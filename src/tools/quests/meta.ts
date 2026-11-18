// Quêtes : constantes partagées (client + serveur).
export const QUESTS_TOOL_ID = "quetes";

export type QuestStatus = "todo" | "open" | "done" | "failed";
export const QUEST_STATUS: Record<QuestStatus, { label: string; icon: string; chip: string }> = {
  todo: { label: "À venir", icon: "✶", chip: "" },
  open: { label: "En cours", icon: "⏳", chip: "chip-accent" },
  done: { label: "Accomplie", icon: "✓", chip: "chip-ok" },
  failed: { label: "Échouée", icon: "✗", chip: "chip-danger" },
};
export const isQuestStatus = (v: unknown): v is QuestStatus => typeof v === "string" && v in QUEST_STATUS;
