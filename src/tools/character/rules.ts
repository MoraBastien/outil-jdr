// Moteur de règles de la fiche de personnage (D&D 5.5, niveaux 1 à 4).
// Fonctions pures, utilisées à l'identique par le navigateur (aperçu) et par le serveur (validation).
import { ABILITIES, ALL_SKILLS, POINT_BUY_BUDGET, POINT_BUY_COST, SKILLS, STANDARD_ARRAY, skillName, abilityName } from "./data/abilities";
import { CLASSES, getClass, getSubclass, type Caster, type ClassDef } from "./data/classes";
import { ARMORS, WEAPONS, getArmor, type WeaponDef } from "./data/equipment";
import { FEATS, ORIGIN_FEATS, getFeat } from "./data/feats";
import { getBackground, getSpecies } from "./data/origins";
import {
  MAX_LEVEL,
  type Ability,
  type Answers,
  type CharacterState,
  type Choice,
  type Feature,
  type Scores,
  type SkillId,
  type Weapon,
} from "./types";

export class RuleError extends Error {}
const fail = (msg: string): never => {
  throw new RuleError(msg);
};

/* ---------- Bases ---------- */

export const mod = (score: number) => Math.floor((score - 10) / 2);
export const fmtMod = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);
export const profBonus = (level: number) => Math.ceil(level / 4) + 1;
const ABILITY_IDS = ABILITIES.map((a) => a.id);
const zeroScores = (): Scores => ({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 });

export function finalScores(s: Pick<CharacterState, "baseScores" | "backgroundBonus" | "asiBonus" | "feats">): Scores {
  const out = { ...s.baseScores };
  for (const a of ABILITY_IDS) out[a] += (s.backgroundBonus[a] ?? 0) + (s.asiBonus[a] ?? 0);
  for (const f of s.feats) if (f.ability) out[f.ability] += 1;
  for (const a of ABILITY_IDS) out[a] = Math.min(20, out[a]);
  return out;
}

export const choiceList = (s: CharacterState, key: string) => s.classChoices[key] ?? [];
const hasFeat = (s: Pick<CharacterState, "feats">, id: string) => s.feats.some((f) => f.id === id);

/* ---------- Magie ---------- */

const FULL_SLOTS = [[2], [3], [4, 2], [4, 3]];
const HALF_SLOTS = [[2], [2], [3], [3]];
const THIRD_SLOTS = [[], [], [2], [3]];

export type Spellcasting = {
  ability: Ability;
  kind: Caster["kind"];
  cantrips: number;
  prepared: number;
  /** Emplacements par niveau de sort (index 0 = niveau 1). */
  slots: number[];
  /** Occultiste : niveau des emplacements de pacte. */
  pactLevel?: number;
  dc: number;
  attack: number;
};

export function spellcasting(s: CharacterState, scores: Scores): Spellcasting | null {
  const cls = getClass(s.classId);
  const sub = getSubclass(s.classId, s.subclassId);
  const caster = cls?.caster ?? (s.level >= 3 ? sub?.caster : undefined);
  if (!caster) return null;
  const i = s.level - 1;
  let slots: number[] = [];
  let pactLevel: number | undefined;
  if (caster.kind === "full") slots = FULL_SLOTS[i];
  else if (caster.kind === "half") slots = HALF_SLOTS[i];
  else if (caster.kind === "third") slots = THIRD_SLOTS[i];
  else {
    pactLevel = s.level >= 3 ? 2 : 1;
    slots = [s.level >= 2 ? 2 : 1];
  }
  // Thaumaturge (clerc) et Magicien (druide) : un sort mineur de plus.
  const extra = choiceList(s, "divine-order").includes("thaumaturge") || choiceList(s, "primal-order").includes("magician") ? 1 : 0;
  const m = mod(scores[caster.ability]);
  const p = profBonus(s.level);
  return {
    ability: caster.ability,
    kind: caster.kind,
    cantrips: caster.cantrips[i] + extra,
    prepared: caster.prepared[i],
    slots,
    pactLevel,
    dc: 8 + p + m,
    attack: p + m,
  };
}

/* ---------- Armures et armes ---------- */

export function armorTraining(s: CharacterState): Set<"light" | "medium" | "heavy" | "shield"> {
  const set = new Set(getClass(s.classId)?.armor ?? []);
  if (choiceList(s, "divine-order").includes("protector")) set.add("heavy");
  if (choiceList(s, "primal-order").includes("warden")) set.add("medium");
  if (s.subclassId === "valor" && s.level >= 3) (set.add("medium"), set.add("shield"));
  if (hasFeat(s, "moderately-armored")) (set.add("light"), set.add("medium"), set.add("shield"));
  if (hasFeat(s, "heavily-armored")) (set.add("medium"), set.add("heavy"));
  return set;
}

