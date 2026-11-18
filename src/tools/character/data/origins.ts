// Espèces et historiques D&D 5.5 (2024). Résumés en français, à vérifier par le MJ.
import type { Ability, Option, SkillId } from "../types";

export type SpeciesOptionDef = { key: string; label: string; options: Option[] };

export type Species = {
  id: string;
  name: string;
  pitch: string;
  /** Vitesse en mètres. */
  speed: number;
  size: "M" | "P" | "M/P";
  darkvision: number;
  traits: { name: string; desc: string }[];
  /** Options à choisir (lignée, ascendance…). */
  options?: SpeciesOptionDef[];
  /** Compétences à choisir (elfe : 1 parmi 3, humain : 1 au choix). */
  skillChoice?: { count: number; from: SkillId[] | "any"; label: string };
  /** L'humain gagne un don d'origine. */
  originFeat?: boolean;
  /** PV max en plus par niveau (nain). */
  hpPerLevel?: number;
};

const DRAGONS: Option[] = [
  { id: "black", name: "Noir", desc: "Acide" },
  { id: "blue", name: "Bleu", desc: "Foudre" },
  { id: "brass", name: "Airain", desc: "Feu" },
  { id: "bronze", name: "Bronze", desc: "Foudre" },
  { id: "copper", name: "Cuivre", desc: "Acide" },
  { id: "gold", name: "Or", desc: "Feu" },
  { id: "green", name: "Vert", desc: "Poison" },
  { id: "red", name: "Rouge", desc: "Feu" },
  { id: "silver", name: "Argent", desc: "Froid" },
  { id: "white", name: "Blanc", desc: "Froid" },
];
const SIZE_CHOICE: SpeciesOptionDef = {
  key: "size",
  label: "Taille",
  options: [
    { id: "M", name: "Moyenne", desc: "Entre 1,20 m et 2,10 m environ." },
    { id: "P", name: "Petite", desc: "Entre 60 cm et 1,20 m environ." },
  ],
};

