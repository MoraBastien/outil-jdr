"use client";
// Nombre qui défile de 0 jusqu'à sa valeur à l'affichage.

import { useEffect, useState } from "react";

export default function CountUp({ value, className, duration = 900 }: { value: number; className?: string; duration?: number }) {
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (value === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3)))); // décélération douce
      if (t < 1) frame = requestAnimationFrame(step);
    };
    setShown(0);
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <span className={className}>{shown}</span>;
}