export function weaponProficient(s: CharacterState, w: WeaponDef): boolean {
  if (w.category === "simple") return true;
  if (["barbarian", "fighter", "paladin", "ranger"].includes(s.classId)) return true;
  if (choiceList(s, "divine-order").includes("protector") || choiceList(s, "primal-order").includes("warden")) return true;
  if (s.subclassId === "valor" && s.level >= 3) return true;
  if (s.classId === "rogue") return Boolean(w.finesse) || w.props.includes("légère");
  if (s.classId === "monk") return w.props.toLowerCase().includes("légère");
  return false;
}

/** Arme du catalogue → ligne de la fiche (la meilleure caractéristique pour une arme finesse). */
export function weaponFromCatalog(s: CharacterState, id: string, key: string): Weapon | null {
  const w = WEAPONS.find((x) => x.id === id);
  if (!w) return null;
  const sc = finalScores(s);
  const ability: "str" | "dex" = w.ranged ? "dex" : w.finesse && sc.dex > sc.str ? "dex" : "str";
  return {
    key,
    name: w.name,
    ability,
    proficient: weaponProficient(s, w),
    damage: `${w.damage} ${w.type}`,
    notes: `${w.props}${w.mastery ? ` · Botte : ${w.mastery}` : ""}`,
  };
}

/* ---------- Fiche calculée ---------- */

export type SkillLine = { id: SkillId; name: string; ability: Ability; value: number; level: "none" | "half" | "prof" | "expert" };
export type FeatureLine = Feature & { level: number; source: string; picked?: string };

export type Derived = {
  scores: Scores;
  mods: Scores;
  prof: number;
  saves: Record<Ability, { value: number; proficient: boolean }>;
  skills: SkillLine[];
  initiative: number;
  ac: { value: number; formula: string; warnings: string[] };
  hpMax: number;
  hpFormula: string;
  hitDie: number;
  speed: number;
  size: string;
  darkvision: number;
  passivePerception: number;
  spell: Spellcasting | null;
  features: FeatureLine[];
  resources: { name: string; value: string; help: string }[];
  weapons: (Weapon & { attack: number; damageText: string })[];
};

/** Texte lisible de la réponse à un choix (pour la fiche et l'historique). */
export function describeAnswer(choice: Choice, values: string[]): string {
  if (choice.kind === "options") return values.map((v) => choice.options.find((o) => o.id === v)?.name ?? v).join(", ");
  if (choice.kind === "skills" || choice.kind === "expertise") return values.map((v) => skillName(v as SkillId)).join(", ");
  return values.join(", ");
}

