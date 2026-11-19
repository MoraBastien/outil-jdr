"use client";
// Point d'entrée du ciel animé : son code est importé à la demande, après l'affichage,
// et seulement pour les joueurs concernés (rien dans le JavaScript commun).
import { useEffect, useState, type ComponentType } from "react";

type SkyProps = { level: number };

export default function SkyEntry({ level }: SkyProps) {
  const [Sky, setSky] = useState<ComponentType<SkyProps> | null>(null);
  useEffect(() => {
    let alive = true;
    void import("./AstralSky").then((m) => alive && setSky(() => m.default));
    return () => {
      alive = false;
    };
  }, []);
  return Sky ? <Sky level={level} /> : null;
}
