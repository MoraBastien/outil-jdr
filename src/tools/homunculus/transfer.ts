// Transfert de l'homunculus actif (fiche de l'Atelier) vers une fiche de personnage classique (D&D 2024).
// La classe et le niveau (= Écho) passent par le moteur de règles de la fiche ; tout ce qui est propre à
// l'Atelier (Matière, Faiblesse, Anomalie, Fêlure, choix de classe, magie) est listé dans l'onglet Capacités.
// Côté serveur uniquement.
import { emptyState, derive as deriveCharacter } from "@/tools/character/rules";
import { getClass } from "@/tools/character/data/classes";
import type { CharacterState, SkillId } from "@/tools/character/types";
import { ANOMALIES, CLASSES, FELURES, MATIERES, derive, type HomunculusState } from "@/tools/homunculus-creator/server";

/** Classes de l'Atelier (ids français) → classes de la fiche. */
const CLASS_MAP: Record<string, string> = {
  barbare: "barbarian",
  barde: "bard",
  clerc: "cleric",
  druide: "druid",
  guerrier: "fighter",
  moine: "monk",
  paladin: "paladin",
  rodeur: "ranger",
  roublard: "rogue",
  ensorceleur: "sorcerer",
  occultiste: "warlock",
  magicien: "wizard",
};

/** Compétences de l'Atelier → compétences de la fiche. */
const SKILL_MAP: Record<string, SkillId> = {
  acrobaties: "acrobatics",
  arcanes: "arcana",
  athletisme: "athletics",
  discretion: "stealth",
  dressage: "animal",
  escamotage: "sleight",
  histoire: "history",
  intimidation: "intimidation",
  intuition: "insight",
  investigation: "investigation",
  medecine: "medicine",
  nature: "nature",
  perception: "perception",
  persuasion: "persuasion",
  religion: "religion",
  representation: "performance",
  survie: "survival",
  tromperie: "deception",
};

const skill = (id: string): SkillId[] => (SKILL_MAP[id] ? [SKILL_MAP[id]] : []);

export type TransferError = { error: string };

/** Libellé court d'une fiche de l'Atelier : « Verre · Clerc ». */
export function homunculusLabel(h: HomunculusState): string {
  return [MATIERES.find((m) => m.id === h.matiereId)?.nom, CLASSES.find((c) => c.id === h.classeId)?.nom].filter(Boolean).join(" · ");
}

/**
 * Règles de la fiche classique tirées de l'homunculus. `keep` : la fiche actuelle, dont on garde ce que le joueur
 * a rempli en jeu (équipement, notes, PV…) lors d'une mise à jour.
 */
export function homunculusToCharacter(h: HomunculusState, keep?: CharacterState): CharacterState | TransferError {
  const d = derive(h);
  if (!d.complete) return { error: "Cet homunculus n'est pas terminé dans l'Atelier." };
  const classe = CLASSES.find((c) => c.id === h.classeId);
  const classId = classe ? CLASS_MAP[classe.id] : undefined;
  const cls = classId ? getClass(classId) : undefined;
  if (!classe || !cls) return { error: "La classe de cet homunculus n'existe pas dans la fiche de personnage." };

  const matiere = MATIERES.find((m) => m.id === h.matiereId);
  const anomalie = ANOMALIES.find((a) => a.id === h.anomalieId);
  const felure = FELURES.find((f) => f.id === h.felureId);
  const level = Math.min(Math.max(h.echo, 1), 4);
  const stat = (i: number) => d.stats[i].final ?? 8;

  // Choix de classe : les expertises deviennent de vraies expertises, le reste est listé tel quel.
  const expertise: SkillId[] = [];
  const choiceFeatures: { name: string; desc: string; source: string }[] = [];
  for (const ch of classe.choix.filter((c) => c.niveau <= level)) {
    const picked = h.choix[ch.id] ?? [];
    if (!picked.length) continue;
    if (ch.source === "competences") {
      picked.forEach((p) => expertise.push(...skill(p)));
      continue;
    }
    const names = picked.map((p) => ch.options?.find((o) => o.id === p)?.nom ?? p);
    const descs = picked.map((p) => ch.options?.find((o) => o.id === p)?.description).filter(Boolean);
    choiceFeatures.push({ name: `${ch.titre} : ${names.join(", ")}`, desc: descs.join(" ") || "Choix fait dans l'Atelier.", source: classe.nom });
  }

  const features = [
    ...(matiere
      ? [
          { name: matiere.capacite, desc: matiere.effet, source: `Matière · ${matiere.nom}` },
          { name: "Faiblesse", desc: matiere.faiblesse, source: `Matière · ${matiere.nom}` },
        ]
      : []),
    ...(anomalie ? [{ name: anomalie.nom, desc: anomalie.passif, source: "Anomalie" }] : []),
    ...(felure ? [{ name: felure.nom, desc: felure.description, source: "Fêlure" }] : []),
    ...choiceFeatures,
    ...(classe.magie ? [{ name: "Magie", desc: classe.magie[level - 1], source: classe.nom }] : []),
    { name: "Maîtrises", desc: `Armures : ${classe.armures}. Armes : ${classe.armes}.`, source: classe.nom },
  ];

  const base = keep ? structuredClone(keep) : emptyState();
  const s: CharacterState = {
    ...base,
    name: keep?.name || h.nom.trim() || "Homunculus",
    classId: cls.id,
    subclassId: null,
    speciesId: "",
    speciesOptions: {},
    backgroundId: "",
    level,
    scoreMethod: "free",
    baseScores: { str: stat(0), dex: stat(1), con: stat(2), int: stat(3), wis: stat(4), cha: stat(5) },
    backgroundBonus: {},
    asiBonus: {},
    skills: Array.from(new Set(d.competences.flatMap(skill))),
    expertise: Array.from(new Set(expertise)),
    feats: [],
    classChoices: {},
    // Même calcul que l'Atelier : dé de vie au niveau 1, puis la moyenne arrondie (dv/2 + 1) par niveau.
    hpRolls: Array.from({ length: level - 1 }, () => classe.dv / 2 + 1),
    identity: keep?.identity ?? {
      alignment: "",
      appearance: h.marque ? `Marque : ${h.marque}` : "",
      personality: felure ? `${felure.nom} : ${felure.description}` : "",
      backstory: h.mission ? `Mission : ${h.mission}` : "",
    },
    extra: { sourceId: h.id, tag: `Homunculus · ${matiere?.nom ?? "?"}${anomalie ? ` · ${anomalie.nom}` : ""}`, title: "Capacités d'homunculus", features },
  };
  const hpMax = deriveCharacter(s).hpMax;
  s.play = keep ? { ...s.play, hp: Math.min(s.play.hp, hpMax) } : { ...s.play, hp: hpMax };
  return s;
}