export function derive(s: CharacterState): Derived {
  const cls = getClass(s.classId) as ClassDef;
  const sub = getSubclass(s.classId, s.subclassId);
  const species = getSpecies(s.speciesId);
  const scores = finalScores(s);
  const mods = zeroScores();
  for (const a of ABILITY_IDS) mods[a] = mod(scores[a]);
  const prof = profBonus(s.level);

  // Sauvegardes : celles de la classe, plus Résilient.
  const saveProf = new Set<Ability>(cls.saves);
  for (const f of s.feats) if (f.id === "resilient" && f.ability) saveProf.add(f.ability);
  const saves = Object.fromEntries(
    ABILITY_IDS.map((a) => [a, { value: mods[a] + (saveProf.has(a) ? prof : 0), proficient: saveProf.has(a) }]),
  ) as Derived["saves"];

  // Compétences.
  const jack = s.classId === "bard" && s.level >= 2;
  const wisBonus = Math.max(1, mods.wis);
  const thaumaturge = choiceList(s, "divine-order").includes("thaumaturge");
  const magician = choiceList(s, "primal-order").includes("magician");
  const skills: SkillLine[] = SKILLS.map((sk) => {
    const expert = s.expertise.includes(sk.id);
    const proficient = s.skills.includes(sk.id);
    const level = expert ? "expert" : proficient ? "prof" : jack ? "half" : "none";
    let value = mods[sk.ability] + (expert ? prof * 2 : proficient ? prof : jack ? Math.floor(prof / 2) : 0);
    if (thaumaturge && (sk.id === "arcana" || sk.id === "religion")) value += wisBonus;
    if (magician && (sk.id === "arcana" || sk.id === "nature")) value += wisBonus;
    return { id: sk.id, name: sk.name, ability: sk.ability, value, level };
  });

  // Classe d'armure.
  const armor = getArmor(s.armorId);
  const training = armorTraining(s);
  const warnings: string[] = [];
  let ac: number;
  let formula: string;
  if (armor.type === "none") {
    const options: [number, string][] = [[10 + mods.dex, "10 + DEX"]];
    if (cls.unarmored === "barbarian") options.push([10 + mods.dex + mods.con, "10 + DEX + CON (défense sans armure)"]);
    if (cls.unarmored === "monk" && !s.shield) options.push([10 + mods.dex + mods.wis, "10 + DEX + SAG (défense sans armure)"]);
    if (s.subclassId === "draconic" && s.level >= 3) options.push([10 + mods.dex + mods.cha, "10 + DEX + CHA (résistance draconique)"]);
    if (s.subclassId === "dance" && s.level >= 3 && !s.shield) options.push([10 + mods.dex + mods.cha, "10 + DEX + CHA (jeu de jambes)"]);
    [ac, formula] = options.reduce((best, o) => (o[0] > best[0] ? o : best));
  } else {
    const dex = armor.dexMax === null ? mods.dex : Math.min(mods.dex, armor.dexMax);
    ac = armor.base + dex;
    formula = `${armor.name} ${armor.base}${armor.dexMax === 0 ? "" : ` + DEX${armor.dexMax ? ` (max ${armor.dexMax})` : ""}`}`;
    if (choiceList(s, "fighting-style").includes("defense")) (ac += 1), (formula += " + 1 (style Défense)");
    if (!training.has(armor.type)) warnings.push(`Tu n'es pas formé au port de cette armure : désavantage aux tests et attaques de FOR/DEX, et pas de sorts.`);
    if (armor.str && scores.str < armor.str) warnings.push(`Force ${armor.str} requise : ta vitesse baisse de 3 m.`);
  }
  if (s.shield) {
    ac += 2;
    formula += " + 2 (bouclier)";
    if (!training.has("shield")) warnings.push("Tu n'es pas formé au bouclier : tu ne profites pas de son bonus.");
  }

  // Points de vie.
  const conTotal = mods.con * s.level;
  const dieTotal = cls.hitDie + s.hpRolls.reduce((a, b) => a + b, 0);
  let hpMax = dieTotal + conTotal;
  const extras: string[] = [];
  if (species?.hpPerLevel) (hpMax += species.hpPerLevel * s.level), extras.push(`${species.hpPerLevel * s.level} (ténacité naine)`);
  if (hasFeat(s, "tough")) (hpMax += 2 * s.level), extras.push(`${2 * s.level} (Robuste)`);
  if (s.subclassId === "draconic" && s.level >= 3) (hpMax += s.level), extras.push(`${s.level} (résistance draconique)`);
  hpMax = Math.max(s.level, hpMax);
  const hpFormula = [`${dieTotal} (dés de vie)`, `${fmtMod(conTotal)} (CON × ${s.level})`, ...extras.map((e) => `+ ${e}`)].join(" ");

  // Vitesse.
  let speed = species?.speed ?? 9;
  if (s.speciesId === "elf" && s.speciesOptions.lineage === "wood") speed = 10.5;
  if (cls.unarmored === "monk" && s.level >= 2 && armor.type === "none" && !s.shield) speed += 3;
  if (armor.str && scores.str < armor.str) speed -= 3;

  const size = species?.size === "P" ? "Petite" : species?.size === "M" ? "Moyenne" : s.speciesOptions.size === "P" ? "Petite" : "Moyenne";
  const darkvision = s.speciesId === "elf" && s.speciesOptions.lineage === "drow" ? 36 : (species?.darkvision ?? 0);

  // Capacités : classe (niveaux atteints) + sous-classe.
  const features: FeatureLine[] = [];
  for (let lvl = 1; lvl <= s.level; lvl++) {
    for (const f of cls.levels[lvl as 1 | 2 | 3 | 4]) {
      if (f.choice?.kind === "subclass" || f.choice?.kind === "asi") continue;
      const picked = f.choice ? describeAnswer(f.choice, choiceList(s, f.choice.key)) : undefined;
      features.push({ ...f, level: lvl, source: cls.name, picked: picked || undefined });
    }
    if (lvl === 3 && sub) for (const f of sub.features) features.push({ ...f, level: 3, source: sub.name });
  }

  const resources = cls.resources
    .map((r) => ({ name: r.name, value: String(r.values[s.level - 1]), help: r.help }))
    .filter((r) => r.value !== "—");

  const weapons = s.weapons.map((w) => {
    const m = mods[w.ability];
    const [dice, ...type] = w.damage.split(" ");
    // Style Archerie : +2 aux attaques avec les armes à distance (munitions).
    const archery = choiceList(s, "fighting-style").includes("archery") && w.notes.includes("Munitions") ? 2 : 0;
    return {
      ...w,
      attack: m + (w.proficient ? prof : 0) + archery,
      damageText: `${dice}${m ? ` ${m > 0 ? "+" : "−"} ${Math.abs(m)}` : ""} ${type.join(" ")}`.trim(),
    };
  });

  const perception = skills.find((x) => x.id === "perception")!.value;
  return {
    scores,
    mods,
    prof,
    saves,
    skills,
    initiative: mods.dex + (hasFeat(s, "alert") ? prof : 0),
    ac: { value: ac, formula, warnings },
    hpMax,
    hpFormula,
    hitDie: cls.hitDie,
    speed,
    size,
    darkvision,
    passivePerception: 10 + perception,
    spell: spellcasting(s, scores),
    features,
    resources,
    weapons,
  };
}

