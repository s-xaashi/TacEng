import Link from "next/link";

const links = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Skills", href: "#skills" },
  { label: "Experience", href: "#experience" },
  { label: "Projects", href: "#projects" },
  { label: "Contact", href: "#contact" },
];

export default function Footer() {
  return (
    <footer className="border-t border-line px-6 py-12">
      <div className="mx-auto flex max-w-content flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display text-lg text-ink">
            Salmaan Mukhtaar Xaashi
          </p>
          <p className="mt-1 text-sm text-muted">
            Computer Science Student · Creative · Developer
          </p>
        </div>

        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="focus-ring text-sm text-muted hover:text-ink"
              >
                {link.label}
              </a>
            </li>
          ))}
          <li>
            <Link
              href="/marketplace"
              className="focus-ring text-sm text-muted hover:text-ink"
            >
              Marketplace
            </Link>
          </li>
        </ul>
      </div>

      <p className="mx-auto mt-10 max-w-content text-xs text-muted">
        © {new Date().getFullYear()} Salmaan Mukhtaar Xaashi. All rights reserved.
      </p>
    </footer>
  );
}
