// Route du Navire (côté serveur) : les îles des séances de la chronique, dans l'ordre chronologique.
import type { ChronicleSession, Group, Island } from "@/lib/db";

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