/* ---------- Choix ---------- */

/** Options d'un choix encore disponibles pour ce personnage. */
export function availableValues(s: CharacterState, choice: Choice): { id: string; name: string; desc?: string }[] {
  if (choice.kind === "options") {
    const family = choice.key.split("-")[0];
    const taken = new Set(Object.entries(s.classChoices).filter(([k]) => k.split("-")[0] === family).flatMap(([, v]) => v));
    return choice.options.filter((o) => !taken.has(o.id));
  }
  if (choice.kind === "skills") {
    const from = choice.from === "any" ? ALL_SKILLS : choice.from;
    return from.filter((id) => !s.skills.includes(id)).map((id) => ({ id, name: skillName(id) }));
  }
  if (choice.kind === "expertise") {
    return s.skills
      .filter((id) => !s.expertise.includes(id) && (!choice.from || choice.from.includes(id)))
      .map((id) => ({ id, name: skillName(id) }));
  }
  if (choice.kind === "subclass") return (getClass(s.classId)?.subclasses ?? []).map((x) => ({ id: x.id, name: x.name, desc: x.desc }));
  return [];
}

/** Applique un choix « simple » (options, compétences, expertise, sous-classe). Renvoie la ligne d'historique. */
function applyChoice(s: CharacterState, choice: Choice, values: string[] | undefined): string {
  if (choice.kind === "asi") return applyAsi(s, values);
  const list = values ?? [];
  const count = choice.kind === "subclass" ? 1 : choice.count;
  if (list.length !== count || new Set(list).size !== list.length) fail(`${choice.label} : choisis ${count} option${count > 1 ? "s" : ""}.`);
  const allowed = new Set(availableValues(s, choice).map((o) => o.id));
  for (const v of list) if (!allowed.has(v)) fail(`${choice.label} : choix invalide.`);
  // On garde toutes les réponses (pour l'affichage), en plus de leur effet.
  if (choice.kind !== "subclass") s.classChoices[choice.key] = list;
  if (choice.kind === "skills") s.skills.push(...(list as SkillId[]));
  else if (choice.kind === "expertise") s.expertise.push(...(list as SkillId[]));
  else if (choice.kind === "subclass") s.subclassId = list[0];
  const label = choice.kind === "subclass" ? getSubclass(s.classId, list[0])!.name : describeAnswer(choice, list);
  return `${choice.label} : ${label}`;
}

/**
 * Amélioration de caractéristiques ou don (niveau 4).
 * Réponse : ["asi", a, b] (+1 à a et b, ou +2 si a = b) ou ["feat", idDuDon, caractéristique?].
 */
