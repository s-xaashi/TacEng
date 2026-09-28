import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createR2PresignedUrl, makeR2DocumentKey } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PRODUCT_FILE_SIZE = 50 * 1024 * 1024;

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

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => null);
    const documentId = typeof body?.documentId === "string" ? body.documentId : "";
    const variantId = typeof body?.variantId === "string" ? body.variantId : null;
    const fileName = typeof body?.fileName === "string" ? body.fileName : "";
    const contentType =
      typeof body?.contentType === "string" && body.contentType.trim()
        ? body.contentType.trim().slice(0, 200)
        : "application/octet-stream";
    const fileSize = Number(body?.fileSize);

    if (!documentId || !fileName || !Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
    }

    if (fileSize > MAX_PRODUCT_FILE_SIZE) {
      return NextResponse.json(
        { error: "Product files must be 50 MB or smaller." },
        { status: 400 }
      );
    }

    const { data: document } = await auth.admin
      .from("documents")
      .select("id")
      .eq("id", documentId)
      .maybeSingle();

    if (!document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    if (variantId) {
      const { data: variant } = await auth.admin
        .from("document_variants")
        .select("id")
        .eq("id", variantId)
        .eq("document_id", documentId)
        .maybeSingle();

      if (!variant) {
        return NextResponse.json({ error: "Invalid product level." }, { status: 400 });
      }
    }

    const key = makeR2DocumentKey(documentId, fileName, variantId);
    const uploadUrl = await createR2PresignedUrl({
      key,
      method: "PUT",
      expiresIn: 10 * 60,
      contentType,
    });

    return NextResponse.json({
      key,
      uploadUrl,
      expiresIn: 10 * 60,
    });
  } catch (error) {
    console.error("R2 upload URL error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not prepare R2 upload." },
      { status: 500 }
    );
  }
}