export const SPECIES: Species[] = [
  {
    id: "aasimar",
    name: "Aasimar",
    pitch: "Des mortels touchés par une étincelle céleste.",
    speed: 9,
    size: "M/P",
    darkvision: 18,
    options: [SIZE_CHOICE],
    traits: [
      { name: "Résistance céleste", desc: "Résistance aux dégâts nécrotiques et radiants." },
      { name: "Mains guérisseuses", desc: "Une fois par repos long : soigne une créature (bonus de maîtrise × d4)." },
      { name: "Porteur de lumière", desc: "Tu connais le sort mineur Lumière." },
      { name: "Révélation céleste (niveau 3)", desc: "Une fois par repos long : ailes, aura radieuse ou linceul nécrotique pendant 1 minute." },
    ],
  },
  {
    id: "dragonborn",
    name: "Drakéide",
    pitch: "Les descendants des dragons, fiers et puissants.",
    speed: 9,
    size: "M",
    darkvision: 18,
    options: [{ key: "ancestry", label: "Ascendance draconique", options: DRAGONS }],
    traits: [
      { name: "Souffle", desc: "Remplace une attaque : cône de 4,5 m ou ligne de 9 m, 1d10 dégâts (sauvegarde de DEX). Bonus de maîtrise utilisations par repos long." },
      { name: "Résistance aux dégâts", desc: "Résistance au type de dégâts de ton ascendance." },
    ],
  },
  {
    id: "dwarf",
    name: "Nain",
    pitch: "Robustes et tenaces, nés de la pierre.",
    speed: 9,
    size: "M",
    darkvision: 36,
    hpPerLevel: 1,
    traits: [
      { name: "Résilience naine", desc: "Résistance au poison, avantage contre l'état empoisonné." },
      { name: "Ténacité naine", desc: "+1 PV max par niveau (déjà compté)." },
      { name: "Connaissance de la pierre", desc: "Action bonus : perception des vibrations sur 18 m au contact de la pierre (bonus de maîtrise fois par repos long)." },
    ],
  },
  {
    id: "elf",
    name: "Elfe",
    pitch: "Gracieux et magiques, liés au monde des fées.",
    speed: 9,
    size: "M",
    darkvision: 18,
    options: [
      {
        key: "lineage",
        label: "Lignée elfique",
        options: [
          { id: "drow", name: "Drow", desc: "Vision dans le noir 36 m, sort mineur Lumières dansantes." },
          { id: "high", name: "Haut-elfe", desc: "Sort mineur Prestidigitation (modifiable après un repos long)." },
          { id: "wood", name: "Elfe des bois", desc: "Vitesse 10,5 m, sort mineur Druidisme." },
        ],
      },
    ],
    skillChoice: { count: 1, from: ["insight", "perception", "survival"], label: "Sens aiguisés" },
    traits: [
      { name: "Ascendance féerique", desc: "Avantage contre l'état charmé." },
      { name: "Sens aiguisés", desc: "Maîtrise d'Intuition, Perception ou Survie." },
      { name: "Transe", desc: "Un repos long ne te demande que 4 heures de méditation." },
    ],
  },
  {
    id: "gnome",
    name: "Gnome",
    pitch: "Petits, curieux et inventifs.",
    speed: 9,
    size: "P",
    darkvision: 18,
    options: [
      {
        key: "lineage",
        label: "Lignée gnome",
        options: [
          { id: "forest", name: "Gnome des forêts", desc: "Illusion mineure, et Communication avec les animaux quelques fois par jour." },
          { id: "rock", name: "Gnome des roches", desc: "Réparation et Prestidigitation, petits mécanismes." },
        ],
      },
    ],
    traits: [{ name: "Ruse gnome", desc: "Avantage aux sauvegardes d'Intelligence, de Sagesse et de Charisme." }],
  },
  {
    id: "goliath",
    name: "Goliath",
    pitch: "Des géants dans l'âme, descendants des titans.",
    speed: 10.5,
    size: "M",
    darkvision: 0,
    options: [
      {
        key: "giant",
        label: "Ascendance géante",
        options: [
          { id: "cloud", name: "Nuages", desc: "Téléportation de 9 m en action bonus." },
          { id: "fire", name: "Feu", desc: "+1d10 dégâts de feu sur une attaque." },
          { id: "frost", name: "Givre", desc: "+1d6 froid et ralentit la cible." },
          { id: "hill", name: "Collines", desc: "Renverse une cible Grande ou plus petite." },
          { id: "stone", name: "Pierre", desc: "Réaction : réduis des dégâts de 1d12 + CON." },
          { id: "storm", name: "Tempête", desc: "Réaction : 1d8 tonnerre à un attaquant." },
        ],
      },
    ],
    traits: [
      { name: "Ascendance géante", desc: "Un pouvoir de géant, bonus de maîtrise utilisations par repos long." },
      { name: "Carrure puissante", desc: "Avantage pour te libérer d'une saisie, capacité de charge comme une taille au-dessus." },
    ],
  },
  {
    id: "halfling",
    name: "Halfelin",
    pitch: "Petits, chanceux et étonnamment braves.",
    speed: 9,
    size: "P",
    darkvision: 0,
    traits: [
      { name: "Brave", desc: "Avantage contre l'état effrayé." },
      { name: "Agilité halfeline", desc: "Tu traverses l'espace des créatures plus grandes." },
      { name: "Chanceux", desc: "Quand tu fais 1 au d20 d'un test, relance-le." },
      { name: "Discrétion naturelle", desc: "Tu peux te cacher derrière une créature plus grande." },
    ],
  },
  {
    id: "human",
    name: "Humain",
    pitch: "Polyvalents et ambitieux, partout dans le monde.",
    speed: 9,
    size: "M/P",
    darkvision: 0,
    options: [SIZE_CHOICE],
    skillChoice: { count: 1, from: "any", label: "Doué (une compétence)" },
    originFeat: true,
    traits: [
      { name: "Ingénieux", desc: "Tu gagnes l'Inspiration héroïque après chaque repos long." },
      { name: "Doué", desc: "Une compétence de plus." },
      { name: "Polyvalent", desc: "Un don d'origine de plus." },
    ],
  },
  {
    id: "orc",
    name: "Orc",
    pitch: "Endurants et déterminés, bénis par Gruumsh.",
    speed: 9,
    size: "M",
    darkvision: 36,
    traits: [
      { name: "Montée d'adrénaline", desc: "Action bonus : Foncer et gagner des PV temporaires (bonus de maîtrise fois par repos)." },
      { name: "Endurance implacable", desc: "Une fois par repos long, tu tombes à 1 PV au lieu de 0." },
    ],
  },
  {
    id: "tiefling",
    name: "Tieffelin",
    pitch: "Marqués par un héritage infernal.",
    speed: 9,
    size: "M/P",
    darkvision: 18,
    options: [
      SIZE_CHOICE,
      {
        key: "legacy",
        label: "Héritage fiélon",
        options: [
          { id: "abyssal", name: "Abyssal", desc: "Résistance au poison, sort mineur Bouffée de poison." },
          { id: "chthonic", name: "Chtonien", desc: "Résistance nécrotique, sort mineur Contact glacial." },
          { id: "infernal", name: "Infernal", desc: "Résistance au feu, sort mineur Trait de feu." },
        ],
      },
    ],
    traits: [
      { name: "Héritage fiélon", desc: "Une résistance et des sorts selon ton héritage." },
      { name: "Présence d'outre-monde", desc: "Tu connais le sort mineur Thaumaturgie." },
    ],
  },
];

export type Background = {
  id: string;
  name: string;
  /** Les trois caractéristiques que l'historique peut augmenter. */
  abilities: [Ability, Ability, Ability];
  feat: string;
  skills: [SkillId, SkillId];
  tool: string;
  equipment: string;
};

