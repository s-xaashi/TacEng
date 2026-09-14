"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { documents, type DocumentCategory } from "@/data/documents";
import DocumentCard from "@/components/DocumentCard";

const categories: DocumentCategory[] = [
  "Education",
  "Computer Science",
  "Business",
  "Books",
  "Other",
];

export default function MarketplacePage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<DocumentCategory | "All">(
    "All"
  );

  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      const matchesCategory =
        activeCategory === "All" || doc.category === activeCategory;
      const matchesQuery = doc.title
        .toLowerCase()
        .includes(query.trim().toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [query, activeCategory]);

  return (
    <main className="mx-auto min-h-screen max-w-content px-6 py-12">
      <Link
        href="/"
        className="focus-ring text-sm text-muted hover:text-ink"
      >
        ← Back to Portfolio
      </Link>

      <div className="mt-8">
        <h1 className="font-display text-4xl text-ink">
          Document Marketplace
        </h1>
        <p className="mt-3 max-w-md text-base text-muted">
          Find the documents and resources you need.
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documents..."
          className="focus-ring w-full rounded-full border border-line bg-white/60 px-5 py-3 text-sm text-ink sm:max-w-sm"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory("All")}
            className={`focus-ring rounded-full border px-4 py-2 text-xs transition-colors ${
              activeCategory === "All"
                ? "border-ink bg-ink text-paper"
                : "border-line text-muted hover:border-ink hover:text-ink"
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`focus-ring rounded-full border px-4 py-2 text-xs transition-colors ${
                activeCategory === category
                  ? "border-ink bg-ink text-paper"
                  : "border-line text-muted hover:border-ink hover:text-ink"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      ) : (
        <p className="mt-16 text-center text-sm text-muted">
          No documents match your search.
        </p>
      )}
    </main>
  );
}
