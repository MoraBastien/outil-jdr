// Liste de tous les outils du site.
// Pour ajouter un outil : crée son composant dans src/tools/<id>/ puis ajoute une entrée ici.
// Il apparaîtra automatiquement dans la page admin pour être attribué aux joueurs.
import type { ComponentType, ReactNode } from "react";
import type { User } from "@/lib/db";
import DiceRoller from "./dice/DiceRoller";
import DiceWidget from "./dice/DiceWidget";
import HomunculusTool from "./homunculus/HomunculusTool";
import HomunculusWidget from "./homunculus/HomunculusWidget";
import CharacterTool from "./character/CharacterTool";
import CharacterWidget from "./character/CharacterWidget";
import { CHARACTER_TOOL_ID } from "./character/types";
import Planning from "./planning/Planning";
import VaultTool from "./vault/VaultTool";
import { VAULT_TOOL_ID } from "./vault/meta";
import Cemetery from "./cemetery/Cemetery";
import CemeteryWidget from "./cemetery/CemeteryWidget";
import { CEMETERY_TOOL_ID } from "./cemetery/meta";
import PlanningWidget from "./planning/PlanningWidget";
import { PLANNING_TOOL_ID } from "./planning/types";
import { TOOL_META as HOMUNCULUS_META } from "./homunculus-creator/meta";

/** Infos du joueur transmises à chaque outil (jamais son code). */
export type ToolPlayer = {
  name: string;
  isAdmin: boolean;
  /** Écho de l'homunculus (Atelier de Rigel), fixé par le MJ. */
  echo?: number;
  profile: { fields: { label: string; value: string }[]; notes: string };
};

/**
 * Widget affiché sur le tableau de bord (page d'accueil).
 * Composant serveur (peut être async et lire la base) ; il reçoit l'utilisateur connecté
 * et ne s'affiche que si l'utilisateur a accès à l'outil.
 * Attention : `user` contient le code d'accès. Ne jamais le passer tel quel à un composant client ;
 * le widget serveur transmet seulement ce dont la partie interactive a besoin.
 */
export type ToolWidget = {
  component: (props: { user: User }) => ReactNode | Promise<ReactNode>;
  /** Titre du panneau (par défaut : nom de l'outil). */
  title?: string;
  /** Titre affiché au MJ, s'il diffère (ex. « Mon personnage » → « Personnages de la table »). */
  adminTitle?: string;
  /** Occupe toute la largeur du tableau de bord. */
  wide?: boolean;
  /** Ordre d'affichage, du plus petit au plus grand (défaut 100). */
  order?: number;
};

export type ToolDefinition = {
  id: string; // identifiant stable, utilisé dans l'URL et dans db.json
  name: string;
  description: string;
  icon: string;
  component: ComponentType<{ player: ToolPlayer }>;
  /** Outil pleine largeur, sans carte ni titre de page (il affiche son propre en-tête). */
  wide?: boolean;
  /** Panneau facultatif pour le tableau de bord. */
  widget?: ToolWidget;
  /** Rubrique de la navigation. */
  section: NavSection;
  /** Libellé court (barre d'onglets du téléphone). */
  short: string;
};

/** Rubriques de la navigation, dans l'ordre d'affichage. */
export const NAV_SECTIONS = [
  { id: "campagne", label: "Campagne" },
  { id: "creation", label: "Création" },
  { id: "outils", label: "Outils" },
] as const;
export type NavSection = (typeof NAV_SECTIONS)[number]["id"];

export const TOOLS: ToolDefinition[] = [
  {
    id: "des",
    name: "Lanceur de dés",
    description: "Lance des dés (d4, d6, d20…) ou une formule comme 2d6+3.",
    icon: "🎲",
    component: DiceRoller,
    section: "outils",
    short: "Dés",
    widget: { component: DiceWidget, title: "Jet rapide", order: 30 },
  },
  {
    id: HOMUNCULUS_META.id, // "homunculus-creator"
    name: HOMUNCULUS_META.name,
    description: "Crée ton homunculus pour les one-shots de Rigel Sterne : matière, classe, dés, Anomalie, Fêlure.",
    icon: "✨",
    component: HomunculusTool,
    section: "creation",
    short: "Atelier",
    wide: true,
    widget: { component: HomunculusWidget, title: "Mes homunculus", order: 20 },
  },
  {
    id: PLANNING_TOOL_ID, // "planning"
    name: "Planning des sessions",
    description: "Le MJ propose des dates à chaque groupe, chacun indique ses disponibilités.",
    icon: "📅",
    component: Planning,
    section: "campagne",
    short: "Planning",
    widget: { component: PlanningWidget, title: "Prochaines sessions", wide: true, order: 10 },
  },
  {
    id: CHARACTER_TOOL_ID, // "personnage"
    name: "Fiche de personnage",
    description: "Ta fiche D&D (règles 2024) : création guidée, explications et montée de niveau pas à pas.",
    icon: "🛡️",
    component: CharacterTool,
    section: "campagne",
    short: "Fiche",
    wide: true,
    widget: { component: CharacterWidget, title: "Mes personnages", adminTitle: "Personnages de la table", wide: true, order: 5 },
  },
  {
    id: VAULT_TOOL_ID, // "coffre"
    name: "Coffre",
    description: "Expérimente la création de personnages et garde tes essais. Ici, c'est toi qui choisis le niveau.",
    icon: "🗝️",
    component: VaultTool,
    section: "creation",
    short: "Coffre",
    wide: true,
  },
  {
    id: CEMETERY_TOOL_ID, // "cimetiere"
    name: "Cimetière",
    description: "Les héros tombés de ta campagne, et leur épitaphe.",
    icon: "🪦",
    component: Cemetery,
    section: "campagne",
    short: "Cimetière",
    widget: { component: CemeteryWidget, title: "Cimetière", order: 40 },
  },
  // { id: "mon-outil", name: "Mon outil", description: "…", icon: "🗺️", component: MonOutil, widget: { component: MonWidget } },
];

export function getTool(id: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.id === id);
}
