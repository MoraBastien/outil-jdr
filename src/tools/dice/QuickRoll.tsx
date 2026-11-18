"use client";
// Jet rapide d'un dé, partage l'historique avec le lanceur complet.

import { useEffect, useState } from "react";
import { DICE, critical, loadHistory, roll, saveHistory, type Roll } from "./roll";
import { Sparks, tumble, useRolling } from "./RollingNumber";

export default function QuickRoll() {
  const [history, setHistory] = useState<Roll[]>([]);
  const [fresh, setFresh] = useState(false);
  useEffect(() => setHistory(loadHistory()), []);

  const launch = (faces: number) => {
    const r = roll(`1d${faces}`);
    if (!r) return;
    setFresh(true);
    setHistory(saveHistory([r, ...loadHistory()]));
  };

  const last = history[0];
  const { shown, settled } = useRolling(last, fresh);
  const crit = settled ? critical(last) : null;

  return (
    <div className="quick-roll">
      <div className={`quick-result${crit ? ` ${crit}` : ""}${settled ? "" : " rolling"}`} aria-live="polite" aria-busy={!settled}>
        {last ? (
          <div key={last.id} className="dice-result-inner">
            {crit === "crit" && <Sparks />}
            <span className="quick-total">{shown}</span>
            <span className="label">{last.formula}</span>
          </div>
        ) : (
          <span className="muted small">Touche un dé</span>
        )}
      </div>
      <div className="quick-dice">
        {DICE.map((f) => (
          <button
            key={f}
            type="button"
            className="die-btn die-btn-sm"
            onClick={(e) => {
              tumble(e.currentTarget);
              launch(f);
            }}
          >
            <span className="die-face">d{f}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
