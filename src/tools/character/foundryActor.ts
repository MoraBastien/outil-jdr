// Conversion entre la fiche de l'outil et un acteur Foundry VTT (système dnd5e, testé avec Foundry 14 / dnd5e 6,
// traduction Babele FR). Pur, partagé client + serveur.
//
// - Import : fichier « Exporter les données » d'un acteur → fiche de l'outil (puis `normalizeImported`).
//   On s'appuie sur les identifiants des objets (`system.identifier` : « druid », « quarterstaff »…), qui ne changent pas
//   avec la langue. Ce que l'outil ne connaît pas est gardé en texte (équipement, notes) et signalé.
// - Export : fiche de l'outil → acteur à charger avec « Importer des données ». Caractéristiques, compétences, PV,
//   pièces, textes, armes, armure et sorts sont repris ; les capacités automatiques de Foundry (avancements de classe)
//   viennent du compendium, à glisser sur la fiche si on veut les automatisations.
import { ALL_SKILLS } from "./data/abilities";
import { CLASSES, getClass, getSubclass } from "./data/classes";
import { WEAPONS, getArmor } from "./data/equipment";
import { getFeat } from "./data/feats";
import { BACKGROUNDS, SPECIES } from "./data/origins";
import { SPELLS, getSpell } from "@/tools/grimoire/data/spells";
import { RuleError, derive, emptyState, weaponFromCatalog } from "./rules";
import { normalizeImported, type ImportResult } from "./transfer";
import { MAX_LEVEL, type Ability, type CharacterState, type SkillId, type Weapon } from "./types";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const obj = (v: unknown): Obj => (isObj(v) ? v : {});
const text = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown, fallback = 0) => (Number.isFinite(Number(v)) && v !== null && v !== "" ? Number(v) : fallback);

const ABILITY_IDS: Ability[] = ["str", "dex", "con", "int", "wis", "cha"];

/** Compétences : clé Foundry ↔ clé de l'outil. */
const SKILL_KEYS: Record<string, SkillId> = {
  acr: "acrobatics", ani: "animal", arc: "arcana", ath: "athletics", dec: "deception", his: "history",
  ins: "insight", itm: "intimidation", inv: "investigation", med: "medicine", nat: "nature", prc: "perception",
  prf: "performance", per: "persuasion", rel: "religion", slt: "sleight", ste: "stealth", sur: "survival",
};
const SKILL_TO_FOUNDRY = Object.fromEntries(Object.entries(SKILL_KEYS).map(([k, v]) => [v, k])) as Record<SkillId, string>;

/** Pièces : po = gp, pe = ep, pa = sp, pc = cp. */
const COINS = { pp: "pp", po: "gp", pe: "ep", pa: "sp", pc: "cp" } as const;

/** Armures : id de l'outil → objet de base Foundry. */
const ARMOR_BASE: Record<string, string> = {
  padded: "padded", leather: "leather", studded: "studded", hide: "hide", "chain-shirt": "chainshirt", scale: "scalemail",
  breastplate: "breastplate", "half-plate": "halfplate", ring: "ringmail", "chain-mail": "chainmail", splint: "splint", plate: "plate",
};
const ARMOR_FROM_BASE = Object.fromEntries(Object.entries(ARMOR_BASE).map(([k, v]) => [v, k]));
/** Armes : l'id Foundry est celui de l'outil sans tirets (« light-crossbow » → « lightcrossbow »). */
const weaponBase = (id: string) => id.replace(/-/g, "");
const WEAPON_FROM_BASE = Object.fromEntries(WEAPONS.map((w) => [weaponBase(w.id), w.id]));

const DAMAGE_TYPES: Record<string, string> = { contondant: "bludgeoning", perforant: "piercing", tranchant: "slashing" };
const DAMAGE_TYPES_FR = Object.fromEntries(Object.entries(DAMAGE_TYPES).map(([k, v]) => [v, k]));

