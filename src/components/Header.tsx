// Navigation du site (composant serveur) : calcule les liens auxquels l'utilisateur a droit,
// puis délègue l'affichage à AppNav (barre latérale, barre d'onglets mobile, recherche Ctrl+K).
import { canUseTool } from "@/lib/auth";
import { getUsers, type User } from "@/lib/db";
import { NAV_SECTIONS, TOOLS } from "@/tools/registry";
import AppNav, { type NavGroup, type NavItem } from "./AppNav";
import { entitySheetOf } from "@/tools/homunculus/entity";
import { ASTRAL_LABELS, NAV_GLYPHS } from "@/tools/homunculus/astral/theme";
import SkyEntry from "@/tools/homunculus/astral/SkyEntry";

/** Ordre d'affichage des outils (les plus utilisés d'abord, c'est aussi l'ordre de la barre mobile). */
const PRIORITY = ["personnage", "planning", "chronique", "quetes", "cimetiere", "coffre", "homunculus-creator", "grimoire", "aide-memoire", "des"];
const rank = (id: string) => (PRIORITY.includes(id) ? PRIORITY.indexOf(id) : PRIORITY.length);

export default async function Header({ user }: { user: User }) {
  const isAdmin = user.role === "admin";
  const tools = TOOLS.filter((t) => canUseTool(user, t.id)).sort((a, b) => rank(a.id) - rank(b.id));
  // Joueur de l'Atelier : thème « Astre déchu » (glyphes planétaires, « Observatoire », « Mon entité »).
  const entity = entitySheetOf(user);
  const toItem = (t: (typeof tools)[number]): NavItem => {
    const item = { href: `/outils/${t.id}`, label: t.name, short: t.short, icon: t.icon, hint: t.description };
    if (!entity) return item;
    const own = t.id === "personnage" ? { label: ASTRAL_LABELS.personnage, short: "Entité", hint: "La fiche de ton entité : nom et niveau d'Écho." } : {};
    return { ...item, icon: NAV_GLYPHS[t.id] ?? item.icon, ...own };
  };

  const home: NavItem = entity
    ? { href: "/accueil", label: ASTRAL_LABELS.home, short: "Ciel", icon: NAV_GLYPHS.home, hint: "Ton ciel : ton entité, tes homunculus, les séances." }
    : { href: "/accueil", label: "Tableau de bord", short: "Accueil", icon: "⌂", hint: "Ton résumé : personnages, sessions, cimetière." };
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

  const nav = <AppNav groups={groups} primary={primary} players={players} user={{ name: isAdmin ? "Maître du jeu" : user.name, role: isAdmin ? "MJ" : "Joueur" }} />;
  if (!entity) return nav;
  return (
    <>
      {/* Feuille servie seulement à ce joueur (route qui vérifie la session) ; ?e= la renouvelle quand l'Écho change. */}
      <link rel="stylesheet" href={`/s/perso.css?e=${entity.echo}`} precedence="high" />
      <SkyEntry level={entity.echo} />
      {nav}
    </>
  );
}
