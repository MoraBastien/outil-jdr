import { CONSTELLATIONS } from "../data/constellations";
import { STATS, STAT_MAX } from "../data/stats";
import { MATIERES } from "../data/matieres";
import { ANOMALIES } from "../data/anomalies";
import { COMPETENCES } from "../data/competences";
import { FELURES } from "../data/felures";
import type { HomunculusState } from "../types";
import { allCompetences, asiPoints, asiUsed, baseStat, finalStat, getClasse } from "./rules";

const zeros = () => STATS.map(() => 0);
const nulls = () => STATS.map(() => null as number | null);

/**
 * État initial. Déterministe (pas d'aléa ni d'id) pour éviter les écarts d'hydratation avec le rendu serveur :
 * l'id et la constellation aléatoire sont posés après le montage (action « hydrate »).
 */
export function createInitialState(partial?: Partial<HomunculusState>, maxEcho = 4): HomunculusState {
  const base: HomunculusState = {
    schemaVersion: 1,
    id: "",
    echo: 1,
    matiereId: null,
    classeId: null,
    pool: null,
    assign: nulls(),
    bonus: zeros(),
    competencesAnomalie: [],
    competencesClasse: [],
    choix: {},
    anomalieId: null,
    felureId: null,
    jets: 0,
    felJets: 0,
    nom: "",
    marque: "",
    mission: "",
    constellationId: CONSTELLATIONS[0].id,
  };
  return normalize({ ...base, ...partial }, maxEcho);
}

/** Remet un état (venant d'une base, d'une ancienne version...) dans un état cohérent avec les données actuelles. */
export function normalize(input: HomunculusState, maxEcho = 4): HomunculusState {
  const s: HomunculusState = { ...input };
  s.echo = Math.min(Math.max(1, Math.round(s.echo || 1)), maxEcho);
  const m = MATIERES.find((x) => x.id === s.matiereId);
  if (!m || m.echoMin > s.echo) s.matiereId = null;
  if (!getClasse(s.classeId)) {
    s.classeId = null;
    s.competencesClasse = [];
    s.choix = {};
  }
  if (!ANOMALIES.some((a) => a.id === s.anomalieId)) s.anomalieId = null;
  if (!FELURES.some((f) => f.id === s.felureId)) s.felureId = null;
  if (!CONSTELLATIONS.some((c) => c.id === s.constellationId)) s.constellationId = CONSTELLATIONS[0].id;
  const known = new Set(COMPETENCES.map((c) => c.id));
  s.competencesAnomalie = (s.competencesAnomalie ?? []).filter((c) => known.has(c)).slice(0, 2);
  s.competencesClasse = (s.competencesClasse ?? []).filter((c) => known.has(c) && !s.competencesAnomalie.includes(c));
  const cl = getClasse(s.classeId);
  if (cl) s.competencesClasse = s.competencesClasse.slice(0, cl.nbCompetences);
  s.pool = s.pool && s.pool.length === STATS.length ? s.pool : null;
  s.assign = STATS.map((_, i) => (s.pool ? s.assign?.[i] ?? null : null));
  s.bonus = STATS.map((_, i) => s.bonus?.[i] ?? 0);
  if (asiUsed(s) > asiPoints(s.echo)) s.bonus = zeros();
  s.choix = { ...(s.choix ?? {}) };
  return prune(s);
}

/** Retire les choix de classe verrouillés, inconnus ou en excès. */
function prune(s: HomunculusState): HomunculusState {
  const c = getClasse(s.classeId);
  const choix: Record<string, string[]> = {};
  if (c) {
    const comps = allCompetences(s);
    for (const ch of c.choix) {
      const cur = s.choix[ch.id];
      if (!cur || ch.niveau > s.echo) continue;
      const valid = ch.source === "competences" ? cur.filter((x) => comps.includes(x)) : cur.filter((x) => ch.options?.some((o) => o.id === x));
      choix[ch.id] = valid.slice(0, ch.nombre);
    }
  }
  return { ...s, choix };
}

