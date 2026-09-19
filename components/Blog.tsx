"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type Block={id?:string;type:"paragraph"|"heading"|"image"|"date"|"highlight";text?:string;image_path?:string;color?:string;level?:2|3};
type BlogPost={id:string;title:string;excerpt:string|null;cover_image_path:string|null;published_at:string|null;blocks:Block[];section_id:string|null};
type BlogSection={id:string;label:string;sort_order:number};

export default function Blog(){
 const [sections,setSections]=useState<BlogSection[]>([]),[posts,setPosts]=useState<BlogPost[]>([]),[active,setActive]=useState<BlogPost|null>(null);
 const load=async()=>{const s=getSupabaseClient();if(!s)return;const [{data:secs},{data:items}]=await Promise.all([
  s.from("blog_sections").select("id,label,sort_order").order("sort_order"),
  s.from("blogs").select("id,title,excerpt,cover_image_path,published_at,blocks,section_id").eq("published",true).order("sort_order").order("published_at",{ascending:false})
 ]);setSections((secs??[]) as BlogSection[]);setPosts((items??[]) as BlogPost[])};
 useEffect(()=>{load()},[]);
 useEffect(()=>{document.body.style.overflow=active?"hidden":"";return()=>{document.body.style.overflow=""}},[active]);
 const url=(path?:string|null)=>{if(!path)return null;const s=getSupabaseClient();return s?.storage.from("thumbnails").getPublicUrl(path).data.publicUrl??null};
 return <section id="blog" className="site-section section-divider">
  <div className="flex items-end justify-between gap-5"><div><p className="hand text-xl text-[#e45560]">From my journal</p><h2 className="mt-1 font-display text-4xl sm:text-5xl">Blogs.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-white/50">Ideas, lessons, experiments and everyday observations — written in my own space.</p></div><span className="hidden rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[.2em] text-white/40 sm:block">Articles</span></div>
  <div className="mt-10 space-y-12">
   {sections.map(section=>{const row=posts.filter(p=>p.section_id===section.id);if(!row.length)return null;return <div key={section.id} className="blog-section-row">
    <div className="mb-5 flex items-end justify-between gap-4"><div><p className="hand text-lg text-[#e45560]">Section</p><h3 className="font-display text-3xl text-white sm:text-4xl">{section.label}</h3></div><div className="hidden text-[10px] uppercase tracking-[.2em] text-white/30 sm:block">Swipe to explore →</div></div>
    <div className="blog-horizontal-row">{row.map(post=><button key={post.id} type="button" onClick={()=>setActive(post)} className="blog-card blog-horizontal-card group text-left"><div className="blog-card-image">{post.cover_image_path&&url(post.cover_image_path)?<img src={url(post.cover_image_path)!} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/>:<div className="blog-card-placeholder">✦</div>}</div><div className="p-6"><div className="flex items-center justify-between gap-3"><span className="hand text-sm text-[#e45560]">BLOG</span>{post.published_at&&<time className="text-[10px] uppercase tracking-[.18em] text-white/35">{new Date(post.published_at).toLocaleDateString()}</time>}</div><h4 className="mt-3 font-display text-2xl leading-tight text-white">{post.title}</h4>{post.excerpt&&<p className="mt-3 line-clamp-3 text-sm leading-6 text-white/55">{post.excerpt}</p>}<span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#d8e06b]">Read article <span className="text-base transition-transform group-hover:translate-x-1">→</span></span></div></button>)}</div>
   </div>})}
   {posts.length===0&&<div className="rounded-3xl border border-white/10 bg-white/[.025] p-10 text-center text-sm text-white/45">New articles will appear here.</div>}
  </div>
  {active&&<div className="blog-modal fixed inset-0 z-[200] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={active.title} onMouseDown={e=>{if(e.target===e.currentTarget)setActive(null)}}><article className="blog-reader max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem]"><button type="button" onClick={()=>setActive(null)} aria-label="Close article" className="blog-close">×</button><div className="p-7 sm:p-10">{active.cover_image_path&&url(active.cover_image_path)&&<img src={url(active.cover_image_path)!} alt="" className="mb-8 max-h-[360px] w-full rounded-2xl object-cover"/>}<p className="hand text-xl text-[#e45560]">BLOG</p><h2 className="mt-2 font-display text-4xl leading-tight text-white sm:text-5xl">{active.title}</h2>{active.published_at&&<time className="mt-4 block text-xs uppercase tracking-[.18em] text-white/35">{new Date(active.published_at).toLocaleDateString()}</time>}<div className="blog-prose mt-9">{active.blocks.map((b,i)=>b.type==="heading"?<h3 key={i} className={b.level===3?"blog-h3":"blog-h2"}>{b.text}</h3>:b.type==="paragraph"?<p key={i}>{b.text}</p>:b.type==="date"?<time key={i} className="blog-date">{b.text}</time>:b.type==="highlight"?<div key={i} className="blog-highlight" style={{borderColor:(b.color??"#e45560")+"99",background:(b.color??"#e45560")+"1c"}}>{b.text}</div>:b.type==="image"&&url(b.image_path)?<figure key={i}><img src={url(b.image_path)!} alt="" className="w-full rounded-2xl"/>{b.text&&<figcaption>{b.text}</figcaption>}</figure>:null)}</div></div></article></div>}
 </section>
}