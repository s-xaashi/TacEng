const groups = [
  {
    label: "Technical",
    items: ["Computer Science", "Web Development", "Programming"],
  },
  {
    label: "Creative",
    items: ["Graphic Design", "Video Editing"],
  },
  {
    label: "Marketing & AI",
    items: ["AI-driven Advertising", "Social Media", "Digital Marketing"],
  },
];

export default function Skills() {
  return (
    <section
      id="skills"
      className="mx-auto max-w-content border-t border-line px-6 py-20"
    >
      <h2 className="font-display text-3xl text-ink">Skills</h2>

      <div className="mt-10 grid gap-10 sm:grid-cols-3">
        {groups.map((group) => (
          <div key={group.label}>
            <h3 className="text-xs uppercase tracking-wide text-muted">
              {group.label}
            </h3>
            <ul className="mt-4 space-y-3 border-l border-line pl-4">
              {group.items.map((item) => (
                <li key={item} className="text-base text-ink">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
