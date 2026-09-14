const responsibilities = [
  "Edited and optimized promotional videos for social media and advertising campaigns.",
  "Used AI tools such as Flow AI to create advertising video content.",
  "Designed marketing visuals and branding materials.",
  "Contributed to social media, marketing, communication, and creative content.",
];

export default function Experience() {
  return (
    <section
      id="experience"
      className="mx-auto max-w-content border-t border-line px-6 py-20"
    >
      <h2 className="font-display text-3xl text-ink">Experience</h2>

      <div className="mt-10 grid gap-6 rounded-2xl border border-line bg-white/40 p-8 sm:grid-cols-[1fr_2fr] sm:gap-10">
        <div>
          <h3 className="text-lg font-medium text-ink">Casri Care</h3>
          <p className="mt-1 text-sm text-muted">
            Social Media Manager / Creative Team Member
          </p>
          <p className="mt-3 text-sm text-muted">2022 – 2025</p>
        </div>

        <ul className="space-y-3">
          {responsibilities.map((item) => (
            <li
              key={item}
              className="relative pl-5 text-sm leading-relaxed text-ink/80"
            >
              <span className="absolute left-0 top-[0.55em] h-1 w-1 rounded-full bg-pine" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
