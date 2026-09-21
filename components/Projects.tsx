"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/LanguageProvider";
import type { PortfolioProject } from "@/lib/projects";

type BilingualProject=PortfolioProject & { title_en:string; description_en:string|null; title_so:string|null; description_so:string|null };

export default function Projects(){
  const {locale,t}=useLanguage();
  const [projects,setProjects]=useState<BilingualProject[]>([]);
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    let active=true; const supabase=getSupabaseClient(); if(!supabase){setProjects([]);return;}
    supabase.from("projects").select("id,title,description,title_en,description_en,title_so,description_so,tags,status,href,image_path,published")
      .eq("published",true).order("sort_order",{ascending:true}).order("created_at",{ascending:false})
      .then(({data,error})=>{if(!active)return;if(error){console.error("Failed to load projects:",error.message);return;}setProjects((data??[]).map(p=>({...p,image_url:p.image_path?supabase.storage.from("thumbnails").getPublicUrl(p.image_path).data.publicUrl:null})) as BilingualProject[])});
    return()=>{active=false};
  },[]);
  const move=(dir:number)=>ref.current?.scrollBy({left:dir*Math.min(ref.current.clientWidth*.86,520),behavior:"smooth"});
  return <section id="projects" className="site-section section-divider">
    <div className="flex items-end justify-between gap-6"><div><p className="hand text-xl text-[#e45560]">{t.sections.featuredProjects}</p><h2 className="mt-1 font-display text-4xl tracking-tight text-white sm:text-6xl">{t.sections.selectedWork}</h2></div><a href="/#contact" className="yellow-link hidden text-sm font-medium sm:block">{t.sections.haveProject}</a></div>
    {projects.length===0?<div className="mt-10 rounded-3xl border border-dashed border-white/15 bg-white/[.02] p-10 text-center text-sm text-white/45">{t.sections.projectsEmpty}</div>:<div className="projects-carousel-wrap relative mt-10"><div className="projects-carousel-actions flex gap-2"><button type="button" onClick={()=>move(-1)} aria-label="Previous projects" className="project-nav-btn">←</button><button type="button" onClick={()=>move(1)} aria-label="Next projects" className="project-nav-btn">→</button></div><div ref={ref} className="projects-carousel" aria-label={t.sections.featuredProjects}>{projects.map((p,i)=>{const title=locale==="so"?(p.title_so||p.title_en||p.title):(p.title_en||p.title);const description=locale==="so"?(p.description_so??p.description_en??p.description):(p.description_en??p.description);const status=locale==="so"?t.status[p.status==="Coming Soon"?"comingSoon":p.status==="In Progress"?"inProgress":"live"]:p.status;const card=<article className="project-card ink-card group h-full overflow-hidden rounded-[1.45rem]"><div className="relative aspect-[16/10] overflow-hidden bg-[#260b0d]">{p.image_url?<Image src={p.image_url} alt={title} fill sizes="(min-width: 1024px) 33vw, 88vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.06]"/>:<div className="absolute inset-0 project-placeholder"><span>{String(i+1).padStart(2,"0")}</span></div>}<div className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">{status}</div></div><div className="p-5"><div className="flex items-start justify-between gap-4"><h3 className="font-display text-2xl text-white">{title}</h3>{p.href&&<span className="project-arrow text-lg text-[#d8e06b]">↗</span>}</div><p className="mt-2 line-clamp-2 text-sm leading-6 text-white/55">{description}</p><ul className="mt-4 flex flex-wrap gap-2">{p.tags.slice(0,4).map(x=><li key={x} className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/55">{x}</li>)}</ul></div></article>;return p.href?<Link key={p.id} href={p.href} className="focus-ring project-slide block h-full">{card}</Link>:<div key={p.id} className="project-slide">{card}</div>})}</div></div>}
  </section>;
}