function applyAsi(s: CharacterState, values: string[] | undefined): string {
  const [kind, x, y] = values ?? [];
  const scores = finalScores(s);
  if (kind === "asi") {
    if (!ABILITY_IDS.includes(x as Ability) || !ABILITY_IDS.includes(y as Ability)) fail("Choisis les caractéristiques à augmenter.");
    const plus = zeroScores();
    plus[x as Ability] += 1;
    plus[y as Ability] += 1;
    for (const a of ABILITY_IDS) {
      if (scores[a] + plus[a] > 20) fail(`${abilityName(a)} ne peut pas dépasser 20.`);
      if (plus[a]) s.asiBonus[a] = (s.asiBonus[a] ?? 0) + plus[a];
    }
    return x === y ? `${abilityName(x as Ability)} +2` : `${abilityName(x as Ability)} +1, ${abilityName(y as Ability)} +1`;
  }
  if (kind === "feat") {
    const feat = getFeat(x);
    if (!feat) fail("Don inconnu.");
    if (hasFeat(s, feat!.id)) fail("Tu as déjà ce don.");
    let ability: Ability | undefined;
    if (feat!.abilities) {
      if (!feat!.abilities.includes(y as Ability)) fail("Choisis la caractéristique que ce don augmente.");
      ability = y as Ability;
      if (scores[ability] + 1 > 20) fail(`${abilityName(ability)} ne peut pas dépasser 20.`);
    }
    s.feats.push({ id: feat!.id, source: "Niveau 4", ability });
    return `Don : ${feat!.name}${ability ? ` (${abilityName(ability)} +1)` : ""}`;
  }
  return fail("Choisis une amélioration de caractéristiques ou un don.");
}

/** Le don Doué demande 3 compétences ; la clé de réponse dépend de l'endroit où il a été pris. */
function applySkilled(s: CharacterState, values: string[] | undefined, label: string): string {
  return applyChoice(s, { kind: "skills", key: "skilled", label, count: 3, from: "any" }, values);
}

/* ---------- Création ---------- */

export type CreationInput = {
  name: string;
  classId: string;
  speciesId: string;
  backgroundId: string;
  speciesOptions: Record<string, string>;
  scoreMethod: "standard" | "pointbuy" | "free";
  baseScores: Scores;
  backgroundBonus: Partial<Scores>;
  answers: Answers;
  identity?: Partial<CharacterState["identity"]>;
  notes?: string;
};

/** Options de création : le coffre autorise les valeurs de caractéristiques libres. */
export type BuildOptions = { allowFree?: boolean };
export const FREE_MIN = 3;
export const FREE_MAX = 18;

export const CLASS_SKILLS_KEY = "class-skills";
export const SPECIES_SKILL_KEY = "species-skill";
export const ORIGIN_FEAT_KEY = "origin-feat";
export const BG_SKILLED_KEY = "bg-skilled";
export const SPECIES_SKILLED_KEY = "species-skilled";

/** Choix de classe à faire à la création (compétences + capacités de niveau 1). */
export function creationClassChoices(cls: ClassDef): Choice[] {
  const skillChoice: Choice = {
    kind: "skills",
    key: CLASS_SKILLS_KEY,
    label: `${cls.skillCount} compétences de ${cls.name.toLowerCase()}`,
    count: cls.skillCount,
    from: cls.skillList,
  };
  return [skillChoice, ...cls.levels[1].flatMap((f) => (f.choice ? [f.choice] : []))];
}

export function validateScores(method: CreationInput["scoreMethod"], base: Scores, opts: BuildOptions = {}): string | null {
  const values = ABILITY_IDS.map((a) => base[a]);
  if (values.some((v) => !Number.isInteger(v))) return "Caractéristiques invalides.";
  if (method === "free") {
    if (!opts.allowFree) return "Les valeurs libres ne sont permises que dans le coffre.";
    if (values.some((v) => v < FREE_MIN || v > FREE_MAX)) return `Avec les valeurs libres, chaque caractéristique va de ${FREE_MIN} à ${FREE_MAX}.`;
    return null;
  }
  if (method === "standard") {
    const sorted = [...values].sort((a, b) => b - a);
    if (sorted.join() !== STANDARD_ARRAY.join()) return "Utilise chaque valeur du tableau standard une fois (15, 14, 13, 12, 10, 8).";
    return null;
  }
  if (values.some((v) => v < 8 || v > 15)) return "Avec l'achat de points, chaque valeur va de 8 à 15.";
  const cost = values.reduce((n, v) => n + POINT_BUY_COST[v], 0);
  if (cost > POINT_BUY_BUDGET) return `Tu as dépensé ${cost} points sur ${POINT_BUY_BUDGET}.`;
  return null;
}

export const pointBuyCost = (base: Scores) => ABILITY_IDS.reduce((n, a) => n + (POINT_BUY_COST[base[a]] ?? 99), 0);

