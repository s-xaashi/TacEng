import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  createR2PresignedUrl,
  getPublicR2Url,
  isR2DocumentKey,
} from "@/lib/r2";

const SIGNED_URL_TTL_SECONDS = 5 * 60;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const documentId = typeof body?.documentId === "string" ? body.documentId : "";
    const variantId = typeof body?.variantId === "string" ? body.variantId : null;

    if (!documentId) {
      return NextResponse.json({ error: "documentId is required." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select(
        "id, file_path, file_storage, is_free, price, published, download_enabled, download_count"
      )
      .eq("id", documentId)
      .maybeSingle();

    if (docErr || !doc) {
      return NextResponse.json({ error: "Document file not found." }, { status: 404 });
    }

    if (!doc.published) {
      return NextResponse.json({ error: "This document is not available." }, { status: 404 });
    }

    if (doc.download_enabled === false) {
      return NextResponse.json(
        { error: "Downloads are currently unavailable for this document." },
        { status: 403 }
      );
    }

    let filePath = doc.file_path;
    let fileStorage = doc.file_storage ?? "supabase";
    let fileBucket = doc.is_free ? "free-documents" : "paid-documents";
    let effectivePrice = Number(doc.price);

    if (variantId) {
      const { data: variant, error: variantErr } = await supabase
        .from("document_variants")
        .select("id, document_id, price, enabled, file_path, file_bucket, file_storage")
        .eq("id", variantId)
        .eq("document_id", documentId)
        .maybeSingle();

      if (variantErr || !variant || !variant.enabled) {
        return NextResponse.json({ error: "The selected level is no longer available." }, { status: 404 });
      }

      effectivePrice = Number(variant.price);
      filePath = variant.file_path;
      fileBucket = variant.file_bucket;
      fileStorage = variant.file_storage ?? "supabase";
    }

    // A document/level is downloadable without payment when its effective
    // price is zero or below, regardless of the admin "Free/Paid" toggle.
    // This also covers a paid parent document with a zero-price level.
    if (effectivePrice > 0) {
      return NextResponse.json(
        { error: "This document requires a purchase before downloading." },
        { status: 403 }
      );
    }

    if (!filePath) {
      return NextResponse.json({ error: "Document file not found." }, { status: 404 });
    }

    let url: string | null = null;

    if (isR2DocumentKey(filePath)) {
      if (fileStorage === "r2-public") {
        url = getPublicR2Url(filePath);
      } else {
        url = await createR2PresignedUrl({
          key: filePath,
          method: "GET",
          expiresIn: SIGNED_URL_TTL_SECONDS,
        });
      }
    } else {
      const signed = await supabase.storage
        .from(fileBucket)
        .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS);

      if (!signed.data?.signedUrl) {
        return NextResponse.json(
          { error: "Could not generate a download link. Please try again." },
          { status: 500 }
        );
      }

      url = signed.data.signedUrl;
    }

    if (!url) {
      return NextResponse.json(
        { error: "Could not generate a download link. Please try again." },
        { status: 500 }
      );
    }

    const { error: countError } = await supabase.rpc("increment_download_count", {
      doc_id: doc.id,
    });

    if (countError) {
      console.error("Failed to increment free document download count", {
        documentId: doc.id,
        message: countError.message,
      });
    }

    return NextResponse.json({
      url,
      expiresIn:
        isR2DocumentKey(filePath) && fileStorage !== "r2-public"
          ? SIGNED_URL_TTL_SECONDS
          : null,
    });
  } catch (error) {
    console.error("Free document download error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not prepare download." },
      { status: 500 }
    );
  }
}
