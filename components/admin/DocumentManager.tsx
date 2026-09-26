"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getThumbnailUrl } from "@/lib/supabase/storage";
import type { Category, DocumentImage, DocumentReview, DocumentVariant, MarketplaceDocument, ProductType } from "@/lib/supabase/types";

type DraftVariant = {
  id?: string;
  label: string;
  price: string;
  enabled: boolean;
  imageFiles: File[];
  productFile: File | null;
  existingFilePath: string | null;
  existingFileBucket: "free-documents" | "paid-documents" | null;
  existingImages: DocumentImage[];
};

type FormState = {
  id: string | null;
  title: string;
  title_so: string;
  description: string;
  description_so: string;
  category_id: string;
  product_type: string;
  is_free: boolean;
  price: string;
  download_enabled: boolean;
  published: boolean;
  thumbnailFile: File | null;
  productFile: File | null;
  galleryFiles: File[];
  existingThumbnailPath: string | null;
  existingFilePath: string | null;
  existingIsFree: boolean | null;
  variants: DraftVariant[];
  existingGeneralImages: DocumentImage[];
};

const emptyForm: FormState = {
  id: null,
  title: "",
  title_so: "",
  description: "",
  description_so: "",
  category_id: "",
  product_type: "book",
  is_free: true,
  price: "0",
  download_enabled: true,
  published: true,
  thumbnailFile: null,
  productFile: null,
  galleryFiles: [],
  existingThumbnailPath: null,
  existingFilePath: null,
  existingIsFree: null,
  variants: [],
  existingGeneralImages: [],
};

