export default function Hero() {
  return (
    <section
      id="home"
      className="mx-auto grid max-w-content gap-12 px-6 pb-20 pt-16 md:grid-cols-[1.2fr_1fr] md:items-center md:pb-28 md:pt-24"
    >
      <div>
        <p className="text-sm text-muted">
          Developer · Creative · AI &amp; Digital Media
        </p>
        <h1 className="mt-4 font-display text-4xl leading-[1.05] text-ink sm:text-5xl md:text-6xl">
          Salmaan Mukhtaar Xaashi
        </h1>
        <p className="mt-2 text-lg text-muted">
          Senior Computer Science Student
        </p>
        <p className="mt-6 max-w-md text-base leading-relaxed text-ink/80">
          Computer Science student at the University of Hargeisa combining
          technology, creativity, programming, design, and AI-driven digital
          experiences.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <a
            href="#projects"
            className="focus-ring rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-ink/85"
          >
            Explore My Work
          </a>
          <a
            href="/marketplace"
            className="focus-ring rounded-full border border-line px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-ink"
          >
            Document Marketplace →
          </a>
        </div>
      </div>

      {/* Abstract mark standing in for a portrait — structural, not decorative */}
      <div className="relative mx-auto aspect-square w-full max-w-xs md:max-w-sm">
        <svg
          viewBox="0 0 320 320"
          fill="none"
          className="h-full w-full"
          aria-hidden="true"
        >
          <rect
            x="20"
            y="20"
            width="200"
            height="200"
            rx="16"
            className="stroke-line"
            strokeWidth="1.5"
          />
          <rect
            x="100"
            y="100"
            width="200"
            height="200"
            rx="16"
            fill="#EAF1EE"
          />
          <circle cx="120" cy="120" r="6" className="fill-pine" />
          <path
            d="M100 220 L220 100"
            className="stroke-gold"
            strokeWidth="2"
            strokeDasharray="4 6"
          />
          <text
            x="132"
            y="230"
            className="fill-ink font-display"
            fontSize="86"
          >
            S
          </text>
        </svg>
      </div>
    </section>
  );
}
