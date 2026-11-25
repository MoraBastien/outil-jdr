"use server";
// Actions serveur des quêtes : le MJ les écrit, les cache ou les révèle, et les fait avancer.
// Une quête lancée apparaît dans la frise de la chronique, à la séance choisie.

import { requireUser, canUseTool } from "@/lib/auth";
import { getCharacters, getChronicle, getGroups, getQuests, randomUUID, updateDb, type Db, type Quest, type User } from "@/lib/db";
import { visibleGroups } from "@/lib/groups";
import { logActivity } from "@/lib/activity";
import type { CharacterState } from "@/tools/character/types";
import { QUESTS_TOOL_ID, isQuestStatus, type QuestStatus } from "./meta";

type SessionRef = { id: string; number: number; title: string; date: string };
export type QuestView = {
  id: string;
  title: string;
  description: string;
  giver: string;
  reward: string;
  visible: boolean;
  status: QuestStatus;
  start: SessionRef | null;
  end: SessionRef | null;
  characters: { id: string; name: string }[];
  /** Le joueur connecté a un personnage concerné. */
  mine: boolean;
};
export type QuestGroup = {
  id: string;
  name: string;
  quests: QuestView[];
  /** MJ : séances de la chronique (les plus récentes d'abord), pour situer le début et la fin des quêtes. */
  sessions: SessionRef[];
  /** MJ : personnages du groupe. */
  characters: { id: string; name: string; dead: boolean }[];
};
export type QuestsView = { isAdmin: boolean; groups: QuestGroup[] };
export type QuestsResult = { ok: true; view: QuestsView } | { ok: false; error: string };
export type QuestInput = { id?: string | null; groupId: string; title: string; description: string; giver: string; reward: string; visible: boolean; characterIds: string[] };

const ORDER: Record<QuestStatus, number> = { open: 0, todo: 1, done: 2, failed: 2 };

async function requireToolUser(): Promise<User> {
  const user = await requireUser();
  if (!canUseTool(user, QUESTS_TOOL_ID)) throw new Error("Accès refusé à cet outil.");
  return user;
}

async function view(user: User): Promise<QuestsView> {
  const [allGroups, quests, sessions, chars] = await Promise.all([getGroups(), getQuests(), getChronicle(), getCharacters()]);
  const isAdmin = user.role === "admin";
  const mineIds = new Set(chars.filter((c) => c.ownerId === user.id).map((c) => c.id));

  return {
    isAdmin,
    groups: visibleGroups(user, allGroups).map((g) => {
      // Séances visibles par cet utilisateur, numérotées dans l'ordre chronologique.
      const refs: SessionRef[] = sessions
        .filter((s) => s.groupId === g.id && (isAdmin || !s.draft))
        .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
        .map((s, i) => ({ id: s.id, number: i + 1, title: s.title, date: s.date }));
      const ref = (id: string | null) => refs.find((r) => r.id === id) ?? null;
      return {
        id: g.id,
        name: g.name,
        quests: quests
          .filter((q) => q.groupId === g.id && (isAdmin || q.visible))
          .sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.updatedAt.localeCompare(a.updatedAt))
          .map((q) => ({
            id: q.id,
            title: q.title,
            description: q.description,
            giver: q.giver,
            reward: q.reward,
            visible: q.visible,
            status: q.status,
            start: ref(q.startSessionId),
            end: ref(q.endSessionId),
            characters: q.characters,
            mine: q.characters.some((c) => mineIds.has(c.id)),
          })),
        sessions: isAdmin ? [...refs].reverse() : [],
        characters: isAdmin
          ? chars
              .filter((c) => c.groupId === g.id)
              .map((c) => ({ id: c.id, name: (c.state as CharacterState).name, dead: Boolean(c.deadAt) }))
              .sort((a, b) => Number(a.dead) - Number(b.dead) || a.name.localeCompare(b.name, "fr"))
          : [],
      };
    }),
  };
}

async function adminChange(fn: (db: Db, now: string) => string | null): Promise<QuestsResult> {
  const user = await requireToolUser();
  if (user.role !== "admin") return { ok: false, error: "Réservé au MJ." };
  const error = await updateDb((db) => fn(db, new Date().toISOString()));
  return error ? { ok: false, error } : { ok: true, view: await view(user) };
}

