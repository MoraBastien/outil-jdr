// Événements de campagne détectés automatiquement (montées de niveau, morts), pas encore racontés dans une séance.
// Pur : reçoit les données, ne lit pas la base.
import type { ChronicleSession, Grave, StoredCharacter } from "@/lib/db";
import type { CharacterState } from "@/tools/character/types";

export type DetectedEvent = {
  source: string;
  kind: "levelup" | "death";
  text: string;
  /** Date ISO de l'événement. */
  at: string;
  character: { id: string; name: string };
};

/** Lignes de montée de niveau qui méritent d'être racontées (pas les PV ni les emplacements). */
const STORY = (line: string) => !/^(PV max|Emplacements|Sorts préparés|Sorts mineurs|Incantation)/.test(line);

export function detectedEvents(groupId: string, chars: StoredCharacter[], graves: Grave[], sessions: ChronicleSession[]): DetectedEvent[] {
  const used = new Set(sessions.filter((s) => s.groupId === groupId).flatMap((s) => s.moments.map((m) => m.source).filter(Boolean)));
  const out: DetectedEvent[] = [];
  for (const c of chars.filter((x) => x.groupId === groupId)) {
    const s = c.state as CharacterState;
    for (const h of s.history ?? []) {
      // Les montées de niveau commencent toujours par « PV max … » (voir applyLevelUp).
      if (h.level < 2 || !h.summary[0]?.startsWith("PV max")) continue;
      const source = `levelup:${c.id}:${h.level}`;
      if (used.has(source)) continue;
      const details = h.summary.filter(STORY).map((l) => l.replace(/^Nouvelle capacité : /, ""));
      out.push({
        source,
        kind: "levelup",
        text: `${s.name} atteint le niveau ${h.level}${details.length ? ` (${details.slice(0, 3).join(", ")})` : ""}.`,
        at: h.at,
        character: { id: c.id, name: s.name },
      });
    }
  }
  for (const g of graves.filter((x) => x.groupId === groupId)) {
    const source = `death:${g.characterId}`;
    if (used.has(source)) continue;
    out.push({
      source,
      kind: "death",
      text: `${g.name} tombe au combat.${g.epitaph ? ` « ${g.epitaph} »` : ""}`,
      at: g.diedAt,
      character: { id: g.characterId, name: g.name },
    });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}
