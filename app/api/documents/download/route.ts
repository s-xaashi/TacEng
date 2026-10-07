import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getPurchaseById } from "@/lib/sifalo/purchases";
import { createR2PresignedUrl, isR2DocumentKey } from "@/lib/r2";

const SIGNED_URL_TTL_SECONDS = 5 * 60; // short-lived, per spec

export async function POST(req: NextRequest) {
  let body: { purchaseId?: string; mode?: "url" | "stream" | "prepare" };
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
    .select("id, file_path, file_storage, download_count, download_enabled")
    .eq("id", purchase.document_id)
    .maybeSingle();

  if (docErr || !doc) {
    return NextResponse.json({ error: "Document file not found." }, { status: 404 });
  }

  if (doc.download_enabled === false) {
    return NextResponse.json({ error: "Downloads are currently unavailable for this document." }, { status: 403 });
  }

  let filePath = doc.file_path;
  let fileBucket = "paid-documents";
  let fileStorage = doc.file_storage ?? "supabase";

  if (purchase.variant_id) {
    const { data: variant, error: variantErr } = await supabase
      .from("document_variants")
      .select("id, document_id, price, enabled, file_path, file_bucket, file_storage")
      .eq("id", purchase.variant_id)
      .eq("document_id", purchase.document_id)
      .maybeSingle();

    if (variantErr || !variant || !variant.enabled || Number(variant.price) <= 0) {
      return NextResponse.json({ error: "The selected level is no longer available." }, { status: 403 });
    }

    if (!variant.file_path || variant.file_bucket !== "paid-documents") {
      return NextResponse.json({ error: "The selected level file is not available." }, { status: 404 });
    }

    filePath = variant.file_path;
    fileBucket = variant.file_bucket;
    fileStorage = variant.file_storage ?? "supabase";
    if (fileStorage === "r2-public") {
      return NextResponse.json(
        { error: "The paid level file is not stored in protected storage." },
        { status: 500 }
      );
    }
  }

  if (!filePath) {
    return NextResponse.json({ error: "Document file not found." }, { status: 404 });
  }

  let downloadUrl: string | null = null;

  if (isR2DocumentKey(filePath)) {
    if (fileStorage === "r2-public") {
      return NextResponse.json(
        { error: "The paid document file is not stored in protected storage." },
        { status: 500 }
      );
    }

    downloadUrl = await createR2PresignedUrl({
      key: filePath,
      method: "GET",
      expiresIn: SIGNED_URL_TTL_SECONDS,
    });
  } else {
    const { data: signed, error: signErr } = await supabase.storage
      .from(fileBucket)
      .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS);

    if (signErr || !signed) {
      return NextResponse.json(
        { error: "Could not generate a download link. Please try again." },
        { status: 500 }
      );
    }

    downloadUrl = signed.signedUrl;
  }

  if (body.mode !== "prepare") {
    await supabase
      .from("documents")
      .update({ download_count: (doc.download_count ?? 0) + 1 })
      .eq("id", doc.id);
  }

  if (body.mode === "stream" || body.mode === "prepare") {
    try {
      const fileResponse = await fetch(downloadUrl, { cache: "no-store" });

      if (!fileResponse.ok || !fileResponse.body) {
        return NextResponse.json(
          { error: "Could not retrieve the document file. Please try again." },
          { status: 502 }
        );
      }

      const pathName = filePath.split("/").pop() ?? "document.pdf";
      const fileName = pathName
        .replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, "")
        .replace(/["\\\r\n]/g, "")
        .slice(0, 180) || "document.pdf";
      const finalFileName = /\.pdf$/i.test(fileName) ? fileName : `${fileName}.pdf`;

      return new NextResponse(fileResponse.body, {
        status: 200,
        headers: {
          "Content-Type": fileResponse.headers.get("Content-Type") || "application/pdf",
          "Content-Disposition": `attachment; filename="${finalFileName}"`,
          "Cache-Control": "private, no-store, max-age=0",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      return NextResponse.json(
        { error: "Could not retrieve the document file. Please try again." },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ url: downloadUrl, expiresIn: SIGNED_URL_TTL_SECONDS });
}
