"use server";
// Actions serveur de l'Atelier de Rigel : jets de dés côté serveur (journalisés) et stockage des fiches.
// Rien de ce qui vient du navigateur n'est cru sur parole : accès vérifié, fiche re-normalisée,
// Écho imposé par le MJ, jets comparés au journal.

import { requireUser, canUseTool } from "@/lib/auth";
import { updateDb, getHomunculi, getDiceLog, randomUUID, type User } from "@/lib/db";
import {
  TOOL_META,
  FELURES,
  derive,
  normalize,
  roll4d5,
  randomInt,
  type HomunculusState,
} from "@/tools/homunculus-creator/server";
import { clampEcho, MAX_ECHO } from "./echo";
import { homunculusToCharacter } from "./transfer";
import type { CharacterState } from "@/tools/character/types";

/** Nombre maximum d'essais dans le coffre (même limite que le coffre). */
const MAX_VAULT = 30;

// (Un fichier "use server" ne peut exporter que des fonctions async.)
const HOMUNCULUS_TOOL_ID = TOOL_META.id;

async function requireToolUser(): Promise<User> {
  const user = await requireUser();
  if (!canUseTool(user, HOMUNCULUS_TOOL_ID)) throw new Error("Accès refusé à cet outil.");
  return user;
}

async function logRoll(userId: string, kind: string, values: number[]): Promise<void> {
  await updateDb((db) => {
    (db.diceLog ??= []).push({ userId, tool: HOMUNCULUS_TOOL_ID, kind, values, createdAt: new Date().toISOString() });
  });
}

/** Six jets de 4d5 (le plus bas retiré), triés par ordre décroissant. */
export async function rollStatsAction(): Promise<number[]> {
  const user = await requireToolUser();
  const pool = Array.from({ length: 6 }, roll4d5).sort((a, b) => b - a);
  await logRoll(user.id, "stats", pool);
  return pool;
}

/** Résultat du d20 de Fêlure (le nombre de faces est fixé par le serveur, pas par le client). */
export async function rollFelureAction(): Promise<number> {
  const user = await requireToolUser();
  const value = randomInt(FELURES.length) + 1;
  await logRoll(user.id, "felure", [value]);
  return value;
}

export async function listHomunculiAction(): Promise<HomunculusState[]> {
  const user = await requireToolUser();
  return (await getHomunculi(user.id)).map((h) => h.state as HomunculusState);
}

/** `vault` : ce qui est arrivé dans le coffre (envoyé, mis à jour, ou pas encore car l'homunculus n'est pas terminé). */
export type SaveResult = { ok: true; vault: "sent" | "updated" | "incomplete" | "full" } | { ok: false; error: string };

export async function saveHomunculusAction(input: HomunculusState): Promise<SaveResult> {
  const user = await requireToolUser();
  if (!input || typeof input !== "object" || typeof input.id !== "string" || !input.id || input.id.length > 100) {
    return { ok: false, error: "Fiche invalide." };
  }

  // Écho : fixé par le MJ dans la page admin du joueur (1 par défaut). Le MJ lui-même reste libre.
  const imposed = user.role === "admin" ? undefined : clampEcho(user.echo);
  const state = normalize({ ...input, echo: imposed ?? input.echo }, MAX_ECHO);

  // Les jets doivent venir du serveur (journal).
  const log = await getDiceLog(user.id, HOMUNCULUS_TOOL_ID);
  if (state.pool) {
    const key = [...state.pool].sort((a, b) => b - a).join(",");
    if (!log.some((d) => d.kind === "stats" && d.values.join(",") === key)) {
      return { ok: false, error: "Ces caractéristiques ne correspondent à aucun jet enregistré. Relance les dés." };
    }
  }
  if (state.felureId) {
    const value = FELURES.findIndex((f) => f.id === state.felureId) + 1;
    if (!log.some((d) => d.kind === "felure" && d.values[0] === value)) {
      return { ok: false, error: "Cette Fêlure ne correspond à aucun tirage enregistré. Retire-la." };
    }
  }

  const d = derive(state);
  const now = new Date().toISOString();
  const error = await updateDb((db) => {
    const list = (db.homunculi ??= []);
    const existing = list.find((h) => h.id === state.id);
    if (existing && existing.ownerId !== user.id) return "Cette fiche appartient à quelqu'un d'autre.";
    if (existing) {
      Object.assign(existing, { state, echo: state.echo, complete: d.complete, schemaVersion: state.schemaVersion, updatedAt: now });
    } else {
      list.push({
        id: state.id,
        ownerId: user.id,
        state,
        echo: state.echo,
        complete: d.complete,
        schemaVersion: state.schemaVersion,
        createdAt: now,
        updatedAt: now,
      });
    }
    return null;
  });
  if (error) return { ok: false, error };
  return { ok: true, vault: await sendToVault(user, state) };
}

export async function removeHomunculusAction(id: string): Promise<void> {
  const user = await requireToolUser();
  await updateDb((db) => {
    db.homunculi = (db.homunculi ?? []).filter((h) => !(h.id === id && h.ownerId === user.id));
  });
}

/**
 * Envoie un homunculus terminé dans le coffre du joueur, sous forme de fiche de personnage classique
 * (voir transfer.ts). Une sauvegarde suivante met à jour la même fiche en gardant ce que le joueur y a rempli.
 */
async function sendToVault(user: User, h: HomunculusState): Promise<"sent" | "updated" | "incomplete" | "full"> {
  if (!derive(h).complete) return "incomplete";
  let outcome: "sent" | "updated" | "incomplete" | "full" = "incomplete";
  await updateDb((db) => {
    const vault = (db.vault ??= []);
    const existing = vault.find((c) => c.ownerId === user.id && (c.state as CharacterState).extra?.sourceId === h.id);
    const state = homunculusToCharacter(h, existing?.state as CharacterState | undefined);
    if ("error" in state) return;
    const now = new Date().toISOString();
    if (existing) {
      if ((existing.state as CharacterState).level !== state.level) existing.snapshots = [{ level: state.level, at: now, state }];
      existing.state = state;
      existing.grantedLevel = state.level;
      existing.updatedAt = now;
      outcome = "updated";
      return;
    }
    if (vault.filter((c) => c.ownerId === user.id).length >= MAX_VAULT) {
      outcome = "full";
      return;
    }
    vault.push({ id: randomUUID(), ownerId: user.id, state, grantedLevel: state.level, snapshots: [{ level: state.level, at: now, state }], createdAt: now, updatedAt: now });
    outcome = "sent";
  });
  return outcome;
}
