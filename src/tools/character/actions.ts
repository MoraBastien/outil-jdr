"use server";
// Actions serveur de la fiche de personnage. Une fiche par joueur ET par groupe de jeu.
// Rien n'est cru sur parole : création et montée de niveau sont recalculées par le moteur de règles,
// le dé de vie est lancé ici, et le niveau ne monte que si le MJ l'a accordé.

import { randomInt } from "crypto";
import { requireUser, canUseTool } from "@/lib/auth";
import { getCharacters, getGraves, getGroups, getUsers, randomUUID, updateDb, type Db, type Grave, type StoredCharacter, type User } from "@/lib/db";
import { membersOf, userGroupIds, visibleGroups } from "@/lib/groups";
import { getClass } from "./data/classes";
import { RuleError, applyLevelUp, averageHp, buildCharacter, sanitizeFree, shortLabel, type CreationInput } from "./rules";
import { CHARACTER_TOOL_ID, MAX_LEVEL, type Answers, type CharacterRecord, type CharacterState } from "./types";

type Snapshot = { level: number; at: string; state: CharacterState };
export type Death = { epitaph: string; diedAt: string };
export type AdminEntry = { record: CharacterRecord; snapshots: Snapshot[]; dead?: Death };

export type CharacterView = {
  isAdmin: boolean;
  meId: string;
  /** Joueur : une entrée par groupe dont il est membre, avec sa fiche (ou null). */
  mine: { group: { id: string; name: string }; record: CharacterRecord | null; fallen: { name: string; epitaph: string; diedAt: string }[] }[];
  /** MJ : chaque groupe, ses membres et leur fiche dans ce groupe. */
  groups: { id: string; name: string; members: { id: string; name: string; entry: AdminEntry | null }[] }[];
  /** MJ : fiches hors groupe (groupe supprimé, joueur retiré du groupe, anciennes fiches). */
  archived: (AdminEntry & { groupName: string | null })[];
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
  groupId: c.groupId ?? null,
  ownerName: users.find((u) => u.id === c.ownerId)?.name ?? "?",
  state: c.state as CharacterState,
  grantedLevel: c.grantedLevel,
  updatedAt: c.updatedAt,
});
const toEntry = (c: StoredCharacter, users: User[], graves: Grave[]): AdminEntry => {
  const grave = graves.find((g) => g.characterId === c.id);
  return {
    record: toRecord(c, users),
    snapshots: (c.snapshots ?? []).map((s) => ({ ...s, state: s.state as CharacterState })),
    dead: c.deadAt ? { epitaph: grave?.epitaph ?? "", diedAt: c.deadAt } : undefined,
  };
};

async function view(user: User): Promise<CharacterView> {
  const [chars, users, allGroups, graves] = await Promise.all([getCharacters(), getUsers(), getGroups(), getGraves()]);
  const isAdmin = user.role === "admin";
  const groups = visibleGroups(user, allGroups);
  // La fiche « en jeu » d'un joueur dans un groupe : la seule qui n'est pas morte.
  const find = (ownerId: string, groupId: string) => chars.find((c) => c.ownerId === ownerId && c.groupId === groupId && !c.deadAt);

  if (!isAdmin) {
    return {
      isAdmin,
      meId: user.id,
      mine: groups.map((g) => {
        const c = find(user.id, g.id);
        const fallen = graves
          .filter((gr) => gr.groupId === g.id && gr.ownerId === user.id)
          .map((gr) => ({ name: gr.name, epitaph: gr.epitaph, diedAt: gr.diedAt }));
        return { group: { id: g.id, name: g.name }, record: c ? toRecord(c, users) : null, fallen };
      }),
      groups: [],
      archived: [],
    };
  }

  const placed = new Set<string>();
  const adminGroups = groups.map((g) => ({
    id: g.id,
    name: g.name,
    members: membersOf(users, g.id).map((m) => {
      const c = find(m.id, g.id);
      if (c) placed.add(c.id);
      return { id: m.id, name: m.name, entry: c ? toEntry(c, users, graves) : null };
    }),
  }));
  const groupName = new Map(allGroups.map((g) => [g.id, g.name]));
  return {
    isAdmin,
    meId: user.id,
    mine: [],
    groups: adminGroups,
    archived: chars.filter((c) => !placed.has(c.id)).map((c) => ({ ...toEntry(c, users, graves), groupName: c.groupId ? groupName.get(c.groupId) ?? null : null })),
  };
}

