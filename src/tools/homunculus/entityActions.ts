"use server";
// Actions de la fiche de l'entité (joueurs de l'Atelier) :
// - le nom de l'entité (l'Écho reste fixé par le MJ) ;
// - l'homunculus actif de chaque groupe, transféré dans une fiche de personnage classique (voir transfer.ts).
//   Le MJ peut le déclarer mort comme n'importe quel personnage ; il ne peut alors plus être réactivé.
import { requireUser } from "@/lib/auth";
import { getCharacters, getGraves, getGroups, getHomunculi, randomUUID, updateDb, type User } from "@/lib/db";
import { userGroupIds } from "@/lib/groups";
import type { CharacterRecord, CharacterState } from "@/tools/character/types";
import { derive as deriveHomunculus, type HomunculusState } from "@/tools/homunculus-creator/server";
import { clampEcho } from "./echo";
import { ENTITY_NAME_MAX, isEntityPlayer } from "./entity";
import { homunculusLabel, homunculusToCharacter } from "./transfer";

export type EntityResult = { ok: true; name: string } | { ok: false; error: string };

export type EntityGroup = {
  id: string;
  name: string;
  /** Fiche classique de l'homunculus actif dans ce groupe. */
  record: CharacterRecord | null;
  /** Écho de l'entité différent du niveau de la fiche : l'homunculus est à mettre à jour. */
  stale: boolean;
  fallen: { name: string; epitaph: string; diedAt: string }[];
};
export type EntityHomunculus = { id: string; name: string; label: string; complete: boolean; echo: number; dead: boolean; activeIn: string | null };
export type EntityView = { echo: number; groups: EntityGroup[]; homunculi: EntityHomunculus[] };
export type EntityViewResult = { ok: true; view: EntityView } | { ok: false; error: string };

class EntityError extends Error {}

async function requireAtelierPlayer(): Promise<User> {
  const user = await requireUser();
  if (!isEntityPlayer(user)) throw new Error("Accès refusé.");
  return user;
}

const isExtra = (state: unknown) => Boolean((state as CharacterState).extra);
const sourceOf = (state: unknown) => (state as CharacterState).extra?.sourceId;

async function buildView(user: User): Promise<EntityView> {
  const [chars, graves, allGroups, sheets] = await Promise.all([getCharacters(), getGraves(), getGroups(), getHomunculi(user.id)]);
  const echo = clampEcho(user.echo);
  const mine = chars.filter((c) => c.ownerId === user.id && isExtra(c.state));
  const groups = allGroups.filter((g) => userGroupIds(user).includes(g.id));
  return {
    echo,
    groups: groups.map((g) => {
      const c = mine.find((x) => x.groupId === g.id && !x.deadAt);
      const state = c?.state as CharacterState | undefined;
      const record: CharacterRecord | null =
        c && state
          ? { id: c.id, ownerId: c.ownerId, groupId: g.id, ownerName: user.name, state, grantedLevel: c.grantedLevel, prepared: null, foundryTodo: null, updatedAt: c.updatedAt }
          : null;
      return {
        id: g.id,
        name: g.name,
        record,
        stale: Boolean(state && state.level !== echo),
        fallen: graves
          .filter((gr) => gr.groupId === g.id && gr.ownerId === user.id && mine.some((x) => x.id === gr.characterId))
          .map((gr) => ({ name: gr.name, epitaph: gr.epitaph, diedAt: gr.diedAt })),
      };
    }),
    homunculi: [...sheets]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((h) => {
        const s = h.state as HomunculusState;
        const live = mine.find((x) => !x.deadAt && sourceOf(x.state) === h.id);
        return {
          id: h.id,
          name: s.nom.trim() || "Sans nom",
          label: homunculusLabel(s),
          complete: deriveHomunculus(s).complete,
          echo: s.echo,
          dead: mine.some((x) => x.deadAt && sourceOf(x.state) === h.id),
          activeIn: live?.groupId ?? null,
        };
      }),
  };
}

async function run(fn: (user: User) => Promise<void>): Promise<EntityViewResult> {
  try {
    const user = await requireAtelierPlayer();
    await fn(user);
    return { ok: true, view: await buildView(user) };
  } catch (e) {
    if (e instanceof EntityError) return { ok: false, error: e.message };
    console.error("Fiche de l'entité :", e);
    return { ok: false, error: "L'action a échoué. Réessaie." };
  }
}

