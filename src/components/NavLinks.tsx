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
        >
          <span className="nav-icon" aria-hidden="true">
            {l.icon}
          </span>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
