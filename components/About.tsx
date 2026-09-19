export default function About(){return <section id="about" className="site-section section-divider about-premium">
  <div className="relative grid gap-10 lg:grid-cols-[.95fr_1.05fr] lg:items-center">
    <div className="about-portrait-wrap relative mx-auto w-full max-w-[500px]">
      <span className="doodle -left-3 top-8 text-5xl">✦</span>
      <span className="about-arc absolute -right-3 top-[15%] h-[70%] w-1/2 rounded-full border border-[#e45560]/25 rotate-12"/>
      <div className="about-glow absolute bottom-[5%] left-1/2 h-[72%] w-[75%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(198,63,76,.34),transparent_68%)] blur-3xl"/>
      <div className="about-portrait relative z-10 flex min-h-[390px] items-end justify-center overflow-visible rounded-[2rem] border border-white/10 bg-gradient-to-b from-[#2a0e10]/70 to-transparent px-4 pt-5 sm:min-h-[480px]">
        <img src="/images/91774872-05B7-42E5-B172-B4B87333DCF1.png" alt="Salmaan Mukhtaar Xaashi" className="about-cutout max-h-[480px] w-auto max-w-[100%] object-contain object-bottom select-none" draggable={false}/>
      </div>
      <div className="about-image-label absolute bottom-4 left-4 z-20 rounded-full border border-white/10 bg-[#160607]/80 px-4 py-2 text-[10px] uppercase tracking-[.2em] text-white/55 backdrop-blur-md">Salmaan · 2027</div>
    </div>

    <div className="about-copy relative z-20">
      <p className="hand text-xl text-[#e45560]">A little about me</p>
      <h2 className="mt-1 max-w-xl font-display text-4xl leading-[.95] sm:text-6xl">Building with curiosity.</h2>
      <div className="mt-6 max-w-2xl space-y-4 text-base leading-8 text-white/65">
        <p>I&apos;m Salmaan, a Senior Computer Science student at the University of Hargeisa. I enjoy combining programming, AI, design, marketing and creative media to turn ideas into useful digital experiences.</p>
        <p>I&apos;m dedicated to learning, staying active, exploring new places and continuously aiming for better things.</p>
      </div>
      <div className="about-facts mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div><p className="text-[10px] uppercase tracking-[.18em] text-white/35">University</p><p className="mt-1 text-sm">Hargeisa</p></div>
        <div><p className="text-[10px] uppercase tracking-[.18em] text-white/35">Field</p><p className="mt-1 text-sm">Computer Science</p></div>
        <div><p className="text-[10px] uppercase tracking-[.18em] text-white/35">Status</p><p className="mt-1 text-sm">Senior</p></div>
        <div><p className="text-[10px] uppercase tracking-[.18em] text-white/35">Grad.</p><p className="mt-1 text-sm">2027</p></div>
      </div>
      <a href="#contact" className="yellow-link mt-8 inline-flex items-center gap-2 text-sm font-semibold">Know me better <span>→</span></a>
    </div>
  </div>
</section>}