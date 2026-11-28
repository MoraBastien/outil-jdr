// Liste de tous les outils du site.
// Pour ajouter un outil : crée son composant dans src/tools/<id>/ puis ajoute une entrée ici.
// Il apparaîtra automatiquement dans la page admin pour être attribué aux joueurs.
import type { ComponentType, ReactNode } from "react";
import type { User } from "@/lib/db";
import DiceRoller from "./dice/DiceRoller";
import DiceWidget from "./dice/DiceWidget";
import HomunculusEntry from "./homunculus/HomunculusEntry";
import HomunculusWidget from "./homunculus/HomunculusWidget";
import CharacterHost from "./character/CharacterHost";
import CharacterWidget from "./character/CharacterWidget";
import GroupWidget from "./character/GroupWidget";
import { CHARACTER_TOOL_ID } from "./character/types";
import Planning from "./planning/Planning";
import VaultTool from "./vault/VaultTool";
import { VAULT_TOOL_ID } from "./vault/meta";
import Cemetery from "./cemetery/Cemetery";
import CemeteryWidget from "./cemetery/CemeteryWidget";
import { CEMETERY_TOOL_ID } from "./cemetery/meta";
import Chronicle from "./chronicle/Chronicle";
import { getChronicleAction } from "./chronicle/actions";
import { getVaultAction } from "./vault/actions";
import { getMarketAction } from "./marche/actions";
import { getPlanningAction } from "./planning/actions";
import { getCemeteryAction } from "./cemetery/actions";
import { getCharacterViewAction } from "./character/actions";
import { getCrewAction } from "./equipage/actions";
import { getMapAction } from "./carte/actions";
import { getQuestsAction } from "./quests/actions";
import ChronicleWidget from "./chronicle/ChronicleWidget";
import QuestsTool from "./quests/QuestsTool";
import QuestsWidget from "./quests/QuestsWidget";
import { QUESTS_TOOL_ID } from "./quests/meta";
import { CHRONICLE_TOOL_ID } from "./chronicle/meta";
import PlanningWidget from "./planning/PlanningWidget";
import { PLANNING_TOOL_ID } from "./planning/types";
import { TOOL_META as HOMUNCULUS_META } from "./homunculus-creator/meta";
import Grimoire from "./grimoire/Grimoire";
import { GRIMOIRE_TOOL_ID } from "./grimoire/meta";
import AideMemoire, { AIDE_MEMOIRE_TOOL_ID } from "./aide-memoire/AideMemoire";
import MapTool from "./carte/MapTool";
import { CARTE_TOOL_ID } from "./carte/meta";
import Market from "./marche/Market";
import { MARCHE_TOOL_ID } from "./marche/meta";
import CrewTool from "./equipage/CrewTool";
import { EQUIPAGE_TOOL_ID } from "./equipage/meta";

/** Infos du joueur transmises à chaque outil (jamais son code). */
export type ToolPlayer = {
  name: string;
  isAdmin: boolean;
  /** Écho de l'homunculus (Atelier de Rigel), fixé par le MJ. */
  echo?: number;
  /** Fiche de l'entité (joueurs de l'Atelier) : remplace la fiche D&D. Nom neutre, car visible dans le code client. */
  altSheet?: { name: string; echo: number; atelierHref: string };
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
  /** Icône du panneau (par défaut : celle de l'outil). */
  icon?: string;
  /** Identifiant du panneau, s'il n'est pas le principal de l'outil (glyphe du thème « Astre déchu »). */
  id?: string;
  /** Réservé aux joueurs (masqué pour le MJ). */
  playersOnly?: boolean;
};

export type ToolDefinition = {
  id: string; // identifiant stable, utilisé dans l'URL et dans db.json
  name: string;
  description: string;
  icon: string;
  // `initial` : les données préchargées par `preload` (absent si l'outil n'en a pas) ; leur type dépend de l'outil.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<{ player: ToolPlayer; initial?: any }>;
  /**
   * Données de l'outil lues côté serveur avant le rendu de la page, passées au composant en `initial` :
   * l'outil s'affiche avec son contenu dès le HTML, sans attendre le JavaScript puis un aller-retour serveur.
   */
  preload?: () => Promise<unknown>;
  /** Outil pleine largeur, sans carte ni titre de page (il affiche son propre en-tête). */
  wide?: boolean;
  /** Panneau facultatif pour le tableau de bord. */
  widget?: ToolWidget;
  /** Panneaux supplémentaires (ex. la chronique : « Dernière séance » et « Quêtes en cours »). */
  extraWidgets?: ToolWidget[];
  /** Rubrique de la navigation. */
  section: NavSection;
  /** Libellé court (barre d'onglets du téléphone). */
  short: string;
};

/** Rubriques de la navigation, dans l'ordre d'affichage. */
export const NAV_SECTIONS = [
  { id: "histoire", label: "L'histoire" },
  { id: "personnage", label: "Mon personnage" },
  { id: "escale", label: "L'escale" },
  { id: "creation", label: "Création" },
] as const;
export type NavSection = (typeof NAV_SECTIONS)[number]["id"];

