import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getPurchaseById } from "@/lib/sifalo/purchases";

const SIGNED_URL_TTL_SECONDS = 5 * 60; // short-lived, per spec

export async function POST(req: NextRequest) {
  let body: { purchaseId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.purchaseId) {
    return NextResponse.json({ error: "purchaseId is required." }, { status: 400 });
  }

  const purchase = await getPurchaseById(body.purchaseId);

  // Confirm: purchase exists, is actually paid, and belongs to the
  // requested document — you cannot get a paid file by guessing/changing
  // a document id, since the lookup is purchase-id -> its own document,
  // never document-id -> "any paid purchase".
  if (!purchase || purchase.status !== "paid") {
    return NextResponse.json(
      { error: "This document hasn't been purchased yet." },
      { status: 403 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .select("id, file_path, download_count, download_enabled")
    .eq("id", purchase.document_id)
    .maybeSingle();

  if (docErr || !doc || !doc.file_path) {
    return NextResponse.json({ error: "Document file not found." }, { status: 404 });
  }

  if (doc.download_enabled === false) {
    return NextResponse.json({ error: "Downloads are currently unavailable for this document." }, { status: 403 });
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from("paid-documents")
    .createSignedUrl(doc.file_path, SIGNED_URL_TTL_SECONDS);

  if (signErr || !signed) {
    return NextResponse.json(
      { error: "Could not generate a download link. Please try again." },
      { status: 500 }
    );
  }

  await supabase
    .from("documents")
    .update({ download_count: (doc.download_count ?? 0) + 1 })
    .eq("id", doc.id);

  return NextResponse.json({ url: signed.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS });
}
