"use client";

import { useState } from "react";
import type { ToolPlayer } from "../registry";

type Roll = { formula: string; rolls: number[]; modifier: number; total: number };

const FORMULA = /^(\d*)d(\d+)\s*([+-]\s*\d+)?$/i;

function roll(formula: string): Roll | null {
  const m = formula.trim().match(FORMULA);
  if (!m) return null;
  const count = Math.min(Number(m[1] || 1), 100);
  const faces = Number(m[2]);
  if (count < 1 || faces < 2 || faces > 1000) return null;
  const modifier = m[3] ? Number(m[3].replace(/\s/g, "")) : 0;
  const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * faces));
  return { formula: formula.trim(), rolls, modifier, total: rolls.reduce((a, b) => a + b, 0) + modifier };
}

export default function DiceRoller({ player }: { player: ToolPlayer }) {
  const [formula, setFormula] = useState("1d20");
  const [history, setHistory] = useState<Roll[]>([]);
  const [error, setError] = useState("");

  function launch(f: string) {
    const r = roll(f);
    if (!r) {
      setError("Formule invalide. Exemples : d20, 3d6, 2d8+4");
      return;
    }
    setError("");
    setHistory((h) => [r, ...h].slice(0, 20));
  }

  const last = history[0];

  return (
    <div className="stack">
      <p className="muted">Bonne chance, {player.name}.</p>

      <div className="dice-row">
        {[4, 6, 8, 10, 12, 20, 100].map((f) => (
          <button key={f} className="btn btn-ghost" onClick={() => launch(`1d${f}`)}>
            d{f}
          </button>
        ))}
      </div>

      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          launch(formula);
        }}
      >
        <input className="input" value={formula} onChange={(e) => setFormula(e.target.value)} aria-label="Formule" />
        <button className="btn">Lancer</button>
      </form>
      {error && <p className="error">{error}</p>}

      {last && (
        <div className="dice-result">
          <span className="dice-total">{last.total}</span>
          <span className="muted">
            {last.formula} → [{last.rolls.join(", ")}]
            {last.modifier ? ` ${last.modifier > 0 ? "+" : "−"} ${Math.abs(last.modifier)}` : ""}
          </span>
        </div>
      )}

      {history.length > 1 && (
        <ul className="history">
          {history.slice(1).map((r, i) => (
            <li key={i}>
              <strong>{r.total}</strong> <span className="muted">{r.formula}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
