"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type LearningItem = { id:string; title:string; degree:string|null; period:string|null; status:string|null; description:string|null; color:string; sort_order:number; published:boolean };

export default function Education() {
  const [items,setItems]=useState<LearningItem[]>([]);
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{const s=getSupabaseClient(); if(!s)return; s.from("learning_items").select("*").eq("published",true).order("sort_order").order("created_at",{ascending:false}).then(({data})=>setItems((data??[]) as LearningItem[]))},[]);
  const move=(dir:number)=>ref.current?.scrollBy({left:dir*Math.min(ref.current.clientWidth*.86,560),behavior:"smooth"});
  return <section id="education" className="site-section section-divider">
    <div className="flex items-end justify-between gap-6"><div><p className="hand text-xl text-[#e45560]">Currently learning</p><h2 className="mt-1 font-display text-4xl sm:text-5xl">Learning.</h2></div>{items.length>1&&<div className="experience-nav flex gap-2"><button type="button" onClick={()=>move(-1)} aria-label="Previous learning" className="project-nav-btn">←</button><button type="button" onClick={()=>move(1)} aria-label="Next learning" className="project-nav-btn">→</button></div>}</div>
    {items.length>0&&<div ref={ref} className="experience-carousel mt-10">{items.map(x=><article key={x.id} className="experience-slide red-card rounded-[2rem] p-7 sm:p-9" style={{background:"linear-gradient(145deg, "+x.color+", #1b080a 125%)",borderColor:x.color+"88"}}><p className="hand text-xl text-[#e45560]">Currently learning</p><h3 className="mt-2 font-display text-4xl sm:text-5xl">{x.title}</h3>{x.degree&&<p className="mt-5 text-base text-white/60">{x.degree}</p>}<div className="mt-7 flex flex-wrap gap-2 text-sm">{x.period&&<span className="rounded-full border border-white/15 px-3 py-1 text-[#d8e06b]">{x.period}</span>}{x.status&&<span className="rounded-full border border-white/15 px-3 py-1 text-[#d8e06b]">{x.status}</span>}</div>{x.description&&<p className="mt-6 text-sm leading-6 text-white/60">{x.description}</p>}</article>)}</div>}
  </section>;
}
