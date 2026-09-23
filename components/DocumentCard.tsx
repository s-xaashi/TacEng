"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getFreeDocumentUrl, getThumbnailUrl } from "@/lib/supabase/storage";
import type { MarketplaceDocument } from "@/lib/supabase/types";
import BuyModal from "./marketplace/BuyModal";
import { useLanguage } from "@/components/LanguageProvider";

export default function DocumentCard({
  doc,
  categoryName,
}: {
  doc: MarketplaceDocument;
  categoryName?: string;
}) {
  const { t } = useLanguage();
  const thumbnailUrl = getThumbnailUrl(doc.thumbnail_path);
  const [showBuyModal, setShowBuyModal] = useState(false);

  async function handleDownload() {
    if (!doc.is_free) return;
    const supabase = getSupabaseClient();
    // Best-effort download count — never blocks the download itself.
    if (supabase) {
      supabase.rpc("increment_download_count", { doc_id: doc.id }).then();
    }
    const url = getFreeDocumentUrl(doc.file_path);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-line p-6">
      <div>
        {thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt=""
            className="mb-4 aspect-[4/3] w-full rounded-lg object-cover"
          />
        )}

        <div className="flex items-start justify-between gap-3">
          {categoryName && (
            <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">
              {categoryName}
            </span>
          )}
        </div>

        <h3 className="mt-4 font-display text-lg text-ink">{doc.title}</h3>
        {doc.description && (
          <p className="mt-2 text-sm leading-relaxed text-ink/80">
            {doc.description}
          </p>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <span className="text-sm font-medium text-ink">
          {doc.is_free ? t.marketplace.free : `${doc.price.toFixed(2)}`}
        </span>
        {doc.is_free ? (
          <button
            type="button"
            onClick={handleDownload}
            disabled={!doc.file_path}
            className="focus-ring rounded-full bg-pine px-5 py-2 text-sm font-medium text-paper transition-colors hover:bg-pine-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.marketplace.download}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowBuyModal(true)}
            className="focus-ring rounded-full bg-gold px-5 py-2 text-sm font-medium text-paper transition-colors hover:opacity-90"
          >
            {t.marketplace.buyNow}
          </button>
        )}
      </div>

      {showBuyModal && (
        <BuyModal
          documentId={doc.id}
          title={doc.title}
          price={doc.price}
          onClose={() => setShowBuyModal(false)}
        />
      )}
    </div>
  );
}
