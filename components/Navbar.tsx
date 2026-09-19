"use client";
import {useEffect,useState} from "react";
import Link from "next/link";

const links=[{label:"Home",href:"#home"},{label:"Projects",href:"#projects"},{label:"About",href:"#about"},{label:"Blog",href:"#blog"},{label:"Contact",href:"#contact"}];

export default function Navbar(){
  const[open,setOpen]=useState(false),[scrolled,setScrolled]=useState(false);
  useEffect(()=>{const f=()=>setScrolled(window.scrollY>30);f();window.addEventListener("scroll",f,{passive:true});return()=>window.removeEventListener("scroll",f)},[]);
  return <header className={"fixed left-0 right-0 top-0 z-50 px-3 pt-3 transition-all duration-300"}>
    <nav className={"mx-auto flex max-w-[1250px] items-center justify-between px-5 py-3 transition-all "+(scrolled?"rounded-2xl border border-white/10 bg-[#160607]/80 shadow-2xl backdrop-blur-xl":"")}>
      <Link href="#home" className="focus-ring hand text-2xl text-white">Salmaan<span className="text-[#e45560]">.</span></Link>
      <ul className="hidden items-center gap-8 md:flex">{links.map(l=><li key={l.href}><a href={l.href} className="focus-ring text-sm text-white/65 hover:text-white">{l.label}</a></li>)}</ul>
      <Link href="/marketplace" className="focus-ring hidden rounded-full bg-[#c63f4c] px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-red-950/30 hover:-translate-y-0.5 md:inline-block">Marketplace ↗</Link>
      <button type="button" className="focus-ring grid h-10 w-10 place-items-center rounded-full bg-[#8d2632] text-white md:hidden" aria-label={open?"Close menu":"Open menu"} aria-expanded={open} onClick={()=>setOpen(v=>!v)}><span className="text-lg">{open?"×":"☰"}</span></button>
    </nav>
    {open&&<div className="mx-1 mt-2 rounded-2xl border border-white/10 bg-[#180607]/95 px-4 pb-4 shadow-2xl backdrop-blur-xl md:hidden"><ul className="flex flex-col gap-1 pt-3">{links.map(l=><li key={l.href}><a href={l.href} onClick={()=>setOpen(false)} className="focus-ring block rounded-xl px-3 py-3 text-sm text-white/80 hover:bg-white/5 hover:text-white">{l.label}</a></li>)}</ul><Link href="/marketplace" onClick={()=>setOpen(false)} className="focus-ring mt-2 block rounded-full bg-[#c63f4c] px-5 py-3 text-center text-sm font-semibold text-white">Marketplace ↗</Link></div>}
  </header>
}