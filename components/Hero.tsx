"use client";

import { useLanguage } from "@/components/LanguageProvider";

export default function Hero(){
  const { t } = useLanguage();
  return <section id="home" className="hero-shell site-section !max-w-none !px-5 md:!px-10 lg:!px-16">
    <div className="hero-glow" aria-hidden="true"/>
    <span className="doodle left-[7%] top-[20%] rotate-[-8deg] text-3xl">↘</span>
    <span className="doodle right-[7%] top-[22%] text-5xl">✦</span>
    <span className="doodle left-[48%] top-[18%] text-4xl">⌁</span>
    <span className="doodle bottom-[18%] left-[43%] text-5xl">↯</span>
    <div className="relative mx-auto w-full max-w-[1250px]">
      <div className="relative z-20 pt-10 text-center lg:pt-16">
        <div className="hand mb-5 text-lg text-white/80">{t.hero.hey}</div>
        <h1 className="hero-title mx-auto max-w-5xl font-display text-[4.7rem] leading-[.82] tracking-[-.065em] sm:text-[6.8rem] md:text-[8rem] lg:text-[9.1rem]">
          <span className="script block text-[3.5rem] leading-none sm:text-[4.4rem] md:text-[5rem]">{t.hero.im}</span>
          <span className="red-underline block">SALMAAN.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base font-medium tracking-wide text-white/80 sm:text-xl">{t.hero.tagline}</p>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/55 sm:text-base">{t.hero.intro}</p>
        <div className="mt-7 flex justify-center gap-3">
          <a href="/marketplace" className="focus-ring rounded-full bg-[#c63f4c] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(198,63,76,.28)] hover:-translate-y-1">{t.hero.marketplace}</a>
          <a href="#projects" className="focus-ring rounded-full border border-red-400/40 bg-black/10 px-6 py-3 text-sm font-medium text-white hover:bg-red-500/10">{t.hero.projects}</a>
        </div>
      </div>
      <div className="hero-person relative z-10 mx-auto mt-3 flex min-h-[470px] items-end justify-center sm:min-h-[540px] lg:min-h-[600px]">
        <div className="person-backdrop absolute bottom-[5%] left-1/2 h-[78%] w-[72%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(circle,rgba(198,63,76,.46),rgba(110,20,31,.14)_48%,transparent_72%)] blur-2xl"/>
        <span className="hero-sticker absolute left-[4%] top-[12%] z-20 rotate-6 rounded-full bg-[#8f2834] px-5 py-3 text-center text-xs font-bold text-white shadow-xl sm:left-[14%]"><span className="hand text-sm">{t.hero.create}</span><br/>{t.hero.awesome}</span>
        <div className="person-scribble absolute bottom-[7%] left-1/2 z-0 h-[78%] w-[62%] -translate-x-1/2 rounded-[48%] border-2 border-[#e45560]/30 rotate-[-5deg]"/>
        <img src="/images/467AE8E4-F9AE-4196-B80C-212DAB242A8C.png" alt="Salmaan Mukhtaar Xaashi" className="hero-cutout relative z-10 max-h-[520px] w-auto max-w-[92%] object-contain object-bottom select-none sm:max-h-[590px] lg:max-h-[650px]" draggable={false}/>
        <div className="absolute bottom-[5%] right-[7%] z-20 rotate-[-7deg] rounded-xl border-2 border-black bg-[#e9e0d5] px-3 py-2 text-2xl shadow-xl">▶</div>
      </div>
      <div className="hero-about-card relative z-30 mx-auto -mt-8 w-[calc(100%-18px)] max-w-[900px] rounded-[1.8rem] border border-white/10 bg-[#21090c]/90 p-5 shadow-[0_25px_70px_rgba(0,0,0,.42)] backdrop-blur-xl sm:p-7">
        <div className="grid gap-5 sm:grid-cols-[.8fr_1.2fr] sm:items-center">
          <div><p className="hand text-xl text-[#e45560]">{t.hero.about}</p><h2 className="mt-1 font-display text-2xl text-white sm:text-3xl">Salmaan Mukhtaar Xaashi</h2></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="floating-point"><span className="floating-dot"/>{t.hero.senior}<br/><small>{t.hero.computerScience}</small></div>
            <div className="floating-point"><span className="floating-dot"/>2027<br/><small>{t.hero.graduation}</small></div>
            <div className="floating-point col-span-2 sm:col-span-1"><span className="floating-dot"/>{t.hero.university}<br/><small>{t.hero.somaliland}</small></div>
          </div>
        </div>
      </div>
      <div className="mt-7 flex justify-center items-center gap-3 text-xs uppercase tracking-[.22em] text-white/45"><span className="h-8 w-5 rounded-full border border-white/45 p-1"><span className="block h-2 w-1 rounded-full bg-white/70"/></span>{t.hero.scroll}</div>
    </div>
  </section>
}