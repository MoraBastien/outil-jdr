// Chronique : constantes partagées (client + serveur).
export const CHRONICLE_TOOL_ID = "chronique";

/** Types de moments marquants, dans l'ordre du sélecteur. */
export const MOMENT_KINDS = [
  { id: "boss", icon: "🐉", label: "Combat de boss" },
  { id: "loot", icon: "💎", label: "Objet rare" },
  { id: "levelup", icon: "✦", label: "Montée de niveau" },
  { id: "death", icon: "🪦", label: "Mort" },
  { id: "exploit", icon: "🏆", label: "Exploit" },
  { id: "npc", icon: "🎭", label: "Rencontre" },
  { id: "place", icon: "🗺️", label: "Lieu découvert" },
  { id: "twist", icon: "⚡", label: "Rebondissement" },
  { id: "quote", icon: "💬", label: "Réplique culte" },
  { id: "other", icon: "✶", label: "Autre" },
] as const;

export type MomentKind = (typeof MOMENT_KINDS)[number]["id"];
export const momentKind = (id: string) => MOMENT_KINDS.find((k) => k.id === id) ?? MOMENT_KINDS[MOMENT_KINDS.length - 1];
export const isMomentKind = (id: string): id is MomentKind => MOMENT_KINDS.some((k) => k.id === id);

export const MAX_MOMENTS = 40;

