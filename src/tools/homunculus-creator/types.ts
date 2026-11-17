export type StatId = "for" | "dex" | "con" | "int" | "sag" | "cha";

export interface StatDef {
  id: StatId;
  abbr: string;
  nom: string;
}

export interface CompetenceDef {
  id: string;
  nom: string;
}

export type MatiereType = "RP" | "Défense" | "Dégâts" | "Utilité" | "Soutien";

/** Matière = « race » de l'homunculus : une capacité + une faiblesse, débloquée par palier d'Écho. */
export interface Matiere {
  id: string;
  nom: string;
  palier: string;
  /** Écho minimum pour la choisir (premier Écho du palier). */
  echoMin: number;
  type: MatiereType;
  capacite: string;
  effet: string;
  faiblesse: string;
}

export interface ChoixOption {
  id: string;
  nom: string;
  description?: string;
}

/**
 * Un choix de classe à faire (sous-classe, style de combat, expertise, métamagie...).
 * `source: "competences"` : les options sont les compétences déjà maîtrisées par l'homunculus (expertise).
 */
export interface ClasseChoix {
  id: string;
  niveau: number;
  titre: string;
  nombre: number;
  options?: ChoixOption[];
  source?: "competences";
}

export interface ClasseTrait {
  niveau: number;
  nom: string;
  description: string;
}

export interface ClasseDef {
  id: string;
  nom: string;
  /** Dé de vie (6, 8, 10, 12). */
  dv: number;
  /** Caractéristiques par ordre de priorité, pour la répartition automatique. */
  priorite: StatId[];
  sauvegardes: string;
  armures: string;
  armes: string;
  nbCompetences: number;
  /** Ids de compétences au choix, ou « toutes ». */
  competences: string[] | "toutes";
  traits: ClasseTrait[];
  choix: ClasseChoix[];
  /** Une ligne par Écho (1 à 4) : tours de magie, sorts, emplacements. */
  magie?: string[];
}

export type AnomalieFamille = "Combat" | "Exploration" | "Social";

/** Anomalie = « background » : un passif fixe, plus deux compétences au choix. */
export interface Anomalie {
  id: string;
  famille: AnomalieFamille;
  nom: string;
  passif: string;
  /** Clin d'œil narratif (« ce que la cuve a laissé de travers »). */
  cuve: string;
  provisoire?: boolean;
}

/** Fêlure : trait de personnalité tiré au d20 (index + 1 = résultat du dé). */
export interface Felure {
  id: string;
  nom: string;
  description: string;
  provisoire?: boolean;
}

export interface ConstellationDef {
  id: string;
  nom: string;
  alpha: string;
  alphaIndex: number;
  stars: [number, number][];
  lines: [number, number][];
}

/** État sérialisable d'un homunculus en cours de création (c'est ce qu'on stocke en base). */
export interface HomunculusState {
  schemaVersion: 1;
  /** Identifiant de la fiche. Vide tant que le composant n'est pas monté (voir README, hydratation). */
  id: string;
  echo: number;
  matiereId: string | null;
  classeId: string | null;
  /** Six résultats de 4d5 (le plus bas retiré), triés par ordre décroissant. */
  pool: number[] | null;
  /** Pour chaque caractéristique (ordre de STATS) : index dans `pool`, ou null. */
  assign: (number | null)[];
  /** Points d'augmentation de caractéristiques dépensés, par caractéristique. */
  bonus: number[];
  competencesAnomalie: string[];
  competencesClasse: string[];
  /** Choix de classe : id du choix -> ids d'options (ou de compétences). */
  choix: Record<string, string[]>;
  anomalieId: string | null;
  felureId: string | null;
  /** Nombre de tirages de caractéristiques (relances = jets - 1). */
  jets: number;
  /** Nombre de tirages de Fêlure. */
  felJets: number;
  nom: string;
  marque: string;
  mission: string;
  constellationId: string;
}

export interface DerivedSheet {
  pb: number;
  asi: number;
  asiUsed: number;
  stats: { id: StatId; base: number | null; final: number | null; mod: number | null }[];
  pv: number | null;
  dd: number | null;
  initiative: number | null;
  /** Les 6 étapes dans l'ordre : matière, classe (+ choix), caractéristiques, Anomalie (+ compétences), Fêlure, nom. */
  steps: boolean[];
  complete: boolean;
  competences: string[];
}

/** Fournisseur de dés : à remplacer par un appel serveur pour empêcher la triche. */
export interface DiceProvider {
  /** Six résultats de 4d5 en retirant le plus bas dé. */
  rollStats(): Promise<number[]>;
  /** Résultat d'un d20 (1 à `sides`). */
  rollFelure(sides: number): Promise<number>;
}

/** Stockage des fiches : par défaut le navigateur ; à remplacer par une API / une base. */
export interface HomunculusStorage {
  list(): Promise<HomunculusState[]>;
  save(state: HomunculusState): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface HomunculusCreatorProps {
  /** État de départ (reprise d'une fiche). */
  initialState?: Partial<HomunculusState>;
  /** Écho imposé (par exemple fixé par le MJ pour le one-shot). */
  echo?: number;
  /** Si vrai, le joueur ne peut pas changer l'Écho. */
  echoLocked?: boolean;
  /** Écho maximum proposé (les données couvrent 1 à 4). */
  maxEcho?: number;
  dice?: DiceProvider;
  /** `null` désactive le registre local. */
  storage?: HomunculusStorage | null;
  onChange?: (state: HomunculusState, derived: DerivedSheet) => void;
  /** Si fourni, affiche un bouton d'envoi, actif quand la création est complète. */
  onSubmit?: (state: HomunculusState, derived: DerivedSheet) => void | Promise<void>;
  submitLabel?: string;
  readOnly?: boolean;
  theme?: "auto" | "dark" | "light";
  /** Affiche des nébuleuses floues derrière les panneaux (utile si le site hôte a un fond uni). */
  ambient?: boolean;
  showBeta?: boolean;
  className?: string;
}
