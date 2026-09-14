"use client";

import { useState } from "react";
import Link from "next/link";

const links = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Skills", href: "#skills" },
  { label: "Experience", href: "#experience" },
  { label: "Projects", href: "#projects" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/90 backdrop-blur">
      <nav className="mx-auto flex max-w-content items-center justify-between px-6 py-4">
        <Link
          href="#home"
          className="focus-ring font-display text-lg tracking-tight text-ink"
        >
          Salmaan
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="focus-ring text-sm text-muted transition-colors hover:text-ink"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <Link
          href="/marketplace"
          className="focus-ring hidden rounded-full bg-pine px-5 py-2 text-sm font-medium text-paper transition-colors hover:bg-pine-dark md:inline-block"
        >
          Marketplace →
        </Link>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-line md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="relative block h-3.5 w-4">
            <span
              className={`absolute left-0 top-0 h-[1.5px] w-full bg-ink transition-transform ${
                open ? "translate-y-[6px] rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-[6px] h-[1.5px] w-full bg-ink transition-opacity ${
                open ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 top-[12px] h-[1.5px] w-full bg-ink transition-transform ${
                open ? "-translate-y-[6px] -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </nav>

      {/* Mobile menu panel */}
      {open && (
        <div className="border-t border-line bg-paper px-6 pb-6 md:hidden">
          <ul className="flex flex-col gap-1 pt-4">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="focus-ring block rounded-md px-2 py-3 text-base text-ink"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <Link
            href="/marketplace"
            onClick={() => setOpen(false)}
            className="focus-ring mt-3 block rounded-full bg-pine px-5 py-3 text-center text-sm font-medium text-paper"
          >
            Marketplace →
          </Link>
        </div>
      )}
    </header>
  );
}
