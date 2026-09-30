import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { deleteR2Object, isR2DocumentKey } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";

  if (!token) return { error: "Unauthorized.", status: 401 as const };

  const admin = getSupabaseAdmin();
  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);

  if (userError || !user) return { error: "Unauthorized.", status: 401 as const };

  const { data: adminRow } = await admin
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) return { error: "Forbidden.", status: 403 as const };

  return { admin };
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => null);
    const documentId = typeof body?.documentId === "string" ? body.documentId : "";
    const key = typeof body?.key === "string" ? body.key : "";
    const storage =
      body?.storage === "public" || body?.storage === "private"
        ? body.storage
        : null;

    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required." }, { status: 400 });
    }

    const [{ data: document }, { data: variants }] = await Promise.all([
      auth.admin
        .from("documents")
        .select("id, file_path, file_storage")
        .eq("id", documentId)
        .maybeSingle(),
      auth.admin
        .from("document_variants")
        .select("id, file_path, file_storage")
        .eq("document_id", documentId),
    ]);

    if (!document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    // When a specific key is supplied, this endpoint is also used for
    // replacement cleanup and upload rollback. Keep it scoped to this
    // document and never allow deletion of a file still referenced by DB.
    if (key || storage) {
      if (!key || !storage || !isR2DocumentKey(key)) {
        return NextResponse.json({ error: "Invalid R2 object cleanup request." }, { status: 400 });
      }

      const documentPrefix = `documents/${documentId}/`;
      if (!key.startsWith(documentPrefix)) {
        return NextResponse.json({ error: "R2 object does not belong to this document." }, { status: 403 });
      }

      const currentObjects = [
        {
          key: document.file_path,
          storage: document.file_storage,
        },
        ...(variants ?? []).map(variant => ({
          key: variant.file_path,
          storage: variant.file_storage,
        })),
      ].filter((object): object is {
        key: string;
        storage: "supabase" | "r2-public" | "r2-private";
      } =>
        typeof object.key === "string" &&
        ["supabase", "r2-public", "r2-private"].includes(object.storage)
      );

      const isCurrentReference = currentObjects.some(
        object =>
          object.key === key &&
          (object.storage === "r2-public" ? "public" : "private") === storage
      );

      if (isCurrentReference) {
        return NextResponse.json(
          { error: "Cannot delete an R2 object still referenced by the document." },
          { status: 409 }
        );
      }

      await deleteR2Object(key, storage);
      return NextResponse.json({ ok: true, deleted: 1 });
    }

    const objects = [
      {
        key: document.file_path,
        storage: document.file_storage === "r2-public" ? "public" : "private",
      },
      ...(variants ?? []).map(variant => ({
        key: variant.file_path,
        storage: variant.file_storage === "r2-public" ? "public" : "private",
      })),
    ].filter((object): object is { key: string; storage: "public" | "private" } =>
      isR2DocumentKey(object.key)
    );

    await Promise.all(
      objects.map(object =>
        deleteR2Object(object.key, object.storage)
      )
    );

    return NextResponse.json({ ok: true, deleted: objects.length });
  } catch (error) {
    console.error("R2 document deletion error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not remove R2 files." },
      { status: 500 }
    );
  }
}
