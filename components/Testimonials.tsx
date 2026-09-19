"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type Testimonial = { id:string; name:string; rating:number; comment:string; approved:boolean };

const positions = [
  { left:"4%", top:"7%", rotate:"-3deg" }, { left:"57%", top:"4%", rotate:"3deg" },
  { left:"20%", top:"39%", rotate:"2deg" }, { left:"72%", top:"34%", rotate:"-4deg" },
  { left:"43%", top:"68%", rotate:"-2deg" }, { left:"5%", top:"73%", rotate:"4deg" },
];

export default function Testimonials(){
  const [items,setItems]=useState<Testimonial[]>([]);
  const [name,setName]=useState(""); const [rating,setRating]=useState(5); const [comment,setComment]=useState("");
  const [sent,setSent]=useState(false); const [sending,setSending]=useState(false); const area=useRef<HTMLDivElement>(null); const [frontId,setFrontId]=useState<string|null>(null); const [returning,setReturning]=useState<Record<string,boolean>>({});

  useEffect(()=>{const s=getSupabaseClient(); if(!s)return; s.from("testimonials").select("id,name,rating,comment,approved").eq("approved",true).order("created_at",{ascending:false}).then(({data})=>setItems((data??[]) as Testimonial[]))},[]);

  const bringToFront=(id:string)=>setFrontId(id);

  const drag=(e:React.PointerEvent<HTMLDivElement>)=>{
    const card=e.currentTarget, parent=area.current; if(!parent)return;
    const id=card.dataset.id;
    if(id) setFrontId(id);

    const startX=e.clientX,startY=e.clientY,rect=card.getBoundingClientRect(),pr=parent.getBoundingClientRect();
    const ox=rect.left-pr.left,oy=rect.top-pr.top;
    let moved=false;

    card.setPointerCapture(e.pointerId);
    card.style.transition="none";

    const move=(ev:PointerEvent)=>{
      const x=ox+ev.clientX-startX;
      const y=oy+ev.clientY-startY;
      if(Math.abs(ev.clientX-startX)>4 || Math.abs(ev.clientY-startY)>4) moved=true;
      card.style.left=x+"px";
      card.style.top=y+"px";
      card.style.transform="rotate(0deg) scale(1.02)";
    };

    const up=()=>{
      const current=card.getBoundingClientRect(), box=parent.getBoundingClientRect();
      const centerX=current.left+current.width/2;
      const centerY=current.top+current.height/2;
      const thrownAway =
        moved &&
        (centerX < box.left-30 || centerX > box.right+30 || centerY < box.top-30 || centerY > box.bottom+30);

      if(thrownAway && id){
        const idx=items.findIndex(x=>x.id===id);
        const target=positions[(idx<0?0:idx)%positions.length];

        // Let the note fade away first, then smoothly float back to its home position.
        card.style.transition="opacity .22s ease, transform .22s ease";
        card.style.opacity="0";
        card.style.transform="scale(.92) rotate(0deg)";

        window.setTimeout(()=>{
          card.style.transition="none";
          card.style.left=target.left;
          card.style.top=target.top;
          card.style.transform="scale(.96) rotate("+target.rotate+")";
          window.requestAnimationFrame(()=>{
            card.style.transition="left 20s cubic-bezier(.22,1,.36,1), top 20s cubic-bezier(.22,1,.36,1), transform 20s cubic-bezier(.22,1,.36,1), opacity 2s ease";
            card.style.opacity="1";
            window.setTimeout(()=>{ card.style.transition=""; },20300);
          });
        },240);
      } else {
        card.style.transition="transform .25s ease";
        card.style.transform="rotate("+((Math.random()*6)-3)+"deg)";
        window.setTimeout(()=>{ card.style.transition=""; },260);
      }

      window.removeEventListener("pointermove",move);
      window.removeEventListener("pointerup",up);
    };

    window.addEventListener("pointermove",move);
    window.addEventListener("pointerup",up,{once:true});
  };

  const submit=async(e:React.FormEvent)=>{e.preventDefault(); if(!name.trim()||!comment.trim())return; const s=getSupabaseClient(); if(!s)return; setSending(true); const {error}=await s.from("testimonials").insert({name:name.trim().slice(0,80),rating,comment:comment.trim().slice(0,500),approved:false}); setSending(false); if(!error){setName("");setRating(5);setComment("");setSent(true)}};

  return <section id="testimonials" className="site-section section-divider">
    <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:items-center">
      <div>
        <p className="hand text-xl text-[#e45560]">A little kindness 😊</p>
        <h2 className="mt-1 font-display text-5xl tracking-tight sm:text-6xl">Leave a note.</h2>
        <p className="mt-5 max-w-md text-base leading-7 text-white/60">Share your thoughts, a review, or simply leave something nice. Your note appears here after I approve it.</p>
        <form onSubmit={submit} className="ink-card mt-8 rounded-[2rem] p-6 sm:p-7">
          <label className="block text-sm text-white/70">Your name<input value={name} onChange={e=>setName(e.target.value)} maxLength={80} required className="admin-input mt-2 w-full rounded-xl border border-white/10 bg-[#240b0e] p-3 text-white outline-none focus:border-[#e45560]" placeholder="Your name"/></label>
          <div className="mt-4"><span className="block text-sm text-white/70">Your rating</span><div className="mt-2 flex gap-1">{[1,2,3,4,5].map(n=><button type="button" key={n} onClick={()=>setRating(n)} aria-label={n+" stars"} className={"text-2xl transition "+(n<=rating?"text-[#d8e06b]":"text-white/20")}>★</button>)}</div></div>
          <label className="mt-4 block text-sm text-white/70">Your thoughts<textarea value={comment} onChange={e=>setComment(e.target.value)} maxLength={500} required rows={4} className="admin-input mt-2 w-full resize-none rounded-xl border border-white/10 bg-[#240b0e] p-3 text-white outline-none focus:border-[#e45560]" placeholder="Write something nice... 😊"/></label>
          <button disabled={sending} className="mt-5 rounded-full bg-[#c63f4c] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{sending?"Sending…":"Leave my note 😊"}</button>
          {sent&&<p className="mt-3 text-sm text-[#d8e06b]">Thank you! Your note was sent for approval. 😊</p>}
        </form>
      </div>
      <div>
        <div className="mb-4 flex items-end justify-between"><div><p className="text-xs uppercase tracking-[.25em] text-white/35">Community wall</p><h3 className="mt-2 font-display text-3xl sm:text-4xl">Kind words.</h3></div><span className="text-xs text-white/35">Drag the notes around</span></div>
        <div ref={area} className="relative min-h-[500px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#170607] shadow-2xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(198,63,76,.16),transparent_60%)]"/>
          {items.length===0&&<div className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-white/35">Be the first to leave a kind note. 😊</div>}
          {items.map((x,i)=><article key={x.id} data-id={x.id} onPointerDown={drag} onClick={()=>bringToFront(x.id)} className={"absolute w-[72%] max-w-[300px] cursor-grab touch-none select-none rounded-2xl border border-white/10 bg-[#2a0d10]/95 p-5 shadow-xl backdrop-blur-md transition-shadow active:cursor-grabbing "+(frontId===x.id?"ring-1 ring-[#e45560]/50":"")} style={{left:positions[i%positions.length].left,top:positions[i%positions.length].top,transform:"rotate("+positions[i%positions.length].rotate+")",zIndex:frontId===x.id?100:i+1,opacity:returning[x.id]?0:1}}><div className="flex items-center justify-between gap-3"><span className="font-semibold text-white">{x.name}</span><span className="text-[#d8e06b] text-sm">{"★".repeat(x.rating)}</span></div><p className="mt-3 text-sm leading-6 text-white/70">“{x.comment}”</p><p className="mt-3 text-xs text-white/30">😊</p></article>)}
        </div>
      </div>
    </div>
  </section>
}