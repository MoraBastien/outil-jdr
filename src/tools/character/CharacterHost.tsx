"use client";
// Point d'entrée de « Fiche de personnage » : les joueurs de l'Atelier ont la fiche de leur entité,
// les autres la fiche D&D. La fiche de l'entité est chargée à part : seuls ceux qui l'ont la téléchargent.
import dynamic from "next/dynamic";
import type { ToolPlayer } from "../registry";
import CharacterTool from "./CharacterTool";

const AltSheet = dynamic(() => import("../homunculus/EntitySheet"));

export default function CharacterHost({ player }: { player: ToolPlayer }) {
  if (player.altSheet && !player.isAdmin) return <AltSheet sheet={player.altSheet} />;
  return <CharacterTool player={player} />;
}
