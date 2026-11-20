// Export / import de fiches au format de l'outil (fichier .json). Pur, partagé client + serveur.
// L'import ne fait confiance à rien : `normalizeImported` reconstruit une fiche valide champ par champ
// (le serveur l'applique à nouveau avant d'écrire quoi que ce soit). Une fiche importée va dans le coffre :
// pour jouer en campagne, elle passe par la proposition au MJ, comme n'importe quel essai.
import { ALL_SKILLS } from "./data/abilities";
import { getClass, getSubclass } from "./data/classes";
import { getFeat } from "./data/feats";
import { getBackground, getSpecies } from "./data/origins";
import { getSpell, type SpellClass } from "@/tools/grimoire/data/spells";
import { FREE_MAX, FREE_MIN, RuleError, derive, emptyState, sanitizeFree, validateBackgroundBonus, validateScores } from "./rules";
import { MAX_LEVEL, type Ability, type CharacterState, type Scores, type SkillId } from "./types";

export const EXPORT_FORMAT = "outil-jdr/fiche";
export const EXPORT_VERSION = 1;

export type ExportFile = { format: typeof EXPORT_FORMAT; version: number; exportedAt: string; character: CharacterState };
export type ImportResult = { state: CharacterState; warnings: string[] };

const ABILITY_IDS: Ability[] = ["str", "dex", "con", "int", "wis", "cha"];
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const int = (v: unknown, min: number, max: number, fallback = min) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const isSkill = (v: unknown): v is SkillId => typeof v === "string" && (ALL_SKILLS as string[]).includes(v);

/** Nom de fichier sûr : « Aoth le druide » → « aoth-le-druide ». */
export function fileSlug(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "personnage"
  );
}

/** Fichier d'export de l'outil. Les infos propres au serveur (propriétaire, groupe…) n'y sont pas. */
export function exportFile(state: CharacterState): ExportFile {
  const character = structuredClone(state);
  // Une fiche venue de l'Atelier ne se transporte pas : ses passifs sont écrits par le serveur.
  delete character.extra;
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: new Date().toISOString(), character };
}

/** Le fichier vient-il de l'outil ? (sinon on essaie le format Foundry) */
export const isExportFile = (raw: unknown): raw is { character: unknown } => isObj(raw) && raw.format === EXPORT_FORMAT && isObj(raw.character);

/** Liste de sorts utilisée par un personnage (même règle que le Grimoire), ou null s'il ne lance pas de sorts. */
export function spellListOf(s: CharacterState): SpellClass | null {
  const cls = getClass(s.classId);
  if (cls?.caster) return cls.id as SpellClass;
  if (s.level >= 3 && getSubclass(s.classId, s.subclassId)?.caster) return "wizard";
  return null;
}

/** Sorts du Grimoire gardés : bonne liste de classe, niveau accessible, et dans les limites de la fiche. */
export function validGrimoire(s: CharacterState, ids: unknown[]): string[] {
  const list = spellListOf(s);
  const spell = derive(s).spell;
  if (!list || !spell) return [];
  const maxLevel = spell.pactLevel ?? spell.slots.filter((n) => n > 0).length;
  let cantrips = 0;
  let prepared = 0;
  const out: string[] = [];
  for (const id of ids) {
    const sp = typeof id === "string" ? getSpell(id) : undefined;
    if (!sp || out.includes(sp.id) || !sp.classes.includes(list) || sp.level > maxLevel) continue;
    if (sp.level === 0 ? cantrips >= spell.cantrips : prepared >= spell.prepared) continue;
    if (sp.level === 0) cantrips++;
    else prepared++;
    out.push(sp.id);
  }
  return out;
}

/**
 * Reconstruit une fiche valide à partir de données venues d'un fichier. Les valeurs hors règles sont corrigées
 * (et signalées dans `warnings`) ; seule une classe inconnue est bloquante.
 */
