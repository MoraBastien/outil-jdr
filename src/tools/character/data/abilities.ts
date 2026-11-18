import type { Ability, SkillId } from "../types";

export const ABILITIES: { id: Ability; name: string; short: string; desc: string }[] = [
  { id: "str", name: "Force", short: "FOR", desc: "Puissance physique : soulever, pousser, frapper au corps à corps, nager, grimper." },
  { id: "dex", name: "Dextérité", short: "DEX", desc: "Agilité et réflexes : esquiver, viser à distance, se faufiler, agir en premier." },
  { id: "con", name: "Constitution", short: "CON", desc: "Endurance : elle augmente tes points de vie et t'aide à garder ta concentration." },
  { id: "int", name: "Intelligence", short: "INT", desc: "Mémoire et raisonnement : savoirs, enquêtes, magie des magiciens." },
  { id: "wis", name: "Sagesse", short: "SAG", desc: "Perception et intuition : remarquer, comprendre les gens, magie des clercs et druides." },
  { id: "cha", name: "Charisme", short: "CHA", desc: "Présence et force de caractère : convaincre, tromper, magie des bardes et ensorceleurs." },
];

export const abilityName = (a: Ability) => ABILITIES.find((x) => x.id === a)!.name;
export const abilityShort = (a: Ability) => ABILITIES.find((x) => x.id === a)!.short;

export const SKILLS: { id: SkillId; name: string; ability: Ability; desc: string }[] = [
  { id: "acrobatics", name: "Acrobaties", ability: "dex", desc: "Garder l'équilibre, faire des cabrioles, se rattraper." },
  { id: "animal", name: "Dressage", ability: "wis", desc: "Calmer, diriger ou comprendre un animal." },
  { id: "arcana", name: "Arcanes", ability: "int", desc: "Connaître la magie, les sorts, les objets et les plans." },
  { id: "athletics", name: "Athlétisme", ability: "str", desc: "Grimper, sauter, nager, lutter." },
  { id: "deception", name: "Tromperie", ability: "cha", desc: "Mentir de façon convaincante, se déguiser." },
  { id: "history", name: "Histoire", ability: "int", desc: "Se souvenir des événements, royaumes et légendes." },
  { id: "insight", name: "Intuition", ability: "wis", desc: "Deviner les intentions et repérer un mensonge." },
  { id: "intimidation", name: "Intimidation", ability: "cha", desc: "Influencer par la menace ou la peur." },
  { id: "investigation", name: "Investigation", ability: "int", desc: "Chercher des indices, déduire, fouiller." },
  { id: "medicine", name: "Médecine", ability: "wis", desc: "Stabiliser un mourant, diagnostiquer un mal." },
  { id: "nature", name: "Nature", ability: "int", desc: "Connaître le terrain, les plantes, les animaux, le climat." },
  { id: "perception", name: "Perception", ability: "wis", desc: "Voir, entendre, remarquer ce qui t'entoure." },
  { id: "performance", name: "Représentation", ability: "cha", desc: "Divertir : musique, danse, comédie, conte." },
  { id: "persuasion", name: "Persuasion", ability: "cha", desc: "Convaincre avec tact et de bons arguments." },
  { id: "religion", name: "Religion", ability: "int", desc: "Connaître les dieux, rites, cultes et créatures sacrées." },
  { id: "sleight", name: "Escamotage", ability: "dex", desc: "Faire les poches, cacher un objet, tour de passe-passe." },
  { id: "stealth", name: "Discrétion", ability: "dex", desc: "Se cacher, se déplacer sans bruit." },
  { id: "survival", name: "Survie", ability: "wis", desc: "Pister, chasser, s'orienter, éviter les dangers naturels." },
];

export const skillName = (s: SkillId) => SKILLS.find((x) => x.id === s)?.name ?? s;
export const ALL_SKILLS = SKILLS.map((s) => s.id);

/** Tableau standard (règles 2024). */
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

/** Achat de points : 27 points, valeurs de 8 à 15. */
export const POINT_BUY_BUDGET = 27;
export const POINT_BUY_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
