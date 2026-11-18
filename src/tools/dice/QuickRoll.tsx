"use client";
// Jet rapide d'un dé, partage l'historique avec le lanceur complet.

import { useEffect, useState } from "react";
import { DICE, critical, loadHistory, roll, saveHistory, type Roll } from "./roll";

export default function QuickRoll() {
  const [history, setHistory] = useState<Roll[]>([]);
  useEffect(() => setHistory(loadHistory()), []);

  const launch = (faces: number) => {
    const r = roll(`1d${faces}`);
    if (r) setHistory(saveHistory([r, ...loadHistory()]));
  };

  const last = history[0];
  const crit = critical(last);

  return (
    <div className="quick-roll">
      <div className={`quick-result${crit ? ` ${crit}` : ""}`} aria-live="polite">
        {last ? (
          <div key={last.id} className="dice-result-inner">
            <span className="quick-total">{last.total}</span>
            <span className="label">{last.formula}</span>
          </div>
        ) : (
          <span className="muted small">Touche un dé</span>
        )}
      </div>
      <div className="quick-dice">
        {DICE.map((f) => (
          <button key={f} type="button" className="die-btn die-btn-sm" onClick={() => launch(f)}>
            <span className="die-face">d{f}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
