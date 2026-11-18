"use client";
// Liste du widget « Quêtes en cours » : un clic ouvre le résumé sur place, sans quitter le tableau de bord.

import { useState } from "react";
import QuestSummary, { type QuestSummaryData } from "./QuestSummary";

export type WidgetQuest = { summary: QuestSummaryData; meta: string };

export default function QuestsWidgetList({ quests }: { quests: WidgetQuest[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const current = quests.find((q) => q.summary.id === open);
  return (
    <>
      <ul className="qw-list">
        {quests.map(({ summary: q, meta }, i) => (
          <li key={q.id} style={{ animationDelay: `${i * 70}ms` }}>
            <button type="button" className="qw-quest" onClick={() => setOpen(q.id)} title="Voir le résumé de la quête">
              <span className="qw-seal" aria-hidden="true">
                📜
              </span>
              <span className="stack-xs">
                <strong className="qw-text">{q.title}</strong>
                {meta && <span className="muted small">{meta}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {current && <QuestSummary key={current.summary.id} quest={current.summary} onClose={() => setOpen(null)} showLink />}
    </>
  );
}
