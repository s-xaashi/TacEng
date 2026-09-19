import Link from "next/link";
import SocialLinks from "@/components/SocialLinks";

const links=[{label:"Home",href:"#home"},{label:"Projects",href:"#projects"},{label:"About",href:"#about"},{label:"Contact",href:"#contact"}];

export default function Footer(){
  return <footer className="border-t border-white/10 px-6 py-10">
    <div className="mx-auto max-w-content">
      <SocialLinks />
      <div className="mt-10 flex flex-col gap-5 border-t border-white/10 pt-7 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="hand text-xl">Salmaan.</p><p className="mt-1 text-xs text-white/35">Computer Science · Developer · Creative</p></div>
        <div className="flex flex-wrap gap-5">{links.map(l=><a key={l.href} href={l.href} className="text-xs text-white/45 hover:text-white">{l.label}</a>)}<Link href="/marketplace" className="text-xs text-[#d8e06b]">Marketplace ↗</Link></div>
      </div>
      <p className="mt-8 text-[10px] uppercase tracking-[.18em] text-white/25">© {new Date().getFullYear()} Salmaan Mukhtaar Xaashi</p>
    </div>
  </footer>
}