export function validateBackgroundBonus(bgAbilities: Ability[], bonus: Partial<Scores>): string | null {
  const entries = Object.entries(bonus).filter(([, v]) => v);
  if (entries.some(([a]) => !bgAbilities.includes(a as Ability))) return "Le bonus d'historique ne peut porter que sur ses trois caractéristiques.";
  const vals = entries.map(([, v]) => v).sort();
  if (vals.join() === "1,2" || vals.join() === "1,1,1") return null;
  return "Répartis le bonus d'historique : +2 et +1, ou +1 à trois caractéristiques.";
}

const DEFAULT_ARMOR: Record<string, { armor: string; shield: boolean; weapons: string[] }> = {
  barbarian: { armor: "none", shield: false, weapons: ["greataxe", "handaxe"] },
  bard: { armor: "leather", shield: false, weapons: ["dagger"] },
  cleric: { armor: "chain-shirt", shield: true, weapons: ["mace"] },
  druid: { armor: "leather", shield: true, weapons: ["sickle"] },
  fighter: { armor: "chain-mail", shield: false, weapons: ["greatsword", "flail", "javelin"] },
  monk: { armor: "none", shield: false, weapons: ["spear", "dagger"] },
  paladin: { armor: "chain-mail", shield: true, weapons: ["longsword", "javelin"] },
  ranger: { armor: "studded", shield: false, weapons: ["scimitar", "shortsword", "longbow"] },
  rogue: { armor: "leather", shield: false, weapons: ["shortsword", "shortbow", "dagger"] },
  sorcerer: { armor: "none", shield: false, weapons: ["spear", "dagger"] },
  warlock: { armor: "leather", shield: false, weapons: ["sickle", "dagger"] },
  wizard: { armor: "none", shield: false, weapons: ["dagger"] },
};

export function emptyState(): CharacterState {
  return {
    version: 1,
    name: "",
    classId: "",
    subclassId: null,
    speciesId: "",
    speciesOptions: {},
    backgroundId: "",
    level: 1,
    scoreMethod: "standard",
    baseScores: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 },
    backgroundBonus: {},
    asiBonus: {},
    skills: [],
    expertise: [],
    feats: [],
    classChoices: {},
    hpRolls: [],
    armorId: "none",
    shield: false,
    weapons: [],
    cantrips: "",
    spells: "",
    equipment: "",
    coins: { pp: 0, po: 0, pe: 0, pa: 0, pc: 0 },
    languages: "Commun",
    tools: "",
    masteries: "",
    identity: { alignment: "", appearance: "", personality: "", backstory: "" },
    notes: "",
    play: { hp: 0, tempHp: 0, hitDiceSpent: 0, deathSuccess: 0, deathFail: 0, slotsUsed: [], inspiration: false },
    history: [],
  };
}

