"use client";

import { useEffect, useState } from "react";
import type { ToolPlayer } from "../registry";
import { DICE, critical, loadHistory, roll, saveHistory, signed, type Roll } from "./roll";

const formulaOf = (count: number, faces: number, mod: number) =>
  `${count}d${faces}${mod ? (mod > 0 ? `+${mod}` : `${mod}`) : ""}`;

function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  format = String,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  format?: (n: number) => string;
}) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <span className="label">{label}</span>
      <div className="stepper-box">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`${label} : moins`}>
          −
        </button>
        <output aria-live="polite">{format(value)}</output>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`${label} : plus`}>
          +
        </button>
      </div>
    </div>
  );
}

export default function DiceRoller({ player }: { player: ToolPlayer }) {
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [formula, setFormula] = useState("");
  const [history, setHistory] = useState<Roll[]>([]);
  const [error, setError] = useState("");

  useEffect(() => setHistory(loadHistory()), []);
  const save = (h: Roll[]) => setHistory(saveHistory(h));

  function launch(f: string) {
    const r = roll(f);
    if (!r) {
      setError("Formule invalide. Exemples : d20, 3d6, 2d8+4");
      return;
    }
    setError("");
    save([r, ...history]);
  }

  const last = history[0];
  const crit = critical(last) === "crit";
  const fumble = critical(last) === "fumble";

  return (
    <div className="dice">
      <div className="dice-controls">
        <p className="muted small">Bonne chance, {player.name}. Règle le nombre de dés et le bonus, puis touche un dé.</p>

        <div className="dice-steppers">
          <Stepper label="Nombre de dés" value={count} onChange={setCount} min={1} max={20} />
          <Stepper label="Modificateur" value={modifier} onChange={setModifier} min={-20} max={20} format={signed} />
        </div>

        <div className="dice-tray">
          {DICE.map((f) => (
            <button key={f} type="button" className="die-btn" onClick={() => launch(formulaOf(count, f, modifier))}>
              <span className="die-face">d{f}</span>
              {(count > 1 || modifier !== 0) && <span className="die-hint">{formulaOf(count, f, modifier)}</span>}
            </button>
          ))}
        </div>

        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (formula.trim()) launch(formula);
          }}
        >
          <input
            className="input input-mono"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder="Formule libre : 2d6+3"
            aria-label="Formule libre"
            spellCheck={false}
            autoComplete="off"
          />
          <button className="btn">Lancer</button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>

      <div className={`dice-result${crit ? " crit" : ""}${fumble ? " fumble" : ""}`} aria-live="polite">
        {last ? (
          <div key={last.id} className="dice-result-inner">
            <span className="label">{last.formula}</span>
            <span className="dice-total">{last.total}</span>
            {crit && <span className="chip chip-ok">Réussite critique !</span>}
            {fumble && <span className="chip chip-danger">Échec critique…</span>}
            {(last.rolls.length > 1 || last.modifier !== 0) && (
              <div className="dice-detail">
                {last.rolls.map((v, i) => (
                  <span key={i} className={`die-value${v === last.faces ? " max" : v === 1 ? " min" : ""}`}>
                    {v}
                  </span>
                ))}
                {last.modifier !== 0 && <span className="die-mod">{signed(last.modifier)}</span>}
              </div>
            )}
          </div>
        ) : (
          <p className="muted">Ton résultat apparaîtra ici.</p>
        )}
      </div>

      {history.length > 1 && (
        <div className="dice-history stack">
          <div className="section-head">
            <span className="label">Jets précédents</span>
            <button type="button" className="link-btn" onClick={() => save([])}>
              Effacer
            </button>
          </div>
          <ul className="history">
            {history.slice(1).map((r) => (
              <li key={r.id}>
                <button type="button" className="history-item" onClick={() => launch(r.formula)} title="Relancer">
                  <strong>{r.total}</strong>
                  <span className="muted small">{r.formula}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
