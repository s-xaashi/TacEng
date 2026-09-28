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

    if (!documentId) {
      return NextResponse.json({ error: "documentId is required." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, file_path, file_storage, is_free, published, download_enabled, download_count")
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

    if (!doc.is_free) {
      return NextResponse.json(
        { error: "This document requires a purchase before downloading." },
        { status: 403 }
      );
    }

    if (!doc.file_path) {
      return NextResponse.json({ error: "Document file not found." }, { status: 404 });
    }

    let url: string | null = null;

    if (isR2DocumentKey(doc.file_path)) {
      if (doc.file_storage === "r2-public") {
        url = getPublicR2Url(doc.file_path);
      } else {
        url = await createR2PresignedUrl({
          key: doc.file_path,
          method: "GET",
          expiresIn: SIGNED_URL_TTL_SECONDS,
        });
      }
    } else {
      const legacy = supabase.storage
        .from("free-documents")
        .getPublicUrl(doc.file_path);
      url = legacy.data.publicUrl;
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
        isR2DocumentKey(doc.file_path) && doc.file_storage !== "r2-public"
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
