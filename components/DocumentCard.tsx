import type { MarketplaceDocument } from "@/data/documents";

export default function DocumentCard({ doc }: { doc: MarketplaceDocument }) {
  const isFree = doc.price === 0;

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-line p-6">
      <div>
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">
            {doc.category}
          </span>
          <span className="text-xs uppercase tracking-wide text-muted">
            {doc.fileType}
          </span>
        </div>

        <h3 className="mt-4 font-display text-lg text-ink">{doc.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink/80">
          {doc.description}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <span className="text-sm font-medium text-ink">
          {isFree ? "Free" : `$${doc.price.toFixed(2)}`}
        </span>
        <button
          type="button"
          className={`focus-ring rounded-full px-5 py-2 text-sm font-medium text-paper transition-colors ${
            isFree ? "bg-pine hover:bg-pine-dark" : "bg-gold hover:opacity-90"
          }`}
        >
          {isFree ? "Download" : "Buy Now"}
        </button>
      </div>
    </div>
  );
}
