"use client";
import {useState} from "react";

const HERO_IMAGE="/images/hero-salmaan.webp";
const FALLBACK="/images/profile.jpg";

export default function Hero(){
  const [src,setSrc]=useState(HERO_IMAGE);
  return <section id="home" className="hero-shell site-section !max-w-none !px-5 md:!px-10 lg:!px-16">
    <div className="hero-glow" aria-hidden="true"/>
    <span className="doodle left-[7%] top-[20%] rotate-[-8deg] text-3xl">↘</span>
    <span className="doodle right-[7%] top-[22%] text-5xl">✦</span>
    <span className="doodle left-[48%] top-[18%] text-4xl">⌁</span>
    <span className="doodle bottom-[18%] left-[43%] text-5xl">↯</span>
    <div className="relative mx-auto grid w-full max-w-[1250px] items-center gap-3 lg:grid-cols-[1.05fr_.95fr]">
      <div className="relative z-20 pt-10 lg:pt-16">
        <div className="hand mb-5 text-lg text-white/80">Hey,</div>
        <h1 className="hero-title max-w-4xl font-display text-[4.7rem] leading-[.82] tracking-[-.065em] sm:text-[6.8rem] md:text-[8rem] lg:text-[9.1rem]">
          <span className="script block text-[3.5rem] leading-none sm:text-[4.4rem] md:text-[5rem]">I&apos;m</span>
          <span className="red-underline block">SALMAAN.</span>
        </h1>
        <p className="mt-9 max-w-2xl text-base font-medium tracking-wide text-white/80 sm:text-xl">
          Developer <span className="mx-2 text-red-400">•</span> Creative Technologist <span className="mx-2 text-red-400">•</span> Pro AI User
        </p>
        <p className="mt-4 max-w-xl text-sm leading-7 text-white/55 sm:text-base">I build useful digital experiences by combining Computer Science, web development, AI, design and creative media.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="/marketplace" className="focus-ring rounded-full bg-[#c63f4c] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(198,63,76,.28)] hover:-translate-y-1">Visit Marketplace ↗</a>
          <a href="#projects" className="focus-ring rounded-full border border-red-400/40 bg-black/10 px-6 py-3 text-sm font-medium text-white hover:bg-red-500/10">View Projects ↗</a>
        </div>
        <div className="mt-9 flex items-center gap-3 text-xs uppercase tracking-[.22em] text-white/45"><span className="h-8 w-5 rounded-full border border-white/45 p-1"><span className="block h-2 w-1 rounded-full bg-white/70"/></span> Scroll down</div>
      </div>

      <div className="hero-person relative z-10 mt-4 flex min-h-[430px] items-end justify-center lg:mt-0 lg:min-h-[680px] lg:justify-end">
        <div className="person-backdrop absolute bottom-[8%] right-[5%] h-[68%] w-[78%] rounded-[45%] bg-[radial-gradient(circle,rgba(198,63,76,.48),rgba(110,20,31,.16)_48%,transparent_72%)] blur-2xl"/>
        <span className="hero-sticker absolute left-[5%] top-[12%] z-20 rotate-6 rounded-full bg-[#8f2834] px-5 py-3 text-center text-xs font-bold text-white shadow-xl"><span className="hand text-sm">LET&apos;S CREATE</span><br/>SOMETHING AWESOME!</span>
        <div className="person-scribble absolute bottom-[13%] right-[0%] z-0 h-[72%] w-[86%] rounded-[48%] border-2 border-[#e45560]/30 rotate-[-5deg]"/>
        <img src={src} onError={()=>setSrc(FALLBACK)} alt="Salmaan" className="hero-cutout relative z-10 max-h-[620px] w-auto max-w-[94%] object-contain object-bottom select-none lg:max-h-[700px]" draggable={false}/>
        <div className="absolute bottom-[7%] right-[4%] z-20 rotate-[-7deg] rounded-xl border-2 border-black bg-[#e9e0d5] px-3 py-2 text-2xl shadow-xl">▶</div>
      </div>
    </div>
  </section>
}