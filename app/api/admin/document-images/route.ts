import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";

  if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const admin = getSupabaseAdmin();
  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);

  if (userError || !user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data: adminRow } = await admin
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const documentId = typeof body?.documentId === "string" ? body.documentId : "";
  const variantId = typeof body?.variantId === "string" ? body.variantId : null;
  const imagePath = typeof body?.imagePath === "string" ? body.imagePath : "";
  const altText = typeof body?.altText === "string" ? body.altText.slice(0, 500) : null;
  const sortOrder = Number.isInteger(body?.sortOrder) ? body.sortOrder : 0;

  if (!documentId || !imagePath || sortOrder < 0 || sortOrder > 10000) {
    return NextResponse.json({ error: "Invalid image data." }, { status: 400 });
  }

  const { data: document } = await admin
    .from("documents")
    .select("id")
    .eq("id", documentId)
    .maybeSingle();

  if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  if (variantId) {
    const { data: variant } = await admin
      .from("document_variants")
      .select("id")
      .eq("id", variantId)
      .eq("document_id", documentId)
      .maybeSingle();

    if (!variant) return NextResponse.json({ error: "Invalid product option." }, { status: 400 });
  }

  // Only accept paths in the product gallery namespace.
  if (!imagePath.startsWith(`products/${documentId}/`)) {
    return NextResponse.json({ error: "Invalid image path." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("document_images")
    .insert({
      document_id: documentId,
      variant_id: variantId,
      image_path: imagePath,
      alt_text: altText,
      sort_order: sortOrder,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to save document image", { message: error.message });
    return NextResponse.json({ error: "Could not save product image." }, { status: 500 });
  }

  return NextResponse.json({ image: data });
}