/** Construit un personnage de niveau 1 à partir des choix du joueur. Lève une RuleError si un choix est invalide. */
export function buildCharacter(input: CreationInput, opts: BuildOptions = {}): CharacterState {
  const cls = getClass(input.classId) ?? fail("Choisis une classe.");
  const species = getSpecies(input.speciesId) ?? fail("Choisis une espèce.");
  const bg = getBackground(input.backgroundId) ?? fail("Choisis un historique.");
  const name = String(input.name ?? "").trim().slice(0, 80);
  if (!name) fail("Donne un nom à ton personnage.");

  const s = emptyState();
  s.name = name;
  const id = input.identity ?? {};
  s.identity = {
    alignment: String(id.alignment ?? "").slice(0, 200),
    appearance: String(id.appearance ?? "").slice(0, 4000),
    personality: String(id.personality ?? "").slice(0, 4000),
    backstory: String(id.backstory ?? "").slice(0, 8000),
    ideals: String(id.ideals ?? "").slice(0, 2000),
    bonds: String(id.bonds ?? "").slice(0, 2000),
    flaws: String(id.flaws ?? "").slice(0, 2000),
  };
  s.notes = String(input.notes ?? "").slice(0, 8000);
  s.classId = cls!.id;
  s.speciesId = species!.id;
  s.backgroundId = bg!.id;

  // Options d'espèce (lignée, ascendance, taille).
  for (const opt of species!.options ?? []) {
    const v = input.speciesOptions?.[opt.key];
    if (!opt.options.some((o) => o.id === v)) fail(`${opt.label} : fais un choix.`);
    s.speciesOptions[opt.key] = v!;
  }

  // Caractéristiques.
  const base = zeroScores();
  for (const a of ABILITY_IDS) base[a] = Number(input.baseScores?.[a]);
  const scoreError = validateScores(input.scoreMethod, base, opts);
  if (scoreError) fail(scoreError);
  s.scoreMethod = input.scoreMethod;
  s.baseScores = base;
  const bonus: Partial<Scores> = {};
  for (const a of ABILITY_IDS) if (input.backgroundBonus?.[a]) bonus[a] = Number(input.backgroundBonus[a]);
  const bonusError = validateBackgroundBonus(bg!.abilities, bonus);
  if (bonusError) fail(bonusError);
  s.backgroundBonus = bonus;

  // Historique : 2 compétences et un don d'origine.
  s.skills.push(...bg!.skills);
  s.feats.push({ id: bg!.feat, source: bg!.name });
  s.tools = [bg!.tool, cls!.tools].filter(Boolean).join(", ");

  const answers = input.answers ?? {};
  // Classe : compétences et choix de niveau 1.
  for (const choice of creationClassChoices(cls!)) applyChoice(s, choice, answers[choice.key]);

  // Espèce : compétence, don d'origine (humain).
  if (species!.skillChoice) {
    applyChoice(s, { kind: "skills", key: SPECIES_SKILL_KEY, ...species!.skillChoice }, answers[SPECIES_SKILL_KEY]);
  }
  if (getFeat(bg!.feat)?.skills) applySkilled(s, answers[BG_SKILLED_KEY], "Doué (historique)");
  if (species!.originFeat) {
    const featId = answers[ORIGIN_FEAT_KEY]?.[0];
    const feat = ORIGIN_FEATS.find((f) => f.id === featId) ?? fail("Choisis le don d'origine de ton humain.");
    if (hasFeat(s, feat!.id)) fail("Choisis un don d'origine différent de celui de ton historique.");
    s.feats.push({ id: feat!.id, source: species!.name });
    if (feat!.skills) applySkilled(s, answers[SPECIES_SKILLED_KEY], "Doué (humain)");
  }

  // Équipement de départ.
  const start = DEFAULT_ARMOR[cls!.id];
  s.armorId = start.armor;
  s.shield = start.shield;
  s.weapons = start.weapons.flatMap((id, i) => weaponFromCatalog(s, id, `w${i}`) ?? []);
  s.equipment = `${cls!.name} : ${cls!.equipment}\n${bg!.name} : ${bg!.equipment}`;

  const d = derive(s);
  s.play.hp = d.hpMax;
  s.play.slotsUsed = d.spell ? d.spell.slots.map(() => 0) : [];
  s.history.push({ level: 1, at: new Date().toISOString(), summary: [`Création : ${species!.name} ${cls!.name.toLowerCase()}, ${bg!.name.toLowerCase()}`], hpGain: d.hpMax });
  return s;
}

/* ---------- Montée de niveau ---------- */

/** Capacités et choix du niveau suivant. */
export function nextLevelFeatures(s: CharacterState): { level: number; features: Feature[]; choices: Choice[] } {
  const level = s.level + 1;
  const cls = getClass(s.classId);
  if (!cls || level > MAX_LEVEL) return { level, features: [], choices: [] };
  const features = cls.levels[level as 1 | 2 | 3 | 4];
  return { level, features, choices: features.flatMap((f) => (f.choice ? [f.choice] : [])) };
}

export const averageHp = (hitDie: number) => hitDie / 2 + 1;
export const FEAT_SKILLED_KEY = "asi-skilled";

export type LevelUpResult = { state: CharacterState; summary: string[]; hpGain: number };

