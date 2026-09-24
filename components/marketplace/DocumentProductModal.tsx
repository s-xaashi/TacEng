"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getFreeDocumentUrl, getThumbnailUrl } from "@/lib/supabase/storage";
import type { DocumentReview, DocumentVariant, MarketplaceDocument } from "@/lib/supabase/types";
import BuyModal from "./BuyModal";
import { useLanguage } from "@/components/LanguageProvider";

export default function DocumentProductModal({
  doc,
  categoryName,
  onClose,
}: {
  doc: MarketplaceDocument;
  categoryName?: string;
  onClose: () => void;
}) {
  const { locale, t } = useLanguage();
  const localizedTitle = locale === "so" ? (doc.title_so || doc.title_en || doc.title) : (doc.title_en || doc.title);
  const localizedDescription = locale === "so" ? (doc.description_so || doc.description_en || doc.description) : (doc.description_en || doc.description);
  const [variantId, setVariantId] = useState<string | null>(doc.variants?.find(v => v.enabled)?.id ?? null);
  const [reviews, setReviews] = useState<DocumentReview[]>(doc.reviews ?? []);
  const [showBuy, setShowBuy] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewMessage, setReviewMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const variants = useMemo(() => (doc.variants ?? []).filter(v => v.enabled), [doc.variants]);
  const selectedVariant = variants.find(v => v.id === variantId) ?? variants[0] ?? null;

  const images = useMemo(() => {
    const variantImages = selectedVariant
      ? (doc.images ?? []).filter(i => i.variant_id === selectedVariant.id)
      : [];
    const general = (doc.images ?? []).filter(i => !i.variant_id);
    const paths = [doc.thumbnail_path, ...variantImages.map(i => i.image_path), ...general.map(i => i.image_path)].filter(Boolean) as string[];
    return Array.from(new Set(paths));
  }, [doc, selectedVariant]);

  const price = selectedVariant ? selectedVariant.price : doc.price;
  const average = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    setActiveImage(0);
  }, [variantId]);

  async function handleDownload() {
    if (!doc.download_enabled || !doc.file_path) return;
    if (!doc.is_free) {
      setShowBuy(true);
      return;
    }
    const client = getSupabaseClient();
    if (client) await client.rpc("increment_download_count", { doc_id: doc.id });
    const url = getFreeDocumentUrl(doc.file_path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  async function submitReview(event: React.FormEvent) {
    event.preventDefault();
    setReviewMessage("");
    const cleanName = name.normalize("NFKC").trim().replace(/\s+/g, " ");
    const cleanComment = comment.normalize("NFKC").trim().replace(/\s+/g, " ");
    if (!cleanName || cleanName.length > 80 || !cleanComment || cleanComment.length > 500) {
      setReviewMessage(t.marketplace.reviewError);
      return;
    }
    if (/[<>]|https?:\/\/|www\.|javascript:|data:|\b[\w-]+\.[a-z]{2,}\b/i.test(cleanName + " " + cleanComment)) {
      setReviewMessage(t.marketplace.reviewError);
      return;
    }
    const client = getSupabaseClient();
    if (!client) { setReviewMessage(t.marketplace.reviewError); return; }
    setSubmitting(true);
    const { error } = await client.from("document_reviews").insert({
      document_id: doc.id,
      name: cleanName,
      rating,
      comment: cleanComment,
      approved: false,
    });
    setSubmitting(false);
    if (error) {
      setReviewMessage(t.marketplace.reviewError);
      return;
    }
    setName("");
    setComment("");
    setRating(5);
    setReviewMessage(t.marketplace.reviewThanks);
  }

  return (
    <>
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 px-4 py-5" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
        <section role="dialog" aria-modal="true" className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-line bg-paper shadow-2xl">
          <button onClick={onClose} type="button" aria-label="Close" className="focus-ring absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-paper/90 text-xl text-ink">×</button>

          <div className="grid gap-0 md:grid-cols-[1.05fr_.95fr]">
            <div className="p-5 sm:p-7">
              <div className="overflow-hidden rounded-2xl border border-line bg-black/5">
                {images[activeImage] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getThumbnailUrl(images[activeImage]) ?? ""} alt={localizedTitle} className="aspect-[4/3] w-full object-contain" />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center text-sm text-muted">No image</div>
                )}
              </div>
              {images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {images.map((path, index) => (
                    <button key={path} type="button" onClick={() => setActiveImage(index)} className={`focus-ring h-16 w-16 shrink-0 overflow-hidden rounded-lg border ${index === activeImage ? "border-ink" : "border-line"}`}>
                      <img src={getThumbnailUrl(path) ?? ""} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 sm:p-7">
              {categoryName && <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">{categoryName}</span>}
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[.18em] text-muted">{t.marketplace.productType}: {doc.product_type}</p>
              <h2 className="mt-2 pr-8 font-display text-3xl text-ink">{localizedTitle}</h2>
              {localizedDescription && <p className="mt-4 text-sm leading-6 text-muted">{localizedDescription}</p>}

              <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 font-medium text-white/90">{doc.download_count} {t.marketplace.downloads}</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 font-medium text-white/90">{reviews.length} {t.marketplace.reviews}</span>
                {reviews.length > 0 && <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 font-medium text-white/90">★ {average.toFixed(1)}/5</span>}
              </div>

              {variants.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t.marketplace.levels}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {variants.map(v => (
                      <button key={v.id} type="button" onClick={() => setVariantId(v.id)} className={`focus-ring rounded-full border px-4 py-2 text-xs ${selectedVariant?.id === v.id ? "border-ink bg-ink text-paper" : "border-line text-muted"}`}>
                        {v.label} {!doc.is_free && `· $${v.price.toFixed(2)}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-7 flex items-center justify-between gap-4 border-t border-line pt-5">
                <div className="text-xl font-semibold text-ink">{doc.is_free ? t.marketplace.free : `$${price.toFixed(2)}`}</div>
                {doc.download_enabled ? (
                  <button type="button" onClick={handleDownload} className="focus-ring rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper">
                    {doc.is_free ? t.marketplace.download : t.marketplace.buyNow}
                  </button>
                ) : (
                  <span className="rounded-full border border-line px-5 py-3 text-sm text-muted">{t.marketplace.unavailable}</span>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-line px-5 py-6 sm:px-7">
            <div className="flex items-end justify-between gap-4">
              <div><h3 className="font-display text-2xl text-ink">{t.marketplace.reviews}</h3><p className="mt-1 text-xs text-muted">{reviews.length ? `★ ${average.toFixed(1)} / 5` : t.marketplace.noReviews}</p></div>
            </div>

            {reviews.length > 0 && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {reviews.map(review => (
                  <article key={review.id} className="rounded-2xl border border-line p-4">
                    <div className="flex justify-between gap-3"><strong className="text-sm text-ink">{review.name}</strong><span className="text-xs text-muted">{"★".repeat(review.rating)}</span></div>
                    <p className="mt-2 text-sm leading-6 text-muted">{review.comment}</p>
                  </article>
                ))}
              </div>
            )}

            <form onSubmit={submitReview} className="mt-6 rounded-2xl border border-line p-4">
              <h4 className="text-sm font-medium text-ink">{t.marketplace.writeReview}</h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="sr-only">{t.marketplace.reviewNamePlaceholder}</span>
                  <input maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder={t.marketplace.reviewNamePlaceholder} className="admin-input" />
                </label>
                <label className="block">
                  <span className="sr-only">{t.marketplace.rating}</span>
                  <select value={rating} onChange={e => setRating(Number(e.target.value))} className="admin-input">
                    {[5,4,3,2,1].map(n => <option key={n} value={n}>{"★".repeat(n)} · {t.marketplace.rating}</option>)}
                  </select>
                </label>
              </div>
              <label className="mt-3 block">
                <span className="sr-only">{t.marketplace.reviewCommentPlaceholder}</span>
                <textarea maxLength={500} rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder={t.marketplace.reviewCommentPlaceholder} className="admin-input" />
              </label>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-muted">{comment.length}/500</span>
                <button disabled={submitting} type="submit" className="focus-ring rounded-full bg-ink px-5 py-2 text-xs text-paper disabled:opacity-50">{submitting ? "…" : t.marketplace.submitReview}</button>
              </div>
              {reviewMessage && <p className="mt-3 text-xs text-muted">{reviewMessage}</p>}
            </form>
          </div>
        </section>
      </div>

      {showBuy && <BuyModal documentId={doc.id} variantId={selectedVariant?.id ?? null} title={localizedTitle + (selectedVariant ? ` — ${selectedVariant.label}` : "")} price={price} onClose={() => setShowBuy(false)} />}
      <style jsx>{`
        .admin-input {
          width: 100%;
          border: 1px solid rgba(255,245,233,.18);
          border-radius: .65rem;
          background: #240b0e;
          padding: .65rem .75rem;
          font-size: .875rem;
          color: var(--cream);
          caret-color: var(--cream);
          outline: none;
        }
        .admin-input::placeholder { color: rgba(255,245,233,.48); }
        .admin-input:focus { border-color: var(--red-bright); box-shadow: 0 0 0 2px rgba(228,85,96,.12); }
        select.admin-input option { background: #240b0e; color: var(--cream); }
      `}</style>
    </>
  );
}
