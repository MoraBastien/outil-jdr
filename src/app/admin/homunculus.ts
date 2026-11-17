// Résumé lisible d'une fiche d'homunculus, pour les pages admin.
import type { StoredHomunculus } from "@/lib/db";
import { MATIERES, CLASSES, derive, normalize, type HomunculusState } from "@/tools/homunculus-creator/server";
import { MAX_ECHO } from "@/tools/homunculus/echo";

export type HomunculusSummary = {
  id: string;
  nom: string;
  echo: number;
  matiere: string | null;
  classe: string | null;
  stepsDone: number;
  complete: boolean;
  pv: number | null;
  relances: number;
  updatedAt: string;
};

export function summarize(h: StoredHomunculus): HomunculusSummary {
  const s = normalize(h.state as HomunculusState, MAX_ECHO);
  const d = derive(s);
  return {
    id: h.id,
    nom: s.nom.trim() || "Sans nom",
    echo: s.echo,
    matiere: MATIERES.find((m) => m.id === s.matiereId)?.nom ?? null,
    classe: CLASSES.find((c) => c.id === s.classeId)?.nom ?? null,
    stepsDone: d.steps.filter(Boolean).length,
    complete: d.complete,
    pv: d.pv,
    relances: Math.max(0, s.jets - 1) + Math.max(0, s.felJets - 1),
    updatedAt: h.updatedAt,
  };
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });
export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