export type Action =
  | { type: "hydrate"; id: string; constellationId: string }
  | { type: "load"; state: HomunculusState; maxEcho?: number }
  | { type: "reset"; id: string; constellationId: string; echo: number }
  | { type: "setEcho"; echo: number; maxEcho: number }
  | { type: "setMatiere"; id: string }
  | { type: "setClasse"; id: string }
  | { type: "setPool"; pool: number[] }
  | { type: "assign"; stat: number; poolIndex: number | null }
  | { type: "autoAssign" }
  | { type: "bonus"; stat: number; delta: 1 | -1 }
  | { type: "setAnomalie"; id: string }
  | { type: "toggleCompetenceAnomalie"; id: string }
  | { type: "toggleCompetenceClasse"; id: string }
  | { type: "toggleChoix"; choixId: string; optionId: string }
  | { type: "setFelure"; id: string }
  | { type: "setField"; field: "nom" | "marque" | "mission"; value: string };

export function reducer(s: HomunculusState, a: Action): HomunculusState {
  switch (a.type) {
    case "hydrate":
      return { ...s, id: s.id || a.id, constellationId: a.constellationId };
    case "load":
      return normalize(a.state, a.maxEcho);
    case "reset":
      return { ...createInitialState({ echo: a.echo }, a.echo), id: a.id, constellationId: a.constellationId };
    case "setEcho":
      return normalize({ ...s, echo: a.echo }, a.maxEcho);
    case "setMatiere": {
      const m = MATIERES.find((x) => x.id === a.id);
      return m && m.echoMin <= s.echo ? { ...s, matiereId: m.id } : s;
    }
    case "setClasse":
      if (!getClasse(a.id)) return s;
      return s.classeId === a.id ? s : { ...s, classeId: a.id, competencesClasse: [], choix: {} };
    case "setPool":
      return { ...s, pool: a.pool, assign: nulls(), bonus: zeros(), jets: s.jets + 1 };
    case "assign": {
      if (!s.pool) return s;
      const assign = [...s.assign];
      assign[a.stat] = a.poolIndex;
      return { ...s, assign };
    }
    case "autoAssign": {
      const c = getClasse(s.classeId);
      if (!c || !s.pool) return s;
      const assign = nulls();
      c.priorite.forEach((id, k) => {
        assign[STATS.findIndex((d) => d.id === id)] = k;
      });
      return { ...s, assign, bonus: zeros() };
    }
    case "bonus": {
      const bonus = [...s.bonus];
      if (a.delta > 0) {
        const f = finalStat(s, a.stat);
        if (asiUsed(s) >= asiPoints(s.echo) || f == null || f >= STAT_MAX) return s;
      } else if (bonus[a.stat] <= 0 || baseStat(s, a.stat) == null) return s;
      bonus[a.stat] += a.delta;
      return { ...s, bonus };
    }
    case "setAnomalie":
      return ANOMALIES.some((x) => x.id === a.id) ? { ...s, anomalieId: a.id } : s;
    case "toggleCompetenceAnomalie": {
      let { competencesAnomalie: an, competencesClasse: cl } = s;
      if (an.includes(a.id)) an = an.filter((x) => x !== a.id);
      else if (cl.includes(a.id)) cl = cl.filter((x) => x !== a.id);
      else if (an.length < 2) an = [...an, a.id];
      return prune({ ...s, competencesAnomalie: an, competencesClasse: cl });
    }
    case "toggleCompetenceClasse": {
      const c = getClasse(s.classeId);
      if (!c) return s;
      let { competencesAnomalie: an, competencesClasse: cl } = s;
      if (cl.includes(a.id)) cl = cl.filter((x) => x !== a.id);
      else if (an.includes(a.id)) an = an.filter((x) => x !== a.id);
      else if (cl.length < c.nbCompetences) cl = [...cl, a.id];
      return prune({ ...s, competencesAnomalie: an, competencesClasse: cl });
    }
    case "toggleChoix": {
      const ch = getClasse(s.classeId)?.choix.find((x) => x.id === a.choixId);
      if (!ch || ch.niveau > s.echo) return s;
      const cur = s.choix[ch.id] ?? [];
      let next: string[];
      if (cur.includes(a.optionId)) next = cur.filter((x) => x !== a.optionId);
      else if (ch.nombre === 1) next = [a.optionId];
      else if (cur.length < ch.nombre) next = [...cur, a.optionId];
      else next = cur;
      return prune({ ...s, choix: { ...s.choix, [ch.id]: next } });
    }
    case "setFelure":
      return FELURES.some((f) => f.id === a.id) ? { ...s, felureId: a.id, felJets: s.felJets + 1 } : s;
    case "setField":
      return { ...s, [a.field]: a.value };
  }
}
