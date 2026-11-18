"use client";
// Sélecteur générique pour un choix de règle (options, compétences, expertise, sous-classe)
// et pour l'amélioration de caractéristiques / don du niveau 4.

import { ABILITIES, abilityShort } from "../data/abilities";
import { getClass } from "../data/classes";
import { FEATS, getFeat } from "../data/feats";
import { availableValues, finalScores } from "../rules";
import type { Ability, CharacterState, Choice } from "../types";

export function ChoicePicker({
  state,
  choice,
  value,
  onChange,
}: {
  state: CharacterState;
  choice: Choice;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  if (choice.kind === "asi") return <AsiPicker state={state} value={value} onChange={onChange} />;

  const count = choice.kind === "subclass" ? 1 : choice.count;
  const options = availableValues(state, choice);
  const subclasses = choice.kind === "subclass" ? getClass(state.classId)?.subclasses ?? [] : [];
  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else if (count === 1) onChange([id]);
    else if (value.length < count) onChange([...value, id]);
  };
  const rich = choice.kind === "options" || choice.kind === "subclass";

  return (
    <fieldset className="cs-choice">
      <legend className="cs-choice-head">
        <strong>{choice.label}</strong>
        <span className={`chip ${value.length === count ? "chip-ok" : "chip-accent"}`}>
          {value.length}/{count}
        </span>
      </legend>
      {choice.kind === "expertise" && (
        <p className="muted small">L&apos;expertise double ton bonus de maîtrise pour cette compétence. Choisis parmi celles que tu maîtrises déjà.</p>
      )}
      <div className={rich ? "cs-options" : "cs-pills"}>
        {options.map((o) => {
          const on = value.includes(o.id);
          const sub = subclasses.find((x) => x.id === o.id);
          return (
            <button
              key={o.id}
              type="button"
              className={`${rich ? "cs-option" : "cs-pill"}${on ? " on" : ""}`}
              aria-pressed={on}
              onClick={() => toggle(o.id)}
              disabled={!on && count > 1 && value.length >= count}
            >
              <strong>{o.name}</strong>
              {rich && o.desc && <span className="muted small">{o.desc}</span>}
              {sub && (
                <ul className="cs-sub-features">
                  {sub.features.map((f) => (
                    <li key={f.name}>
                      <b>{f.name}</b> : {f.desc}
                    </li>
                  ))}
                </ul>
              )}
            </button>
          );
        })}
        {options.length === 0 && <p className="muted small">Aucune option disponible : parles-en à ton MJ.</p>}
      </div>
    </fieldset>
  );
}

/** Réponse : ["asi", a, b] ou ["feat", id, caractéristique?]. */
function AsiPicker({ state, value, onChange }: { state: CharacterState; value: string[]; onChange: (v: string[]) => void }) {
  const scores = finalScores(state);
  const mode = value[0] === "feat" ? "feat" : "asi";
  const [, x, y] = value;
  const feat = mode === "feat" ? getFeat(x) : undefined;
  const taken = new Set(state.feats.map((f) => f.id));

  // +2 sur une caractéristique = deux fois la même.
  const plus = (a: Ability) => (mode === "asi" ? (x === a ? 1 : 0) + (y === a ? 1 : 0) : 0);
  const bump = (a: Ability) => {
    const picks = [x, y].filter((v) => v && ABILITIES.some((ab) => ab.id === v));
    if (picks.length < 2) onChange(["asi", ...picks, a]);
    else onChange(["asi", a]);
  };

  return (
    <fieldset className="cs-choice">
      <legend className="cs-choice-head">
        <strong>Amélioration de caractéristiques ou don</strong>
      </legend>
      <div className="segmented-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "asi"} className={mode === "asi" ? "on" : ""} onClick={() => onChange(["asi"])}>
          +2 aux caractéristiques
        </button>
        <button type="button" role="tab" aria-selected={mode === "feat"} className={mode === "feat" ? "on" : ""} onClick={() => onChange(["feat"])}>
          Prendre un don
        </button>
      </div>

      {mode === "asi" ? (
        <>
          <p className="muted small">Clique deux fois sur la même caractéristique pour +2, ou sur deux différentes pour +1 chacune. Maximum 20.</p>
          <div className="cs-asi">
            {ABILITIES.map((a) => {
              const p = plus(a.id);
              const picks = [x, y].filter(Boolean).length;
              // Pas au-delà de 20 (un 3e clic recommence la sélection).
              const disabled = picks < 2 && scores[a.id] + p + 1 > 20;
              return (
                <button key={a.id} type="button" className={`cs-asi-btn${p ? " on" : ""}`} onClick={() => bump(a.id)} disabled={disabled}>
                  <span className="label">{a.short}</span>
                  <strong>
                    {scores[a.id]}
                    {p > 0 && <span className="cs-up"> → {scores[a.id] + p}</span>}
                  </strong>
                  {p > 0 && <span className="chip chip-ok">+{p}</span>}
                </button>
              );
            })}
          </div>
          {[x, y].filter(Boolean).length === 2 && (
            <button type="button" className="link-btn" onClick={() => onChange(["asi"])}>
              Recommencer
            </button>
          )}
        </>
      ) : (
        <>
          <p className="muted small">Un don apporte une capacité nouvelle. Beaucoup donnent aussi +1 à une caractéristique.</p>
          <div className="cs-options cs-feats">
            {FEATS.filter((f) => !taken.has(f.id)).map((f) => (
              <button key={f.id} type="button" className={`cs-option${x === f.id ? " on" : ""}`} aria-pressed={x === f.id} onClick={() => onChange(["feat", f.id])}>
                <strong>
                  {f.name} {f.kind === "origin" && <span className="chip">origine</span>}
                </strong>
                <span className="muted small">{f.desc}</span>
                {f.abilities && <span className="small cs-feat-ab">+1 : {f.abilities.map(abilityShort).join(" / ")}</span>}
              </button>
            ))}
          </div>
          {feat?.abilities && (
            <div className="cs-pills">
              <span className="label">Caractéristique augmentée :</span>
              {feat.abilities.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`cs-pill${y === a ? " on" : ""}`}
                  aria-pressed={y === a}
                  disabled={scores[a] >= 20}
                  onClick={() => onChange(["feat", feat.id, a])}
                >
                  {abilityShort(a)} {scores[a]} → {scores[a] + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </fieldset>
  );
}

/** La réponse à un choix est-elle complète ? */
export function isComplete(choice: Choice, value: string[] | undefined): boolean {
  const v = value ?? [];
  if (choice.kind === "asi") {
    if (v[0] === "asi") return v.length === 3;
    if (v[0] === "feat") {
      const f = getFeat(v[1]);
      return Boolean(f) && (!f!.abilities || Boolean(v[2]));
    }
    return false;
  }
  return v.length === (choice.kind === "subclass" ? 1 : choice.count);
}
