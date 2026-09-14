export default function Education() {
  return (
    <section
      id="education"
      className="mx-auto max-w-content border-t border-line px-6 py-20"
    >
      <h2 className="font-display text-3xl text-ink">Education</h2>

      <div className="mt-10 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:border-l sm:border-line sm:pl-6">
        <div>
          <h3 className="text-lg font-medium text-ink">
            University of Hargeisa
          </h3>
          <p className="mt-1 text-sm text-muted">
            Bachelor&apos;s Degree in Computer Science
          </p>
        </div>
        <p className="text-sm text-muted">
          2023 – 2027 · Senior, expected graduation 2027
        </p>
      </div>
    </section>
  );
}
