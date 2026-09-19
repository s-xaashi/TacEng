import Image from "next/image";

export default function Hero(){
  return <section id="home" className="hero-shell site-section !max-w-none !px-6 md:!px-10 lg:!px-16">
    <div className="hero-glow" aria-hidden="true"/>
    <span className="doodle left-[7%] top-[20%] rotate-[-8deg] text-3xl">↘</span>
    <span className="doodle right-[7%] top-[22%] text-5xl">✦</span>
    <span className="doodle left-[47%] top-[18%] text-4xl">⌁</span>
    <span className="doodle bottom-[18%] left-[43%] text-5xl">↯</span>
    <div className="relative mx-auto grid w-full max-w-[1250px] items-center gap-8 lg:grid-cols-[1.12fr_.88fr]">
      <div className="relative z-10">
        <div className="hand mb-5 text-lg text-white/75">Hey,</div>
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
      <div className="hero-photo relative z-10 w-full max-w-[520px] justify-self-center lg:justify-self-end">
        <div className="absolute -left-8 top-14 hidden h-28 w-28 rounded-full border border-red-400/35 lg:block"/>
        <div className="absolute -right-2 top-8 rounded-full bg-[#8f2834] px-5 py-3 text-center text-xs font-bold text-white shadow-xl rotate-6">
          <span className="hand text-sm">LET&apos;S CREATE</span><br/>SOMETHING AWESOME!
        </div>
        <div className="hero-photo-frame aspect-[4/5]">
          <Image src="/images/profile.jpg" alt="Salmaan Mukhtaar Xaashi" fill priority sizes="(min-width: 1024px) 520px, 88vw" className="object-cover object-top"/>
          <div className="absolute bottom-5 left-5 right-5 z-10 flex items-end justify-between">
            <div><p className="text-[10px] uppercase tracking-[.2em] text-white/55">CS • University of Hargeisa</p><p className="mt-1 font-display text-xl text-white">Salmaan Mukhtaar Xaashi</p></div>
            <span className="rounded-full border border-white/20 bg-black/35 px-3 py-1 text-[10px] text-white/70 backdrop-blur">2027</span>
          </div>
        </div>
      </div>
    </div>
  </section>
}