export const TOOLS: ToolDefinition[] = [
  {
    id: "des",
    name: "Lanceur de dés",
    description: "Lance des dés (d4, d6, d20…) ou une formule comme 2d6+3.",
    icon: "🎲",
    component: DiceRoller,
    section: "escale",
    short: "Dés",
    widget: { component: DiceWidget, title: "Jet rapide", order: 30 },
  },
  {
    id: HOMUNCULUS_META.id, // "homunculus-creator"
    name: HOMUNCULUS_META.name,
    description: "Crée ton homunculus pour les one-shots de Rigel Sterne : matière, classe, dés, Anomalie, Fêlure.",
    icon: "✨",
    component: HomunculusEntry,
    section: "creation",
    short: "Atelier",
    wide: true,
    widget: { component: HomunculusWidget, title: "Mes homunculus", order: 20 },
  },
  {
    id: PLANNING_TOOL_ID, // "planning"
    name: "Planning des séances",
    description: "Le MJ propose des dates de séance à chaque groupe, chacun indique ses disponibilités.",
    icon: "📅",
    component: Planning,
    preload: getPlanningAction,
    section: "histoire",
    short: "Planning",
    widget: { component: PlanningWidget, title: "Prochaines sessions", wide: true, order: 10 },
  },
  {
    id: CHARACTER_TOOL_ID, // "personnage"
    name: "Fiche de personnage",
    description: "Ta fiche D&D (règles 2024) : création guidée, explications et montée de niveau pas à pas.",
    icon: "🛡️",
    component: CharacterHost,
    preload: getCharacterViewAction,
    section: "personnage",
    short: "Fiche",
    wide: true,
    widget: { component: CharacterWidget, title: "Mes personnages", adminTitle: "Personnages de la table", wide: true, order: 5 },
    // Juste sous « Mes personnages » : les personnages en jeu de tout le groupe (le MJ a déjà la table complète).
    extraWidgets: [{ id: "groupe", component: GroupWidget, title: "Mon groupe", icon: "👥", wide: true, order: 6, playersOnly: true }],
  },
  {
    id: VAULT_TOOL_ID, // "coffre"
    name: "Coffre",
    description: "Expérimente la création de personnages et garde tes essais. Ici, c'est toi qui choisis le niveau.",
    icon: "🗝️",
    component: VaultTool,
    preload: getVaultAction,
    section: "creation",
    short: "Coffre",
    wide: true,
  },
  {
    id: CHRONICLE_TOOL_ID, // "chronique"
    name: "Chronique",
    description: "La frise des séances : résumés et moments marquants de ta campagne.",
    icon: "📖",
    component: Chronicle,
    preload: getChronicleAction,
    section: "histoire",
    short: "Chronique",
    widget: { component: ChronicleWidget, title: "Dernière séance", order: 15 },
  },
  {
    id: QUESTS_TOOL_ID, // "quetes"
    name: "Quêtes",
    description: "Le journal de quêtes du groupe : en cours, pistes et quêtes terminées.",
    icon: "📜",
    component: QuestsTool,
    preload: getQuestsAction,
    section: "histoire",
    short: "Quêtes",
    widget: { component: QuestsWidget, title: "Quêtes en cours", order: 16 },
  },
  {
    id: CEMETERY_TOOL_ID, // "cimetiere"
    name: "Cimetière",
    description: "Les héros tombés de ta campagne, et leur épitaphe.",
    icon: "🪦",
    component: Cemetery,
    preload: getCemeteryAction,
    section: "personnage",
    short: "Cimetière",
    widget: { component: CemeteryWidget, title: "Cimetière", order: 40 },
  },
  {
    id: GRIMOIRE_TOOL_ID, // "grimoire"
    name: "Grimoire",
    description: "Les sorts de niveau 0 à 2 : recherche, détail, et le choix des sorts de ton personnage.",
    icon: "📕",
    component: Grimoire,
    section: "personnage",
    short: "Grimoire",
    wide: true,
  },
  {
    id: AIDE_MEMOIRE_TOOL_ID, // "aide-memoire"
    name: "Aide-mémoire",
    description: "Les règles essentielles sur une page : ton tour, les actions, les jets, la mort et les états.",
    icon: "🧭",
    component: AideMemoire,
    section: "personnage",
    short: "Règles",
    wide: true,
  },
  {
    id: CARTE_TOOL_ID, // "carte"
    name: "La Carte",
    description: "L'archipel : les îles visitées, la route du Navire, l'escale actuelle et la prochaine.",
    icon: "🗺️",
    component: MapTool,
    preload: getMapAction,
    section: "histoire",
    short: "Carte",
    wide: true,
  },
  {
    id: MARCHE_TOOL_ID, // "marche"
    name: "Le Marché",
    description: "Les échoppes de l'île où mouille le Navire : achète avec les pièces de ta fiche.",
    icon: "⚖️",
    component: Market,
    preload: getMarketAction,
    section: "escale",
    short: "Marché",
    wide: true,
  },
  {
    id: EQUIPAGE_TOOL_ID, // "equipage"
    name: "L'Équipage",
    description: "Les marins du Navire : qui tient la barre, qui fait la cuisine, qui grimpe à la vigie.",
    icon: "⚓",
    component: CrewTool,
    preload: getCrewAction,
    section: "escale",
    short: "Équipage",
    wide: true,
  },
  // { id: "mon-outil", name: "Mon outil", description: "…", icon: "🗺️", component: MonOutil, widget: { component: MonWidget } },
];

export function getTool(id: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.id === id);
}
