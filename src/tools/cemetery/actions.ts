"use server";
// Actions serveur du cimetière : un cimetière par groupe (campagne), visible de ses membres.
// Le MJ y écrit les épitaphes et peut ramener un personnage à la vie (en cas d'erreur).

import { requireUser, canUseTool } from "@/lib/auth";
import { getGraves, getGroups, updateDb, type User } from "@/lib/db";
import { visibleGroups } from "@/lib/groups";
import { CEMETERY_TOOL_ID } from "./meta";

export type CemeteryView = {
  isAdmin: boolean;
  groups: { id: string; name: string; graves: { id: string; name: string; label: string; epitaph: string; diedAt: string; mine: boolean }[] }[];
};
export type CemeteryResult = { ok: true; view: CemeteryView } | { ok: false; error: string };

async function requireToolUser(): Promise<User> {
  const user = await requireUser();
  if (!canUseTool(user, CEMETERY_TOOL_ID)) throw new Error("Accès refusé à cet outil.");
  return user;
}

async function view(user: User): Promise<CemeteryView> {
  const [groups, graves] = await Promise.all([getGroups(), getGraves()]);
  return {
    isAdmin: user.role === "admin",
    groups: visibleGroups(user, groups).map((g) => ({
      id: g.id,
      name: g.name,
      graves: graves
        .filter((gr) => gr.groupId === g.id)
        .map((gr) => ({ id: gr.id, name: gr.name, label: gr.label, epitaph: gr.epitaph, diedAt: gr.diedAt, mine: gr.ownerId === user.id })),
    })),
  };
}

async function adminChange(fn: (db: Parameters<Parameters<typeof updateDb>[0]>[0]) => string | null): Promise<CemeteryResult> {
  const user = await requireToolUser();
  if (user.role !== "admin") return { ok: false, error: "Réservé au MJ." };
  const error = await updateDb(fn);
  return error ? { ok: false, error } : { ok: true, view: await view(user) };
}

export async function getCemeteryAction(): Promise<CemeteryView> {
  return view(await requireToolUser());
}

export async function setEpitaphAction(graveId: string, epitaph: string): Promise<CemeteryResult> {
  return adminChange((db) => {
    const g = (db.graves ?? []).find((x) => x.id === graveId);
    if (!g) return "Tombe introuvable.";
    g.epitaph = String(epitaph ?? "").trim().slice(0, 300);
    return null;
  });
}

/** Ramène un personnage à la vie : la tombe disparaît et la fiche redevient jouable (si le joueur n'en a pas créé d'autre). */
export async function reviveAction(graveId: string): Promise<CemeteryResult> {
  return adminChange((db) => {
    const g = (db.graves ?? []).find((x) => x.id === graveId);
    if (!g) return "Tombe introuvable.";
    const c = (db.characters ?? []).find((x) => x.id === g.characterId);
    if (c) {
      const other = (db.characters ?? []).some((x) => x.id !== c.id && x.ownerId === c.ownerId && x.groupId === c.groupId && !x.deadAt);
      if (other) return "Ce joueur a déjà un autre personnage dans ce groupe : impossible de ramener celui-ci.";
      delete c.deadAt;
      c.updatedAt = new Date().toISOString();
    }
    db.graves = (db.graves ?? []).filter((x) => x.id !== graveId);
    return null;
  });
}
