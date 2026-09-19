"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin" },
  { label: "Payments / Purchases", href: "/admin/payments" },
  { label: "Account Settings", href: "/admin/account" },
];

export default function AdminShell({
  children,
  onSignOut,
}: {
  children: React.ReactNode;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-content items-center justify-between px-6 py-4">
          <Link href="/admin" className="focus-ring font-display text-lg text-ink">
            Admin
          </Link>

          {/* Desktop nav — inline, never covers content */}
          <nav className="hidden items-center gap-6 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`focus-ring text-sm transition-colors ${
                  pathname === item.href
                    ? "text-ink"
                    : "text-muted hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={onSignOut}
              className="focus-ring rounded-full border border-line px-4 py-2 text-sm text-ink hover:border-ink"
            >
              Sign out
            </button>
          </nav>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-line md:hidden"
            aria-label={open ? "Close admin menu" : "Open admin menu"}
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <span className="relative block h-3.5 w-4">
              <span className="absolute left-0 top-0 h-[1.5px] w-full bg-ink" />
              <span className="absolute left-0 top-[6px] h-[1.5px] w-full bg-ink" />
              <span className="absolute left-0 top-[12px] h-[1.5px] w-full bg-ink" />
            </span>
          </button>
        </div>
      </header>

      {/* Mobile drawer — closable by tapping outside or selecting an item */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-ink/40 md:hidden"
          onClick={() => setOpen(false)}
        >
          <nav
            className="flex h-full w-80 max-w-[85vw] flex-col bg-paper p-6"
            onClick={(e) => e.stopPropagation()}
            aria-label="Admin menu"
          >
            <div className="flex items-center justify-between">
              <p className="font-display text-lg text-ink">Admin Menu</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="focus-ring text-muted hover:text-ink"
              >
                ✕
              </button>
            </div>

            <p className="mt-8 text-xs uppercase tracking-wide text-muted">
              Sections
            </p>
            <div className="mt-2 flex flex-col">
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="focus-ring rounded-md px-2 py-3 text-base text-ink"
              >
                Dashboard
              </Link>
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="focus-ring rounded-md px-2 py-3 text-base text-ink"
              >
                Documents
              </Link>
              <Link
                href="/admin/payments"
                onClick={() => setOpen(false)}
                className="focus-ring rounded-md px-2 py-3 text-base text-ink"
              >
                Payments / Purchases
              </Link>
            </div>

            <p className="mt-6 text-xs uppercase tracking-wide text-muted">
              Account
            </p>
            <div className="mt-2 flex flex-col">
              <Link
                href="/admin/account"
                onClick={() => setOpen(false)}
                className="focus-ring rounded-md px-2 py-3 text-base text-ink"
              >
                Account Settings
              </Link>
            </div>

            <p className="mt-6 text-xs uppercase tracking-wide text-muted">
              Security
            </p>
            <div className="mt-2 flex flex-col">
              <Link
                href="/admin/forgot-password"
                onClick={() => setOpen(false)}
                className="focus-ring rounded-md px-2 py-3 text-base text-ink"
              >
                Reset Admin Password
              </Link>
            </div>

            <div className="mt-auto border-t border-line pt-4">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
                className="focus-ring w-full rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper"
              >
                Sign Out
              </button>
            </div>
          </nav>
        </div>
      )}

      {children}
    </div>
  );
}
