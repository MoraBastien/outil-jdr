"use server";
// Actions serveur de la fiche de personnage.
// Rien n'est cru sur parole : création et montée de niveau sont recalculées par le moteur de règles,
// le dé de vie est lancé ici, et le niveau ne monte que si le MJ l'a accordé.

import { randomInt } from "crypto";
import { requireUser, canUseTool } from "@/lib/auth";
import { getCharacters, getUsers, randomUUID, updateDb, type StoredCharacter, type User } from "@/lib/db";
import { getClass } from "./data/classes";
import { RuleError, applyLevelUp, averageHp, buildCharacter, sanitizeFree, type CreationInput } from "./rules";
import { CHARACTER_TOOL_ID, MAX_LEVEL, type Answers, type CharacterRecord, type CharacterState } from "./types";

export type CharacterView = {
  isAdmin: boolean;
  meId: string;
  /** Fiche du joueur connecté (null s'il n'en a pas encore). */
  mine: CharacterRecord | null;
  /** MJ : tous les joueurs ayant l'outil, avec leur fiche et ses copies par niveau. */
  players: { id: string; name: string; record: CharacterRecord | null; snapshots: { level: number; at: string; state: CharacterState }[] }[];
};

export type ActionResult = { ok: true; view: CharacterView; levelUp?: { hpDie: number; rolled: boolean; summary: string[] } } | { ok: false; error: string };

async function requireToolUser(): Promise<User> {
  const user = await requireUser();
  if (!canUseTool(user, CHARACTER_TOOL_ID)) throw new Error("Accès refusé à cet outil.");
  return user;
}

const toRecord = (c: StoredCharacter, users: User[]): CharacterRecord => ({
  id: c.id,
  ownerId: c.ownerId,
  ownerName: users.find((u) => u.id === c.ownerId)?.name ?? "?",
  state: c.state as CharacterState,
  grantedLevel: c.grantedLevel,
  updatedAt: c.updatedAt,
});

async function view(user: User): Promise<CharacterView> {
  const [chars, users] = await Promise.all([getCharacters(), getUsers()]);
  const mineRaw = chars.find((c) => c.ownerId === user.id);
  const isAdmin = user.role === "admin";
  return {
    isAdmin,
    meId: user.id,
    mine: mineRaw ? toRecord(mineRaw, users) : null,
    players: isAdmin
      ? users
          .filter((u) => u.role === "player" && u.tools.includes(CHARACTER_TOOL_ID))
          .sort((a, b) => a.name.localeCompare(b.name, "fr"))
          .map((u) => {
            const c = chars.find((x) => x.ownerId === u.id);
            return {
              id: u.id,
              name: u.name,
              record: c ? toRecord(c, users) : null,
              snapshots: (c?.snapshots ?? []).map((sn) => ({ ...sn, state: sn.state as CharacterState })),
            };
          })
      : [],
  };
}

/** Le joueur agit sur sa fiche ; le MJ peut agir sur celle de n'importe quel joueur ayant l'outil. */
async function targetOwner(user: User, ownerId: string | null | undefined): Promise<string> {
  if (!ownerId || ownerId === user.id) return user.id;
  if (user.role !== "admin") throw new RuleError("Tu ne peux modifier que ta propre fiche.");
  const target = (await getUsers()).find((u) => u.id === ownerId && u.role === "player");
  if (!target || !target.tools.includes(CHARACTER_TOOL_ID)) throw new RuleError("Ce joueur n'a pas accès aux fiches de personnage.");
  return target.id;
}

async function guard(user: User, fn: () => Promise<ActionResult | void>): Promise<ActionResult> {
  try {
    const r = await fn();
    return r ?? { ok: true, view: await view(user) };
  } catch (e) {
    if (e instanceof RuleError) return { ok: false, error: e.message };
    console.error("Fiche de personnage :", e);
    return { ok: false, error: "L'action a échoué. Réessaie." };
  }
}

export async function getCharacterViewAction(): Promise<CharacterView> {
  return view(await requireToolUser());
}

export async function createCharacterAction(input: CreationInput, ownerId?: string | null): Promise<ActionResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    const owner = await targetOwner(user, ownerId);
    const state = buildCharacter(input);
    await updateDb((db) => {
      const list = (db.characters ??= []);
      if (list.some((c) => c.ownerId === owner)) throw new RuleError("Ce joueur a déjà une fiche.");
      const now = new Date().toISOString();
      list.push({ id: randomUUID(), ownerId: owner, state, grantedLevel: 1, snapshots: [{ level: 1, at: now, state }], createdAt: now, updatedAt: now });
    });
  });
}

export async function saveCharacterAction(patch: Partial<CharacterState>, ownerId?: string | null): Promise<ActionResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    const owner = await targetOwner(user, ownerId);
    await updateDb((db) => {
      const c = (db.characters ?? []).find((x) => x.ownerId === owner);
      if (!c) throw new RuleError("Fiche introuvable.");
      c.state = sanitizeFree(c.state as CharacterState, patch ?? {});
      c.updatedAt = new Date().toISOString();
    });
  });
}

export async function levelUpAction(answers: Answers, hpMode: "average" | "roll", ownerId?: string | null): Promise<ActionResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    const owner = await targetOwner(user, ownerId);
    let result: { hpDie: number; rolled: boolean; summary: string[] } | undefined;
    await updateDb((db) => {
      const c = (db.characters ?? []).find((x) => x.ownerId === owner);
      if (!c) throw new RuleError("Fiche introuvable.");
      const state = c.state as CharacterState;
      if (c.grantedLevel <= state.level) throw new RuleError("Ton MJ ne t'a pas encore accordé de niveau.");
      const hitDie = getClass(state.classId)?.hitDie ?? 8;
      const rolled = hpMode === "roll";
      const hpDie = rolled ? randomInt(1, hitDie + 1) : averageHp(hitDie);
      const r = applyLevelUp(state, answers ?? {}, hpDie);
      const now = new Date().toISOString();
      c.state = r.state;
      c.snapshots = [...(c.snapshots ?? []), { level: r.state.level, at: now, state: r.state }];
      c.updatedAt = now;
      result = { hpDie, rolled, summary: r.summary };
    });
    return { ok: true, view: await view(user), levelUp: result };
  });
}

/** MJ : autorise le joueur à monter jusqu'à `level` (ou retire une autorisation non utilisée). */
export async function grantLevelAction(ownerId: string, level: number): Promise<ActionResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    if (user.role !== "admin") throw new RuleError("Réservé au MJ.");
    await updateDb((db) => {
      const c = (db.characters ?? []).find((x) => x.ownerId === ownerId);
      if (!c) throw new RuleError("Fiche introuvable.");
      const current = (c.state as CharacterState).level;
      c.grantedLevel = Math.min(MAX_LEVEL, Math.max(current, Math.round(level)));
      c.updatedAt = new Date().toISOString();
    });
  });
}

export async function deleteCharacterAction(ownerId: string): Promise<ActionResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    if (user.role !== "admin") throw new RuleError("Réservé au MJ.");
    await updateDb((db) => {
      db.characters = (db.characters ?? []).filter((c) => c.ownerId !== ownerId);
    });
  });
}
