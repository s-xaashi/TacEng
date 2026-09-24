"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { DocumentReview, MarketplaceDocument } from "@/lib/supabase/types";

export default function DocumentReviewsManager() {
  const [reviews, setReviews] = useState<(DocumentReview & { documentTitle: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) return;
    setLoading(true);
    const [{ data: rows }, { data: docs }] = await Promise.all([
      client.from("document_reviews").select("*").order("created_at", { ascending: false }),
      client.from("documents").select("id, title"),
    ]);
    const titles = new Map((docs ?? []).map((d: Pick<MarketplaceDocument, "id" | "title">) => [d.id, d.title]));
    setReviews(((rows ?? []) as DocumentReview[]).map(r => ({ ...r, documentTitle: titles.get(r.document_id) ?? "Unknown product" })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function requireAdmin() {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data: { user } } = await client.auth.getUser();
    if (!user) { setError("Your session has expired."); return null; }
    const { data } = await client.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (!data) { setError("Not authorized."); return null; }
    return client;
  }

  async function toggle(review: DocumentReview) {
    const client = await requireAdmin();
    if (!client) return;
    const { error: updateError } = await client.from("document_reviews").update({ approved: !review.approved }).eq("id", review.id);
    if (updateError) setError(updateError.message); else await load();
  }

  async function save(review: DocumentReview) {
    const client = await requireAdmin();
    if (!client) return;
    const name = review.name.normalize("NFKC").trim().replace(/\s+/g, " ");
    const comment = review.comment.normalize("NFKC").trim().replace(/\s+/g, " ");
    if (!name || name.length > 80 || !comment || comment.length > 500 || /[<>]|https?:\/\/|www\.|javascript:|data:|\b[\w-]+\.[a-z]{2,}\b/i.test(name + " " + comment)) {
      setError("Review contains invalid text.");
      return;
    }
    const { error: updateError } = await client.from("document_reviews").update({ name, comment, rating: Math.min(5, Math.max(1, review.rating)) }).eq("id", review.id);
    if (updateError) setError(updateError.message); else { setEditing(null); await load(); }
  }

  async function remove(review: DocumentReview) {
    if (!window.confirm("Delete this review permanently?")) return;
    const client = await requireAdmin();
    if (!client) return;
    const { error: deleteError } = await client.from("document_reviews").delete().eq("id", review.id);
    if (deleteError) setError(deleteError.message); else await load();
  }

  return (
    <section className="mt-10 rounded-3xl border border-line bg-white/10 p-5 sm:p-7">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Marketplace moderation</p>
      <h2 className="mt-1 font-display text-2xl text-ink">Product reviews</h2>
      <p className="mt-2 text-sm text-muted">Edit, approve/hide, or delete customer reviews before they appear publicly.</p>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      {loading ? <p className="mt-5 text-sm text-muted">Loading…</p> : reviews.length === 0 ? <p className="mt-5 text-sm text-muted">No reviews yet.</p> : (
        <div className="mt-5 grid gap-3">
          {reviews.map(review => (
            <article key={review.id} className="rounded-2xl border border-line p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{review.documentTitle}</p>
                  {editing === review.id ? (
                    <input value={review.name} onChange={e => setReviews(rs => rs.map(r => r.id === review.id ? { ...r, name: e.target.value } : r))} className="admin-input mt-2" />
                  ) : <h3 className="mt-1 font-medium text-ink">{review.name}</h3>}
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] ${review.approved ? "bg-pine-light text-pine-dark" : "bg-line text-muted"}`}>{review.approved ? "Visible" : "Hidden / pending"}</span>
              </div>

              {editing === review.id ? (
                <>
                  <div className="mt-3 flex gap-2">
                    {[1,2,3,4,5].map(n => <button key={n} type="button" onClick={() => setReviews(rs => rs.map(r => r.id === review.id ? { ...r, rating: n } : r))} className={`text-lg ${n <= review.rating ? "text-ink" : "text-muted"}`}>★</button>)}
                  </div>
                  <textarea maxLength={500} value={review.comment} onChange={e => setReviews(rs => rs.map(r => r.id === review.id ? { ...r, comment: e.target.value } : r))} className="admin-input mt-3" rows={4} />
                </>
              ) : <><p className="mt-2 text-sm text-muted">{"★".repeat(review.rating)}</p><p className="mt-2 text-sm leading-6 text-muted">{review.comment}</p></>}

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => toggle(review)} className="focus-ring rounded-full border border-line px-4 py-2 text-xs">{review.approved ? "Hide" : "Approve / Show"}</button>
                {editing === review.id ? (
                  <button type="button" onClick={() => save(review)} className="focus-ring rounded-full bg-ink px-4 py-2 text-xs text-paper">Save</button>
                ) : <button type="button" onClick={() => setEditing(review.id)} className="focus-ring rounded-full border border-line px-4 py-2 text-xs">Edit</button>}
                <button type="button" onClick={() => remove(review)} className="focus-ring rounded-full border border-red-200 px-4 py-2 text-xs text-red-700">Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}

      <style jsx>{`
        .admin-input { width: 100%; border: 1px solid var(--line); border-radius: .65rem; background: rgba(255,255,255,.6); padding: .65rem .75rem; font-size: .875rem; color: var(--ink); }
      `}</style>
    </section>
  );
}
