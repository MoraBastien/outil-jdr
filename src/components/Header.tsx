// Navigation du site (composant serveur) : calcule les liens auxquels l'utilisateur a droit,
// puis délègue l'affichage à AppNav (barre latérale, barre d'onglets mobile, recherche Ctrl+K).
import { canUseTool } from "@/lib/auth";
import { getUsers, type User } from "@/lib/db";
import { NAV_SECTIONS, TOOLS } from "@/tools/registry";
import AppNav, { type NavGroup, type NavItem } from "./AppNav";

/** Ordre d'affichage des outils (les plus utilisés d'abord, c'est aussi l'ordre de la barre mobile). */
const PRIORITY = ["personnage", "planning", "chronique", "quetes", "cimetiere", "coffre", "homunculus-creator", "des"];
const rank = (id: string) => (PRIORITY.includes(id) ? PRIORITY.indexOf(id) : PRIORITY.length);

export default async function Header({ user }: { user: User }) {
  const isAdmin = user.role === "admin";
  const tools = TOOLS.filter((t) => canUseTool(user, t.id)).sort((a, b) => rank(a.id) - rank(b.id));
  const toItem = (t: (typeof tools)[number]): NavItem => ({ href: `/outils/${t.id}`, label: t.name, short: t.short, icon: t.icon, hint: t.description });

  const home: NavItem = { href: "/accueil", label: "Tableau de bord", short: "Accueil", icon: "⌂", hint: "Ton résumé : personnages, sessions, cimetière." };
  const groups: NavGroup[] = [
    { label: null, items: [home] },
    ...NAV_SECTIONS.map((s) => ({ label: s.label, items: tools.filter((t) => t.section === s.id).map(toItem) })).filter((g) => g.items.length > 0),
    ...(isAdmin
      ? [{ label: "Maître du jeu", items: [{ href: "/admin", label: "Joueurs & groupes", short: "Admin", icon: "⚙︎", hint: "Codes, groupes, outils des joueurs." }] }]
      : []),
  ];

  // Barre mobile : l'accueil + les 3 premières destinations (le reste est dans « Menu »).
  const primary = [home, ...groups.slice(1).flatMap((g) => g.items)].slice(0, 4);

  // Recherche du MJ : accès direct à la page de chaque joueur (nom et id seulement, jamais le code).
  const players = isAdmin
    ? (await getUsers())
        .filter((u) => u.role === "player")
        .map((u) => ({ href: `/admin/joueurs/${u.id}`, label: u.name }))
        .sort((a, b) => a.label.localeCompare(b.label, "fr"))
    : [];

  return <AppNav groups={groups} primary={primary} players={players} user={{ name: isAdmin ? "Maître du jeu" : user.name, role: isAdmin ? "MJ" : "Joueur" }} />;
}
