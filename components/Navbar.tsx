"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { locale, setLocale, t } = useLanguage();

  const links = [
    { label: t.nav.home, href: "#home" },
    { label: t.nav.projects, href: "#projects" },
    { label: t.nav.about, href: "#about" },
    { label: t.nav.blog, href: "#blog" },
    { label: t.nav.contact, href: "#contact" },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function toggleLanguage() {
    setLocale(locale === "en" ? "so" : "en");
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-50 px-3 pt-3 transition-all duration-300">
      <nav
        className={
          "mx-auto flex max-w-[1250px] items-center justify-between gap-3 px-5 py-3 transition-all " +
          (scrolled
            ? "rounded-2xl border border-white/10 bg-[#160607]/80 shadow-2xl backdrop-blur-xl"
            : "")
        }
      >
        <Link href="#home" className="focus-ring hand text-2xl text-white">
          Salmaan<span className="text-[#e45560]">.</span>
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="focus-ring text-sm text-white/65 hover:text-white"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLanguage}
            className="focus-ring rounded-full border border-white/15 px-3 py-2 text-[10px] font-semibold uppercase tracking-[.12em] text-white/80 hover:border-white/40 hover:text-white"
            aria-label={`Switch to ${t.switchTo}`}
            title={`Switch to ${t.switchTo}`}
          >
            {locale === "en" ? "SO" : "EN"}
          </button>

          <Link
            href="/marketplace"
            className="focus-ring hidden rounded-full bg-[#c63f4c] px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-red-950/30 hover:-translate-y-0.5 md:inline-block"
          >
            {t.nav.marketplace}
          </Link>

          <button
            type="button"
            className="focus-ring grid h-10 w-10 place-items-center rounded-full bg-[#8d2632] text-white md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="text-lg">{open ? "×" : "☰"}</span>
          </button>
        </div>
      </nav>

      {open && (
        <div className="mx-1 mt-2 rounded-2xl border border-white/10 bg-[#180607]/95 px-4 pb-4 shadow-2xl backdrop-blur-xl md:hidden">
          <ul className="flex flex-col gap-1 pt-3">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="focus-ring block rounded-xl px-3 py-3 text-sm text-white/80 hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <Link
            href="/marketplace"
            onClick={() => setOpen(false)}
            className="focus-ring mt-2 block rounded-full bg-[#c63f4c] px-5 py-3 text-center text-sm font-semibold text-white"
          >
            {t.nav.marketplace}
          </Link>
        </div>
      )}
    </header>
  );
}
