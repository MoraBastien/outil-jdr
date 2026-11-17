// Types et utilitaires partagés (client + serveur) de l'outil « Planning des sessions ».
import type { Poll, PollAnswer, PollSlot } from "@/lib/db";

export type { Poll, PollAnswer, PollSlot };

export const PLANNING_TOOL_ID = "planning";

export type SlotInput = { date: string; start: string; end: string };

export type PlanningData = {
  me: { id: string; isAdmin: boolean };
  /** Joueurs ayant accès à l'outil (ceux qui peuvent répondre). */
  participants: { id: string; name: string }[];
  polls: Poll[];
};

export type PlanningResult = { ok: true; data: PlanningData } | { ok: false; error: string };

export const ANSWER_LABELS: Record<PollAnswer, string> = { yes: "Oui", maybe: "Peut-être", no: "Non" };

/** Tri chronologique des créneaux. */
export const slotKey = (s: PollSlot) => `${s.date}T${s.start}`;
export const sortSlots = (slots: PollSlot[]) => [...slots].sort((a, b) => slotKey(a).localeCompare(slotKey(b)));

/** Date "AAAA-MM-JJ" + n jours (calcul en UTC pour éviter les décalages d'heure d'été). */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Fin effective d'un créneau : date + heure (le lendemain si la fin est avant le début ; +3 h si pas de fin). */
export function slotEnd(s: PollSlot): { date: string; time: string } {
  if (!s.end) {
    const [h, m] = s.start.split(":").map(Number);
    const total = h * 60 + m + 180;
    return {
      date: total >= 1440 ? addDays(s.date, 1) : s.date,
      time: `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`,
    };
  }
  return { date: s.end <= s.start ? addDays(s.date, 1) : s.date, time: s.end };
}