const findQuest = (db: Db, id: string) => (db.quests ?? []).find((q) => q.id === id);

export async function getQuestsAction(): Promise<QuestsView> {
  return view(await requireToolUser());
}

/** Crée (sans `id`) ou modifie une quête. Le statut se change à part (voir setQuestStatusAction). */
export async function saveQuestAction(input: QuestInput): Promise<QuestsResult> {
  const groupId = String(input?.groupId ?? "");
  const title = String(input?.title ?? "").trim().slice(0, 140);
  if (!title) return { ok: false, error: "Donne un titre à la quête." };
  const fields = {
    title,
    description: String(input?.description ?? "").trim().slice(0, 6000),
    giver: String(input?.giver ?? "").trim().slice(0, 140),
    reward: String(input?.reward ?? "").trim().slice(0, 300),
    visible: Boolean(input?.visible),
  };
  const ids = Array.isArray(input?.characterIds) ? input.characterIds.map(String) : [];

  return adminChange((db, now) => {
    if (!(db.groups ?? []).some((g) => g.id === groupId)) return "Groupe introuvable.";
    const characters = (db.characters ?? [])
      .filter((c) => c.groupId === groupId && ids.includes(c.id))
      .map((c) => ({ id: c.id, name: (c.state as CharacterState).name }));
    if (input.id) {
      const q = findQuest(db, input.id);
      if (!q) return "Quête introuvable.";
      Object.assign(q, fields, { characters, updatedAt: now });
    } else {
      const q: Quest = { id: randomUUID(), groupId, ...fields, status: "todo", startSessionId: null, endSessionId: null, characters, createdAt: now, updatedAt: now };
      (db.quests ??= []).push(q);
    }
    return null;
  });
}

/**
 * Fait avancer une quête. `sessionId` : la séance où elle commence (« en cours ») ou se termine.
 * Lancer une quête la rend visible : elle apparaît dans la frise et le journal des joueurs.
 */
export async function setQuestStatusAction(questId: string, status: QuestStatus, sessionId: string | null): Promise<QuestsResult> {
  if (!isQuestStatus(status)) return { ok: false, error: "Statut invalide." };
  return adminChange((db, now) => {
    const q = findQuest(db, questId);
    if (!q) return "Quête introuvable.";
    const session = sessionId ? (db.chronicle ?? []).find((s) => s.id === sessionId && s.groupId === q.groupId) : null;
    if (sessionId && !session) return "Séance introuvable.";
    const sid = session?.id ?? null;
    if (status === "todo") {
      q.startSessionId = null;
      q.endSessionId = null;
    } else if (status === "open") {
      q.visible = true;
      q.endSessionId = null;
      // Rouvrir une quête terminée garde sa séance de départ.
      if (q.status === "todo" || !q.startSessionId) q.startSessionId = sid;
    } else {
      q.endSessionId = sid;
    }
    const was = q.status;
    q.status = status;
    q.updatedAt = now;
    if (was !== status && q.visible) {
      const text = status === "open" ? `Nouvelle quête : ${q.title}.` : status === "done" ? `Quête accomplie : ${q.title} !` : status === "failed" ? `Quête échouée : ${q.title}.` : null;
      if (text) logActivity(db, { groupId: q.groupId, kind: "quest", text, href: `/outils/quetes?quete=${q.id}`, key: `quest:${q.id}` });
    }
    return null;
  });
}

export async function setQuestVisibleAction(questId: string, visible: boolean): Promise<QuestsResult> {
  return adminChange((db, now) => {
    const q = findQuest(db, questId);
    if (!q) return "Quête introuvable.";
    const revealed = !q.visible && Boolean(visible);
    q.visible = Boolean(visible);
    q.updatedAt = now;
    if (revealed && q.status === "open") logActivity(db, { groupId: q.groupId, kind: "quest", text: `Nouvelle quête : ${q.title}.`, href: `/outils/quetes?quete=${q.id}`, key: `quest:${q.id}` });
    return null;
  });
}

export async function deleteQuestAction(questId: string): Promise<QuestsResult> {
  return adminChange((db) => {
    db.quests = (db.quests ?? []).filter((q) => q.id !== questId);
    return null;
  });
}
