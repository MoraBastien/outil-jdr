// Widget du tableau de bord : les quêtes en cours (visibles) de chaque groupe.
import Link from "next/link";
import { getChronicle, getGroups, getQuests, type User } from "@/lib/db";
import { visibleGroups } from "@/lib/groups";
import { QUESTS_TOOL_ID } from "./meta";
import QuestsWidgetList from "./QuestsWidgetList";

const HREF = `/outils/${QUESTS_TOOL_ID}`;
const MAX = 5;

export default async function QuestsWidget({ user }: { user: User }) {
  const [allGroups, quests, sessions] = await Promise.all([getGroups(), getQuests(), getChronicle()]);
  const isAdmin = user.role === "admin";
  const groups = visibleGroups(user, allGroups);
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  const multi = groups.length > 1;

  // Séance (numéro + titre) dans l'ordre chronologique des séances visibles.
  const sessionRef = (groupId: string, sessionId: string | null) => {
    if (!sessionId) return null;
    const list = sessions
      .filter((s) => s.groupId === groupId && (isAdmin || !s.draft))
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
    const i = list.findIndex((s) => s.id === sessionId);
    return i >= 0 ? { number: i + 1, title: list[i].title } : null;
  };

  const open = quests
    .filter((q) => groupName.has(q.groupId) && q.status === "open" && q.visible)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const hidden = isAdmin ? quests.filter((q) => groupName.has(q.groupId) && q.status === "todo").length : 0;

  if (open.length === 0) {
    return (
      <div className="cem-w-empty">
        <span aria-hidden="true">🧭</span>
        <p className="muted small">
          {isAdmin ? (hidden ? `Aucune quête en cours. ${hidden} quête${hidden > 1 ? "s" : ""} à venir, prête${hidden > 1 ? "s" : ""} à être lancée${hidden > 1 ? "s" : ""}.` : "Aucune quête en cours.") : "Aucune quête en cours pour l'instant."}
        </p>
      </div>
    );
  }

  return (
    <div className="stack">
      <QuestsWidgetList
        quests={open.slice(0, MAX).map((q) => {
          const start = sessionRef(q.groupId, q.startSessionId);
          const meta = [start ? `Depuis la séance ${start.number}` : null, multi ? groupName.get(q.groupId) : null, q.characters.map((c) => c.name).join(", ") || null]
            .filter(Boolean)
            .join(" · ");
          return {
            meta,
            summary: {
              id: q.id,
              title: q.title,
              description: q.description,
              giver: q.giver,
              reward: q.reward,
              status: q.status,
              visible: q.visible,
              start,
              end: null,
              characters: q.characters.map((c) => c.name),
            },
          };
        })}
      />
      {(open.length > MAX || hidden > 0) && (
        <Link href={HREF} className="text-link small">
          {open.length > MAX ? `Voir les ${open.length} quêtes en cours` : `${hidden} quête${hidden > 1 ? "s" : ""} à venir dans ton journal`}
        </Link>
      )}
    </div>
  );
}