/**
 * Fiche sur laquelle l'utilisateur peut agir (dans une transaction) :
 * le MJ, toutes ; un joueur, la sienne dans un groupe dont il fait partie.
 */
function editable(db: Db, user: User, characterId: string): StoredCharacter {
  const c = (db.characters ?? []).find((x) => x.id === characterId);
  if (!c) throw new RuleError("Fiche introuvable.");
  if (c.deadAt) throw new RuleError("Ce personnage est mort : sa fiche ne peut plus être modifiée.");
  if (user.role === "admin") return c;
  if (c.ownerId !== user.id || !c.groupId || !userGroupIds(user).includes(c.groupId)) throw new RuleError("Tu ne peux modifier que tes propres fiches.");
  return c;
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

/** Crée la fiche d'un joueur pour un groupe (le joueur pour lui-même, le MJ pour n'importe quel membre). */
export async function createCharacterAction(input: CreationInput, groupId: string, ownerId?: string | null): Promise<ActionResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    const owner = ownerId && user.role === "admin" ? ownerId : user.id;
    const state = buildCharacter(input);
    await updateDb((db) => {
      if (!(db.groups ?? []).some((g) => g.id === groupId)) throw new RuleError("Groupe introuvable.");
      const target = db.users.find((u) => u.id === owner && u.role === "player");
      if (!target || !userGroupIds(target).includes(groupId)) throw new RuleError("Ce joueur ne fait pas partie de ce groupe.");
      const list = (db.characters ??= []);
      if (list.some((c) => c.ownerId === owner && c.groupId === groupId && !c.deadAt)) throw new RuleError("Ce joueur a déjà une fiche dans ce groupe.");
      const now = new Date().toISOString();
      list.push({ id: randomUUID(), ownerId: owner, groupId, state, grantedLevel: 1, snapshots: [{ level: 1, at: now, state }], createdAt: now, updatedAt: now });
    });
  });
}

export async function saveCharacterAction(characterId: string, patch: Partial<CharacterState>): Promise<ActionResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    await updateDb((db) => {
      const c = editable(db, user, characterId);
      c.state = sanitizeFree(c.state as CharacterState, patch ?? {});
      c.updatedAt = new Date().toISOString();
    });
  });
}

export async function levelUpAction(characterId: string, answers: Answers, hpMode: "average" | "roll"): Promise<ActionResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    let result: { hpDie: number; rolled: boolean; summary: string[] } | undefined;
    await updateDb((db) => {
      const c = editable(db, user, characterId);
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

/** MJ : autorise une fiche à monter jusqu'à `level` (ou retire une autorisation non utilisée). */
export async function grantLevelAction(characterId: string, level: number): Promise<ActionResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    if (user.role !== "admin") throw new RuleError("Réservé au MJ.");
    await updateDb((db) => {
      const c = editable(db, user, characterId);
      const current = (c.state as CharacterState).level;
      c.grantedLevel = Math.min(MAX_LEVEL, Math.max(current, Math.round(level)));
      c.updatedAt = new Date().toISOString();
    });
  });
}

export async function deleteCharacterAction(characterId: string): Promise<ActionResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    if (user.role !== "admin") throw new RuleError("Réservé au MJ.");
    await updateDb((db) => {
      db.characters = (db.characters ?? []).filter((c) => c.id !== characterId);
    });
  });
}

/** MJ : déclare un personnage mort. Il rejoint le cimetière de son groupe et devient inutilisable. */
export async function declareDeathAction(characterId: string, epitaph: string): Promise<ActionResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    if (user.role !== "admin") throw new RuleError("Réservé au MJ.");
    await updateDb((db) => {
      const c = editable(db, user, characterId);
      if (!c.groupId) throw new RuleError("Seul un personnage de campagne peut rejoindre un cimetière.");
      const state = c.state as CharacterState;
      const now = new Date().toISOString();
      c.deadAt = now;
      c.updatedAt = now;
      (db.graves ??= []).push({
        id: randomUUID(),
        groupId: c.groupId,
        characterId: c.id,
        ownerId: c.ownerId,
        name: state.name,
        label: shortLabel(state),
        epitaph: String(epitaph ?? "").trim().slice(0, 300),
        diedAt: now,
      });
    });
  });
}
