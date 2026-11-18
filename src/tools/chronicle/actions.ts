"use server";
// Actions serveur de la chronique : une frise des séances par groupe. Le MJ écrit, les membres lisent.

import { requireUser, canUseTool } from "@/lib/auth";
import { getCharacters, getChronicle, getGraves, getGroups, getPolls, getQuests, getUsers, randomUUID, updateDb, type ChronicleMoment, type User } from "@/lib/db";
import { visibleGroups } from "@/lib/groups";
import { tableToday } from "@/tools/planning/summary";
import type { CharacterState } from "@/tools/character/types";
import type { QuestSummaryData } from "@/tools/quests/QuestSummary";
import { detectedEvents, type DetectedEvent } from "./events";
import { CHRONICLE_TOOL_ID, MAX_MOMENTS, isMomentKind } from "./meta";

export type MomentView = ChronicleMoment & { mine: boolean };
export type SessionView = {
  id: string;
  number: number;
  date: string;
  title: string;
  summary: string;
  draft: boolean;
  moments: MomentView[];
  /** Quêtes lancées ou terminées à cette séance (outil « Quêtes »). `hidden` : cachée des joueurs (MJ seulement). */
  quests: { id: string; title: string; event: "start" | "done" | "failed"; hidden: boolean }[];
};
export type ChronicleGroup = {
  id: string;
  name: string;
  /** Les plus récentes d'abord. */
  sessions: SessionView[];
  /** MJ : personnages du groupe (vivants et morts), pour les associer aux moments. */
  characters: { id: string; name: string; owner: string; dead: boolean }[];
  /** Résumés des quêtes présentes dans la frise (ouverts d'un clic). */
  questSummaries: QuestSummaryData[];
  /** MJ : montées de niveau et morts pas encore racontées. */
  pending: DetectedEvent[];
  /** MJ : date proposée pour une nouvelle séance (dernière session confirmée du planning). */
  suggestedDate: string;
};
export type ChronicleView = { isAdmin: boolean; groups: ChronicleGroup[] };
export type ChronicleResult = { ok: true; view: ChronicleView } | { ok: false; error: string };

export type SessionInput = {
  id?: string | null;
  groupId: string;
  date: string;
  title: string;
  summary: string;
  draft: boolean;
  moments: { kind: string; text: string; characterIds: string[]; source?: string }[];
};

const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

async function requireToolUser(): Promise<User> {
  const user = await requireUser();
  if (!canUseTool(user, CHRONICLE_TOOL_ID)) throw new Error("Accès refusé à cet outil.");
  return user;
}

async function view(user: User): Promise<ChronicleView> {
  const [allGroups, sessions, chars, graves, users, polls, quests] = await Promise.all([
    getGroups(),
    getChronicle(),
    getCharacters(),
    getGraves(),
    getUsers(),
    getPolls(),
    getQuests(),
  ]);
  const isAdmin = user.role === "admin";
  const today = tableToday();
  const mineIds = new Set(chars.filter((c) => c.ownerId === user.id).map((c) => c.id));

  return {
    isAdmin,
    groups: visibleGroups(user, allGroups).map((g) => {
      // Numérotation dans l'ordre chronologique (les brouillons comptent : le MJ les voit à leur place).
      const ordered = sessions
        .filter((s) => s.groupId === g.id && (isAdmin || !s.draft))
        .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
      const list: SessionView[] = ordered
        .map((s, i) => ({
          id: s.id,
          number: i + 1,
          date: s.date,
          title: s.title,
          summary: s.summary,
          draft: s.draft,
          moments: s.moments.map((m) => ({ ...m, mine: m.characters.some((c) => mineIds.has(c.id)) })),
          quests: quests
            .filter((q) => q.groupId === g.id && (isAdmin || q.visible) && q.status !== "todo")
            .flatMap((q) => [
              ...(q.startSessionId === s.id ? [{ id: q.id, title: q.title, event: "start" as const, hidden: !q.visible }] : []),
              ...(q.endSessionId === s.id && (q.status === "done" || q.status === "failed")
                ? [{ id: q.id, title: q.title, event: q.status, hidden: !q.visible }]
                : []),
            ]),
        }))
        .reverse();

      const confirmed = polls
        .filter((p) => p.groupId === g.id && p.status === "confirmed")
        .map((p) => p.slots.find((s) => s.id === p.confirmedSlotId)?.date)
        .filter((d): d is string => Boolean(d && d <= today))
        .sort();
      return {
        id: g.id,
        name: g.name,
        sessions: list,
        questSummaries: quests
          .filter((q) => q.groupId === g.id && (isAdmin || q.visible) && q.status !== "todo")
          .map((q) => {
            const ref = (id: string | null) => {
              const i = ordered.findIndex((s) => s.id === id);
              return i >= 0 ? { number: i + 1, title: ordered[i].title } : null;
            };
            return {
              id: q.id,
              title: q.title,
              description: q.description,
              giver: q.giver,
              reward: q.reward,
              status: q.status,
              visible: q.visible,
              start: ref(q.startSessionId),
              end: q.status === "done" || q.status === "failed" ? ref(q.endSessionId) : null,
              characters: q.characters.map((c) => c.name),
            };
          }),
        characters: isAdmin
          ? chars
              .filter((c) => c.groupId === g.id)
              .map((c) => ({ id: c.id, name: (c.state as CharacterState).name, owner: users.find((u) => u.id === c.ownerId)?.name ?? "?", dead: Boolean(c.deadAt) }))
              .sort((a, b) => Number(a.dead) - Number(b.dead) || a.name.localeCompare(b.name, "fr"))
          : [],
        pending: isAdmin ? detectedEvents(g.id, chars, graves, sessions) : [],
        suggestedDate: confirmed.at(-1) ?? today,
      };
    }),
  };
}

