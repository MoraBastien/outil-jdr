import { ANOMALIES } from "../data/anomalies";
import { CONSTELLATIONS } from "../data/constellations";
import { FELURES } from "../data/felures";
import { STATS } from "../data/stats";
import type { DerivedSheet, HomunculusState } from "../types";
import { choixActifs, competenceNom, getClasse, getMatiere, signed } from "./rules";

/** Nom lisible d'une option de choix de classe (ou d'une compétence pour l'expertise). */
export function choixLabel(classeId: string | null, choixId: string, optionId: string): string {
  const ch = getClasse(classeId)?.choix.find((x) => x.id === choixId);
  if (!ch) return optionId;
  if (ch.source === "competences") return competenceNom(optionId);
  return ch.options?.find((o) => o.id === optionId)?.nom ?? optionId;
}

/** Texte brut de la fiche (bouton « Copier la fiche », exports, Discord...). */
export function sheetToText(s: HomunculusState, d: DerivedSheet): string {
  const m = getMatiere(s.matiereId);
  const c = getClasse(s.classeId);
  const a = ANOMALIES.find((x) => x.id === s.anomalieId);
  const f = FELURES.find((x) => x.id === s.felureId);
  const L: string[] = [];
  L.push(`${s.nom || "Homunculus sans nom"} — Écho ${s.echo}`);
  L.push(`Matière : ${m ? `${m.nom} — ${m.capacite} : ${m.effet} / Faiblesse : ${m.faiblesse}` : "—"}`);
  L.push(`Classe : ${c ? `${c.nom} niveau ${s.echo}` : "—"}`);
  L.push(
    "Caractéristiques : " +
      STATS.map((st, i) => {
        const v = d.stats[i];
        return `${st.abbr} ${v.final == null ? "—" : `${v.final} (${signed(v.mod ?? 0)})`}`;
      }).join(", "),
  );
  L.push(`PV : ${d.pv ?? "—"} · Maîtrise ${signed(d.pb)} · DD ${d.dd ?? "—"}`);
  L.push(`Anomalie : ${a ? `${a.nom} — ${a.passif}` : "—"}`);
  L.push(`Compétences : ${d.competences.length ? d.competences.map(competenceNom).join(", ") : "—"}`);
  if (c) {
    L.push(`Sauvegardes : ${c.sauvegardes}`);
    L.push(`Traits de classe : ${c.traits.filter((t) => t.niveau <= s.echo).map((t) => t.nom).join(", ")}`);
    for (const ch of choixActifs(s)) {
      const v = s.choix[ch.id] ?? [];
      if (v.length) L.push(`${ch.titre} : ${v.map((o) => choixLabel(s.classeId, ch.id, o)).join(", ")}`);
    }
    if (c.magie) L.push(`Magie : ${c.magie[Math.min(s.echo, 4) - 1]}`);
  }
  L.push(`Fêlure : ${f ? `${f.nom} — ${f.description}` : "—"}`);
  L.push(`Marque : ${s.marque || "—"}`);
  L.push(`Mission : ${s.mission || "—"}`);
  L.push(`Constellation : ${CONSTELLATIONS.find((x) => x.id === s.constellationId)?.nom ?? "—"}`);
  L.push(`Relances : stats ${Math.max(0, s.jets - 1)}, Fêlure ${Math.max(0, s.felJets - 1)}`);
  return L.join("\n");
}
