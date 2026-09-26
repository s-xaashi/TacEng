"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Category, MarketplaceDocument, ProductType } from "@/lib/supabase/types";
import DocumentCard from "@/components/DocumentCard";
import { useLanguage } from "@/components/LanguageProvider";
import MarketplaceAdPopup from "@/components/MarketplaceAdPopup";

export default function MarketplacePage() {
  const { locale, setLocale, t } = useLanguage();

  function toggleLanguage() {
    setLocale(locale === "en" ? "so" : "en");
  }
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [categories, setCategories] = useState<Category[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [documents, setDocuments] = useState<MarketplaceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError(
        "Marketplace isn't configured yet — Supabase environment variables are missing."
      );
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      const [
        { data: cats, error: catErr },
        { data: docs, error: docErr },
        { data: types, error: typeErr },
        { data: variants, error: variantErr },
        { data: images, error: imageErr },
        { data: reviews, error: reviewErr },
      ] = await Promise.all([
        supabase!.from("categories").select("id, name, slug").order("name"),
        supabase!
          .from("documents")
          .select("id, title, description, title_en, description_en, title_so, description_so, category_id, file_path, thumbnail_path, price, is_free, payment_link, published, download_enabled, product_type, download_count, download_count_adjustment, created_at, updated_at")
          .eq("published", true)
          .order("created_at", { ascending: false }),
        supabase!.from("product_types").select("id, name, slug").order("name"),
        supabase!.from("document_variants").select("*").eq("enabled", true).order("sort_order"),
        supabase!.from("document_images").select("*").order("sort_order"),
        supabase!.from("document_reviews").select("*").eq("approved", true).order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;

      if (catErr || docErr || typeErr || variantErr || imageErr || reviewErr) {
        setError((catErr ?? docErr ?? typeErr ?? variantErr ?? imageErr ?? reviewErr)?.message ?? "Failed to load marketplace.");
      } else {
        setCategories(cats ?? []);
        setProductTypes(types ?? []);
        const variantRows = variants ?? [];
        const imageRows = images ?? [];
        const reviewRows = reviews ?? [];
        setDocuments(
          (docs ?? []).map((doc) => ({
            ...doc,
            variants: variantRows.filter((v) => v.document_id === doc.id),
            images: imageRows.filter((i) => i.document_id === doc.id),
            reviews: reviewRows.filter((r) => r.document_id === doc.id),
          }))
        );
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => {
      const slug = c.slug.toLowerCase();
      const label =
        locale === "so"
          ? slug === "books" ? t.marketplace.category.books
          : slug === "business" ? t.marketplace.category.business
          : slug === "computer-science" || slug === "computer_science" ? t.marketplace.category.computerScience
          : slug === "education" ? t.marketplace.category.education
          : slug === "other" ? t.marketplace.category.other
          : c.name
          : c.name;
      map.set(c.id, label);
    });
    return map;
  }, [categories, locale, t]);

  const productTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    productTypes.forEach(type => map.set(type.slug, type.name));
    return map;
  }, [productTypes]);

  const filtered = useMemo(() => {
    const tokens = query
      .trim()
      .toLocaleLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    return documents.filter((doc) => {
      const categoryName = doc.category_id ? categoryMap.get(doc.category_id) : undefined;
      const typeName = productTypeMap.get(doc.product_type) ?? doc.product_type;
      const matchesCategory =
        activeCategory === "all" || doc.category_id === activeCategory;

      const searchableText = [
        doc.title,
        doc.title_en,
        doc.title_so,
        doc.description,
        doc.description_en,
        doc.description_so,
        doc.product_type,
        typeName,
        categoryName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      const matchesQuery =
        tokens.length === 0 || tokens.every(token => searchableText.includes(token));

      return matchesCategory && matchesQuery;
    });
  }, [documents, query, activeCategory, categoryMap, productTypeMap]);

  return (
    <main className="mx-auto min-h-screen max-w-content px-6 py-12">
      <MarketplaceAdPopup />
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="focus-ring text-sm text-muted hover:text-ink">
          {t.marketplace.back}
        </Link>
        <button
          type="button"
          onClick={toggleLanguage}
          className="focus-ring rounded-full border border-line px-4 py-2 text-[10px] font-semibold uppercase tracking-[.12em] text-muted transition-colors hover:border-ink hover:text-ink"
          aria-label={`Switch to ${t.switchTo}`}
          title={`Switch to ${t.switchTo}`}
        >
          {locale === "en" ? "SO" : "EN"}
        </button>
      </div>

      <div className="mt-8">
        <h1 className="font-display text-4xl text-ink">
          {t.marketplace.title}
        </h1>
        <p className="mt-3 max-w-md text-base text-muted">
          {t.marketplace.intro}
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.marketplace.search}
          className="focus-ring w-full rounded-full border border-line bg-white/60 px-5 py-3 text-sm text-ink sm:max-w-sm"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={`focus-ring rounded-full border px-4 py-2 text-xs transition-colors ${
              activeCategory === "all"
                ? "border-ink bg-ink text-paper"
                : "border-line text-muted hover:border-ink hover:text-ink"
            }`}
          >
            {t.marketplace.all}
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.id)}
              className={`focus-ring rounded-full border px-4 py-2 text-xs transition-colors ${
                activeCategory === category.id
                  ? "border-ink bg-ink text-paper"
                  : "border-line text-muted hover:border-ink hover:text-ink"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="mt-16 text-center text-sm text-muted">{t.marketplace.loading}</p>
      ) : error ? (
        <p className="mt-16 text-center text-sm text-muted">{error}</p>
      ) : filtered.length > 0 ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              categoryName={
                doc.category_id ? categoryMap.get(doc.category_id) : undefined
              }
              productTypeName={productTypeMap.get(doc.product_type) ?? doc.product_type}
            />
          ))}
        </div>
      ) : (
        <p className="mt-16 text-center text-sm text-muted">
          {documents.length === 0
            ? t.marketplace.noDocuments
            : t.marketplace.noMatch}
        </p>
      )}
    </main>
  );
}