const LANGUAGES: Record<string, string> = {
  common: "Commun", dwarvish: "Nain", elvish: "Elfique", giant: "Géant", gnomish: "Gnome", goblin: "Gobelin", halfling: "Halfelin",
  orc: "Orc", draconic: "Draconique", abyssal: "Abyssal", celestial: "Céleste", deep: "Profond", infernal: "Infernal",
  primordial: "Primordial", sylvan: "Sylvestre", undercommon: "Commun des profondeurs", druidic: "Druidique", cant: "Argot des voleurs", sign: "Langue des signes",
};
const LANGUAGE_KEYS = Object.fromEntries(Object.entries(LANGUAGES).map(([k, v]) => [norm(v), k]));

const TOOLS: Record<string, string> = {
  herb: "Matériel d'herboriste", thief: "Outils de voleur", disg: "Kit de déguisement", forg: "Kit de contrefaçon", pois: "Kit d'empoisonneur",
  navg: "Instruments de navigateur", cart: "Outils de cartographe", calligrapher: "Matériel de calligraphie", carpenter: "Outils de charpentier",
};

/** Texte comparable : minuscules, sans accents ni ponctuation. */
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
const tokens = (id: string) => new Set(id.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));

/** HTML de Foundry → texte simple (paragraphes, listes, liens @UUID[…]{Nom}). */
export function htmlToText(html: string): string {
  return html
    .replace(/@\w+\[[^\]]*\]\{([^}]*)\}/g, "$1")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "• ")
    .replace(/<\/\s*(p|div|li|h\d|tr)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Texte → HTML : un paragraphe par bloc, retours à la ligne gardés. */
const textToHtml = (s: string) =>
  s
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

/** Le fichier ressemble-t-il à un acteur Foundry ? */
export const isFoundryActor = (raw: unknown): boolean => isObj(raw) && isObj(raw.system) && Array.isArray(raw.items) && typeof raw.type === "string";

/* ---------- Foundry → outil ---------- */

/** Id de l'outil dont tous les mots se retrouvent dans l'identifiant Foundry (« circle-of-the-land » → « land »). */
function matchByTokens<T extends { id: string }>(identifier: string, list: T[], aliases: Record<string, string> = {}): T | undefined {
  const idTokens = tokens(aliases[identifier] ?? identifier);
  const exact = list.find((x) => x.id === identifier);
  if (exact) return exact;
  return list
    .filter((x) => [...tokens(x.id)].every((t) => idTokens.has(t)))
    .sort((a, b) => tokens(b.id).size - tokens(a.id).size)[0];
}
const SUBCLASS_ALIASES: Record<string, string> = {
  "school-of-abjuration": "abjurer", "school-of-divination": "diviner", "school-of-evocation": "evoker", "school-of-illusion": "illusionist",
  abjurer: "abjurer", diviner: "diviner", evoker: "evoker", illusionist: "illusionist",
};

const SPELL_BY_NAME = new Map(SPELLS.map((s) => [norm(s.name), s.id]));

export function fromFoundryActor(raw: unknown): ImportResult {
  if (!isFoundryActor(raw)) throw new RuleError("Ce fichier n'est ni un export de l'outil, ni un personnage exporté depuis Foundry.");
  const actor = raw as Obj;
  if (actor.type !== "character") throw new RuleError("Ce fichier Foundry n'est pas un personnage joueur (type « character »).");
  const sys = obj(actor.system);
  const items = (actor.items as unknown[]).filter(isObj);
  const warnings: string[] = [];
  const ident = (it: Obj) => text(obj(it.system).identifier).toLowerCase();
  const ofType = (t: string) => items.filter((it) => it.type === t);

  // Classe : celle qui a le plus de niveaux (l'outil ne gère pas le multiclassage).
  const classes = ofType("class").sort((a, b) => num(obj(b.system).levels, 1) - num(obj(a.system).levels, 1));
  const classItem = classes.find((c) => getClass(ident(c)));
  const cls = classItem ? getClass(ident(classItem)) : undefined;
  if (!cls) {
    const names = classes.map((c) => text(c.name)).join(", ");
    throw new RuleError(names ? `Classe inconnue de l'outil : ${names}.` : "Ce personnage n'a pas de classe dans Foundry.");
  }
  if (classes.length > 1) warnings.push(`Multiclassage non géré : seule la classe ${cls.name} (la principale) est reprise.`);
  const classSys = obj(classItem!.system);
  const foundryLevel = num(classSys.levels, 1);
  const level = Math.min(MAX_LEVEL, Math.max(1, foundryLevel));

  const s = emptyState();
  s.name = text(actor.name).trim();
  s.classId = cls.id;
  s.level = level;

  const subItem = ofType("subclass")[0];
  if (subItem && level >= 3) {
    const sub = matchByTokens(ident(subItem), cls.subclasses, SUBCLASS_ALIASES);
    s.subclassId = sub?.id ?? null;
    if (!sub) warnings.push(`Sous-classe « ${text(subItem.name)} » inconnue de l'outil.`);
  }

  // Espèce et historique (les « demi-elfe », « demi-orc » des règles 2014 n'ont pas d'équivalent).
  const raceItem = ofType("race")[0];
  if (raceItem) {
    const id = ident(raceItem);
    const species = tokens(id).has("half") ? undefined : matchByTokens(id, SPECIES);
    if (species) {
      s.speciesId = species.id;
      // Lignée tirée de l'identifiant quand c'est possible : « high-elf » → haut-elfe, « rock-gnome » → gnome des roches.
      for (const def of species.options ?? []) {
        const found = def.options.find((o) => tokens(id).has(o.id.toLowerCase()));
        if (found) s.speciesOptions[def.key] = found.id;
      }
      // Taille (aasimar, humain) : celle de la fiche Foundry.
      const size = text(obj(sys.traits).size);
      if (species.options?.some((o) => o.key === "size") && (size === "sm" || size === "med")) s.speciesOptions.size = size === "sm" ? "P" : "M";
    } else warnings.push(`Espèce « ${text(raceItem.name)} » inconnue de l'outil (règles 2014 ?) : laissée vide.`);
  }
  const bgItem = ofType("background")[0];
  if (bgItem) {
    const bg = BACKGROUNDS.find((b) => b.id === ident(bgItem));
    if (bg) s.backgroundId = bg.id;
    else warnings.push(`Historique « ${text(bgItem.name)} » inconnu de l'outil (règles 2014 ?) : laissé vide, noté dans les notes.`);
  }

  // Caractéristiques : Foundry donne les valeurs finales. On les reprend en valeurs libres (coffre).
  const abilities = obj(sys.abilities);
  for (const a of ABILITY_IDS) s.baseScores[a] = num(obj(abilities[a]).value, 10);
  s.scoreMethod = "free";
  warnings.push("Caractéristiques reprises telles quelles depuis Foundry (bonus d'espèce et d'historique déjà inclus).");

  // Compétences : 1 = maîtrise, 2 = expertise.
  const skills = obj(sys.skills);
  for (const [k, id] of Object.entries(SKILL_KEYS)) {
    const v = num(obj(skills[k]).value);
    if (v >= 1) s.skills.push(id);
    if (v >= 2) s.expertise.push(id);
  }

  // Dons généraux et d'origine reconnus (les capacités de classe viennent des données de l'outil).
  const otherFeats: string[] = [];
  for (const f of ofType("feat").filter((f) => text(obj(obj(f.system).type).value) === "feat")) {
    const feat = getFeat(ident(f));
    if (feat && !s.feats.some((x) => x.id === feat.id)) s.feats.push({ id: feat.id, source: "Foundry" });
    else otherFeats.push(text(f.name));
  }

  // PV : valeurs de l'avancement « Points de vie » de la classe (« max », un nombre, ou « avg »).
  const hpAdv = Object.values(obj(classSys.advancement)).map(obj).find((a) => a.type === "HitPoints");
  const hpValues = obj(hpAdv?.value);
  const avg = cls.hitDie / 2 + 1;
  s.hpRolls = Array.from({ length: level - 1 }, (_, i) => {
    const v = hpValues[String(i + 2)];
    return typeof v === "number" ? v : avg;
  });

  // Équipement : armure et bouclier portés, armes, le reste en liste.
  const equipped = (it: Obj) => obj(it.system).equipped === true;
  const baseItem = (it: Obj) => text(obj(obj(it.system).type).baseItem).toLowerCase();
  const armors = ofType("equipment").filter((it) => ARMOR_FROM_BASE[baseItem(it)]);
  const armor = armors.find(equipped) ?? armors[0];
  if (armor) s.armorId = ARMOR_FROM_BASE[baseItem(armor)];
  s.shield = ofType("equipment").some((it) => baseItem(it) === "shield" && equipped(it));

  const weapons: Weapon[] = [];
  for (const [i, w] of ofType("weapon").slice(0, 20).entries()) {
    const id = WEAPON_FROM_BASE[baseItem(w)] ?? WEAPON_FROM_BASE[ident(w).replace(/-/g, "")];
    const fromCatalog = id ? weaponFromCatalog(s, id, `w${i}`) : null;
    if (fromCatalog) {
      weapons.push({ ...fromCatalog, name: text(w.name) || fromCatalog.name });
      continue;
    }
    const dmg = obj(obj(obj(w.system).damage).base);
    const type = (Array.isArray(dmg.types) ? dmg.types : []).map((t) => DAMAGE_TYPES_FR[String(t)] ?? String(t)).join(", ");
    weapons.push({
      key: `w${i}`,
      name: text(w.name).slice(0, 60),
      ability: "str",
      proficient: true,
      damage: dmg.number && dmg.denomination ? `${dmg.number}d${dmg.denomination} ${type}`.trim() : "",
      notes: "Importée de Foundry",
    });
  }
  s.weapons = weapons;

  const gear = items
    .filter((it) => ["loot", "consumable", "container", "tool", "equipment", "backpack"].includes(String(it.type)))
    .filter((it) => it !== armor && !(it.type === "equipment" && baseItem(it) === "shield"))
    .map((it) => {
      const q = num(obj(it.system).quantity, 1);
      return q > 1 ? `${text(it.name)} ×${q}` : text(it.name);
    })
    .filter(Boolean);
  s.equipment = gear.join(", ");

  const cur = obj(sys.currency);
  for (const [ours, theirs] of Object.entries(COINS)) s.coins[ours as keyof typeof COINS] = Math.max(0, Math.round(num(cur[theirs])));

  // Langues et outils.
  const traits = obj(sys.traits);
  const langs = obj(traits.languages);
  s.languages = [
    ...(Array.isArray(langs.value) ? langs.value : []).map((k) => LANGUAGES[String(k)] ?? String(k)),
    text(langs.custom),
  ]
    .filter(Boolean)
    .join(", ");
  const toolNames = new Set<string>(ofType("tool").map((t) => text(t.name)));
  for (const [k, v] of Object.entries(obj(sys.tools))) if (num(obj(v).value) >= 1 && ![...toolNames].length) toolNames.add(TOOLS[k] ?? k);
  s.tools = [...toolNames].filter(Boolean).join(", ");

  // Sorts : tous en texte ; ceux que le Grimoire connaît (même nom) y sont aussi ajoutés.
  const spells = ofType("spell").map((sp) => ({ name: text(sp.name), level: num(obj(sp.system).level), prepared: num(obj(sp.system).prepared) }));
  s.cantrips = spells.filter((x) => x.level === 0).map((x) => x.name).join(", ");
  s.spells = spells
    .filter((x) => x.level > 0)
    .sort((a, b) => a.level - b.level)
    .map((x) => `${x.name} (niv. ${x.level}${x.prepared ? ", préparé" : ""})`)
    .join(", ");
  s.grimoire = spells
    .filter((x) => x.level === 0 || x.prepared >= 1)
    .map((x) => SPELL_BY_NAME.get(norm(x.name)))
    .filter((x): x is string => Boolean(x && getSpell(x)));

  // Textes.
  const details = obj(sys.details);
  s.identity = {
    alignment: text(details.alignment),
    appearance: text(details.appearance),
    personality: text(details.trait),
    backstory: htmlToText(text(obj(details.biography).value)),
    ideals: text(details.ideal),
    bonds: text(details.bond),
    flaws: text(details.flaw),
  };
  const notes = [
    `Importé depuis Foundry VTT (dnd5e ${text(obj(actor._stats).systemVersion) || "?"}).`,
    foundryLevel > MAX_LEVEL ? `Niveau ${foundryLevel} dans Foundry, ramené à ${MAX_LEVEL}.` : "",
    bgItem && !s.backgroundId ? `Historique : ${text(bgItem.name)}.` : "",
    raceItem && !s.speciesId ? `Espèce : ${text(raceItem.name)}.` : "",
    otherFeats.length ? `Dons : ${otherFeats.join(", ")}.` : "",
  ].filter(Boolean);
  s.notes = notes.join("\n");

  // État en jeu.
  const attr = obj(sys.attributes);
  const hp = obj(attr.hp);
  const death = obj(attr.death);
  const slotsLeft = obj(sys.spells);
  const d = derive(s);
  s.play = {
    hp: num(hp.value, d.hpMax),
    tempHp: num(hp.temp),
    hitDiceSpent: num(obj(classSys.hd).spent),
    deathSuccess: num(death.success),
    deathFail: num(death.failure),
    // Foundry compte les emplacements restants ; l'outil, les emplacements utilisés.
    slotsUsed: (d.spell?.slots ?? []).map((n, i) => {
      const key = d.spell?.kind === "pact" ? "pact" : `spell${i + 1}`;
      const left = obj(slotsLeft[key]).value;
      return left === undefined || left === null ? 0 : Math.max(0, n - num(left));
    }),
    inspiration: attr.inspiration === true,
  };

  const result = normalizeImported(s);
  return { state: result.state, warnings: [...warnings, ...result.warnings] };
}

/* ---------- Outil → Foundry ---------- */

const FOUNDRY_IMG = "icons/svg/mystery-man.svg";

/** Acteur Foundry (dnd5e) à charger avec « Importer des données » sur un personnage. */
export function toFoundryActor(s: CharacterState): Obj {
  const cls = getClass(s.classId) ?? CLASSES[0];
  const sub = getSubclass(s.classId, s.subclassId);
  const d = derive(s);
  const skillLevel = new Map(d.skills.map((x) => [x.id, x.level]));
  const caster = cls.caster ?? (s.level >= 3 ? sub?.caster : undefined);
  const PROGRESSION = { full: "full", half: "half", third: "third", pact: "pact" } as const;

  const items: Obj[] = [];
  const desc = (t: string) => ({ value: textToHtml(t) });

  items.push({
    name: cls.name,
    type: "class",
    img: FOUNDRY_IMG,
    system: {
      identifier: cls.id,
      levels: s.level,
      hd: { denomination: `d${cls.hitDie}`, spent: s.play.hitDiceSpent },
      spellcasting: caster ? { progression: PROGRESSION[caster.kind], ability: caster.ability } : { progression: "none", ability: "" },
      description: desc(cls.pitch),
    },
  });
  if (sub) items.push({ name: sub.name, type: "subclass", img: FOUNDRY_IMG, system: { identifier: sub.id, classIdentifier: cls.id, description: desc(sub.desc) } });

  // Capacités (classe, sous-classe, espèce, dons) : en objets « aptitude » pour les relire dans Foundry.
  for (const f of d.features) {
    items.push({
      name: f.picked ? `${f.name} : ${f.picked}` : f.name,
      type: "feat",
      img: FOUNDRY_IMG,
      system: { type: { value: "class" }, requirements: f.source, description: desc(f.desc) },
    });
  }

  // Armure, bouclier, armes.
  const armor = getArmor(s.armorId);
  if (armor.type !== "none") {
    items.push({
      name: armor.name,
      type: "equipment",
      img: FOUNDRY_IMG,
      system: { type: { value: armor.type, baseItem: ARMOR_BASE[armor.id] ?? "" }, armor: { value: armor.base, dex: armor.dexMax }, equipped: true, strength: armor.str ?? null },
    });
  }
  if (s.shield) items.push({ name: "Bouclier", type: "equipment", img: FOUNDRY_IMG, system: { type: { value: "shield", baseItem: "shield" }, armor: { value: 2 }, equipped: true } });
  for (const w of s.weapons) {
    const def = WEAPONS.find((x) => x.name === w.name);
    const m = /(\d+)d(\d+)\s*(\w*)/.exec(w.damage);
    items.push({
      name: w.name,
      type: "weapon",
      img: FOUNDRY_IMG,
      system: {
        type: { value: def ? `${def.category}${def.ranged ? "R" : "M"}` : "simpleM", baseItem: def ? weaponBase(def.id) : "" },
        equipped: true,
        proficient: w.proficient ? 1 : 0,
        damage: { base: m ? { number: Number(m[1]), denomination: Number(m[2]), types: DAMAGE_TYPES[m[3]] ? [DAMAGE_TYPES[m[3]]] : [] } : {} },
        description: desc(w.notes),
      },
    });
  }

  // Sorts du Grimoire (préparés), avec le résumé de l'outil.
  for (const id of s.grimoire ?? []) {
    const sp = getSpell(id);
    if (!sp) continue;
    items.push({
      name: sp.name,
      type: "spell",
      img: FOUNDRY_IMG,
      system: {
        level: sp.level,
        method: "spell",
        prepared: sp.level > 0 ? 1 : 0,
        sourceItem: `class:${cls.id}`,
        description: desc([sp.desc, sp.higher ? `Aux niveaux supérieurs. ${sp.higher}` : ""].filter(Boolean).join("\n\n")),
      },
    });
  }

  // Le reste de l'équipement (texte libre) en un seul objet.
  if (s.equipment.trim()) items.push({ name: "Équipement", type: "loot", img: FOUNDRY_IMG, system: { quantity: 1, description: desc(s.equipment) } });

  const langKeys: string[] = [];
  const langCustom: string[] = [];
  for (const l of s.languages.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean)) {
    const k = LANGUAGE_KEYS[norm(l)];
    if (k) langKeys.push(k);
    else langCustom.push(l);
  }

  const bio = [
    s.identity.backstory,
    [s.cantrips && `Sorts mineurs : ${s.cantrips}`, s.spells && `Sorts : ${s.spells}`].filter(Boolean).join("\n"),
    s.notes && `Notes :\n${s.notes}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    name: s.name,
    type: "character",
    img: FOUNDRY_IMG,
    system: {
      abilities: Object.fromEntries(ABILITY_IDS.map((a) => [a, { value: d.scores[a], proficient: d.saves[a].proficient ? 1 : 0 }])),
      skills: Object.fromEntries(
        ALL_SKILLS.map((id) => {
          const lvl = skillLevel.get(id);
          return [SKILL_TO_FOUNDRY[id], { value: lvl === "expert" ? 2 : lvl === "prof" ? 1 : lvl === "half" ? 0.5 : 0 }];
        }),
      ),
      attributes: {
        hp: { value: s.play.hp, max: d.hpMax, temp: s.play.tempHp || null },
        death: { success: s.play.deathSuccess, failure: s.play.deathFail },
        inspiration: s.play.inspiration,
        spellcasting: caster?.ability ?? "",
      },
      currency: Object.fromEntries(Object.entries(COINS).map(([ours, theirs]) => [theirs, s.coins[ours as keyof typeof COINS]])),
      details: {
        biography: { value: textToHtml(bio), public: "" },
        alignment: s.identity.alignment,
        appearance: s.identity.appearance,
        trait: s.identity.personality,
        ideal: s.identity.ideals ?? "",
        bond: s.identity.bonds ?? "",
        flaw: s.identity.flaws ?? "",
      },
      traits: {
        size: d.size.startsWith("P") ? "sm" : "med",
        languages: { value: langKeys, custom: langCustom.join(", ") },
      },
    },
    items,
    flags: { "outil-jdr": { exportedAt: new Date().toISOString() } },
  };
}
