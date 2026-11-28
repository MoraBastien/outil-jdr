// Route du groupe (côté serveur) : les étapes posées sur la carte, chacune gagnée en mer ou à pied.
// Anciennes données sans étapes : la route se déduit des séances de la chronique, toutes en mer.
import type { ChronicleSession, Group, Island, Travel } from "@/lib/db";

/** Une étape affichée : le lieu, le mode d'arrivée, et sa position dans l'itinéraire enregistré (pour la modifier). */
export type RouteStep = { id: string; travel: Travel; index: number };

export function routeOf(groupId: string, sessions: ChronicleSession[], withDrafts: boolean, allowed: (id: string) => boolean): string[] {
  const ids = sessions
    .filter((s) => s.groupId === groupId && s.islandId && (withDrafts || !s.draft))
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
    .map((s) => s.islandId as string)
    .filter(allowed);
  return ids.filter((id, i) => id !== ids[i - 1]);
}

/** Île où mouille le Navire pour un groupe (si elle existe encore). */
export function harborOf(group: Group | undefined, islands: Island[]): Island | null {
  if (!group?.harborIslandId) return null;
  return islands.find((i) => i.id === group.harborIslandId && i.groupId === group.id) ?? null;
}

/**
 * Itinéraire d'un groupe : ses étapes (sans répétition consécutive d'un même lieu), filtrées par `allowed`
 * (lieux visibles). Sans étapes enregistrées, la route des séances, en mer.
 */
export function itineraryOf(group: Group, sessions: ChronicleSession[], withDrafts: boolean, allowed: (id: string) => boolean): RouteStep[] {
  const steps = group.itinerary
    ? group.itinerary.map((s, index) => ({ id: s.islandId, travel: s.travel, index })).filter((s) => allowed(s.id))
    : routeOf(group.id, sessions, withDrafts, allowed).map((id, index) => ({ id, travel: "sea" as const, index }));
  return steps.filter((s, i) => s.id !== steps[i - 1]?.id);
}
