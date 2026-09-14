import Link from "next/link";
import { projects } from "@/data/projects";

export default function Projects() {
  return (
    <section
      id="projects"
      className="mx-auto max-w-content border-t border-line px-6 py-20"
    >
      <h2 className="font-display text-3xl text-ink">Projects</h2>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const content = (
            <div className="flex h-full flex-col justify-between rounded-2xl border border-line p-6 transition-colors hover:border-ink">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-lg text-ink">
                    {project.title}
                  </h3>
                  <span className="whitespace-nowrap rounded-full bg-gold-light px-3 py-1 text-xs text-gold">
                    {project.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink/80">
                  {project.description}
                </p>
              </div>
              <ul className="mt-6 flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border border-line px-3 py-1 text-xs text-muted"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            </div>
          );

          return project.href ? (
            <Link key={project.id} href={project.href} className="focus-ring block h-full">
              {content}
            </Link>
          ) : (
            <div key={project.id}>{content}</div>
          );
        })}
      </div>
    </section>
  );
}
