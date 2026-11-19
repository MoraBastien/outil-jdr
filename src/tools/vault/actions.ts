"use server";
// Actions serveur du coffre : les essais de personnages d'un joueur.
// Même moteur de règles que les fiches de campagne, mais le joueur choisit librement son niveau
// (montée sans accord du MJ, retour à un niveau précédent grâce aux copies).

import { randomInt } from "crypto";
import { requireUser, canUseTool } from "@/lib/auth";
import { getCharacters, getGroups, getProposals, getVault, randomUUID, updateDb, type StoredCharacter, type User } from "@/lib/db";
import { userGroupIds, visibleGroups } from "@/lib/groups";
import { getClass } from "@/tools/character/data/classes";
import { toCampaignState } from "@/tools/character/proposal";
import { RuleError, applyLevelUp, averageHp, buildCharacter, sanitizeFree, type CreationInput } from "@/tools/character/rules";
import { MAX_LEVEL, type Answers, type CharacterRecord, type CharacterState } from "@/tools/character/types";
import { VAULT_TOOL_ID } from "./meta";
import { isEntityPlayer } from "@/tools/homunculus/entity";

const MAX_DRAFTS = 30;

export type VaultEntry = { record: CharacterRecord; levels: number[] };
/** Groupes du joueur, pour proposer un essai au MJ. */
export type VaultGroup = {
  id: string;
  name: string;
  /** Le joueur a déjà un personnage vivant dans ce groupe : pas de proposition possible. */
  hasCharacter: boolean;
  proposal: { draftId: string; name: string; status: "pending" | "refused"; reason: string } | null;
};
export type VaultData = { entries: VaultEntry[]; groups: VaultGroup[] };
export type VaultResult = ({ ok: true; levelUp?: { hpDie: number; rolled: boolean; summary: string[] } } & VaultData) | { ok: false; error: string };

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

async function data(user: User): Promise<VaultData> {
  const [vault, allGroups, chars, proposals] = await Promise.all([getVault(user.id), getGroups(), getCharacters(), getProposals()]);
  // MJ et joueurs de l'Atelier (leur fiche de campagne est celle de leur entité) : rien à proposer.
  const groups = user.role === "admin" || isEntityPlayer(user) ? [] : visibleGroups(user, allGroups);
  return {
    entries: vault.map((c) => toEntry(c, user)),
    groups: groups.map((g) => {
      const p = proposals.find((x) => x.ownerId === user.id && x.groupId === g.id);
      return {
        id: g.id,
        name: g.name,
        hasCharacter: chars.some((c) => c.ownerId === user.id && c.groupId === g.id && !c.deadAt),
        proposal: p ? { draftId: p.draftId, name: (p.state as CharacterState).name, status: p.status, reason: p.reason ?? "" } : null,
      };
    }),
  };
}

async function guard(user: User, fn: () => Promise<VaultResult | void>): Promise<VaultResult> {
  try {
    return (await fn()) ?? { ok: true, ...(await data(user)) };
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

export async function getVaultAction(): Promise<VaultData> {
  return data(await requireToolUser());
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
    return { ok: true, ...(await data(user)), levelUp };
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

/* ---------- Proposer un essai au MJ ---------- */

/**
 * Propose un essai pour devenir le personnage du joueur dans un groupe (après une mort, ou pour un nouveau venu).
 * Règles de campagne : pas de valeurs libres, PV recalculés à la moyenne. Une seule proposition par groupe.
 */
export async function proposeDraftAction(draftId: string, groupId: string, message: string): Promise<VaultResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    if (user.role !== "player") throw new RuleError("Seuls les joueurs proposent des personnages.");
    if (isEntityPlayer(user)) throw new RuleError("Ta fiche de campagne ne vient pas du coffre.");
    await updateDb((db) => {
      const draft = mine(db.vault, user, draftId);
      const group = (db.groups ?? []).find((g) => g.id === groupId);
      const me = db.users.find((u) => u.id === user.id);
      if (!group || !me || !userGroupIds(me).includes(groupId)) throw new RuleError("Tu ne fais pas partie de ce groupe.");
      if ((db.characters ?? []).some((c) => c.ownerId === user.id && c.groupId === groupId && !c.deadAt)) {
        throw new RuleError("Tu as déjà un personnage dans ce groupe.");
      }
      const state = toCampaignState(draft.state as CharacterState);
      const now = new Date().toISOString();
      const list = (db.proposals ?? []).filter((p) => !(p.ownerId === user.id && p.groupId === groupId));
      list.push({ id: randomUUID(), ownerId: user.id, groupId, draftId, state, message: String(message ?? "").trim().slice(0, 1000), status: "pending", createdAt: now, updatedAt: now });
      db.proposals = list;
    });
  });
}

/** Retire sa proposition (ou efface un refus) pour un groupe. */
export async function withdrawProposalAction(groupId: string): Promise<VaultResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    await updateDb((db) => {
      db.proposals = (db.proposals ?? []).filter((p) => !(p.ownerId === user.id && p.groupId === groupId));
    });
  });
}
