import Link from "next/link";

export default function MarketplaceCTA() {
  return (
    <section className="border-t border-line bg-pine-dark">
      <div className="mx-auto max-w-content px-6 py-20 text-center">
        <h2 className="font-display text-3xl text-paper sm:text-4xl">
          Looking for a document?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base text-paper/80">
          Explore the document marketplace and find the resources you need.
        </p>
        <Link
          href="/marketplace"
          className="focus-ring mt-8 inline-block rounded-full bg-paper px-7 py-3 text-sm font-medium text-ink transition-opacity hover:opacity-90"
        >
          Visit Marketplace →
        </Link>
      </div>
    </section>
  );
}
