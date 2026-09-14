"use client";

export default function Contact() {
  return (
    <section
      id="contact"
      className="mx-auto max-w-content border-t border-line px-6 py-20"
    >
      <h2 className="font-display text-3xl text-ink">Contact</h2>
      <p className="mt-4 max-w-md text-base leading-relaxed text-ink/80">
        Interested in working together or have a question? Reach out below.
      </p>

      {/* Placeholder contact details — replace with real info */}
      <div className="mt-8 flex flex-col gap-2 text-sm text-ink">
        <p>
          Email:{" "}
          <span className="text-muted">your.email@example.com</span>
        </p>
        <p>
          Location: <span className="text-muted">Hargeisa, Somalia</span>
        </p>
      </div>

      {/* Frontend-only form — not yet wired to a backend */}
      <form className="mt-10 grid max-w-lg gap-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="name" className="text-sm text-muted">
            Name
          </label>
          <input
            id="name"
            type="text"
            className="focus-ring mt-1 w-full rounded-md border border-line bg-white/60 px-3 py-2 text-sm text-ink"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="email" className="text-sm text-muted">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="focus-ring mt-1 w-full rounded-md border border-line bg-white/60 px-3 py-2 text-sm text-ink"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="message" className="text-sm text-muted">
            Message
          </label>
          <textarea
            id="message"
            rows={4}
            className="focus-ring mt-1 w-full rounded-md border border-line bg-white/60 px-3 py-2 text-sm text-ink"
            placeholder="How can I help?"
          />
        </div>
        <button
          type="submit"
          className="focus-ring mt-2 w-fit rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-ink/85"
        >
          Send Message
        </button>
      </form>
    </section>
  );
}
