import Link from "next/link";
import { logout } from "@/app/actions";
import { canUseTool } from "@/lib/auth";
import type { User } from "@/lib/db";
import { TOOLS } from "@/tools/registry";
import NavLinks, { type NavLink } from "./NavLinks";

export default function Header({ user }: { user: User }) {
  const isAdmin = user.role === "admin";
  const links: NavLink[] = [
    { href: "/accueil", label: "Accueil", icon: "⌂" },
    ...TOOLS.filter((t) => canUseTool(user, t.id)).map((t) => ({ href: `/outils/${t.id}`, label: t.name, icon: t.icon })),
    ...(isAdmin ? [{ href: "/admin", label: "Joueurs", icon: "⚙︎" }] : []),
  ];

  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/accueil" className="brand">
          <span className="brand-mark" aria-hidden="true">
            ✦
          </span>
          <span className="brand-name">Outils de la table</span>
        </Link>

        <NavLinks links={links} />

        <div className="user-menu">
          <span className="avatar" aria-hidden="true">
            {user.name.trim().charAt(0).toUpperCase() || "?"}
          </span>
          <span className="user-name">{isAdmin ? "MJ" : user.name}</span>
          <form action={logout}>
            <button className="btn btn-ghost btn-small" title="Se déconnecter">
              Quitter
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
