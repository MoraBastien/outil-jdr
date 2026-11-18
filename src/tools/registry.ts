// Liste de tous les outils du site.
// Pour ajouter un outil : crée son composant dans src/tools/<id>/ puis ajoute une entrée ici.
// Il apparaîtra automatiquement dans la page admin pour être attribué aux joueurs.
import type { ComponentType, ReactNode } from "react";
import type { User } from "@/lib/db";
import DiceRoller from "./dice/DiceRoller";
import DiceWidget from "./dice/DiceWidget";
import HomunculusTool from "./homunculus/HomunculusTool";
import HomunculusWidget from "./homunculus/HomunculusWidget";
import Planning from "./planning/Planning";
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
};

export const TOOLS: ToolDefinition[] = [
  {
    id: "des",
    name: "Lanceur de dés",
    description: "Lance des dés (d4, d6, d20…) ou une formule comme 2d6+3.",
    icon: "🎲",
    component: DiceRoller,
    widget: { component: DiceWidget, title: "Jet rapide", order: 30 },
  },
  {
    id: HOMUNCULUS_META.id, // "homunculus-creator"
    name: HOMUNCULUS_META.name,
    description: "Crée ton homunculus pour les one-shots de Rigel Sterne : matière, classe, dés, Anomalie, Fêlure.",
    icon: "✨",
    component: HomunculusTool,
    wide: true,
    widget: { component: HomunculusWidget, title: "Mes homunculus", order: 20 },
  },
  {
    id: PLANNING_TOOL_ID, // "planning"
    name: "Planning des sessions",
    description: "Le MJ propose des dates et des horaires, chacun indique ses disponibilités.",
    icon: "📅",
    component: Planning,
    widget: { component: PlanningWidget, title: "Prochaines sessions", wide: true, order: 10 },
  },
  // { id: "mon-outil", name: "Mon outil", description: "…", icon: "🗺️", component: MonOutil, widget: { component: MonWidget } },
];

export function getTool(id: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.id === id);
}