export const BACKGROUNDS: Background[] = [
  { id: "acolyte", name: "Acolyte", abilities: ["int", "wis", "cha"], feat: "magic-initiate-cleric", skills: ["insight", "religion"], tool: "Matériel de calligraphie", equipment: "Matériel de calligraphie, livre de prières, symbole sacré, parchemins, robe, 8 po (ou 50 po)." },
  { id: "artisan", name: "Artisan", abilities: ["str", "dex", "int"], feat: "crafter", skills: ["investigation", "persuasion"], tool: "Outils d'artisan au choix", equipment: "Outils d'artisan, 2 sacoches, tenue de voyageur, 32 po (ou 50 po)." },
  { id: "charlatan", name: "Charlatan", abilities: ["dex", "con", "cha"], feat: "skilled", skills: ["deception", "sleight"], tool: "Kit de contrefaçon", equipment: "Kit de contrefaçon, costume, beaux habits, 15 po (ou 50 po)." },
  { id: "criminal", name: "Criminel", abilities: ["dex", "con", "int"], feat: "alert", skills: ["sleight", "stealth"], tool: "Outils de voleur", equipment: "2 dagues, outils de voleur, pied-de-biche, 2 sacoches, tenue de voyageur, 16 po (ou 50 po)." },
  { id: "entertainer", name: "Artiste", abilities: ["str", "dex", "cha"], feat: "musician", skills: ["acrobatics", "performance"], tool: "Instrument de musique", equipment: "Instrument, 2 costumes, miroir, parfum, tenue de voyageur, 11 po (ou 50 po)." },
  { id: "farmer", name: "Fermier", abilities: ["str", "con", "wis"], feat: "tough", skills: ["animal", "nature"], tool: "Outils de charpentier", equipment: "Faucille, outils de charpentier, trousse de soins, pelle, pot en fer, tenue de voyageur, 30 po (ou 50 po)." },
  { id: "guard", name: "Garde", abilities: ["str", "int", "wis"], feat: "alert", skills: ["athletics", "perception"], tool: "Jeu au choix", equipment: "Lance, arbalète légère et 20 carreaux, jeu, lanterne, menottes, carquois, tenue de voyageur, 12 po (ou 50 po)." },
  { id: "guide", name: "Guide", abilities: ["dex", "con", "wis"], feat: "magic-initiate-druid", skills: ["stealth", "survival"], tool: "Outils de cartographe", equipment: "Arc court et 20 flèches, outils de cartographe, sac de couchage, carquois, tente, tenue de voyageur, 3 po (ou 50 po)." },
  { id: "hermit", name: "Ermite", abilities: ["con", "wis", "cha"], feat: "healer", skills: ["medicine", "religion"], tool: "Matériel d'herboriste", equipment: "Bâton, matériel d'herboriste, sac de couchage, livre de philosophie, lampe, huile, tenue de voyageur, 16 po (ou 50 po)." },
  { id: "merchant", name: "Marchand", abilities: ["con", "int", "cha"], feat: "lucky", skills: ["animal", "persuasion"], tool: "Instruments de navigateur", equipment: "Instruments de navigateur, 2 sacoches, tenue de voyageur, 22 po (ou 50 po)." },
  { id: "noble", name: "Noble", abilities: ["str", "int", "cha"], feat: "skilled", skills: ["history", "persuasion"], tool: "Jeu au choix", equipment: "Jeu, beaux habits, parfum, 29 po (ou 50 po)." },
  { id: "sage", name: "Sage", abilities: ["con", "int", "wis"], feat: "magic-initiate-wizard", skills: ["arcana", "history"], tool: "Matériel de calligraphie", equipment: "Bâton, matériel de calligraphie, livre d'histoire, parchemins, robe, 8 po (ou 50 po)." },
  { id: "sailor", name: "Marin", abilities: ["str", "dex", "wis"], feat: "tavern-brawler", skills: ["acrobatics", "perception"], tool: "Instruments de navigateur", equipment: "Dague, instruments de navigateur, corde, tenue de voyageur, 20 po (ou 50 po)." },
  { id: "scribe", name: "Scribe", abilities: ["dex", "int", "wis"], feat: "skilled", skills: ["investigation", "perception"], tool: "Matériel de calligraphie", equipment: "Matériel de calligraphie, beaux habits, lampe, huile, parchemins, 23 po (ou 50 po)." },
  { id: "soldier", name: "Soldat", abilities: ["str", "dex", "con"], feat: "savage-attacker", skills: ["athletics", "intimidation"], tool: "Jeu au choix", equipment: "Lance, arc court et 20 flèches, jeu, trousse de soins, carquois, tenue de voyageur, 14 po (ou 50 po)." },
  { id: "wayfarer", name: "Voyageur", abilities: ["dex", "wis", "cha"], feat: "lucky", skills: ["insight", "stealth"], tool: "Outils de voleur", equipment: "2 dagues, outils de voleur, jeu, sac de couchage, 2 sacoches, tenue de voyageur, 16 po (ou 50 po)." },
];

export const getSpecies = (id: string) => SPECIES.find((s) => s.id === id);
export const getBackground = (id: string) => BACKGROUNDS.find((b) => b.id === id);
