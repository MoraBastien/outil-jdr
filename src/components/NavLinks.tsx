"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavLink = { href: string; label: string; icon: string };

export default function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="nav" aria-label="Navigation principale">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`nav-link${isActive(l.href) ? " active" : ""}`}
          aria-current={isActive(l.href) ? "page" : undefined}
          title={l.label}
        >
          {/* Pastille de l'onglet actif : nommée pour glisser d'un onglet à l'autre entre deux pages. */}
          {isActive(l.href) && <span className="nav-pill" aria-hidden="true" />}
          <span className="nav-icon" aria-hidden="true">
            {l.icon}
          </span>
          <span className="nav-label">{l.label}</span>
        </Link>
      ))}
    </nav>
  );
}
