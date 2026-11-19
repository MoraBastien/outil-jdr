// Types de la fiche de personnage D&D 5.5 (règles 2024). Partagés client + serveur.

export const CHARACTER_TOOL_ID = "personnage";
export const MAX_LEVEL = 4;

export type Ability = "str" | "dex" | "con" | "int" | "wis" | "cha";
export type SkillId =
  | "acrobatics" | "animal" | "arcana" | "athletics" | "deception" | "history"
  | "insight" | "intimidation" | "investigation" | "medicine" | "nature" | "perception"
  | "performance" | "persuasion" | "religion" | "sleight" | "stealth" | "survival";

export type Scores = Record<Ability, number>;

/** Option d'un choix (style de combat, ordre divin, métamagie…). */
export type Option = { id: string; name: string; desc: string };

/**
 * Choix demandé par une capacité. Toutes les réponses ont la forme `string[]`, rangées sous `key`.
 * - options : `count` options parmi `options` (gardées dans `classChoices[key]`)
 * - skills : nouvelles maîtrises de compétence parmi `from`
 * - expertise : expertise sur des compétences déjà maîtrisées (parmi `from` si précisé)
 * - subclass : la sous-classe (niveau 3)
 * - asi : amélioration de caractéristiques ou don (niveau 4)
 */
export type Choice =
  | { kind: "options"; key: string; label: string; count: number; options: Option[] }
  | { kind: "skills"; key: string; label: string; count: number; from: SkillId[] | "any" }
  | { kind: "expertise"; key: string; label: string; count: number; from?: SkillId[] }
  | { kind: "subclass"; key: "subclass"; label: string }
  | { kind: "asi"; key: "asi"; label: string };

export type Feature = {
  name: string;
  /** Ce que fait la capacité, en clair. */
  desc: string;
  /** Conseil pour bien l'utiliser (affiché dans l'aide). */
  tip?: string;
  choice?: Choice;
};

export type Answers = Record<string, string[]>;

export type Weapon = {
  key: string;
  name: string;
  ability: "str" | "dex";
  proficient: boolean;
  damage: string;
  notes: string;
};

export type LevelUpEntry = {
  level: number;
  at: string;
  /** Ce qui a changé, en phrases courtes. */
  summary: string[];
  hpGain: number;
};

export type CharacterState = {
  version: 1;
  name: string;
  classId: string;
  subclassId: string | null;
  speciesId: string;
  /** Lignée (elfe, gnome, tieffelin), ascendance (drakéide, goliath), taille… */
  speciesOptions: Record<string, string>;
  backgroundId: string;
  level: number;

  /** "free" : valeurs saisies librement (3 à 18), seulement dans le coffre. */
  scoreMethod: "standard" | "pointbuy" | "free";
  /** Valeurs choisies (tableau standard ou achat de points), avant bonus. */
  baseScores: Scores;
  /** Bonus d'historique : +2/+1 ou +1/+1/+1. */
  backgroundBonus: Partial<Scores>;
  /** Bonus gagnés en montant de niveau (amélioration de caractéristiques, dons). */
  asiBonus: Partial<Scores>;

  skills: SkillId[];
  expertise: SkillId[];
  /** Dons : id + origine (historique, espèce, niveau 4). */
  feats: { id: string; source: string; ability?: Ability }[];
  /** Choix de classe : style de combat, ordre divin, métamagie… */
  classChoices: Record<string, string[]>;
  /** PV gagnés à chaque niveau après le 1er (dé, sans la CON). */
  hpRolls: number[];

  armorId: string;
  shield: boolean;
  weapons: Weapon[];
  cantrips: string;
  spells: string;
  equipment: string;
  coins: { pp: number; po: number; pe: number; pa: number; pc: number };
  languages: string;
  tools: string;
  masteries: string;
  identity: {
    alignment: string;
    appearance: string;
    personality: string;
    backstory: string;
    ideals?: string;
    bonds?: string;
    flaws?: string;
  };
  notes: string;

  /** État en jeu, modifié pendant les parties. */
  play: {
    hp: number;
    tempHp: number;
    hitDiceSpent: number;
    deathSuccess: number;
    deathFail: number;
    slotsUsed: number[];
    inspiration: boolean;
  };

  history: LevelUpEntry[];

  /**
   * Fiche venue d'un autre outil (l'homunculus actif d'un joueur de l'Atelier, voir tools/homunculus/transfer.ts).
   * Pas d'espèce ni d'historique ; ses passifs s'ajoutent à l'onglet Capacités. Le niveau suit l'Écho :
   * pas de montée de niveau ici. Les textes sont écrits par le serveur (le code client reste neutre).
   */
  extra?: ExtraOrigin;
};

export type ExtraOrigin = {
  /** Identifiant de la fiche d'origine (pour la mise à jour et pour ne pas la réactiver après sa mort). */
  sourceId: string;
  /** Sous-titre du bandeau, à la place de l'espèce et de l'historique. */
  tag: string;
  /** Titre de la section des passifs dans l'onglet Capacités. */
  title: string;
  features: { name: string; desc: string; source: string }[];
};

export type CharacterRecord = {
  id: string;
  ownerId: string;
  /** Groupe (campagne) de la fiche. */
  groupId: string | null;
  ownerName: string;
  state: CharacterState;
  /** Niveau autorisé par le MJ : si > state.level, le joueur peut monter de niveau. */
  grantedLevel: number;
  /** Choix du prochain niveau préparés à l'avance (seulement s'ils visent bien le niveau suivant). */
  prepared?: PreparedPlan | null;
  /** Ce qu'il reste à reporter dans Foundry après la dernière montée de niveau. */
  foundryTodo?: { level: number; items: { text: string; done: boolean }[] } | null;
  updatedAt: string;
};

export type HpMode = "average" | "roll";
export type PreparedPlan = { level: number; answers: Answers; hpMode: HpMode; at: string };

/** Champs que le joueur peut modifier librement (le reste passe par la création / la montée de niveau). */
export const FREE_FIELDS = [
  "name", "armorId", "shield", "weapons", "cantrips", "spells", "equipment", "coins",
  "languages", "tools", "masteries", "identity", "notes", "play",
] as const;
export type FreeField = (typeof FREE_FIELDS)[number];
