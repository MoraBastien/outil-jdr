"use client";
// Au chargement, la rangée d'épisodes défile jusqu'à l'épisode suivant (sinon jusqu'au dernier épisode) :
// la vignette mise en avant n'est jamais cachée hors de l'écran, même après une longue saison.
import { useEffect } from "react";

export default function RailFocus({ railId }: { railId: string }) {
  useEffect(() => {
    const rail = document.getElementById(railId);
    if (!rail) return;
    const target = rail.querySelector<HTMLElement>(".sv-tile.next") ?? rail.querySelector<HTMLElement>("li:last-child .sv-tile");
    const item = target?.closest("li");
    if (!item) return;
    // Toujours caler le défilement sur le début d'une vignette (la rangée accroche par vignette) :
    // la précédente aussi quand les deux tiennent, sinon la vignette mise en avant seule.
    const prev = item.previousElementSibling as HTMLElement | null;
    const pad = parseFloat(getComputedStyle(rail).paddingLeft) || 0;
    const start = prev && rail.clientWidth - pad >= item.offsetLeft + item.offsetWidth - prev.offsetLeft ? prev : item;
    rail.scrollLeft = Math.max(0, start.offsetLeft - pad);
  }, [railId]);
  return null;
}
