"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

export default function DownloadPurchaseButton({
  purchaseId,
}: {
  purchaseId: string;
}) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState<"download" | "share" | null>(null);
  const [preparedFile, setPreparedFile] = useState<File | null>(null);
  const [shareSupported, setShareSupported] = useState<boolean | null>(null);
  const [prepareError, setPrepareError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getDocumentFile(mode: "stream" | "prepare" = "stream") {
    const res = await fetch("/api/documents/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchaseId, mode }),
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

  useEffect(() => {
    let active = true;

    async function prepareShareFile() {
      if (
        typeof navigator.share !== "function" ||
        typeof navigator.canShare !== "function"
      ) {
        if (active) setShareSupported(false);
        return;
      }

      const testFile = new File([""], "document.pdf", { type: "application/pdf" });
      if (!navigator.canShare({ files: [testFile] })) {
        if (active) setShareSupported(false);
        return;
      }

      if (active) setShareSupported(true);

      try {
        const file = await getDocumentFile("prepare");
        if (active) setPreparedFile(file);
      } catch {
        if (active) setPrepareError(true);
      }
    }

    void prepareShareFile();

    return () => {
      active = false;
    };
  }, [purchaseId]);

  async function handleDownload() {
    setLoading("download");
    setError(null);

    try {
      const file = preparedFile ?? await getDocumentFile();
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

  function handleShare() {
    setError(null);

    if (!preparedFile) {
      setError(prepareError ? t.marketplace.shareFailed : t.marketplace.preparingDocument);
      return;
    }

    setLoading("share");

    try {
      // The file is prepared before this click so navigator.share() retains
      // the required transient user activation.
      void navigator
        .share({
          title: preparedFile.name.replace(/\.pdf$/i, ""),
          files: [preparedFile],
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(err instanceof Error ? err.message : t.marketplace.shareFailed);
        })
        .finally(() => setLoading(null));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.marketplace.shareFailed);
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

      {shareSupported !== false && (
        <button
          type="button"
          onClick={handleShare}
          disabled={loading !== null || !preparedFile}
          className="focus-ring rounded-full border border-line bg-paper px-6 py-3 text-sm font-medium text-ink hover:border-ink disabled:opacity-50"
        >
          {loading === "share" || !preparedFile
            ? t.marketplace.sharingDocument
            : t.marketplace.shareDocument}
        </button>
      )}

      {error && <p className="text-sm text-red-700 sm:col-span-2">{error}</p>}
    </div>
  );
}
