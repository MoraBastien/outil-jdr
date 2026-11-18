"use client";
// Résultat qui « roule » : les chiffres défilent un instant avant de se fixer.
// Partagé par le lanceur et le jet rapide.

import { useEffect, useState } from "react";
import type { Roll } from "./roll";

const DURATION = 520;
const TICK = 45;

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useRolling(roll: Roll | undefined, animate: boolean): { shown: number | null; settled: boolean } {
  const [shown, setShown] = useState<number | null>(roll?.total ?? null);
  const [settled, setSettled] = useState(true);

  useEffect(() => {
    if (!roll) {
      setShown(null);
      return;
    }
    if (!animate || reducedMotion()) {
      setShown(roll.total);
      setSettled(true);
      return;
    }
    const n = roll.rolls.length;
    const min = n + roll.modifier;
    const max = n * roll.faces + roll.modifier;
    setSettled(false);
    const timer = setInterval(() => setShown(min + Math.floor(Math.random() * (max - min + 1))), TICK);
    const stop = setTimeout(() => {
      clearInterval(timer);
      setShown(roll.total);
      setSettled(true);
    }, DURATION);
    return () => {
      clearInterval(timer);
      clearTimeout(stop);
    };
    // Rejoue seulement pour un nouveau jet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roll?.id, animate]);

  return { shown, settled };
}

/** Éclats lumineux pour une réussite critique. */
export function Sparks() {
  return (
    <span className="sparks" aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => (
        <i key={i} style={{ "--a": `${(360 / 14) * i}deg`, "--d": `${60 + (i % 3) * 18}px` } as React.CSSProperties} />
      ))}
    </span>
  );
}

/** Petite bascule du dé cliqué. */
export function tumble(el: HTMLElement) {
  if (reducedMotion()) return;
  el.animate(
    [
      { transform: "rotate(0) scale(1)" },
      { transform: "rotate(-14deg) scale(0.92)" },
      { transform: "rotate(10deg) scale(1.06)" },
      { transform: "rotate(0) scale(1)" },
    ],
    { duration: 420, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
  );
}
