"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/LanguageProvider";
import type { PortfolioProject } from "@/lib/projects";

type BilingualProject = PortfolioProject & {
  title_en: string;
  description_en: string | null;
  title_so: string | null;
  description_so: string | null;
};

export default function Projects() {
  const { locale, t } = useLanguage();
  const [projects, setProjects] = useState<BilingualProject[]>([]);
  const [activeProject, setActiveProject] = useState<BilingualProject | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseClient();
    if (!supabase) {
      setProjects([]);
      return;
    }

    supabase
      .from("projects")
      .select("id,title,description,title_en,description_en,title_so,description_so,tags,status,href,image_path,published")
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Failed to load projects:", error.message);
          return;
        }
        setProjects(
          (data ?? []).map((project) => ({
            ...project,
            image_url: project.image_path
              ? supabase.storage.from("thumbnails").getPublicUrl(project.image_path).data.publicUrl
              : null,
          })) as BilingualProject[],
        );
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = activeProject ? "hidden" : "";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveProject(null);
    };
    if (activeProject) window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeProject]);

  const move = (direction: number) =>
    ref.current?.scrollBy({
      left: direction * Math.min((ref.current.clientWidth || 0) * 0.86, 520),
      behavior: "smooth",
    });

  const titleFor = (project: BilingualProject) =>
    locale === "so"
      ? project.title_so || project.title_en || project.title
      : project.title_en || project.title;

  const descriptionFor = (project: BilingualProject) =>
    locale === "so"
      ? project.description_so ?? project.description_en ?? project.description
      : project.description_en ?? project.description;

  const statusFor = (project: BilingualProject) =>
    locale === "so"
      ? t.status[
          project.status === "Coming Soon"
            ? "comingSoon"
            : project.status === "In Progress"
              ? "inProgress"
              : "live"
        ]
      : project.status;

  return (
    <section id="projects" className="site-section section-divider">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="hand text-xl text-[#e45560]">{t.sections.featuredProjects}</p>
          <h2 className="mt-1 font-display text-4xl tracking-tight text-white sm:text-6xl">
            {t.sections.selectedWork}
          </h2>
        </div>
        <a href="/#contact" className="yellow-link hidden text-sm font-medium sm:block">
          {t.sections.haveProject}
        </a>
      </div>

      {projects.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-white/15 bg-white/[.02] p-10 text-center text-sm text-white/45">
          {t.sections.projectsEmpty}
        </div>
      ) : (
        <div className="projects-carousel-wrap relative mt-10">
          <div className="projects-carousel-actions flex gap-2">
            <button type="button" onClick={() => move(-1)} aria-label="Previous projects" className="project-nav-btn">←</button>
            <button type="button" onClick={() => move(1)} aria-label="Next projects" className="project-nav-btn">→</button>
          </div>

          <div ref={ref} className="projects-carousel" aria-label={t.sections.featuredProjects}>
            {projects.map((project, index) => {
              const title = titleFor(project);
              const description = descriptionFor(project);
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setActiveProject(project)}
                  className="project-slide project-card-trigger block h-full w-full text-left focus-ring"
                  aria-haspopup="dialog"
                  aria-label={(locale === "so" ? "Faahfaahin mashruuca: " : "View project details: ") + title}
                >
                  <article className="project-card ink-card group h-full overflow-hidden rounded-[1.45rem]">
                    <div className="relative aspect-[16/10] overflow-hidden bg-[#260b0d]">
                      {project.image_url ? (
                        <Image src={project.image_url} alt={title} fill sizes="(min-width: 1024px) 33vw, 88vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.06]" />
                      ) : (
                        <div className="absolute inset-0 project-placeholder"><span>{String(index + 1).padStart(2, "0")}</span></div>
                      )}
                      <div className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
                        {statusFor(project)}
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-display text-2xl text-white">{title}</h3>
                        {project.href && <span className="project-arrow text-lg text-[#d8e06b]">↗</span>}
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/55">{description}</p>
                      <ul className="mt-4 flex flex-wrap gap-2">
                        {project.tags.slice(0, 4).map((tag) => (
                          <li key={tag} className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/55">{tag}</li>
                        ))}
                      </ul>
                    </div>
                  </article>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeProject && typeof document !== "undefined" && createPortal(
        <div
          className="blog-modal fixed inset-0 z-[200] grid place-items-center overflow-hidden bg-black/80 p-3 backdrop-blur-md sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="project-detail-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveProject(null);
          }}
        >
          <article className="blog-reader relative flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem]">
            <button
              type="button"
              onClick={() => setActiveProject(null)}
              aria-label={locale === "so" ? "Xidh faahfaahinta mashruuca" : "Close project details"}
              className="blog-close absolute right-3 top-3 z-20 sm:right-4 sm:top-4"
            >×</button>

            <div className="blog-reader-scroll min-h-0 flex-1 overflow-y-auto">
              <div className="px-6 pb-8 pt-16 sm:px-10 sm:pb-10 sm:pt-20">
                {activeProject.image_url && (
                  <img src={activeProject.image_url} alt={titleFor(activeProject)} className="mb-8 max-h-[360px] w-full rounded-2xl object-cover" />
                )}
                <p className="hand text-xl text-[#e45560]">{locale === "so" ? "MASHRUUC" : "PROJECT"}</p>
                <h2 id="project-detail-title" className="mt-2 break-words font-display text-3xl leading-tight text-white sm:text-5xl">
                  {titleFor(activeProject)}
                </h2>
                <p className="mt-6 whitespace-pre-line break-words text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
                  {descriptionFor(activeProject) || (locale === "so" ? "Faahfaahin lama hayo." : "No description available.")}
                </p>

                {activeProject.tags.length > 0 && (
                  <ul className="mt-6 flex flex-wrap gap-2">
                    {activeProject.tags.map((tag) => (
                      <li key={tag} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/65">{tag}</li>
                    ))}
                  </ul>
                )}

                {activeProject.href && (
                  <div className="mt-8 border-t border-white/10 pt-6">
                    <p className="mb-2 text-xs uppercase tracking-[.18em] text-white/40">{locale === "so" ? "Xiriirka mashruuca" : "Project URL"}</p>
                    <a
                      href={activeProject.href}
                      target={/^https?:\/\//i.test(activeProject.href) ? "_blank" : undefined}
                      rel={/^https?:\/\//i.test(activeProject.href) ? "noopener noreferrer" : undefined}
                      className="break-all text-sm font-medium text-[#d8e06b] underline decoration-white/20 underline-offset-4 hover:decoration-[#d8e06b] sm:text-base"
                    >{activeProject.href}</a>
                    <div className="mt-5">
                      <a
                        href={activeProject.href}
                        target={/^https?:\/\//i.test(activeProject.href) ? "_blank" : undefined}
                        rel={/^https?:\/\//i.test(activeProject.href) ? "noopener noreferrer" : undefined}
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.04] px-5 py-3 text-sm font-semibold text-white transition hover:border-[#d8e06b]/50 hover:bg-white/[.08]"
                      >
                        {locale === "so" ? "Booqo mashruuca" : "Visit project"} <span aria-hidden="true">↗</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </article>
        </div>,
        document.body,
      )}
    </section>
  );
}
