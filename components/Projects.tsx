"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import type { PortfolioProject } from "@/lib/projects";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export default function Projects(){
  const [projects,setProjects]=useState<PortfolioProject[]>([]);
  const ref=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    let active=true;
    supabase.from("projects").select("id,title,description,tags,status,href,image_path,published")
      .eq("published",true).order("sort_order",{ascending:true}).order("created_at",{ascending:false})
      .then(({data,error})=>{
        if(!active) return;
        if(error){console.error("Failed to load projects:",error.message);return;}
        setProjects((data??[]).map(p=>({...p,image_url:p.image_path?supabase.storage.from("thumbnails").getPublicUrl(p.image_path).data.publicUrl:null})) as PortfolioProject[]);
      });
    return()=>{active=false};
  },[]);

  const move=(dir:number)=>ref.current?.scrollBy({left:dir*Math.min(ref.current.clientWidth*.86,520),behavior:"smooth"});

  return <section id="projects" className="site-section section-divider">
    <div className="flex items-end justify-between gap-6">
      <div><p className="hand text-xl text-[#e45560]">Featured projects</p><h2 className="mt-1 font-display text-4xl tracking-tight text-white sm:text-6xl">Selected Work.</h2></div>
      <a href="/#contact" className="yellow-link hidden text-sm font-medium sm:block">Have a project? →</a>
    </div>
    {projects.length===0
      ? <div className="mt-10 rounded-3xl border border-dashed border-white/15 bg-white/[.02] p-10 text-center text-sm text-white/45">Projects will appear here as they are published from the admin panel.</div>
      : <div className="projects-carousel-wrap relative mt-10">
          <div className="projects-carousel-actions flex gap-2">
            <button type="button" onClick={()=>move(-1)} aria-label="Previous projects" className="project-nav-btn">←</button>
            <button type="button" onClick={()=>move(1)} aria-label="Next projects" className="project-nav-btn">→</button>
          </div>
          <div ref={ref} className="projects-carousel" aria-label="Featured projects">
            {projects.map((p,i)=>{
              const card=<article className="project-card ink-card group h-full overflow-hidden rounded-[1.45rem]">
                <div className="relative aspect-[16/10] overflow-hidden bg-[#260b0d]">
                  {p.image_url?<Image src={p.image_url} alt={p.title} fill sizes="(min-width: 1024px) 33vw, 88vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.06]"/>:<div className="absolute inset-0 project-placeholder"><span>{String(i+1).padStart(2,"0")}</span></div>}
                  <div className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">{p.status}</div>
                </div>
                <div className="p-5"><div className="flex items-start justify-between gap-4"><h3 className="font-display text-2xl text-white">{p.title}</h3>{p.href&&<span className="project-arrow text-lg text-[#d8e06b]">↗</span>}</div><p className="mt-2 line-clamp-2 text-sm leading-6 text-white/55">{p.description}</p><ul className="mt-4 flex flex-wrap gap-2">{p.tags.slice(0,4).map(t=><li key={t} className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/55">{t}</li>)}</ul></div>
              </article>;
              return p.href?<Link key={p.id} href={p.href} className="focus-ring project-slide block h-full">{card}</Link>:<div key={p.id} className="project-slide">{card}</div>;
            })}
          </div>
        </div>}
  </section>
}