/** Applique une montée de niveau. `hpDie` = résultat du dé de vie (moyenne ou jet fait par le serveur). */
export function applyLevelUp(current: CharacterState, answers: Answers, hpDie: number): LevelUpResult {
  const s: CharacterState = structuredClone(current);
  const cls = getClass(s.classId) ?? fail("Classe inconnue.");
  const { level, choices } = nextLevelFeatures(s);
  if (level > MAX_LEVEL) fail(`Le niveau maximum est ${MAX_LEVEL}.`);
  if (!Number.isInteger(hpDie) || hpDie < 1 || hpDie > cls!.hitDie) fail("Dé de vie invalide.");

  const before = derive(s);
  const summary: string[] = [];
  s.level = level;
  s.hpRolls.push(hpDie);

  for (const choice of choices) summary.push(applyChoice(s, choice, answers[choice.key]));
  // Don Doué pris au niveau 4.
  const lastFeat = s.feats[s.feats.length - 1];
  if (answers.asi?.[0] === "feat" && lastFeat?.id === "skilled") summary.push(applySkilled(s, answers[FEAT_SKILLED_KEY], "Doué"));

  const after = derive(s);
  const hpGain = after.hpMax - before.hpMax;
  s.play.hp = Math.min(after.hpMax, s.play.hp + hpGain);
  s.play.slotsUsed = after.spell ? after.spell.slots.map((_, i) => s.play.slotsUsed[i] ?? 0) : [];

  summary.unshift(`PV max ${before.hpMax} → ${after.hpMax} (+${hpGain})`);
  for (const f of cls!.levels[level as 1 | 2 | 3 | 4]) if (!f.choice) summary.push(`Nouvelle capacité : ${f.name}`);
  if (after.spell && before.spell && after.spell.slots.join() !== before.spell.slots.join()) {
    summary.push(`Emplacements de sorts : ${after.spell.slots.map((n, i) => `${n} niv. ${after.spell!.pactLevel ?? i + 1}`).join(", ")}`);
  }
  if (after.spell && before.spell && after.spell.prepared > before.spell.prepared) summary.push(`Sorts préparés : ${before.spell.prepared} → ${after.spell.prepared}`);
  if (after.spell && before.spell && after.spell.cantrips > before.spell.cantrips) summary.push(`Sorts mineurs : ${before.spell.cantrips} → ${after.spell.cantrips}`);
  if (!before.spell && after.spell) summary.push(`Incantation : ${after.spell.cantrips} sorts mineurs, ${after.spell.prepared} sorts préparés`);

  s.history.push({ level, at: new Date().toISOString(), summary, hpGain });
  return { state: s, summary, hpGain };
}

/* ---------- Modifications libres ---------- */

const str = (v: unknown, max = 4000) => String(v ?? "").slice(0, max);
const int = (v: unknown, min: number, max: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};

/** Nettoie les champs librement modifiables envoyés par le navigateur. */
export function sanitizeFree(current: CharacterState, patch: Partial<CharacterState>): CharacterState {
  const s: CharacterState = structuredClone(current);
  if ("name" in patch) s.name = str(patch.name, 80).trim() || s.name;
  if ("armorId" in patch && ARMORS.some((a) => a.id === patch.armorId)) s.armorId = patch.armorId!;
  if ("shield" in patch) s.shield = Boolean(patch.shield);
  if (Array.isArray(patch.weapons)) {
    s.weapons = patch.weapons.slice(0, 20).map((w, i) => ({
      key: str(w?.key, 40) || `w${i}`,
      name: str(w?.name, 60),
      ability: w?.ability === "dex" ? "dex" : "str",
      proficient: Boolean(w?.proficient),
      damage: str(w?.damage, 60),
      notes: str(w?.notes, 200),
    }));
  }
  for (const k of ["cantrips", "spells", "equipment", "languages", "tools", "masteries", "notes"] as const) {
    if (k in patch) s[k] = str(patch[k]);
  }
  if (patch.coins) for (const k of ["pp", "po", "pe", "pa", "pc"] as const) s.coins[k] = int(patch.coins[k], 0, 1_000_000);
  if (patch.identity) {
    for (const k of ["alignment", "appearance", "personality", "backstory", "ideals", "bonds", "flaws"] as const) {
      if (k in patch.identity) s.identity[k] = str(patch.identity[k]);
    }
  }
  if (patch.play) {
    const p = patch.play;
    const after = derive(s);
    s.play = {
      hp: int(p.hp, 0, after.hpMax),
      tempHp: int(p.tempHp, 0, 999),
      hitDiceSpent: int(p.hitDiceSpent, 0, s.level),
      deathSuccess: int(p.deathSuccess, 0, 3),
      deathFail: int(p.deathFail, 0, 3),
      slotsUsed: (after.spell?.slots ?? []).map((n, i) => int(p.slotsUsed?.[i], 0, n)),
      inspiration: Boolean(p.inspiration),
    };
  }
  return s;
}

/** Libellé court : « Elfe magicien niv. 3 ». */
export function shortLabel(s: CharacterState): string {
  const cls = getClass(s.classId);
  const species = getSpecies(s.speciesId);
  if (!species) return `${cls?.name ?? ""} · niv. ${s.level}`.trim();
  return `${species.name} ${cls?.name.toLowerCase() ?? ""} · niv. ${s.level}`.trim();
}

export { CLASSES, FEATS };
