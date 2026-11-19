"use client";
// Point d'entrée du ciel animé : son code est importé à la demande, après l'affichage,
// et seulement pour les joueurs concernés (rien dans le JavaScript commun).
import { useEffect, useLayoutEffect, useState, type ComponentType } from "react";

type SkyProps = { level: number };

export default function SkyEntry({ level }: SkyProps) {
  const [Sky, setSky] = useState<ComponentType<SkyProps> | null>(null);
  // Active le thème (html[data-astral]) tant que ce composant est affiché : il disparaît avec l'en-tête
  // d'une Entité (déconnexion, autre compte), et le thème avec lui.
  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-astral", "");
    return () => document.documentElement.removeAttribute("data-astral");
  }, []);
  useEffect(() => {
    let alive = true;
    void import("./AstralSky").then((m) => alive && setSky(() => m.default));
    return () => {
      alive = false;
    };
  }, []);
  return Sky ? <Sky level={level} /> : null;
}
