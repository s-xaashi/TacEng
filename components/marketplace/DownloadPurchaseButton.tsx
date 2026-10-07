"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

export default function DownloadPurchaseButton({
  purchaseId,
}: {
  purchaseId: string;
}) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState<"download" | "share" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function getDocumentFile() {
    const res = await fetch("/api/documents/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchaseId, mode: "stream" }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? t.marketplace.downloadFailed);
    }

    const blob = await res.blob();
    if (!blob.size) throw new Error(t.marketplace.downloadFailed);

    const contentDisposition = res.headers.get("Content-Disposition");
    const match = contentDisposition?.match(/filename="([^"]+)"/i);
    const fileName = match?.[1] || "document.pdf";

    return new File([blob], fileName, {
      type: blob.type || "application/pdf",
    });
  }

  async function handleDownload() {
    setLoading("download");
    setError(null);

    try {
      const file = await getDocumentFile();
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.marketplace.downloadFailed);
    } finally {
      setLoading(null);
    }
  }

  async function handleShare() {
    setLoading("share");
    setError(null);

    try {
      const file = await getDocumentFile();

      if (
        typeof navigator.share !== "function" ||
        typeof navigator.canShare !== "function" ||
        !navigator.canShare({ files: [file] })
      ) {
        setError(t.marketplace.shareNotSupported);
        return;
      }

      await navigator.share({
        title: file.name.replace(/\.pdf$/i, ""),
        files: [file],
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : t.marketplace.shareFailed);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading !== null}
        className="focus-ring rounded-full bg-pine px-6 py-3 text-sm font-medium text-paper hover:bg-pine-dark disabled:opacity-50"
      >
        {loading === "download" ? t.marketplace.preparingDocument : t.marketplace.downloadDocument}
      </button>

      <button
        type="button"
        onClick={handleShare}
        disabled={loading !== null}
        className="focus-ring rounded-full border border-line bg-paper px-6 py-3 text-sm font-medium text-ink hover:border-ink disabled:opacity-50"
      >
        {loading === "share" ? t.marketplace.sharingDocument : t.marketplace.shareDocument}
      </button>

      {error && <p className="text-sm text-red-700 sm:col-span-2">{error}</p>}
    </div>
  );
}
