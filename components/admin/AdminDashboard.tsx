"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Category, MarketplaceDocument } from "@/lib/supabase/types";

type FormState = {
  id: string | null;
  title: string;
  description: string;
  category_id: string;
  is_free: boolean;
  price: string;
  payment_link: string;
  published: boolean;
  thumbnailFile: File | null;
  pdfFile: File | null;
  existingThumbnailPath: string | null;
  existingFilePath: string | null;
  existingIsFree: boolean | null;
};

const emptyForm: FormState = {
  id: null,
  title: "",
  description: "",
  category_id: "",
  is_free: true,
  price: "0",
  payment_link: "",
  published: true,
  thumbnailFile: null,
  pdfFile: null,
  existingThumbnailPath: null,
  existingFilePath: null,
  existingIsFree: null,
};

export default function AdminDashboard({
  onSignOut,
}: {
  onSignOut: () => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [documents, setDocuments] = useState<MarketplaceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    const [{ data: cats }, { data: docs }] = await Promise.all([
      supabase.from("categories").select("id, name, slug").order("name"),
      supabase
        .from("documents")
        .select(
          "id, title, description, category_id, file_path, thumbnail_path, price, is_free, payment_link, published, download_count, created_at, updated_at"
        )
        .order("created_at", { ascending: false }),
    ]);
    setCategories(cats ?? []);
    setDocuments(docs ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(doc: MarketplaceDocument) {
    setFormError(null);
    setForm({
      id: doc.id,
      title: doc.title,
      description: doc.description ?? "",
      category_id: doc.category_id ?? "",
      is_free: doc.is_free,
      price: String(doc.price ?? 0),
      payment_link: doc.payment_link ?? "",
      published: doc.published,
      thumbnailFile: null,
      pdfFile: null,
      existingThumbnailPath: doc.thumbnail_path,
      existingFilePath: doc.file_path,
      existingIsFree: doc.is_free,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm(emptyForm);
    setFormError(null);
  }

  /**
   * Every write goes through this first. getUser() (unlike getSession())
   * round-trips to Supabase to validate the token server-side, so this
   * catches an expired/missing session BEFORE we attempt a mutation —
   * instead of the browser silently sending an unauthenticated request
   * that Postgres then rejects with a generic RLS error.
   */
  async function requireFreshAdminSession(
    supabase: NonNullable<ReturnType<typeof getSupabaseClient>>
  ): Promise<string | null> {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return "Your session has expired. Please sign out and sign in again.";
    }

    const { data: adminRow, error: adminErr } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminErr || !adminRow) {
      return "This account is signed in but is no longer an admin.";
    }

    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setFormError("Marketplace isn't configured.");
      return;
    }

    const sessionIssue = await requireFreshAdminSession(supabase);
    if (sessionIssue) {
      setFormError(sessionIssue);
      return;
    }

    const isEditing = form.id !== null;
    const freePaidChanged =
      isEditing && form.existingIsFree !== null && form.existingIsFree !== form.is_free;

    if (freePaidChanged && !form.pdfFile) {
      setFormError(
        "You changed Free/Paid status — please re-upload the PDF so it moves to the correct storage bucket."
      );
      return;
    }

    setSaving(true);
    try {
      let thumbnailPath = form.existingThumbnailPath;
      if (form.thumbnailFile) {
        const path = `${crypto.randomUUID()}-${form.thumbnailFile.name}`;
        const { error: upErr } = await supabase.storage
          .from("thumbnails")
          .upload(path, form.thumbnailFile, { upsert: true });
        if (upErr) throw upErr;
        thumbnailPath = path;
      }

      let filePath = form.existingFilePath;
      if (form.pdfFile) {
        const bucket = form.is_free ? "free-documents" : "paid-documents";
        const path = `${crypto.randomUUID()}-${form.pdfFile.name}`;
        const { error: upErr } = await supabase.storage
          .from(bucket)
          .upload(path, form.pdfFile, { upsert: true });
        if (upErr) throw upErr;
        filePath = path;
      }

      const payload = {
        title: form.title,
        description: form.description || null,
        category_id: form.category_id || null,
        is_free: form.is_free,
        price: form.is_free ? 0 : Number(form.price) || 0,
        payment_link: form.is_free ? null : form.payment_link || null,
        published: form.published,
        thumbnail_path: thumbnailPath,
        file_path: filePath,
      };

      if (isEditing) {
        const { error: updateErr } = await supabase
          .from("documents")
          .update(payload)
          .eq("id", form.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from("documents")
          .insert(payload);
        if (insertErr) throw insertErr;
      }

      resetForm();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(doc: MarketplaceDocument) {
    if (!window.confirm(`Delete "${doc.title}"? This can't be undone.`)) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const sessionIssue = await requireFreshAdminSession(supabase);
    if (sessionIssue) {
      setFormError(sessionIssue);
      return;
    }

    if (doc.thumbnail_path) {
      await supabase.storage.from("thumbnails").remove([doc.thumbnail_path]);
    }
    if (doc.file_path) {
      const bucket = doc.is_free ? "free-documents" : "paid-documents";
      await supabase.storage.from(bucket).remove([doc.file_path]);
    }
    await supabase.from("documents").delete().eq("id", doc.id);
    await load();
  }

  async function togglePublished(doc: MarketplaceDocument) {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const sessionIssue = await requireFreshAdminSession(supabase);
    if (sessionIssue) {
      setFormError(sessionIssue);
      return;
    }

    await supabase
      .from("documents")
      .update({ published: !doc.published })
      .eq("id", doc.id);
    await load();
  }

  return (
    <main className="mx-auto min-h-screen max-w-content px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-ink">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Manage marketplace documents.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/payments"
            className="focus-ring rounded-full border border-line px-5 py-2 text-sm text-ink hover:border-ink"
          >
            Payments
          </Link>
          <button
            type="button"
            onClick={onSignOut}
            className="focus-ring rounded-full border border-line px-5 py-2 text-sm text-ink hover:border-ink"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Create / Edit form */}
      <form
        onSubmit={handleSubmit}
        className="mt-10 grid gap-4 rounded-2xl border border-line p-6 sm:grid-cols-2"
      >
        <h2 className="font-display text-lg text-ink sm:col-span-2">
          {form.id ? "Edit document" : "Upload new document"}
        </h2>

        <div className="sm:col-span-2">
          <label className="text-sm text-muted">Title</label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="focus-ring mt-1 w-full rounded-md border border-line bg-white/60 px-3 py-2 text-sm text-ink"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm text-muted">Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            className="focus-ring mt-1 w-full rounded-md border border-line bg-white/60 px-3 py-2 text-sm text-ink"
          />
        </div>

        <div>
          <label className="text-sm text-muted">Category</label>
          <select
            value={form.category_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, category_id: e.target.value }))
            }
            className="focus-ring mt-1 w-full rounded-md border border-line bg-white/60 px-3 py-2 text-sm text-ink"
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-muted">Free or Paid</label>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, is_free: true }))}
              className={`focus-ring flex-1 rounded-md border px-3 py-2 text-sm ${
                form.is_free
                  ? "border-ink bg-ink text-paper"
                  : "border-line text-ink"
              }`}
            >
              Free
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, is_free: false }))}
              className={`focus-ring flex-1 rounded-md border px-3 py-2 text-sm ${
                !form.is_free
                  ? "border-ink bg-ink text-paper"
                  : "border-line text-ink"
              }`}
            >
              Paid
            </button>
          </div>
        </div>

        {!form.is_free && (
          <>
            <div>
              <label className="text-sm text-muted">Price (USD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price: e.target.value }))
                }
                className="focus-ring mt-1 w-full rounded-md border border-line bg-white/60 px-3 py-2 text-sm text-ink"
              />
            </div>
            <div>
              <label className="text-sm text-muted">Payment link</label>
              <input
                type="url"
                placeholder="https://..."
                value={form.payment_link}
                onChange={(e) =>
                  setForm((f) => ({ ...f, payment_link: e.target.value }))
                }
                className="focus-ring mt-1 w-full rounded-md border border-line bg-white/60 px-3 py-2 text-sm text-ink"
              />
            </div>
          </>
        )}

        <div>
          <label className="text-sm text-muted">
            Thumbnail image{" "}
            {form.existingThumbnailPath && "(leave blank to keep current)"}
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                thumbnailFile: e.target.files?.[0] ?? null,
              }))
            }
            className="focus-ring mt-1 w-full text-sm text-ink"
          />
        </div>

        <div>
          <label className="text-sm text-muted">
            PDF file {form.existingFilePath && "(leave blank to keep current)"}
          </label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) =>
              setForm((f) => ({ ...f, pdfFile: e.target.files?.[0] ?? null }))
            }
            className="focus-ring mt-1 w-full text-sm text-ink"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) =>
              setForm((f) => ({ ...f, published: e.target.checked }))
            }
          />
          Published (visible in marketplace)
        </label>

        {formError && (
          <p className="text-sm text-red-700 sm:col-span-2">{formError}</p>
        )}

        <div className="flex gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="focus-ring rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-ink/85 disabled:opacity-50"
          >
            {saving ? "Saving…" : form.id ? "Save changes" : "Upload document"}
          </button>
          {form.id && (
            <button
              type="button"
              onClick={resetForm}
              className="focus-ring rounded-full border border-line px-6 py-3 text-sm text-ink hover:border-ink"
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>

      {/* Document list */}
      <div className="mt-12">
        <h2 className="font-display text-lg text-ink">
          All documents {!loading && `(${documents.length})`}
        </h2>

        {loading ? (
          <p className="mt-4 text-sm text-muted">Loading…</p>
        ) : documents.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            No documents yet — upload your first one above.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Downloads</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-line/60">
                    <td className="py-3 pr-4 text-ink">{doc.title}</td>
                    <td className="py-3 pr-4 text-muted">
                      {doc.is_free ? "Free" : `$${doc.price.toFixed(2)}`}
                    </td>
                    <td className="py-3 pr-4">
                      <button
                        type="button"
                        onClick={() => togglePublished(doc)}
                        className={`rounded-full px-3 py-1 text-xs ${
                          doc.published
                            ? "bg-pine-light text-pine-dark"
                            : "bg-line text-muted"
                        }`}
                      >
                        {doc.published ? "Published" : "Unpublished"}
                      </button>
                    </td>
                    <td className="py-3 pr-4 text-muted">
                      {doc.download_count}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => startEdit(doc)}
                          className="focus-ring text-xs text-ink underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(doc)}
                          className="focus-ring text-xs text-red-700 underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
