import Image from "next/image";

export default function About() {
  return (
    <section
      id="about"
      className="mx-auto grid max-w-content gap-10 border-t border-line px-6 py-20 md:grid-cols-[1fr_1.4fr] md:gap-16"
    >
      <div>
        <div className="relative aspect-[4/5] w-full max-w-xs overflow-hidden rounded-2xl border border-line bg-pine-light">
          <Image
            src="/images/profile.jpg"
            alt="Salmaan Mukhtaar Xaashi"
            fill
            sizes="(min-width: 768px) 320px, 90vw"
            className="object-cover"
            priority
          />
        </div>
      </div>

      <div>
        <h2 className="font-display text-3xl text-ink">About Me</h2>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-ink/80">
          I am Salmaan, a senior Computer Science student with an ICT
          background and a strong interest in technology, creativity,
          design, programming, AI-driven advertising, and digital
          marketing. I enjoy combining technical skills with creative work
          to build useful digital experiences.
        </p>

        <dl className="mt-10 grid grid-cols-2 gap-6 sm:max-w-md">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">
              University
            </dt>
            <dd className="mt-1 text-sm text-ink">University of Hargeisa</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">
              Field
            </dt>
            <dd className="mt-1 text-sm text-ink">
              ICT &amp; Computer Science
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">
              Expected Graduation
            </dt>
            <dd className="mt-1 text-sm text-ink">2027</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">
              Based in
            </dt>
            <dd className="mt-1 text-sm text-ink">Hargeisa, Somalia</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
