"use client";
// Point d'entrée de l'Atelier dans le registre : l'outil est chargé à la demande, dans un fichier à part.
// Sans ça, tout son code (données, textes) atterrit dans le JavaScript commun des pages outils,
// téléchargé aussi par les joueurs qui n'ont pas l'Atelier et ne doivent pas en avoir connaissance.
import dynamic from "next/dynamic";
import type { ToolPlayer } from "../registry";

const Tool = dynamic(() => import("./HomunculusTool"));

export default function HomunculusEntry({ player }: { player: ToolPlayer }) {
  return <Tool player={player} />;
}
