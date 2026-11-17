import Link from "next/link";
import { logout } from "@/app/actions";
import type { User } from "@/lib/db";

export default function Header({ user }: { user: User }) {
  return (
    <header className="header">
      <Link href="/accueil" className="brand">
        Outils de la table
      </Link>
      <nav className="nav">
        {user.role === "admin" && <Link href="/admin">Administration</Link>}
        <Link href="/accueil">{user.role === "admin" ? "Outils" : user.name}</Link>
        <form action={logout}>
          <button className="btn btn-ghost btn-small">Déconnexion</button>
        </form>
      </nav>
    </header>
  );
}
