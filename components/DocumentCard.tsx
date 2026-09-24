"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getFreeDocumentUrl, getThumbnailUrl } from "@/lib/supabase/storage";
import type { MarketplaceDocument } from "@/lib/supabase/types";
import DocumentProductModal from "./marketplace/DocumentProductModal";
import { useLanguage } from "@/components/LanguageProvider";

export default function DocumentCard({
  doc,
  categoryName,
}: {
  doc: MarketplaceDocument;
  categoryName?: string;
}) {
  const { locale, t } = useLanguage();
  const localizedTitle = locale === "so" ? (doc.title_so || doc.title_en || doc.title) : (doc.title_en || doc.title);
  const localizedDescription = locale === "so" ? (doc.description_so || doc.description_en || doc.description) : (doc.description_en || doc.description);
  const [open, setOpen] = useState(false);
  const thumbnailUrl = getThumbnailUrl(doc.thumbnail_path);
  const activeVariant = doc.variants?.find(v => v.enabled);

  async function handleQuickDownload(event: React.MouseEvent) {
    event.stopPropagation();
    if (!doc.is_free || !doc.download_enabled || !doc.file_path) return;
    const client = getSupabaseClient();
    if (client) await client.rpc("increment_download_count", { doc_id: doc.id });
    const url = getFreeDocumentUrl(doc.file_path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); } }}
        className="group flex h-full cursor-pointer flex-col justify-between rounded-2xl border border-line p-6 transition-transform duration-300 hover:-translate-y-1 hover:border-ink/30"
      >
        <div>
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailUrl} alt="" className="mb-4 aspect-[4/3] w-full rounded-lg object-cover transition-transform duration-300 group-hover:scale-[1.01]" />
          ) : (
            <div className="mb-4 aspect-[4/3] rounded-lg border border-line bg-line/30" />
          )}

          <div className="flex items-center justify-between gap-2">
            {categoryName && <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">{categoryName}</span>}
            <span className="text-[10px] uppercase tracking-wide text-muted">{doc.product_type}</span>
          </div>

          <h3 className="mt-4 font-display text-lg text-ink">{localizedTitle}</h3>
          {localizedDescription && <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-ink/80">{localizedDescription}</p>}

          {(() => {
            const reviews = doc.reviews ?? [];
            const reviewCount = reviews.length;
            const averageRating =
              reviewCount > 0
                ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
                  reviewCount
                : 0;

            return (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                {activeVariant && (
                  <span className="rounded-full border border-line bg-paper/70 px-2.5 py-1 text-ink">
                    {activeVariant.label}
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper/70 px-2.5 py-1 text-ink">
                  <span aria-hidden="true">↓</span>
                  <span className="font-medium">{doc.download_count}</span>
                  <span className="text-ink/70">{t.marketplace.downloads}</span>
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper/70 px-2.5 py-1 text-ink">
                  <span aria-hidden="true">▱</span>
                  <span className="font-medium">{reviewCount}</span>
                  <span className="text-ink/70">{t.marketplace.reviews}</span>
                </span>

                {reviewCount > 0 && (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper/70 px-2.5 py-1 text-ink"
                    aria-label={`${averageRating.toFixed(1)} out of 5 stars from ${reviewCount} reviews`}
                    title={`${averageRating.toFixed(1)} / 5`}
                  >
                    <span className="tracking-[0.08em]" aria-hidden="true">
                      ★★★★★
                    </span>
                    <span className="font-semibold">{averageRating.toFixed(1)}</span>
                  </span>
                )}
              </div>
            );
          })()}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-ink">
            {doc.is_free ? t.marketplace.free : `$${(activeVariant?.price ?? doc.price).toFixed(2)}`}
          </span>
          {doc.is_free && doc.download_enabled ? (
            <button type="button" onClick={handleQuickDownload} disabled={!doc.file_path} className="focus-ring rounded-full bg-pine px-5 py-2 text-sm font-medium text-paper disabled:cursor-not-allowed disabled:opacity-50">
              {t.marketplace.download}
            </button>
          ) : (
            <span className="rounded-full border border-line px-4 py-2 text-xs text-muted">{t.marketplace.details}</span>
          )}
        </div>
      </article>

      {open && <DocumentProductModal doc={doc} categoryName={categoryName} onClose={() => setOpen(false)} />}
    </>
  );
}
