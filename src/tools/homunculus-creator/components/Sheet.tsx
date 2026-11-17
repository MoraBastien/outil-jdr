import { useState } from "react";
import { ANOMALIES } from "../data/anomalies";
import { FELURES } from "../data/felures";
import { STATS } from "../data/stats";
import { choixActifs, competenceNom, getClasse, getMatiere, signed } from "../lib/rules";
import { choixLabel, sheetToText } from "../lib/sheet";
import type { DerivedSheet, HomunculusState } from "../types";

interface Props {
  state: HomunculusState;
  derived: DerivedSheet;
  canSave: boolean;
  onSave: () => void;
  onReset: () => void;
  onSubmit?: () => void;
  submitLabel: string;
  submitting: boolean;
  readOnly: boolean;
}

export function Sheet({ state, derived, canSave, onSave, onReset, onSubmit, submitLabel, submitting, readOnly }: Props) {
  const [copy, setCopy] = useState<null | { text: string; ok: boolean }>(null);
  const m = getMatiere(state.matiereId);
  const c = getClasse(state.classeId);
  const a = ANOMALIES.find((x) => x.id === state.anomalieId);
  const f = FELURES.find((x) => x.id === state.felureId);
  const n = derived.steps.filter(Boolean).length;

  const copyText = async () => {
    const text = sheetToText(state, derived);
    try {
      await navigator.clipboard.writeText(text);
      setCopy({ text, ok: true });
    } catch {
      setCopy({ text, ok: false });
    }
  };

  return (
    <div className="hc-sheet" aria-live="polite">
      <header>
        <span className="hc-label">Fiche de cuve</span>
        <span className="hc-label">{n}/6 étapes</span>
      </header>
      <div className="hc-body">
        <div>
          <h3>{state.nom || "Homunculus sans nom"}</h3>
          <div className="hc-sub">
            Écho {state.echo} · {c ? c.nom : "classe à choisir"} · {m ? m.nom : "matière à choisir"}
          </div>
        </div>
        <div className="hc-grid6">
          {STATS.map((st, i) => {
            const d = derived.stats[i];
            return (
              <div className="hc-cell" key={st.id}>
                <div className="hc-k">{st.abbr}</div>
                <div className="hc-v">{d.final ?? "—"}</div>
                <div className="hc-m">{d.mod == null ? "" : signed(d.mod)}</div>
              </div>
            );
          })}
        </div>
        <div className="hc-kv">
          <span className="hc-label">Combat</span>
          <p>
            PV {derived.pv ?? "—"} · Maîtrise {signed(derived.pb)}
            {derived.dd != null ? ` · DD ${derived.dd}` : ""}
            {derived.initiative != null ? ` · Initiative ${signed(derived.initiative)}` : ""}
          </p>
        </div>
        {c && (
          <div className="hc-kv">
            <span className="hc-label">Classe</span>
            <p>Sauvegardes : {c.sauvegardes}</p>
            <p>Traits : {c.traits.filter((t) => t.niveau <= state.echo).map((t) => t.nom).join(", ")}</p>
            {choixActifs(state).some((ch) => (state.choix[ch.id] ?? []).length) && (
              <p>
                {choixActifs(state)
                  .filter((ch) => (state.choix[ch.id] ?? []).length)
                  .map((ch) => `${ch.titre} : ${(state.choix[ch.id] ?? []).map((o) => choixLabel(state.classeId, ch.id, o)).join(", ")}`)
                  .join(" · ")}
              </p>
            )}
            {c.magie && <p className="hc-empty">{c.magie[Math.min(state.echo, 4) - 1]}</p>}
          </div>
        )}
        <div className="hc-kv">
          <span className="hc-label">Matière</span>
          {m ? (
            <>
              <p><b>{m.capacite}</b> : {m.effet}</p>
              <p className="hc-empty">Faiblesse : {m.faiblesse}</p>
            </>
          ) : (
            <p className="hc-empty">Non choisie</p>
          )}
        </div>
        <div className="hc-kv">
          <span className="hc-label">Anomalie</span>
          {a ? <p><b>{a.nom}</b> : {a.passif}</p> : <p className="hc-empty">Non choisie</p>}
        </div>
        <div className="hc-kv">
          <span className="hc-label">Compétences</span>
          <p>{derived.competences.length ? derived.competences.map(competenceNom).join(", ") : <span className="hc-empty">Aucune</span>}</p>
        </div>
        <div className="hc-kv">
          <span className="hc-label">Fêlure</span>
          {f ? <p><b>{f.nom}</b> : {f.description}</p> : <p className="hc-empty">Non tirée</p>}
        </div>
        <div className="hc-kv">
          <span className="hc-label">Marque</span>
          <p>{state.marque || <span className="hc-empty">—</span>}</p>
        </div>
        <div className="hc-kv">
          <span className="hc-label">Mission</span>
          <p>{state.mission || <span className="hc-empty">—</span>}</p>
        </div>
        <p className="hc-label" style={{ margin: 0 }}>
          Relances : stats {Math.max(0, state.jets - 1)} · Fêlure {Math.max(0, state.felJets - 1)}
        </p>
        <div className="hc-actions">
          <button type="button" className="hc-btn" onClick={copyText}>Copier la fiche</button>
          {canSave && <button type="button" className="hc-btn hc-ghost" onClick={onSave} disabled={readOnly}>Enregistrer</button>}
          <button type="button" className="hc-btn hc-ghost" onClick={onReset} disabled={readOnly}>Nouveau</button>
          {onSubmit && (
            <button type="button" className="hc-btn" onClick={onSubmit} disabled={!derived.complete || submitting || readOnly}>
              {submitting ? "Envoi…" : submitLabel}
            </button>
          )}
        </div>
        {copy && (copy.ok ? <p className="hc-note">Fiche copiée.</p> : <textarea className="hc-copybox" readOnly value={copy.text} onFocus={(e) => e.currentTarget.select()} aria-label="Texte de la fiche" />)}
      </div>
    </div>
  );
}
