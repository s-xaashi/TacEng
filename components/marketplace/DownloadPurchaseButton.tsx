"use client";

import { useState } from "react";

export default function DownloadPurchaseButton({
  purchaseId,
}: {
  purchaseId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/documents/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Download failed.");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className="focus-ring rounded-full bg-pine px-6 py-3 text-sm font-medium text-paper hover:bg-pine-dark disabled:opacity-50"
      >
        {loading ? "Preparing download…" : "Download your document"}
      </button>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
