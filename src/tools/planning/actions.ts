"use server";
// Actions serveur du planning des sessions. Chaque action vérifie l'accès et renvoie les données à jour.

import { requireUser, canUseTool } from "@/lib/auth";
import { getUsers, getPolls, updateDb, randomUUID, type Db, type PollSlot, type User } from "@/lib/db";
import { PLANNING_TOOL_ID, type PlanningData, type PlanningResult, type PollAnswer, type SlotInput } from "./types";

const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const ANSWERS: PollAnswer[] = ["yes", "maybe", "no"];
const MAX_SLOTS = 40;

async function requireToolUser(): Promise<User> {
  const user = await requireUser();
  if (!canUseTool(user, PLANNING_TOOL_ID)) throw new Error("Accès refusé à cet outil.");
  return user;
}

async function view(user: User): Promise<PlanningData> {
  const users = await getUsers();
  const participants = users
    .filter((u) => u.role === "player" && u.tools.includes(PLANNING_TOOL_ID))
    .map((u) => ({ id: u.id, name: u.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const polls = await getPolls();
  return { me: { id: user.id, isAdmin: user.role === "admin" }, participants, polls };
}

function cleanSlot(input: unknown): PollSlot | string {
  const s = (input ?? {}) as Partial<SlotInput>;
  const date = String(s.date ?? "").trim();
  const start = String(s.start ?? "").trim();
  const end = String(s.end ?? "").trim();
  if (!DATE.test(date)) return "Chaque créneau doit avoir une date.";
  if (!TIME.test(start)) return "Chaque créneau doit avoir une heure de début.";
  if (end && !TIME.test(end)) return "Heure de fin invalide.";
  return { id: randomUUID(), date, start, end: end || null };
}

/** Exécute une modification réservée au MJ et renvoie les données à jour. */
async function adminChange(fn: (db: Db, now: string) => string | null): Promise<PlanningResult> {
  const user = await requireToolUser();
  if (user.role !== "admin") return { ok: false, error: "Réservé au MJ." };
  const error = await updateDb((db) => fn(db, new Date().toISOString()));
  return error ? { ok: false, error } : { ok: true, data: await view(user) };
}

const findPoll = (db: Db, id: string) => (db.polls ?? []).find((p) => p.id === id);

export async function getPlanningAction(): Promise<PlanningData> {
  return view(await requireToolUser());
}

export async function createPollAction(input: { title: string; note: string; slots: SlotInput[] }): Promise<PlanningResult> {
  const title = String(input?.title ?? "").trim().slice(0, 120);
  const note = String(input?.note ?? "").trim().slice(0, 2000);
  const raw = Array.isArray(input?.slots) ? input.slots : [];
  if (!title) return { ok: false, error: "Donne un titre au sondage." };
  if (raw.length === 0) return { ok: false, error: "Ajoute au moins un créneau." };
  if (raw.length > MAX_SLOTS) return { ok: false, error: `${MAX_SLOTS} créneaux maximum.` };
  const slots: PollSlot[] = [];
  for (const r of raw) {
    const s = cleanSlot(r);
    if (typeof s === "string") return { ok: false, error: s };
    if (!slots.some((x) => x.date === s.date && x.start === s.start)) slots.push(s);
  }
  return adminChange((db, now) => {
    (db.polls ??= []).push({
      id: randomUUID(),
      title,
      note,
      slots,
      responses: {},
      status: "open",
      confirmedSlotId: null,
      createdAt: now,
      updatedAt: now,
    });
    return null;
  });
}

export async function addSlotAction(pollId: string, input: SlotInput): Promise<PlanningResult> {
  const slot = cleanSlot(input);
  if (typeof slot === "string") return { ok: false, error: slot };
  return adminChange((db, now) => {
    const poll = findPoll(db, pollId);
    if (!poll) return "Sondage introuvable.";
    if (poll.slots.length >= MAX_SLOTS) return `${MAX_SLOTS} créneaux maximum.`;
    if (poll.slots.some((s) => s.date === slot.date && s.start === slot.start)) return "Ce créneau existe déjà.";
    poll.slots.push(slot);
    poll.updatedAt = now;
    return null;
  });
}

export async function removeSlotAction(pollId: string, slotId: string): Promise<PlanningResult> {
  return adminChange((db, now) => {
    const poll = findPoll(db, pollId);
    if (!poll) return "Sondage introuvable.";
    poll.slots = poll.slots.filter((s) => s.id !== slotId);
    for (const r of Object.values(poll.responses)) delete r[slotId];
    if (poll.confirmedSlotId === slotId) {
      poll.confirmedSlotId = null;
      poll.status = "open";
    }
    poll.updatedAt = now;
    return null;
  });
}

/** Confirme un créneau (ou annule la confirmation avec `null`, ce qui rouvre le sondage). */
export async function confirmSlotAction(pollId: string, slotId: string | null): Promise<PlanningResult> {
  return adminChange((db, now) => {
    const poll = findPoll(db, pollId);
    if (!poll) return "Sondage introuvable.";
    if (slotId && !poll.slots.some((s) => s.id === slotId)) return "Créneau introuvable.";
    poll.confirmedSlotId = slotId;
    poll.status = slotId ? "confirmed" : "open";
    poll.updatedAt = now;
    return null;
  });
}

export async function setPollClosedAction(pollId: string, closed: boolean): Promise<PlanningResult> {
  return adminChange((db, now) => {
    const poll = findPoll(db, pollId);
    if (!poll) return "Sondage introuvable.";
    poll.status = closed ? "closed" : poll.confirmedSlotId ? "confirmed" : "open";
    poll.updatedAt = now;
    return null;
  });
}

export async function deletePollAction(pollId: string): Promise<PlanningResult> {
  return adminChange((db) => {
    db.polls = (db.polls ?? []).filter((p) => p.id !== pollId);
    return null;
  });
}

/** Réponse d'un joueur à un créneau (`null` efface la réponse). */
export async function answerAction(pollId: string, slotId: string, answer: PollAnswer | null): Promise<PlanningResult> {
  const user = await requireToolUser();
  if (user.role !== "player") return { ok: false, error: "Seuls les joueurs répondent aux sondages." };
  if (answer !== null && !ANSWERS.includes(answer)) return { ok: false, error: "Réponse invalide." };
  const error = await updateDb((db) => {
    const poll = findPoll(db, pollId);
    if (!poll) return "Sondage introuvable.";
    if (poll.status !== "open") return "Ce sondage n'accepte plus de réponses.";
    if (!poll.slots.some((s) => s.id === slotId)) return "Créneau introuvable.";
    const mine = (poll.responses[user.id] ??= {});
    if (answer) mine[slotId] = answer;
    else delete mine[slotId];
    return null;
  });
  return error ? { ok: false, error } : { ok: true, data: await view(user) };
}
