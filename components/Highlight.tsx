"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

const fallback = {
  quick_note: "The goal is simple: create things that are useful, memorable and worth coming back to.",
  quote_text: "The only limit to our realization of tomorrow is our doubts of today.",
  quote_author: "Franklin D. Roosevelt",
};

export default function Highlight(){
  const [content,setContent]=useState(fallback);
  useEffect(()=>{
    const supabase=getSupabaseClient();
    if(!supabase) return;
    supabase.from("portfolio_content").select("quick_note,quote_text,quote_author").eq("id",true).maybeSingle()
      .then(({data})=>{if(data)setContent({...fallback,...data});});
  },[]);
  return <section className="site-section !pt-0">
    <div className="quote-card grid gap-5 p-4 sm:p-6 lg:grid-cols-[.7fr_1.3fr] lg:items-stretch">
      <div className="flex flex-col justify-center rounded-2xl bg-[#170607] p-6 sm:p-8">
        <p className="hand text-2xl text-white">QUICK NOTE</p>
        <p className="mt-4 font-display text-2xl leading-tight text-white sm:text-3xl">{content.quick_note}</p>
        <p className="mt-5 text-xs uppercase tracking-[.18em] text-white/45">— Salmaan</p>
      </div>
      <div className="quote-paper min-h-[190px] p-6 sm:p-8">
        <div className="flex h-full flex-col justify-between">
          <div><p className="text-[10px] uppercase tracking-[.2em] text-black/45">Quote of the Day</p><p className="mt-4 font-display text-2xl leading-tight sm:text-3xl">“{content.quote_text}”</p></div>
          <p className="mt-6 text-xs font-semibold tracking-wide text-black/55">{content.quote_author}</p>
        </div>
      </div>
    </div>
    <div className="marquee-wrap mt-5 py-3"><div className="marquee-line hand text-sm uppercase tracking-[.25em] text-white/40"><span>WEB DEVELOPMENT ✦ AI ✦ DIGITAL CREATIVITY ✦ COMPUTER SCIENCE ✦ MARKETING ✦ </span><span>WEB DEVELOPMENT ✦ AI ✦ DIGITAL CREATIVITY ✦ COMPUTER SCIENCE ✦ MARKETING ✦ </span></div></div>
  </section>
}