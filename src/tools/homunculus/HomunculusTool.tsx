"use client";
// Branche l'Atelier de Rigel (src/tools/homunculus-creator) sur le site :
// dés et fiches passent par les actions serveur, l'Écho vient de la fiche du joueur.

import { useEffect, useMemo, useState } from "react";
import {
  HomunculusCreator,
  type DiceProvider,
  type HomunculusStorage,
} from "@/tools/homunculus-creator";
import type { ToolPlayer } from "../registry";
import {
  rollStatsAction,
  rollFelureAction,
  listHomunculiAction,
  saveHomunculusAction,
  removeHomunculusAction,
} from "./actions";
import { clampEcho, MAX_ECHO } from "./echo";

const serverDice: DiceProvider = {
  rollStats: () => rollStatsAction(),
  rollFelure: () => rollFelureAction(),
};

type Flash = { kind: "ok" | "error"; text: string } | null;

export default function HomunculusTool({ player }: { player: ToolPlayer }) {
  // Le MJ choisit librement ; un joueur a l'Écho que le MJ a mis dans sa fiche (1 par défaut).
  const echo = player.isAdmin ? undefined : clampEcho(player.echo);
  const [flash, setFlash] = useState<Flash>(null);
  useEffect(() => {
    if (flash?.kind !== "ok") return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  // Objet stable : le composant recharge la liste quand `storage` change.
  const storage = useMemo<HomunculusStorage>(
    () => ({
      list: () => listHomunculiAction(),
      async save(state) {
        try {
          const r = await saveHomunculusAction(state);
          const name = `« ${state.nom.trim() || "sans nom"} »`;
          setFlash(
            !r.ok
              ? { kind: "error", text: r.error }
              : r.vault === "sent"
                ? { kind: "ok", text: `${name} est sauvegardé et envoyé dans ton coffre.` }
                : r.vault === "updated"
                  ? { kind: "ok", text: `${name} est sauvegardé ; sa fiche du coffre est à jour.` }
                  : r.vault === "full"
                    ? { kind: "error", text: `${name} est sauvegardé, mais ton coffre est plein (30 essais) : fais-y de la place pour l'y envoyer.` }
                    : { kind: "ok", text: `${name} est sauvegardé. Il rejoindra ton coffre une fois terminé.` },
          );
          if (!r.ok) throw new Error(r.error);
        } catch (e) {
          setFlash((f) => (f?.kind === "error" ? f : { kind: "error", text: "L'enregistrement a échoué. Réessaie." }));
          throw e;
        }
      },
      async remove(id) {
        try {
          await removeHomunculusAction(id);
          setFlash(null);
        } catch {
          setFlash({ kind: "error", text: "La suppression a échoué. Réessaie." });
        }
      },
    }),
    [],
  );

  return (
    <div className="stack">
      {!player.isAdmin && (
        <p className="muted">
          Écho {echo}, fixé par ton MJ. Les dés sont lancés par le serveur et tes fiches sont enregistrées sur ton compte.
        </p>
      )}
      {flash && (
        <p className={`flash toast ${flash.kind === "ok" ? "flash-ok" : "flash-error"}`} role="status">
          {flash.text}
          <button type="button" className="toast-close" onClick={() => setFlash(null)} aria-label="Fermer">
            ×
          </button>
        </p>
      )}
      <HomunculusCreator
        className="hc-host"
        echo={echo}
        maxEcho={MAX_ECHO}
        dice={serverDice}
        storage={storage}
        saveLabel="Sauvegarder · envoyer au coffre"
        theme="dark"
        ambient
      />
    </div>
  );
}
