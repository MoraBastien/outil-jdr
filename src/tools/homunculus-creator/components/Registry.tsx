import { MATIERES } from "../data/matieres";
import { CLASSES } from "../data/classes";
import type { HomunculusState } from "../types";

interface Props {
  fiches: HomunculusState[];
  onLoad: (s: HomunculusState) => void;
  onRemove: (s: HomunculusState) => void;
}

export function Registry({ fiches, onLoad, onRemove }: Props) {
  return (
    <section className="hc-reg">
      <h2>Registre</h2>
      <p className="hc-hint">Tes homunculus sauvegardés. Charges-en un pour le reprendre dans la cuve.</p>
      {fiches.length === 0 ? (
        <p className="hc-empty">Aucune fiche enregistrée.</p>
      ) : (
        fiches.map((s) => (
          <div className="hc-regrow" key={s.id}>
            <span>
              <b>{s.nom || "Sans nom"}</b> · Écho {s.echo} · {MATIERES.find((m) => m.id === s.matiereId)?.nom ?? "—"} · {CLASSES.find((c) => c.id === s.classeId)?.nom ?? "—"}
            </span>
            <span className="hc-actions">
              <button type="button" className="hc-btn hc-ghost" onClick={() => onLoad(s)}>Charger</button>
              <button type="button" className="hc-btn hc-ghost" onClick={() => onRemove(s)}>Supprimer</button>
            </span>
          </div>
        ))
      )}
    </section>
  );
}
