"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Category, MarketplaceDocument } from "@/lib/supabase/types";
import DocumentCard from "@/components/DocumentCard";
import { useLanguage } from "@/components/LanguageProvider";

export default function MarketplacePage() {
  const { locale, t } = useLanguage();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [categories, setCategories] = useState<Category[]>([]);
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
      const [{ data: cats, error: catErr }, { data: docs, error: docErr }] =
        await Promise.all([
          supabase!.from("categories").select("id, name, slug").order("name"),
          supabase!
            .from("documents")
            .select(
              "id, title, description, category_id, file_path, thumbnail_path, price, is_free, payment_link, published, download_count, created_at, updated_at"
            )
            .eq("published", true)
            .order("created_at", { ascending: false }),
        ]);

      if (cancelled) return;

      if (catErr || docErr) {
        setError((catErr ?? docErr)?.message ?? "Failed to load marketplace.");
      } else {
        setCategories(cats ?? []);
        setDocuments(docs ?? []);
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

  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      const categoryName = doc.category_id
        ? categoryMap.get(doc.category_id)
        : undefined;
      const matchesCategory =
        activeCategory === t.marketplace.all || categoryName === activeCategory;
      const matchesQuery = doc.title
        .toLowerCase()
        .includes(query.trim().toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [documents, query, activeCategory, categoryMap]);

  return (
    <main className="mx-auto min-h-screen max-w-content px-6 py-12">
      <Link href="/" className="focus-ring text-sm text-muted hover:text-ink">
        {t.marketplace.back}
      </Link>

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
            onClick={() => setActiveCategory(t.marketplace.all)}
            className={`focus-ring rounded-full border px-4 py-2 text-xs transition-colors ${
              activeCategory === "All"
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
              onClick={() => setActiveCategory(category.name)}
              className={`focus-ring rounded-full border px-4 py-2 text-xs transition-colors ${
                activeCategory === category.name
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
