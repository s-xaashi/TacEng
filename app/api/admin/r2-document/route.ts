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

    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required." }, { status: 400 });
    }

    const [{ data: document }, { data: variants }] = await Promise.all([
      auth.admin
        .from("documents")
        .select("id, file_path")
        .eq("id", documentId)
        .maybeSingle(),
      auth.admin
        .from("document_variants")
        .select("id, file_path")
        .eq("document_id", documentId),
    ]);

    if (!document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const keys = [
      document.file_path,
      ...(variants ?? []).map(variant => variant.file_path),
    ].filter(isR2DocumentKey);

    await Promise.all(keys.map(key => deleteR2Object(key)));

    return NextResponse.json({ ok: true, deleted: keys.length });
  } catch (error) {
    console.error("R2 document deletion error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not remove R2 files." },
      { status: 500 }
    );
  }
}
