// Vue d'ensemble du planning pour le tableau de bord (côté serveur uniquement).
import { getPolls, getUsers, type User } from "@/lib/db";
import { PLANNING_TOOL_ID, slotEnd, slotKey, sortSlots, type PollSlot } from "./types";

export type PlanningOverview = {
  isAdmin: boolean;
  /** Sessions confirmées à venir, de la plus proche à la plus lointaine. */
  upcoming: { pollId: string; title: string; slot: PollSlot }[];
  /** Sondages ouverts. */
  open: {
    id: string;
    title: string;
    /** Créneaux encore à venir. */
    slots: PollSlot[];
    /** Joueur : a-t-il répondu à tous les créneaux à venir ? */
    mine: "todo" | "partial" | "done";
    /** Nombre de joueurs ayant répondu / nombre de joueurs ayant l'outil. */
    responded: number;
    participants: number;
    /** Créneau qui réunit le plus de monde (Oui = 2, Peut-être = 1). */
    best: PollSlot | null;
  }[];
};

/** Date du jour à l'heure de la table (les créneaux sont stockés en heure locale). */
export const tableToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());

export async function getPlanningOverview(user: User): Promise<PlanningOverview> {
  const day = tableToday();
  const [polls, users] = await Promise.all([getPolls(), getUsers()]);
  const participants = users.filter((u) => u.role === "player" && u.tools.includes(PLANNING_TOOL_ID));

  const upcoming = polls
    .filter((p) => p.status === "confirmed")
    .flatMap((p) => {
      const slot = p.slots.find((s) => s.id === p.confirmedSlotId);
      return slot && slotEnd(slot).date >= day ? [{ pollId: p.id, title: p.title, slot }] : [];
    })
    .sort((a, b) => slotKey(a.slot).localeCompare(slotKey(b.slot)));

  const open = polls
    .filter((p) => p.status === "open")
    .map((p) => {
      const slots = sortSlots(p.slots).filter((s) => s.date >= day);
      const answered = slots.filter((s) => p.responses[user.id]?.[s.id]).length;
      const score = (s: PollSlot) =>
        participants.reduce((n, u) => {
          const a = p.responses[u.id]?.[s.id];
          return n + (a === "yes" ? 2 : a === "maybe" ? 1 : 0);
        }, 0);
      const best = slots.reduce<{ s: PollSlot | null; n: number }>((b, s) => (score(s) > b.n ? { s, n: score(s) } : b), { s: null, n: 0 }).s;
      return {
        id: p.id,
        title: p.title,
        slots,
        mine: (answered === 0 ? "todo" : answered < slots.length ? "partial" : "done") as "todo" | "partial" | "done",
        responded: participants.filter((u) => Object.keys(p.responses[u.id] ?? {}).length > 0).length,
        participants: participants.length,
        best,
      };
    })
    .filter((p) => p.slots.length > 0)
    .sort((a, b) => slotKey(a.slots[0]).localeCompare(slotKey(b.slots[0])));

  return { isAdmin: user.role === "admin", upcoming, open };
}
