"use server";
// L'Équipage : les marins du navire de chaque groupe. Le MJ les nomme, les décrit, et peut garder des notes secrètes.
// Les joueurs ne reçoivent jamais les notes du MJ ni les membres cachés : tout est filtré ici, côté serveur.

import { requireUser, canUseTool } from "@/lib/auth";
import { getCrew, getGroups, randomUUID, updateDb, type Db, type User } from "@/lib/db";
import { visibleGroups } from "@/lib/groups";
import { EQUIPAGE_TOOL_ID } from "./meta";
import { CREW_SEED } from "./seed";

export type CrewMemberView = {
  id: string;
  name: string;
  nickname: string;
  role: string;
  trait: string;
  /** Note du MJ : présente seulement pour le MJ. */
  notes?: string;
  /** Membre caché aux joueurs : présent seulement pour le MJ. */
  hidden?: boolean;
};
export type CrewGroup = { id: string; name: string; shipName: string | null; crew: CrewMemberView[] };
export type CrewView = { isAdmin: boolean; groups: CrewGroup[] };
export type CrewResult = { ok: true; view: CrewView } | { ok: false; error: string };
export type CrewInput = { id?: string | null; groupId: string; name: string; nickname: string; role: string; trait: string; notes: string; hidden: boolean };

async function requireToolUser(): Promise<User> {
  const user = await requireUser();
  if (!canUseTool(user, EQUIPAGE_TOOL_ID)) throw new Error("Accès refusé à cet outil.");
  return user;
}

async function view(user: User): Promise<CrewView> {
  const [groups, crew] = await Promise.all([getGroups(), getCrew()]);
  const isAdmin = user.role === "admin";
  return {
    isAdmin,
    groups: visibleGroups(user, groups).map((g) => ({
      id: g.id,
      name: g.name,
      shipName: g.shipName ?? null,
      crew: crew
        .filter((m) => m.groupId === g.id && (isAdmin || !m.hidden))
        .map((m) => {
          const base = { id: m.id, name: m.name, nickname: m.nickname, role: m.role, trait: m.trait };
          return isAdmin ? { ...base, notes: m.notes, hidden: m.hidden } : base;
        }),
    })),
  };
}

async function adminChange(fn: (db: Db) => string | null): Promise<CrewResult> {
  const user = await requireToolUser();
  if (user.role !== "admin") return { ok: false, error: "Réservé au MJ." };
  const error = await updateDb(fn);
  return error ? { ok: false, error } : { ok: true, view: await view(user) };
}

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export async function getCrewAction(): Promise<CrewView> {
  return view(await requireToolUser());
}

/** Crée (sans `id`) ou modifie un membre d'équipage. */
export async function saveCrewMemberAction(input: CrewInput): Promise<CrewResult> {
  const name = text(input?.name, 60);
  if (!name) return { ok: false, error: "Donne un nom à ce marin." };
  const fields = {
    name,
    nickname: text(input?.nickname, 60),
    role: text(input?.role, 80),
    trait: text(input?.trait, 400),
    notes: text(input?.notes, 1200),
    hidden: input?.hidden === true,
  };
  return adminChange((db) => {
    if (!(db.groups ?? []).some((g) => g.id === input.groupId)) return "Groupe introuvable.";
    const now = new Date().toISOString();
    const list = (db.crew ??= []);
    if (input.id) {
      const m = list.find((x) => x.id === input.id && x.groupId === input.groupId);
      if (!m) return "Marin introuvable.";
      Object.assign(m, fields, { updatedAt: now });
    } else {
      list.push({ id: randomUUID(), groupId: input.groupId, ...fields, createdAt: now, updatedAt: now });
    }
    return null;
  });
}

export async function deleteCrewMemberAction(id: string): Promise<CrewResult> {
  return adminChange((db) => {
    if (!(db.crew ?? []).some((m) => m.id === id)) return "Marin introuvable.";
    db.crew = (db.crew ?? []).filter((m) => m.id !== id);
    return null;
  });
}

/** Embarque l'équipage proposé (seulement si le navire du groupe n'a encore personne à bord). */
export async function seedCrewAction(groupId: string): Promise<CrewResult> {
  return adminChange((db) => {
    if (!(db.groups ?? []).some((g) => g.id === groupId)) return "Groupe introuvable.";
    const list = (db.crew ??= []);
    if (list.some((m) => m.groupId === groupId)) return "Ce navire a déjà un équipage.";
    const now = new Date().toISOString();
    for (const s of CREW_SEED) list.push({ id: randomUUID(), groupId, ...s, hidden: false, createdAt: now, updatedAt: now });
    return null;
  });
}

/** Baptise le navire du groupe (vide : « le Navire »). */
export async function setShipNameAction(groupId: string, shipName: string): Promise<CrewResult> {
  const clean = text(shipName, 60);
  return adminChange((db) => {
    const g = (db.groups ?? []).find((x) => x.id === groupId);
    if (!g) return "Groupe introuvable.";
    g.shipName = clean || null;
    return null;
  });
}
