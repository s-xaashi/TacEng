"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/LanguageProvider";

type Experience={id:string;company:string;role:string;period:string;description:string|null;responsibilities:string[];role_en:string;description_en:string|null;responsibilities_en:string[]|null;role_so:string|null;description_so:string|null;responsibilities_so:string[]|null;color:string;sort_order:number;published:boolean};

export default function Experience(){
 const {locale,t}=useLanguage(); const [items,setItems]=useState<Experience[]>([]); const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{const s=getSupabaseClient();if(!s)return;s.from("experiences").select("*").eq("published",true).order("sort_order").order("created_at",{ascending:false}).then(({data})=>setItems((data??[]) as Experience[]))},[]);
 const move=(dir:number)=>ref.current?.scrollBy({left:dir*Math.min(ref.current.clientWidth*.86,560),behavior:"smooth"});
 return <section id="experience" className="site-section section-divider"><div className="flex items-end justify-between gap-6"><div><p className="hand text-xl text-[#e45560]">{t.sections.experienceEyebrow}</p><h2 className="mt-1 font-display text-4xl sm:text-5xl">{t.sections.experience}</h2></div><div className="experience-nav flex gap-2"><button type="button" onClick={()=>move(-1)} aria-label="Previous experience" className="project-nav-btn">←</button><button type="button" onClick={()=>move(1)} aria-label="Next experience" className="project-nav-btn">→</button></div></div>
 {items.length>0&&<div ref={ref} className="experience-carousel mt-10">{items.map(x=>{const role=locale==="so"?(x.role_so??x.role_en??x.role):(x.role_en??x.role);const description=locale==="so"?(x.description_so??x.description_en??x.description):(x.description_en??x.description);const responsibilities=locale==="so"?(x.responsibilities_so&&x.responsibilities_so.length?x.responsibilities_so:(x.responsibilities_en??x.responsibilities)):(x.responsibilities_en??x.responsibilities);return <article key={x.id} className="experience-slide red-card rounded-[2rem] p-7 sm:p-9" style={{background:"linear-gradient(145deg, "+x.color+", #1b080a 125%)",borderColor:x.color+"88"}}><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="font-display text-2xl">{x.company}</h3><p className="mt-1 text-sm text-white/55">{role}</p></div><span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/65">{x.period}</span></div>{description&&<p className="mt-5 text-sm leading-6 text-white/65">{description}</p>}<ul className="mt-7 space-y-4">{(responsibilities??[]).map((r,i)=><li key={i} className="flex gap-3 text-sm leading-6 text-white/70"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d8e06b]"/>{r}</li>)}</ul></article>})}</div>}
 </section>
}