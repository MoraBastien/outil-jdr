// Liste de tous les outils du site.
// Pour ajouter un outil : crée son composant dans src/tools/<id>/ puis ajoute une entrée ici.
// Il apparaîtra automatiquement dans la page admin pour être attribué aux joueurs.
import type { ComponentType } from "react";
import DiceRoller from "./dice/DiceRoller";
import HomunculusTool from "./homunculus/HomunculusTool";
import Planning from "./planning/Planning";
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

export type ToolDefinition = {
  id: string; // identifiant stable, utilisé dans l'URL et dans db.json
  name: string;
  description: string;
  icon: string;
  component: ComponentType<{ player: ToolPlayer }>;
  /** Outil pleine largeur, sans carte ni titre de page (il affiche son propre en-tête). */
  wide?: boolean;
};

export const TOOLS: ToolDefinition[] = [
  {
    id: "des",
    name: "Lanceur de dés",
    description: "Lance des dés (d4, d6, d20…) ou une formule comme 2d6+3.",
    icon: "🎲",
    component: DiceRoller,
  },
  {
    id: HOMUNCULUS_META.id, // "homunculus-creator"
    name: HOMUNCULUS_META.name,
    description: "Crée ton homunculus pour les one-shots de Rigel Sterne : matière, classe, dés, Anomalie, Fêlure.",
    icon: "✨",
    component: HomunculusTool,
    wide: true,
  },
  {
    id: PLANNING_TOOL_ID, // "planning"
    name: "Planning des sessions",
    description: "Le MJ propose des dates et des horaires, chacun indique ses disponibilités.",
    icon: "📅",
    component: Planning,
  },
  // { id: "mon-outil", name: "Mon outil", description: "…", icon: "🗺️", component: MonOutil },
];

export function getTool(id: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.id === id);
}