export default function DocumentManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [documents, setDocuments] = useState<MarketplaceDocument[]>([]);
  const [reviews, setReviews] = useState<DocumentReview[]>([]);
  const [editingReview, setEditingReview] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newProductTypeName, setNewProductTypeName] = useState("");
  const [allImages, setAllImages] = useState<DocumentImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);\n  const productsCarouselRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) return;
    setLoading(true);
    const [{ data: cats }, { data: types }, { data: docs }, { data: images }, { data: reviewRows }] = await Promise.all([
      client.from("categories").select("id, name, slug").order("name"),
      client.from("product_types").select("id, name, slug").order("name"),
      client.from("documents").select("id, title, description, title_en, description_en, title_so, description_so, category_id, file_path, thumbnail_path, price, is_free, payment_link, published, download_enabled, product_type, download_count, download_count_adjustment, created_at, updated_at").order("created_at", { ascending: false }),
      client.from("document_images").select("id, document_id, variant_id, image_path, alt_text, sort_order, created_at").order("sort_order"),
      client.from("document_reviews").select("*").order("created_at", { ascending: false }),
    ]);
    setCategories(cats ?? []);
    setProductTypes(types ?? []);
    setDocuments(docs ?? []);
    setAllImages(images ?? []);
    setReviews((reviewRows ?? []) as DocumentReview[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function requireAdmin(client: NonNullable<ReturnType<typeof getSupabaseClient>>) {
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return "Your session has expired. Please sign in again.";
    const { data } = await client.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
    return data ? null : "This account is not an admin.";
  }

  async function startEdit(doc: MarketplaceDocument) {
    const client = getSupabaseClient();
    if (!client) return;
    const issue = await requireAdmin(client);
    if (issue) { setError(issue); return; }

    const [{ data: variants }, { data: images }] = await Promise.all([
      client.from("document_variants").select("*").eq("document_id", doc.id).order("sort_order"),
      client.from("document_images").select("*").eq("document_id", doc.id).order("sort_order"),
    ]);

    const imgs = (images ?? []) as DocumentImage[];
    setForm({
      id: doc.id,
      title: doc.title_en ?? doc.title,
      title_so: doc.title_so ?? "",
      description: doc.description_en ?? doc.description ?? "",
      description_so: doc.description_so ?? "",
      category_id: doc.category_id ?? "",
      product_type: doc.product_type ?? "book",
      is_free: doc.is_free,
      price: String(doc.price ?? 0),
      download_enabled: doc.download_enabled !== false,
      published: doc.published,
      thumbnailFile: null,
      productFile: null,
      galleryFiles: [],
      existingThumbnailPath: doc.thumbnail_path,
      existingFilePath: doc.file_path,
      existingIsFree: doc.is_free,
      variants: ((variants ?? []) as DocumentVariant[]).map(v => ({
        id: v.id,
        label: v.label,
        price: String(v.price),
        enabled: v.enabled,
        imageFiles: [],
        productFile: null,
        existingFilePath: v.file_path ?? null,
        existingFileBucket: v.file_bucket ?? null,
        existingImages: imgs.filter(i => i.variant_id === v.id),
      })),
      existingGeneralImages: imgs.filter(i => !i.variant_id),
    });
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm(emptyForm);
    setError(null);
  }

  async function uploadImages(client: NonNullable<ReturnType<typeof getSupabaseClient>>, files: File[], documentId: string, variantId: string | null) {
    if (!files.length) return;

    const { data: { session } } = await client.auth.getSession();
    if (!session?.access_token) throw new Error("Your admin session has expired. Please sign in again.");

    const { count } = await client
      .from("document_images")
      .select("id", { count: "exact", head: true })
      .eq("document_id", documentId)
      .is("variant_id", variantId);

    const startOrder = count ?? 0;

    for (const [index, file] of files.entries()) {
      if (!file.type.startsWith("image/")) throw new Error("Only image files can be uploaded to the gallery.");
      if (file.size > 8 * 1024 * 1024) throw new Error("Each gallery image must be 8 MB or smaller.");

      const imagePath = `products/${documentId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: uploadError } = await client.storage
        .from("thumbnails")
        .upload(imagePath, file, { cacheControl: "31536000", upsert: false });

      if (uploadError) throw uploadError;

      const response = await fetch("/api/admin/document-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          documentId,
          variantId,
          imagePath,
          altText: form.title.trim().slice(0, 500),
          sortOrder: startOrder + index,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Could not save product image.");
      }
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const client = getSupabaseClient();
    if (!client) { setError("Marketplace isn't configured."); return; }
    const issue = await requireAdmin(client);
    if (issue) { setError(issue); return; }

    const editing = Boolean(form.id);
    if (editing && form.existingIsFree !== null && form.existingIsFree !== form.is_free && !form.productFile) {
      setError("You changed Free/Paid status — please re-upload the PDF so it moves to the correct storage bucket.");
      return;
    }
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (!form.is_free && Number(form.price) < 0) { setError("Price cannot be negative."); return; }

    setSaving(true);
    try {
      let thumbnailPath = form.existingThumbnailPath;
      if (form.thumbnailFile) {
        if (form.thumbnailFile.size > 8 * 1024 * 1024) throw new Error("Thumbnail must be 8 MB or smaller.");
        const path = `products/${crypto.randomUUID()}-${form.thumbnailFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: uploadError } = await client.storage.from("thumbnails").upload(path, form.thumbnailFile, { cacheControl: "31536000", upsert: false });
        if (uploadError) throw uploadError;
        thumbnailPath = path;
      }

      let filePath = form.existingFilePath;
      if (form.productFile) {
        const MAX_PRODUCT_FILE_SIZE = 50 * 1024 * 1024;
        if (form.productFile.size > MAX_PRODUCT_FILE_SIZE) {
          throw new Error("Product files must be 50 MB or smaller.");
        }

        const bucket = form.is_free ? "free-documents" : "paid-documents";
        const path = `products/${crypto.randomUUID()}-${form.productFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: uploadError } = await client.storage
          .from(bucket)
          .upload(path, form.productFile, {
            upsert: false,
            contentType: form.productFile.type || "application/octet-stream",
            cacheControl: "31536000",
          });

        if (uploadError) throw uploadError;
        filePath = path;
      }

      const payload = {
        title: form.title.trim(),
        title_en: form.title.trim(),
        title_so: form.title_so.trim() || null,
        description: form.description.trim() || null,
        description_en: form.description.trim() || null,
        description_so: form.description_so.trim() || null,
        category_id: form.category_id || null,
        product_type: form.product_type,
        is_free: form.is_free,
        price: form.is_free ? 0 : Number(form.price) || 0,
        download_enabled: form.download_enabled,
        published: form.published,
        thumbnail_path: thumbnailPath,
        file_path: filePath,
      };

      let documentId = form.id;
      if (documentId) {
        const { error: updateError } = await client.from("documents").update(payload).eq("id", documentId);
        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await client.from("documents").insert(payload).select("id").single();
        if (insertError || !data) throw insertError ?? new Error("Could not create document.");
        documentId = data.id;
      }

      if (!documentId) {
        throw new Error("Could not determine the document ID.");
      }

      const existingVariantIds = (await client.from("document_variants").select("id").eq("document_id", documentId)).data?.map(v => v.id) ?? [];
      const keepVariantIds = form.variants.flatMap(v => v.id ? [v.id] : []);
      const removedVariantIds = existingVariantIds.filter(id => !keepVariantIds.includes(id));

      if (removedVariantIds.length) {
        const removedImages = allImages.filter(i => i.document_id === documentId && i.variant_id && removedVariantIds.includes(i.variant_id));
        if (removedImages.length) {
          await client.storage.from("thumbnails").remove(removedImages.map(i => i.image_path));
          await client.from("document_images").delete().in("id", removedImages.map(i => i.id));
        }
        const { error: removeError } = await client.from("document_variants").delete().in("id", removedVariantIds);
        if (removeError) throw removeError;
      }

      for (const [index, draft] of form.variants.entries()) {
        let variantId = draft.id;
        const label = draft.label.trim();
        if (!label) continue;

        const variantPrice = Math.max(0, Number(draft.price) || 0);
        const desiredBucket = variantPrice > 0 ? "paid-documents" : "free-documents";
        let variantFilePath = draft.existingFilePath;
        let variantFileBucket = draft.existingFileBucket;

        if (draft.productFile) {
          if (draft.productFile.size > 50 * 1024 * 1024) {
            throw new Error("Level files must be 50 MB or smaller.");
          }
          const path = `products/${documentId}/levels/${crypto.randomUUID()}-${draft.productFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          const { error: uploadError } = await client.storage
            .from(desiredBucket)
            .upload(path, draft.productFile, {
              upsert: false,
              contentType: draft.productFile.type || "application/octet-stream",
              cacheControl: "31536000",
            });
          if (uploadError) throw uploadError;
          variantFilePath = path;
          variantFileBucket = desiredBucket;
        } else if (!variantFilePath && index === 0 && filePath) {
          // The first level automatically uses the main product upload.
          // This is safe only when the level's free/paid access matches the
          // main product's storage bucket.
          const mainBucket = form.is_free ? "free-documents" : "paid-documents";
          if (desiredBucket === mainBucket) {
            variantFilePath = filePath;
            variantFileBucket = mainBucket;
          }
        }

        if (!variantFilePath || !variantFileBucket) {
          throw new Error(
            index === 0
              ? "The first level needs a file. It can use the main product file automatically when its price matches the product access type."
              : "Each additional level needs its own downloadable file."
          );
        }

        if (variantFileBucket !== desiredBucket) {
          throw new Error(
            `Level "${label}" needs a new file upload because its ${variantPrice > 0 ? "paid" : "free"} access type does not match its current file storage.`
          );
        }

        const variantPayload = {
          document_id: documentId,
          label,
          price: variantPrice,
          enabled: draft.enabled,
          sort_order: index,
          file_path: variantFilePath,
          file_bucket: variantFileBucket,
        };

        if (variantId) {
          const { error: updateError } = await client.from("document_variants").update(variantPayload).eq("id", variantId);
          if (updateError) throw updateError;
        } else {
          const { data, error: insertError } = await client.from("document_variants").insert(variantPayload).select("id").single();
          if (insertError || !data) throw insertError ?? new Error("Could not create product option.");
          variantId = data.id;
        }

        if (!variantId) throw new Error("Could not determine the product option ID.");
        await uploadImages(client, draft.imageFiles, documentId, variantId);
      }

      await uploadImages(client, form.galleryFiles, documentId, null);
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function removeImage(image: DocumentImage) {
    const client = getSupabaseClient();
    if (!client) return;
    const issue = await requireAdmin(client);
    if (issue) { setError(issue); return; }
    const { data: { session } } = await client.auth.getSession();
    if (!session?.access_token) {
      setError("Your admin session has expired. Please sign in again.");
      return;
    }

    const response = await fetch("/api/admin/document-images", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ imageId: image.id }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error || "Could not remove product image.");
      return;
    }

    setForm(f => ({
      ...f,
      existingGeneralImages: f.existingGeneralImages.filter(i => i.id !== image.id),
      variants: f.variants.map(v => ({ ...v, existingImages: v.existingImages.filter(i => i.id !== image.id) })),
    }));
    await load();
  }

  function effectiveDownloadCount(doc: MarketplaceDocument) {
    return Math.max(0, Number(doc.download_count ?? 0) + Number(doc.download_count_adjustment ?? 0));
  }

  async function adjustDownloadCount(doc: MarketplaceDocument, delta: number) {
    const client = getSupabaseClient();
    if (!client) return;
    const issue = await requireAdmin(client);
    if (issue) { setError(issue); return; }
    const actual = Number(doc.download_count ?? 0);
    const adjustment = Number(doc.download_count_adjustment ?? 0);
    const currentDisplayed = Math.max(0, actual + adjustment);
    if (delta < 0 && currentDisplayed <= 0) return;
    const { error: updateError } = await client.from("documents").update({
      download_count_adjustment: adjustment + delta,
    }).eq("id", doc.id);
    if (updateError) setError(updateError.message);
    else await load();
  }

  async function resetDownloadCount(doc: MarketplaceDocument) {
    const client = getSupabaseClient();
    if (!client) return;
    const issue = await requireAdmin(client);
    if (issue) { setError(issue); return; }
    const { error: updateError } = await client.from("documents").update({
      download_count_adjustment: 0,
    }).eq("id", doc.id);
    if (updateError) setError(updateError.message);
    else await load();
  }

  async function deleteDocument(doc: MarketplaceDocument) {
    if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    const client = getSupabaseClient();
    if (!client) return;
    const issue = await requireAdmin(client);
    if (issue) { setError(issue); return; }

    const images = allImages.filter(i => i.document_id === doc.id);
    if (images.length) await client.storage.from("thumbnails").remove(images.map(i => i.image_path));
    if (doc.thumbnail_path) await client.storage.from("thumbnails").remove([doc.thumbnail_path]);
    if (doc.file_path) await client.storage.from(doc.is_free ? "free-documents" : "paid-documents").remove([doc.file_path]);
    const { error: deleteError } = await client.from("documents").delete().eq("id", doc.id);
    if (deleteError) setError(deleteError.message);
    else await load();
  }

  async function togglePublished(doc: MarketplaceDocument) {
    const client = getSupabaseClient();
    if (!client) return;
    const issue = await requireAdmin(client);
    if (issue) { setError(issue); return; }
    await client.from("documents").update({ published: !doc.published }).eq("id", doc.id);
    await load();
  }

  function addVariant() {
    setForm(f => ({
      ...f,
      variants: [
        ...f.variants,
        {
          label: "",
          price: "",
          enabled: true,
          imageFiles: [],
          productFile: null,
          existingFilePath: null,
          existingFileBucket: null,
          existingImages: [],
        },
      ],
    }));
  }

  function removeVariant(index: number) {
    setForm(f => ({ ...f, variants: f.variants.filter((_, i) => i !== index) }));
  }

  function updateVariant(index: number, patch: Partial<DraftVariant>) {
    setForm(f => ({ ...f, variants: f.variants.map((v, i) => i === index ? { ...v, ...patch } : v) }));
  }

  async function toggleReview(review: DocumentReview) {
    const client = getSupabaseClient();
    if (!client) return;
    const issue = await requireAdmin(client);
    if (issue) { setError(issue); return; }
    const { error: updateError } = await client
      .from("document_reviews")
      .update({ approved: !review.approved })
      .eq("id", review.id);
    if (updateError) setError(updateError.message);
    else await load();
  }

  async function saveReview(review: DocumentReview) {
    const client = getSupabaseClient();
    if (!client) return;
    const issue = await requireAdmin(client);
    if (issue) { setError(issue); return; }

    const name = review.name.normalize("NFKC").trim().replace(/\s+/g, " ");
    const comment = review.comment.normalize("NFKC").trim().replace(/\s+/g, " ");

    if (
      !name ||
      name.length > 80 ||
      !comment ||
      comment.length > 500 ||
      /[<>]|https?:\/\/|www\.|javascript:|data:|\b[\w-]+\.[a-z]{2,}\b/i.test(name + " " + comment)
    ) {
      setError("Review contains invalid text.");
      return;
    }

    const { error: updateError } = await client
      .from("document_reviews")
      .update({
        name,
        comment,
        rating: Math.min(5, Math.max(1, review.rating)),
      })
      .eq("id", review.id);

    if (updateError) setError(updateError.message);
    else {
      setEditingReview(null);
      await load();
    }
  }

  async function deleteReview(review: DocumentReview) {
    if (!window.confirm("Delete this review permanently?")) return;
    const client = getSupabaseClient();
    if (!client) return;
    const issue = await requireAdmin(client);
    if (issue) { setError(issue); return; }

    const { error: deleteError } = await client
      .from("document_reviews")
      .delete()
      .eq("id", review.id);

    if (deleteError) setError(deleteError.message);
    else await load();
  }

  function updateReview(reviewId: string, patch: Partial<DocumentReview>) {
    setReviews(rs => rs.map(r => r.id === reviewId ? { ...r, ...patch } : r));
  }

  return (
    <section className="mt-10 rounded-3xl border border-line bg-white/10 p-5 sm:p-7">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Marketplace CMS</p>
        <h2 className="mt-1 font-display text-2xl text-ink">{form.id ? "Edit product" : "Add product"}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Build a product-style document page with product type, optional levels, separate prices, download control and multiple gallery images.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-7 grid gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div />
          <Field label="Product type">
            <select value={form.product_type} onChange={e => setForm(f => ({ ...f, product_type: e.target.value }))} className="admin-input">
              {productTypes.map(type => <option key={type.id} value={type.slug}>{type.name}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="English title">
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="admin-input" />
          </Field>
          <Field label="Somali title">
            <input value={form.title_so} onChange={e => setForm(f => ({ ...f, title_so: e.target.value }))} className="admin-input" placeholder="Cinwaanka Af-Soomaaliga" />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="English description">
            <textarea rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="admin-input" />
          </Field>
          <Field label="Somali description">
            <textarea rows={4} value={form.description_so} onChange={e => setForm(f => ({ ...f, description_so: e.target.value }))} className="admin-input" placeholder="Sharaxaadda Af-Soomaaliga" />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Category">
            <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className="admin-input">
              <option value="">No category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Base price (USD)">
            <input type="number" min="0" step="0.01" disabled={form.is_free} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="admin-input disabled:opacity-50" />
          </Field>
          <div>
            <span className="text-sm text-muted">Access</span>
            <div className="mt-1 flex gap-2">
              <button type="button" onClick={() => setForm(f => ({ ...f, is_free: true }))} className={`focus-ring flex-1 rounded-lg border px-3 py-2 text-sm ${form.is_free ? "border-ink bg-ink text-paper" : "border-line text-ink"}`}>Free</button>
              <button type="button" onClick={() => setForm(f => ({ ...f, is_free: false }))} className={`focus-ring flex-1 rounded-lg border px-3 py-2 text-sm ${!form.is_free ? "border-ink bg-ink text-paper" : "border-line text-ink"}`}>Paid</button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between rounded-xl border border-line p-4 text-sm text-ink">
            <span><strong>Downloads</strong><span className="block text-xs text-muted">Allow customers to download this product.</span></span>
            <input type="checkbox" checked={form.download_enabled} onChange={e => setForm(f => ({ ...f, download_enabled: e.target.checked }))} />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-line p-4 text-sm text-ink">
            <span><strong>Published</strong><span className="block text-xs text-muted">Visible in the marketplace.</span></span>
            <input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} />
          </label>
        </div>

        <div className="rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-medium text-ink">Levels / product options</h3>
              <p className="text-xs text-muted">
                Add A1, A2, B1 … C1 or any product option. A level can have its own custom price even when the whole document is Free.
              </p>
            </div>
            <button type="button" onClick={addVariant} className="focus-ring rounded-full border border-line px-4 py-2 text-xs text-ink">+ Add level</button>
          </div>

          {form.variants.length > 0 && (
            <div className="mt-4 grid gap-3">
              {form.variants.map((v, index) => (
                <div key={v.id ?? `new-${index}`} className="rounded-xl border border-line/70 p-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_150px_auto]">
                    <input placeholder="A1 / A2 / Full bundle" value={v.label} onChange={e => updateVariant(index, { label: e.target.value })} className="admin-input" />
                    <label className="block">
                      <span className="mb-1 block text-[11px] text-muted">Custom price (USD)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={v.price}
                        placeholder="0.00"
                        onChange={e => updateVariant(index, { price: e.target.value })}
                        className="admin-input"
                      />
                    </label>
                    <button type="button" onClick={() => removeVariant(index)} className="focus-ring rounded-lg border border-red-200 px-3 py-2 text-xs text-red-700">Remove</button>
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={v.enabled} onChange={e => updateVariant(index, { enabled: e.target.checked })} /> Show this option</label>

                  <div className="mt-4 rounded-lg border border-line/70 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Downloadable file for this level
                    </p>
                    {v.existingFilePath ? (
                      <p className="mt-1 break-all text-xs text-ink">
                        Current file: <strong>{v.existingFilePath.split("/").pop()}</strong>
                      </p>
                    ) : index === 0 ? (
                      <p className="mt-1 text-xs leading-5 text-muted">
                        The first level will use the main Product file automatically when its price has the same Free/Paid access type.
                      </p>
                    ) : (
                      <p className="mt-1 text-xs leading-5 text-muted">
                        Upload the specific file customers should receive when they choose this level.
                      </p>
                    )}
                    <input
                      type="file"
                      accept="*/*"
                      required={index > 0 && !v.existingFilePath}
                      onChange={e => updateVariant(index, { productFile: e.target.files?.[0] ?? null })}
                      className="mt-3 w-full text-xs text-ink"
                    />
                    {v.productFile && (
                      <p className="mt-1 text-xs text-ink">
                        Selected: <strong>{v.productFile.name}</strong>
                      </p>
                    )}
                  </div>

                  <div className="mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Level images</p>
                    <input type="file" accept="image/*" multiple onChange={e => updateVariant(index, { imageFiles: Array.from(e.target.files ?? []) })} className="mt-2 w-full text-xs text-ink" />
                    {v.existingImages.length > 0 && (
                      <div className="mt-3 flex gap-2 overflow-x-auto">
                        {v.existingImages.map(image => <ImageThumb key={image.id} image={image} onRemove={() => removeImage(image)} />)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={`Cover / thumbnail ${form.existingThumbnailPath ? "(leave blank to keep current)" : ""}`}>
            <input type="file" accept="image/*" onChange={e => setForm(f => ({ ...f, thumbnailFile: e.target.files?.[0] ?? null }))} className="w-full text-sm text-ink" />
          </Field>
          <Field label={`Product file ${form.existingFilePath ? "(leave blank to keep current)" : ""}`}>
            <input
              type="file"
              accept="*/*"
              onChange={e => setForm(f => ({ ...f, productFile: e.target.files?.[0] ?? null }))}
              className="w-full text-sm text-ink"
            />
            <p className="mt-2 text-xs leading-5 text-muted">
              Upload any shareable file up to 50 MB — PDF, Word (.doc/.docx), Excel, Google Sheets exported as .xlsx/.csv, PowerPoint, audio/voice (.mp3/.m4a/.wav), ZIP, images, and more.
            </p>
            {form.productFile && (
              <p className="mt-1 text-xs text-ink">
                Selected: <strong>{form.productFile.name}</strong>
              </p>
            )}
          </Field>
        </div>

        <Field label="Additional product images (multiple)">
          <input type="file" accept="image/*" multiple onChange={e => setForm(f => ({ ...f, galleryFiles: Array.from(e.target.files ?? []) }))} className="w-full text-sm text-ink" />
          {form.existingGeneralImages.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {form.existingGeneralImages.map(image => <ImageThumb key={image.id} image={image} onRemove={() => removeImage(image)} />)}
            </div>
          )}
        </Field>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={saving} className="focus-ring rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper disabled:opacity-50">{saving ? "Saving…" : form.id ? "Save product" : "Create product"}</button>
          {form.id && <button type="button" onClick={resetForm} className="focus-ring rounded-full border border-line px-6 py-3 text-sm text-ink">Cancel</button>}
        </div>
      </form>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-line p-4">
          <h3 className="font-medium text-ink">Categories</h3>
          <p className="mt-1 text-xs text-muted">Add categories here. New categories immediately appear in the public marketplace.</p>
          <div className="mt-3 flex gap-2">
            <input
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              placeholder="e.g. Health"
              maxLength={80}
              className="admin-input"
            />
            <button type="button" onClick={async () => {
              const name = newCategoryName.trim().replace(/\s+/g, " ");
              if (!name) return;
              const slug = name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
              if (!slug) { setError("Category name must contain letters or numbers."); return; }
              const client = getSupabaseClient();
              if (!client) return;
              const issue = await requireAdmin(client);
              if (issue) { setError(issue); return; }
              const { error: insertError } = await client.from("categories").insert({ name, slug });
              if (insertError) { setError(insertError.code === "23505" ? "That category already exists." : insertError.message); return; }
              setNewCategoryName("");
              await load();
            }} className="focus-ring shrink-0 rounded-full bg-ink px-4 py-2 text-xs text-paper">Add</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map(category => <span key={category.id} className="rounded-full border border-line px-3 py-1 text-xs text-muted">{category.name}</span>)}
          </div>
        </div>

        <div className="rounded-2xl border border-line p-4">
          <h3 className="font-medium text-ink">Product types</h3>
          <p className="mt-1 text-xs text-muted">Add types such as Quiz, Notes, Checklist or any product format.</p>
          <div className="mt-3 flex gap-2">
            <input
              value={newProductTypeName}
              onChange={e => setNewProductTypeName(e.target.value)}
              placeholder="e.g. Quiz"
              maxLength={80}
              className="admin-input"
            />
            <button type="button" onClick={async () => {
              const name = newProductTypeName.trim().replace(/\s+/g, " ");
              if (!name) return;
              const slug = name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
              if (!slug) { setError("Product type name must contain letters or numbers."); return; }
              const client = getSupabaseClient();
              if (!client) return;
              const issue = await requireAdmin(client);
              if (issue) { setError(issue); return; }
              const { error: insertError } = await client.from("product_types").insert({ name, slug });
              if (insertError) { setError(insertError.code === "23505" ? "That product type already exists." : insertError.message); return; }
              setNewProductTypeName("");
              await load();
            }} className="focus-ring shrink-0 rounded-full bg-ink px-4 py-2 text-xs text-paper">Add</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {productTypes.map(type => <span key={type.id} className="rounded-full border border-line px-3 py-1 text-xs text-muted">{type.name}</span>)}
          </div>
        </div>
      </div>

      <div className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div><h3 className="font-display text-xl text-ink">Products</h3><p className="text-xs text-muted">{documents.length} total</p></div>
        </div>
        {loading ? <p className="mt-4 text-sm text-muted">Loading…</p> : (
          <div className="relative mt-4">
            {documents.length > 1 && (
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted">
                  Swipe left/right or use the arrows
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => scrollProducts("left")}
                    className="focus-ring grid h-9 w-9 place-items-center rounded-full border border-line text-lg text-ink transition-colors hover:border-ink"
                    aria-label="Previous product"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollProducts("right")}
                    className="focus-ring grid h-9 w-9 place-items-center rounded-full border border-line text-lg text-ink transition-colors hover:border-ink"
                    aria-label="Next product"
                  >
                    →
                  </button>
                </div>
              </div>
            )}

            <div
              ref={productsCarouselRef}
              className="flex gap-4 overflow-x-auto overflow-y-hidden scroll-smooth snap-x snap-mandatory pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
            {documents.map(doc => {
              const docVariants = allImages.filter(i => i.document_id === doc.id);
              return (
                <div key={doc.id} className="w-[88%] shrink-0 snap-center rounded-2xl border border-line p-4 sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h4 className="font-medium text-ink">{doc.title}</h4>
                      <p className="mt-1 text-xs text-muted">{doc.product_type} · {doc.is_free ? "Free" : `${doc.price.toFixed(2)}`} · {docVariants.length} gallery image{docVariants.length === 1 ? "" : "s"} · {effectiveDownloadCount(doc)} downloads</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] ${doc.published ? "bg-pine-light text-pine-dark" : "bg-line text-muted"}`}>{doc.published ? "Published" : "Hidden"}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => startEdit(doc)} className="focus-ring rounded-full border border-line px-4 py-2 text-xs">Edit</button>
                    <button type="button" onClick={() => togglePublished(doc)} className="focus-ring rounded-full border border-line px-4 py-2 text-xs">{doc.published ? "Hide" : "Publish"}</button>
                    <button type="button" onClick={() => adjustDownloadCount(doc, -1)} disabled={effectiveDownloadCount(doc) <= 0} className="focus-ring rounded-full border border-line px-3 py-2 text-xs disabled:opacity-40">− Download</button>
                    <button type="button" onClick={() => adjustDownloadCount(doc, 1)} className="focus-ring rounded-full border border-line px-3 py-2 text-xs">+ Download</button>
                    <button type="button" onClick={() => resetDownloadCount(doc)} disabled={!doc.download_count_adjustment} className="focus-ring rounded-full border border-line px-3 py-2 text-xs disabled:opacity-40">Reset to actual</button>
                    <button type="button" onClick={() => deleteDocument(doc)} className="focus-ring rounded-full border border-red-200 px-4 py-2 text-xs text-red-700">Delete</button>
                  </div>
                  <p className="mt-2 text-[11px] text-muted">
                    Actual downloads: {doc.download_count} · Displayed: {effectiveDownloadCount(doc)}
                    {doc.download_count_adjustment ? ` · Manual adjustment: ${doc.download_count_adjustment > 0 ? "+" : ""}${doc.download_count_adjustment}` : ""}
                  </p>

                  <div className="mt-4 border-t border-line/70 pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Product reviews</p>
                        <p className="mt-1 text-xs text-muted">
                          {reviews.filter(r => r.document_id === doc.id).length} review{reviews.filter(r => r.document_id === doc.id).length === 1 ? "" : "s"}
                        </p>
                      </div>
                      {reviews.filter(r => r.document_id === doc.id).length > 0 && (
                        <p className="shrink-0 text-[10px] text-muted">Swipe left/right →</p>
                      )}
                    </div>

                    {reviews.filter(r => r.document_id === doc.id).length > 0 ? (
                      <div className="-mx-1 mt-3 flex gap-3 overflow-x-auto px-1 pb-2 snap-x snap-mandatory">
                        {reviews.filter(r => r.document_id === doc.id).map(review => (
                          <article
                            key={review.id}
                            className="w-[280px] shrink-0 snap-start rounded-xl border border-line/70 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                {editingReview === review.id ? (
                                  <input
                                    value={review.name}
                                    onChange={e => updateReview(review.id, { name: e.target.value })}
                                    maxLength={80}
                                    className="admin-input"
                                  />
                                ) : (
                                  <h5 className="font-medium text-ink">{review.name}</h5>
                                )}
                                <p className="mt-1 text-xs text-ink">
                                  {"★".repeat(review.rating)}
                                  <span className="text-muted">{"★".repeat(5 - review.rating)}</span>
                                </p>
                              </div>
                              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] ${review.approved ? "bg-pine-light text-pine-dark" : "bg-line text-muted"}`}>
                                {review.approved ? "Visible" : "Hidden"}
                              </span>
                            </div>

                            {editingReview === review.id ? (
                              <textarea
                                maxLength={500}
                                rows={4}
                                value={review.comment}
                                onChange={e => updateReview(review.id, { comment: e.target.value })}
                                className="admin-input mt-3"
                              />
                            ) : (
                              <p className="mt-3 max-h-20 overflow-y-auto text-xs leading-5 text-muted">
                                {review.comment}
                              </p>
                            )}

                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => toggleReview(review)}
                                className="focus-ring rounded-full border border-line px-3 py-1.5 text-[10px]"
                              >
                                {review.approved ? "Hide" : "Approve"}
                              </button>
                              {editingReview === review.id ? (
                                <button
                                  type="button"
                                  onClick={() => saveReview(review)}
                                  className="focus-ring rounded-full bg-ink px-3 py-1.5 text-[10px] text-paper"
                                >
                                  Save
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setEditingReview(review.id)}
                                  className="focus-ring rounded-full border border-line px-3 py-1.5 text-[10px]"
                                >
                                  Edit
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => deleteReview(review)}
                                className="focus-ring rounded-full border border-red-200 px-3 py-1.5 text-[10px] text-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-muted">No reviews for this product yet.</p>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .admin-input { width: 100%; border: 1px solid var(--line); border-radius: .65rem; background: rgba(255,255,255,.6); padding: .65rem .75rem; font-size: .875rem; color: var(--ink); }
      `}</style>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-sm text-muted">{label}</span><span className="mt-1 block">{children}</span></label>;
}

function ImageThumb({ image, onRemove }: { image: DocumentImage; onRemove: () => void }) {
  const url = getThumbnailUrl(image.image_path);
  if (!url) return null;
  return (
    <div className="relative shrink-0">
      <img src={url} alt={image.alt_text ?? ""} className="h-20 w-20 rounded-lg object-cover" />
      <button type="button" onClick={onRemove} className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-paper" aria-label="Remove image">×</button>
    </div>
  );
}