export async function getEntityViewAction(): Promise<EntityViewResult> {
  return run(async () => {});
}

export async function saveEntityNameAction(input: string): Promise<EntityResult> {
  const user = await requireUser();
  if (!isEntityPlayer(user)) return { ok: false, error: "Accès refusé." };
  const name = String(input ?? "").replace(/\s+/g, " ").trim().slice(0, ENTITY_NAME_MAX);
  if (!name) return { ok: false, error: "Donne un nom à ton entité." };
  await updateDb((db) => {
    const me = db.users.find((u) => u.id === user.id);
    if (me) me.entitySheet = { name, updatedAt: new Date().toISOString() };
  });
  return { ok: true, name };
}

/**
 * Rend un homunculus actif dans un groupe : sa fiche de l'Atelier devient une fiche de personnage classique.
 * Il remplace l'homunculus actif précédent du groupe (s'il est vivant). Une ancienne fiche D&D du joueur
 * dans ce groupe passe dans les archives du MJ.
 */
export async function activateHomunculusAction(groupId: string, homunculusId: string): Promise<EntityViewResult> {
  return run(async (user) => {
    await updateDb((db) => {
      const me = db.users.find((u) => u.id === user.id);
      const group = (db.groups ?? []).find((g) => g.id === groupId);
      if (!me || !group || !userGroupIds(me).includes(groupId)) throw new EntityError("Tu ne fais pas partie de ce groupe.");
      const h = (db.homunculi ?? []).find((x) => x.id === homunculusId && x.ownerId === user.id);
      if (!h) throw new EntityError("Homunculus introuvable.");
      const list = (db.characters ??= []);
      const mine = list.filter((c) => c.ownerId === user.id);
      if (mine.some((c) => c.deadAt && sourceOf(c.state) === h.id)) throw new EntityError("Cet homunculus est mort : il ne peut plus revenir.");
      const elsewhere = mine.find((c) => !c.deadAt && sourceOf(c.state) === h.id && c.groupId !== groupId);
      if (elsewhere) throw new EntityError("Cet homunculus est déjà actif dans un autre groupe.");

      const state = homunculusToCharacter(h.state as HomunculusState);
      if ("error" in state) throw new EntityError(state.error);

      // Le précédent homunculus actif du groupe (vivant) est remplacé ; une ancienne fiche D&D est archivée.
      db.characters = list.filter((c) => !(c.ownerId === user.id && c.groupId === groupId && !c.deadAt && isExtra(c.state)));
      for (const c of db.characters) if (c.ownerId === user.id && c.groupId === groupId && !c.deadAt) c.groupId = undefined;

      const now = new Date().toISOString();
      db.characters.push({
        id: randomUUID(),
        ownerId: user.id,
        groupId,
        state,
        grantedLevel: state.level,
        snapshots: [{ level: state.level, at: now, state }],
        createdAt: now,
        updatedAt: now,
      });
    });
  });
}

/**
 * Met à jour la fiche classique depuis l'Atelier (après une montée d'Écho ou une modification de l'homunculus).
 * Ce que le joueur a rempli en jeu (PV, équipement, notes, nom) est gardé.
 */
export async function refreshHomunculusAction(characterId: string): Promise<EntityViewResult> {
  return run(async (user) => {
    await updateDb((db) => {
      const c = (db.characters ?? []).find((x) => x.id === characterId && x.ownerId === user.id && !x.deadAt);
      const current = c?.state as CharacterState | undefined;
      if (!c || !current?.extra) throw new EntityError("Fiche introuvable.");
      const h = (db.homunculi ?? []).find((x) => x.id === current.extra!.sourceId && x.ownerId === user.id);
      if (!h) throw new EntityError("La fiche de cet homunculus n'existe plus dans l'Atelier.");
      const state = homunculusToCharacter(h.state as HomunculusState, current);
      if ("error" in state) throw new EntityError(state.error);
      const now = new Date().toISOString();
      if (state.level !== current.level) c.snapshots = [...(c.snapshots ?? []), { level: state.level, at: now, state }];
      c.state = state;
      c.grantedLevel = state.level;
      c.updatedAt = now;
    });
  });
}
