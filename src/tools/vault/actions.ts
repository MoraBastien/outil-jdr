"use server";
// Actions serveur du coffre : les essais de personnages d'un joueur.
// Même moteur de règles que les fiches de campagne, mais le joueur choisit librement son niveau
// (montée sans accord du MJ, retour à un niveau précédent grâce aux copies).

import { randomInt } from "crypto";
import { requireUser, canUseTool } from "@/lib/auth";
import { getVault, randomUUID, updateDb, type StoredCharacter, type User } from "@/lib/db";
import { getClass } from "@/tools/character/data/classes";
import { RuleError, applyLevelUp, averageHp, buildCharacter, sanitizeFree, type CreationInput } from "@/tools/character/rules";
import { MAX_LEVEL, type Answers, type CharacterRecord, type CharacterState } from "@/tools/character/types";
import { VAULT_TOOL_ID } from "./meta";

const MAX_DRAFTS = 30;

export type VaultEntry = { record: CharacterRecord; levels: number[] };
export type VaultResult = { ok: true; entries: VaultEntry[]; levelUp?: { hpDie: number; rolled: boolean; summary: string[] } } | { ok: false; error: string };

async function requireToolUser(): Promise<User> {
  const user = await requireUser();
  if (!canUseTool(user, VAULT_TOOL_ID)) throw new Error("Accès refusé à cet outil.");
  return user;
}

// Dans le coffre, le niveau accordé est toujours le maximum : le joueur décide.
const toEntry = (c: StoredCharacter, user: User): VaultEntry => ({
  record: { id: c.id, ownerId: c.ownerId, groupId: null, ownerName: user.name, state: c.state as CharacterState, grantedLevel: MAX_LEVEL, updatedAt: c.updatedAt },
  levels: (c.snapshots ?? []).map((s) => s.level),
});

async function entries(user: User): Promise<VaultEntry[]> {
  return (await getVault(user.id)).map((c) => toEntry(c, user));
}

async function guard(user: User, fn: () => Promise<VaultResult | void>): Promise<VaultResult> {
  try {
    return (await fn()) ?? { ok: true, entries: await entries(user) };
  } catch (e) {
    if (e instanceof RuleError) return { ok: false, error: e.message };
    console.error("Coffre :", e);
    return { ok: false, error: "L'action a échoué. Réessaie." };
  }
}

/** Essai du joueur connecté (dans une transaction). */
function mine(list: StoredCharacter[] | undefined, user: User, id: string): StoredCharacter {
  const c = (list ?? []).find((x) => x.id === id && x.ownerId === user.id);
  if (!c) throw new RuleError("Essai introuvable.");
  return c;
}

export async function getVaultAction(): Promise<VaultEntry[]> {
  return entries(await requireToolUser());
}

export async function createDraftAction(input: CreationInput): Promise<VaultResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    const state = buildCharacter(input, { allowFree: true });
    let id = "";
    await updateDb((db) => {
      const list = (db.vault ??= []);
      if (list.filter((c) => c.ownerId === user.id).length >= MAX_DRAFTS) throw new RuleError(`Ton coffre est plein (${MAX_DRAFTS} essais). Supprimes-en un.`);
      const now = new Date().toISOString();
      id = randomUUID();
      list.push({ id, ownerId: user.id, state, grantedLevel: MAX_LEVEL, snapshots: [{ level: 1, at: now, state }], createdAt: now, updatedAt: now });
    });
  });
}

export async function saveDraftAction(id: string, patch: Partial<CharacterState>): Promise<VaultResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    await updateDb((db) => {
      const c = mine(db.vault, user, id);
      c.state = sanitizeFree(c.state as CharacterState, patch ?? {});
      c.updatedAt = new Date().toISOString();
    });
  });
}

/** Monter de niveau librement (jusqu'au niveau maximum). */
export async function levelUpDraftAction(id: string, answers: Answers, hpMode: "average" | "roll"): Promise<VaultResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    let levelUp: { hpDie: number; rolled: boolean; summary: string[] } | undefined;
    await updateDb((db) => {
      const c = mine(db.vault, user, id);
      const state = c.state as CharacterState;
      const hitDie = getClass(state.classId)?.hitDie ?? 8;
      const rolled = hpMode === "roll";
      const hpDie = rolled ? randomInt(1, hitDie + 1) : averageHp(hitDie);
      const r = applyLevelUp(state, answers ?? {}, hpDie);
      const now = new Date().toISOString();
      c.state = r.state;
      // On remplace une éventuelle ancienne copie de ce niveau (après un retour en arrière).
      c.snapshots = [...(c.snapshots ?? []).filter((sn) => sn.level < r.state.level), { level: r.state.level, at: now, state: r.state }];
      c.updatedAt = now;
      levelUp = { hpDie, rolled, summary: r.summary };
    });
    return { ok: true, entries: await entries(user), levelUp };
  });
}

/** Revenir à un niveau précédent : on restaure la copie de ce niveau (les niveaux suivants sont oubliés). */
export async function revertDraftAction(id: string, level: number): Promise<VaultResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    await updateDb((db) => {
      const c = mine(db.vault, user, id);
      const snap = (c.snapshots ?? []).find((sn) => sn.level === level);
      if (!snap || level >= (c.state as CharacterState).level) throw new RuleError("Niveau introuvable.");
      // On garde les textes et l'équipement actuels : seules les règles reviennent en arrière.
      const current = c.state as CharacterState;
      const restored = snap.state as CharacterState;
      c.state = {
        ...restored,
        name: current.name,
        identity: current.identity,
        notes: current.notes,
        equipment: current.equipment,
        coins: current.coins,
        weapons: current.weapons,
        armorId: current.armorId,
        shield: current.shield,
        cantrips: current.cantrips,
        spells: current.spells,
        languages: current.languages,
        tools: current.tools,
        masteries: current.masteries,
        history: [...current.history, { level, at: new Date().toISOString(), summary: [`Retour au niveau ${level} (coffre)`], hpGain: 0 }],
      };
      c.state = sanitizeFree(c.state as CharacterState, { play: { ...restored.play } });
      c.snapshots = (c.snapshots ?? []).filter((sn) => sn.level <= level);
      c.updatedAt = new Date().toISOString();
    });
  });
}

export async function duplicateDraftAction(id: string): Promise<VaultResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    await updateDb((db) => {
      const c = mine(db.vault, user, id);
      if ((db.vault ?? []).filter((x) => x.ownerId === user.id).length >= MAX_DRAFTS) throw new RuleError(`Ton coffre est plein (${MAX_DRAFTS} essais).`);
      const now = new Date().toISOString();
      const copy = structuredClone(c);
      copy.id = randomUUID();
      (copy.state as CharacterState).name = `${(c.state as CharacterState).name} (copie)`.slice(0, 80);
      copy.createdAt = now;
      copy.updatedAt = now;
      db.vault!.push(copy);
    });
  });
}

export async function deleteDraftAction(id: string): Promise<VaultResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    await updateDb((db) => {
      mine(db.vault, user, id);
      db.vault = (db.vault ?? []).filter((c) => c.id !== id);
    });
  });
}