async function adminChange(fn: (db: Parameters<Parameters<typeof updateDb>[0]>[0]) => string | null): Promise<ChronicleResult> {
  const user = await requireToolUser();
  if (user.role !== "admin") return { ok: false, error: "Réservé au MJ." };
  const error = await updateDb(fn);
  return error ? { ok: false, error } : { ok: true, view: await view(user) };
}

export async function getChronicleAction(): Promise<ChronicleView> {
  return view(await requireToolUser());
}

/** Crée (sans `id`) ou modifie une séance. */
export async function saveSessionAction(input: SessionInput): Promise<ChronicleResult> {
  const groupId = String(input?.groupId ?? "");
  const date = String(input?.date ?? "").trim();
  const title = String(input?.title ?? "").trim().slice(0, 120);
  const summary = String(input?.summary ?? "").trim().slice(0, 8000);
  const raw = Array.isArray(input?.moments) ? input.moments : [];
  if (!DATE.test(date)) return { ok: false, error: "Indique la date de la séance." };
  if (!title) return { ok: false, error: "Donne un titre à la séance." };
  if (raw.length > MAX_MOMENTS) return { ok: false, error: `${MAX_MOMENTS} moments maximum par séance.` };

  return adminChange((db) => {
    if (!(db.groups ?? []).some((g) => g.id === groupId)) return "Groupe introuvable.";
    const groupChars = (db.characters ?? []).filter((c) => c.groupId === groupId);
    const moments: ChronicleMoment[] = [];
    for (const m of raw) {
      const text = String(m?.text ?? "").trim().slice(0, 300);
      if (!text) continue; // ligne laissée vide : ignorée
      const ids = Array.isArray(m?.characterIds) ? m.characterIds.map(String) : [];
      const kind = isMomentKind(String(m?.kind)) ? String(m.kind) : "other";
      moments.push({
        id: randomUUID(),
        kind,
        text,
        characters: groupChars.filter((c) => ids.includes(c.id)).map((c) => ({ id: c.id, name: (c.state as CharacterState).name })),
        ...(m?.source ? { source: String(m.source).slice(0, 120) } : {}),
      });
    }
    const now = new Date().toISOString();
    const list = (db.chronicle ??= []);
    if (input.id) {
      const s = list.find((x) => x.id === input.id);
      if (!s) return "Séance introuvable.";
      Object.assign(s, { groupId, date, title, summary, moments, draft: Boolean(input.draft), updatedAt: now });
    } else {
      list.push({ id: randomUUID(), groupId, date, title, summary, moments, draft: Boolean(input.draft), createdAt: now, updatedAt: now });
    }
    return null;
  });
}

export async function deleteSessionAction(id: string): Promise<ChronicleResult> {
  return adminChange((db) => {
    db.chronicle = (db.chronicle ?? []).filter((s) => s.id !== id);
    // Les quêtes rattachées à cette séance restent, mais hors frise.
    for (const q of db.quests ?? []) {
      if (q.startSessionId === id) q.startSessionId = null;
      if (q.endSessionId === id) q.endSessionId = null;
    }
    return null;
  });
}

