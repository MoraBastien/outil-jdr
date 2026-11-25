"use client";
// Navigation : barre latérale (ordinateur), barre du haut + onglets du bas + tiroir « Menu » (téléphone),
// et recherche rapide Ctrl+K / ⌘K (cmdk).

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Command } from "cmdk";
import { logout } from "@/app/actions";

export type NavItem = { href: string; label: string; short: string; icon: string; hint?: string; glyph?: string };

/** Icône d'un lien : tracé SVG au trait (`glyph`) ou, à défaut, le caractère `icon` (glyphes des Entités). */
function ItemIcon({ item }: { item: Pick<NavItem, "icon" | "glyph"> }) {
  if (!item.glyph) return <>{item.icon}</>;
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={item.glyph} />
    </svg>
  );
}
export type NavGroup = { label: string | null; items: NavItem[] };
type Props = {
  groups: NavGroup[];
  primary: NavItem[];
  players: { href: string; label: string }[];
  user: { name: string; role: string };
  /** Icône au trait du bouton « Menu » (absente pour les Entités, qui gardent ☰). */
  menuGlyph?: string;
};

const useActive = () => {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
};

function NavLinks({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const isActive = useActive();
  return (
    <>
      {groups.map((g, i) => (
        <div key={g.label ?? i} className="sb-group">
          {g.label && <p className="sb-section">{g.label}</p>}
          {g.items.map((it) => {
            const active = isActive(it.href);
            return (
              <Link key={it.href} href={it.href} className={`sb-link${active ? " active" : ""}`} aria-current={active ? "page" : undefined} onClick={onNavigate}>
                {active && <span className="nav-pill" aria-hidden="true" />}
                <span className="sb-icon" aria-hidden="true">
                  <ItemIcon item={it} />
                </span>
                <span className="sb-label">{it.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}

function UserCard({ user }: { user: Props["user"] }) {
  return (
    <div className="sb-user">
      <span className="avatar" aria-hidden="true">
        {user.name.trim().charAt(0).toUpperCase() || "?"}
      </span>
      <span className="stack-xs sb-user-text">
        <strong>{user.name}</strong>
        <span className="muted small">{user.role}</span>
      </span>
      <form action={logout}>
        <button className="btn btn-ghost btn-small" title="Se déconnecter">
          Quitter
        </button>
      </form>
    </div>
  );
}

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

const Brand = () => (
  <Link href="/accueil" className="brand">
    <span className="brand-mark" aria-hidden="true">
      ✦
    </span>
    <span className="brand-name">Le Navire</span>
  </Link>
);

export default function AppNav({ groups, primary, players, user, menuGlyph }: Props) {
  const isActive = useActive();
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mac, setMac] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);

  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform)), []);

  // Ctrl+K / ⌘K ouvre la recherche.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Le tiroir se ferme quand on change de page.
  useEffect(() => drawer.current?.close(), [pathname]);

  const openDrawer = () => drawer.current?.showModal();
  const closeDrawer = () => drawer.current?.close();
  const menuActive = !primary.some((p) => isActive(p.href));
  const shortcut = mac ? "⌘K" : "Ctrl K";

  return (
    <>
      {/* ---------- Ordinateur : barre latérale ---------- */}
      <aside className="sidebar" aria-label="Navigation principale">
        <Brand />
        <button type="button" className="sb-search" onClick={() => setPaletteOpen(true)}>
          <SearchIcon />
          <span>Aller à…</span>
          <kbd>{shortcut}</kbd>
        </button>
        <nav className="sb-nav">
          <NavLinks groups={groups} />
        </nav>
        <UserCard user={user} />
      </aside>

      {/* ---------- Téléphone / tablette ---------- */}
      <header className="topbar">
        <Brand />
        <button type="button" className="icon-btn topbar-search" onClick={() => setPaletteOpen(true)} aria-label="Rechercher une page">
          <SearchIcon />
        </button>
      </header>

      <nav className="tabbar" aria-label="Navigation rapide">
        {primary.map((it) => {
          const active = isActive(it.href);
          return (
            <Link key={it.href} href={it.href} className={`tab${active ? " active" : ""}`} aria-current={active ? "page" : undefined}>
              {active && <span className="tab-pill" aria-hidden="true" />}
              <span className="tab-icon" aria-hidden="true">
                <ItemIcon item={it} />
              </span>
              <span className="tab-label">{it.short}</span>
            </Link>
          );
        })}
        <button type="button" className={`tab${menuActive ? " active" : ""}`} onClick={openDrawer} aria-haspopup="dialog">
          {menuActive && <span className="tab-pill" aria-hidden="true" />}
          <span className="tab-icon" aria-hidden="true">
            <ItemIcon item={{ icon: "☰", glyph: menuGlyph }} />
          </span>
          <span className="tab-label">Menu</span>
        </button>
      </nav>

      <dialog
        ref={drawer}
        className="drawer"
        aria-label="Menu"
        onClick={(e) => {
          // Clic sur le fond : on ferme.
          if (e.target === e.currentTarget) closeDrawer();
        }}
      >
        <div className="drawer-inner">
          <div className="drawer-handle" aria-hidden="true" />
          <div className="drawer-head">
            <strong>Menu</strong>
            <button type="button" className="icon-btn" onClick={closeDrawer} aria-label="Fermer le menu">
              ×
            </button>
          </div>
          <nav className="sb-nav">
            <NavLinks groups={groups} onNavigate={closeDrawer} />
          </nav>
          <UserCard user={user} />
        </div>
      </dialog>

      {/* ---------- Recherche rapide ---------- */}
      <Palette open={paletteOpen} onOpenChange={setPaletteOpen} groups={groups} players={players} />
    </>
  );
}

function Palette({
  open,
  onOpenChange,
  groups,
  players,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  groups: NavGroup[];
  players: Props["players"];
}) {
  const router = useRouter();
  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };
  return (
    <Command.Dialog open={open} onOpenChange={onOpenChange} label="Aller à une page" className="palette" overlayClassName="palette-overlay" contentClassName="palette-content">
      <Command.Input placeholder="Aller à… (fiche, planning, un joueur…)" className="palette-input" />
      <Command.List className="palette-list">
        <Command.Empty className="palette-empty">Rien trouvé.</Command.Empty>
        {groups.map((g, i) => (
          <Command.Group key={g.label ?? i} heading={g.label ?? "Général"}>
            {g.items.map((it) => (
              <Command.Item key={it.href} value={it.label} keywords={[it.short]} onSelect={() => go(it.href)} className="palette-item">
                <span className="sb-icon" aria-hidden="true">
                  <ItemIcon item={it} />
                </span>
                <span className="stack-xs">
                  <span>{it.label}</span>
                  {it.hint && <span className="muted small palette-hint">{it.hint}</span>}
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        ))}
        {players.length > 0 && (
          <Command.Group heading="Joueurs">
            {players.map((p) => (
              <Command.Item key={p.href} value={`Joueur ${p.label}`} keywords={[p.label]} onSelect={() => go(p.href)} className="palette-item">
                <span className="avatar" aria-hidden="true">
                  {p.label.charAt(0).toUpperCase()}
                </span>
                <span>{p.label}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
      <div className="palette-foot muted small">
        <span>
          <kbd>↑</kbd> <kbd>↓</kbd> choisir
        </span>
        <span>
          <kbd>Entrée</kbd> ouvrir
        </span>
        <span>
          <kbd>Échap</kbd> fermer
        </span>
      </div>
    </Command.Dialog>
  );
}
