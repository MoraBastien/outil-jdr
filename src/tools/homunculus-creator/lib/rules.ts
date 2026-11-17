import { ANOMALIES } from "../data/anomalies";
import { CLASSES } from "../data/classes";
import { COMPETENCES } from "../data/competences";
import { MATIERES } from "../data/matieres";
import { STATS, STAT_MAX } from "../data/stats";
import type { ClasseDef, DerivedSheet, HomunculusState } from "../types";

export const getClasse = (id: string | null): ClasseDef | undefined => CLASSES.find((c) => c.id === id);
export const getMatiere = (id: string | null) => MATIERES.find((m) => m.id === id);
export const getAnomalie = (id: string | null) => ANOMALIES.find((a) => a.id === id);
export const competenceNom = (id: string) => COMPETENCES.find((c) => c.id === id)?.nom ?? id;

export const mod = (v: number) => Math.floor((v - 10) / 2);
export const signed = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n)}`;

/** Bonus de maîtrise : +2 (Écho 1-4), +3 (5-8), +4 (9-10). */
export const proficiency = (echo: number) => 2 + Math.floor((echo - 1) / 4);

/** Points d'augmentation de caractéristiques : +2 à l'Écho 4, +2 à l'Écho 8. */
export const asiPoints = (echo: number) => (echo >= 4 ? 2 : 0) + (echo >= 8 ? 2 : 0);

export const asiUsed = (s: Pick<HomunculusState, "bonus">) => s.bonus.reduce((a, b) => a + b, 0);

export function baseStat(s: HomunculusState, i: number): number | null {
  const a = s.assign[i];
  return a == null || !s.pool ? null : s.pool[a] ?? null;
}

export function finalStat(s: HomunculusState, i: number): number | null {
  const b = baseStat(s, i);
  return b == null ? null : Math.min(STAT_MAX, b + s.bonus[i]);
}

/** Toutes les compétences maîtrisées (Anomalie + classe), sans doublon. */
export const allCompetences = (s: HomunculusState) => Array.from(new Set([...s.competencesAnomalie, ...s.competencesClasse]));

/** Les choix de classe encore actifs à cet Écho. */
export function choixActifs(s: HomunculusState) {
  const c = getClasse(s.classeId);
  return c ? c.choix.filter((x) => x.niveau <= s.echo) : [];
}

export function classeComplete(s: HomunculusState): boolean {
  const c = getClasse(s.classeId);
  if (!c) return false;
  if (s.competencesClasse.length !== c.nbCompetences) return false;
  return choixActifs(s).every((x) => (s.choix[x.id] ?? []).length === x.nombre);
}

/** PV = dé de vie au niveau 1, puis moyenne arrondie par niveau, plus le mod. de Constitution par niveau. Minimum : 1 par niveau. */
export function hitPoints(s: HomunculusState): number | null {
  const c = getClasse(s.classeId);
  const con = finalStat(s, 2);
  if (!c || con == null) return null;
  return Math.floor(Math.max(s.echo, c.dv + (s.echo - 1) * (c.dv / 2 + 1) + mod(con) * s.echo));
}

/** DD des capacités de matière : 8 + maîtrise + mod. de Constitution. */
export function saveDC(s: HomunculusState): number | null {
  const con = finalStat(s, 2);
  return con == null ? null : 8 + proficiency(s.echo) + mod(con);
}

export function derive(s: HomunculusState): DerivedSheet {
  const stats = STATS.map((d, i) => {
    const f = finalStat(s, i);
    return { id: d.id, base: baseStat(s, i), final: f, mod: f == null ? null : mod(f) };
  });
  const steps = [
    s.matiereId != null,
    classeComplete(s),
    s.assign.every((a) => a != null),
    s.anomalieId != null && s.competencesAnomalie.length === 2,
    s.felureId != null,
    s.nom.trim().length > 0,
  ];
  const dex = stats[1].mod;
  return {
    pb: proficiency(s.echo),
    asi: asiPoints(s.echo),
    asiUsed: asiUsed(s),
    stats,
    pv: hitPoints(s),
    dd: saveDC(s),
    initiative: dex,
    steps,
    complete: steps.every(Boolean),
    competences: allCompetences(s),
  };
}