export function normalizeImported(raw: unknown): ImportResult {
  if (!isObj(raw)) throw new RuleError("Ce fichier ne contient pas de fiche de personnage.");
  const warnings: string[] = [];
  const cls = getClass(str(raw.classId, 40));
  if (!cls) throw new RuleError("La classe de cette fiche n'existe pas dans l'outil.");

  const s = emptyState();
  s.name = str(raw.name, 80).trim() || "Personnage importé";
  s.classId = cls.id;
  s.level = int(raw.level, 1, MAX_LEVEL);
  if (Number(raw.level) > MAX_LEVEL) warnings.push(`Le niveau est ramené à ${MAX_LEVEL}, le maximum de l'outil.`);
  const sub = s.level >= 3 ? getSubclass(cls.id, str(raw.subclassId, 40)) : undefined;
  s.subclassId = sub?.id ?? null;
  if (s.level >= 3 && !sub) warnings.push("Sous-classe inconnue ou absente : choisis-la à nouveau si besoin (en revenant au niveau 2 puis en remontant).");

  // Origines : une espèce ou un historique inconnus restent vides (la fiche les affiche comme non renseignés).
  const species = getSpecies(str(raw.speciesId, 40));
  s.speciesId = species?.id ?? "";
  if (raw.speciesId && !species) warnings.push("Espèce inconnue de l'outil : laissée vide.");
  if (species) {
    const opts = isObj(raw.speciesOptions) ? raw.speciesOptions : {};
    for (const def of species.options ?? []) {
      const v = str(opts[def.key], 40);
      const ok = def.options.some((o) => o.id === v);
      s.speciesOptions[def.key] = ok ? v : def.options[0].id;
      if (!ok) warnings.push(`${def.label} : non précisé, « ${def.options[0].name} » par défaut. Vérifie-le.`);
    }
  }
  const bg = getBackground(str(raw.backgroundId, 40));
  s.backgroundId = bg?.id ?? "";
  if (raw.backgroundId && !bg) warnings.push("Historique inconnu de l'outil : laissé vide.");

  // Caractéristiques : tableau standard / achat de points gardés s'ils sont valides, sinon valeurs libres (coffre).
  const base = {} as Scores;
  const rawBase = isObj(raw.baseScores) ? raw.baseScores : {};
  for (const a of ABILITY_IDS) base[a] = int(rawBase[a], FREE_MIN, FREE_MAX, 10);
  if (ABILITY_IDS.some((a) => Number(rawBase[a]) !== base[a])) {
    warnings.push(`Des caractéristiques sortaient des limites de l'outil (${FREE_MIN} à ${FREE_MAX} avant bonus) : elles ont été ajustées.`);
  }
  const method = raw.scoreMethod === "standard" || raw.scoreMethod === "pointbuy" ? raw.scoreMethod : "free";
  s.scoreMethod = method !== "free" && !validateScores(method, base) ? method : "free";
  s.baseScores = base;
  const bonus: Partial<Scores> = {};
  const rawBonus = isObj(raw.backgroundBonus) ? raw.backgroundBonus : {};
  for (const a of ABILITY_IDS) if (rawBonus[a]) bonus[a] = int(rawBonus[a], 0, 2);
  s.backgroundBonus = bg && !validateBackgroundBonus(bg.abilities, bonus) ? bonus : {};
  if (Object.keys(bonus).length && !Object.keys(s.backgroundBonus).length) warnings.push("Bonus d'historique invalide : retiré.");
  // Bonus de niveau 4 : +2 au total au plus, seulement à partir du niveau 4.
  const rawAsi = isObj(raw.asiBonus) ? raw.asiBonus : {};
  let asiLeft = s.level >= 4 ? 2 : 0;
  for (const a of ABILITY_IDS) {
    const v = Math.min(int(rawAsi[a], 0, 2), asiLeft);
    if (v) (s.asiBonus[a] = v), (asiLeft -= v);
  }

  // Compétences, dons.
  s.skills = Array.from(new Set((Array.isArray(raw.skills) ? raw.skills : []).filter(isSkill)));
  s.expertise = Array.from(new Set((Array.isArray(raw.expertise) ? raw.expertise : []).filter(isSkill))).filter((x) => s.skills.includes(x));
  for (const f of (Array.isArray(raw.feats) ? raw.feats : []).slice(0, 6)) {
    if (!isObj(f)) continue;
    const feat = getFeat(str(f.id, 60));
    if (!feat || s.feats.some((x) => x.id === feat.id)) continue;
    const ability = feat.abilities?.includes(f.ability as Ability) ? (f.ability as Ability) : undefined;
    s.feats.push({ id: feat.id, source: str(f.source, 60) || "Import", ...(ability ? { ability } : {}) });
  }

  // Choix de classe : les choix à options connus sont vérifiés (ils changent les calculs), le reste est du texte.
  const optionChoices = new Map<string, { ids: Set<string>; count: number }>();
  for (const lvl of [1, 2, 3, 4] as const) {
    for (const f of [...cls.levels[lvl], ...(lvl === 3 && sub ? sub.features : [])]) {
      if (f.choice?.kind === "options") optionChoices.set(f.choice.key, { ids: new Set(f.choice.options.map((o) => o.id)), count: f.choice.count });
    }
  }
  const rawChoices = isObj(raw.classChoices) ? raw.classChoices : {};
  for (const [k, v] of Object.entries(rawChoices).slice(0, 40)) {
    if (!Array.isArray(v)) continue;
    const key = k.slice(0, 60);
    const known = optionChoices.get(key);
    const values = v.slice(0, 10).map((x) => str(x, 60)).filter(Boolean);
    s.classChoices[key] = known ? values.filter((x) => known.ids.has(x)).slice(0, known.count) : values;
  }

  // PV : un dé par niveau au-delà du 1er (moyenne si absent ou impossible).
  const avg = cls.hitDie / 2 + 1;
  const rolls = Array.isArray(raw.hpRolls) ? raw.hpRolls : [];
  s.hpRolls = Array.from({ length: s.level - 1 }, (_, i) => int(rolls[i], 1, cls.hitDie, avg));

  // Champs libres (équipement, textes, état en jeu) : même nettoyage qu'une sauvegarde de la fiche.
  const free = sanitizeFree(s, {
    name: s.name,
    armorId: raw.armorId as string,
    shield: raw.shield as boolean,
    weapons: Array.isArray(raw.weapons) ? (raw.weapons as CharacterState["weapons"]) : [],
    cantrips: raw.cantrips as string,
    spells: raw.spells as string,
    equipment: raw.equipment as string,
    languages: raw.languages as string,
    tools: raw.tools as string,
    masteries: raw.masteries as string,
    notes: raw.notes as string,
    coins: (isObj(raw.coins) ? raw.coins : {}) as CharacterState["coins"],
    identity: (isObj(raw.identity) ? raw.identity : {}) as CharacterState["identity"],
    // Sans état en jeu : PV au maximum (plafonnés par sanitizeFree).
    play: (isObj(raw.play) ? raw.play : { hp: 9999 }) as CharacterState["play"],
  });
  // sanitizeFree ignore les clés absentes : on remet les chaînes non textuelles à vide.
  for (const k of ["cantrips", "spells", "equipment", "languages", "tools", "masteries", "notes"] as const) {
    if (typeof raw[k] !== "string") free[k] = k === "languages" ? s.languages : "";
  }

  // Historique : quelques lignes gardées, plus la trace de l'import.
  free.history = (Array.isArray(raw.history) ? raw.history : [])
    .slice(-20)
    .filter(isObj)
    .map((h) => ({
      level: int(h.level, 1, MAX_LEVEL),
      at: str(h.at, 40),
      summary: (Array.isArray(h.summary) ? h.summary : []).slice(0, 12).map((x) => str(x, 200)),
      hpGain: int(h.hpGain, -999, 999, 0),
    }));

  free.grimoire = validGrimoire(free, Array.isArray(raw.grimoire) ? raw.grimoire : []);
  if (Array.isArray(raw.grimoire) && free.grimoire.length < raw.grimoire.length) {
    warnings.push("Certains sorts du Grimoire ont été retirés (classe, niveau ou nombre de sorts).");
  }
  return { state: free, warnings };
}

/** Lit un fichier d'export de l'outil. */
export function fromExportFile(raw: unknown): ImportResult {
  if (!isExportFile(raw)) throw new RuleError("Ce fichier n'est pas un export de l'outil.");
  return normalizeImported(raw.character);
}
