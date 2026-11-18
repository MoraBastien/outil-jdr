"use client";
// Résumé rapide d'une quête, dans une fenêtre (frise de la chronique, journal des quêtes, lien du tableau de bord).

import { useEffect, useRef } from "react";
import Link from "next/link";
import { QUEST_STATUS, QUESTS_TOOL_ID, type QuestStatus } from "./meta";

export type QuestSummaryData = {
  id: string;
  title: string;
  description: string;
  giver: string;
  reward: string;
  status: QuestStatus;
  visible: boolean;
  start: { number: number; title: string } | null;
  end: { number: number; title: string } | null;
  characters: string[];
};

export default function QuestSummary({ quest: q, onClose, showLink = false }: { quest: QuestSummaryData; onClose: () => void; showLink?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  const st = QUEST_STATUS[q.status];

  return (
    <dialog
      ref={ref}
      className={`qs-dialog s-${q.status}`}
      aria-labelledby={`qs-${q.id}`}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
    >
      <div className="qs-inner">
        <header className="qs-head">
          <span className="qs-seal" aria-hidden="true">
            📜
          </span>
          <div className="stack-xs qs-grow">
            <span className="chips">
              <span className={`chip ${st.chip}`}>
                {st.icon} {st.label}
              </span>
              {!q.visible && <span className="chip chip-warn">🙈 Cachée</span>}
            </span>
            <h2 className="qs-title" id={`qs-${q.id}`}>
              {q.title}
            </h2>
          </div>
          <button type="button" className="icon-btn" onClick={() => ref.current?.close()} aria-label="Fermer" autoFocus>
            ×
          </button>
        </header>

        {(q.giver || q.reward) && (
          <dl className="qs-facts">
            {q.giver && (
              <div>
                <dt>Confiée par</dt>
                <dd>{q.giver}</dd>
              </div>
            )}
            {q.reward && (
              <div>
                <dt>Récompense</dt>
                <dd>{q.reward}</dd>
              </div>
            )}
          </dl>
        )}

        {q.description ? <p className="qs-desc">{q.description}</p> : <p className="muted small">Pas encore de description.</p>}

        {q.characters.length > 0 && (
          <div className="chips">
            {q.characters.map((c) => (
              <span key={c} className="chip">
                {c}
              </span>
            ))}
          </div>
        )}

        {(q.start || q.end) && (
          <ol className="qs-steps">
            {q.start && (
              <li>
                <span aria-hidden="true">📜</span> Commencée à la séance {q.start.number} · <em>{q.start.title}</em>
              </li>
            )}
            {q.end && (
              <li className={q.status === "failed" ? "ko" : "ok"}>
                <span aria-hidden="true">{q.status === "failed" ? "✗" : "✓"}</span> {q.status === "failed" ? "Échouée" : "Accomplie"} à la séance {q.end.number} ·{" "}
                <em>{q.end.title}</em>
              </li>
            )}
          </ol>
        )}

        {showLink && (
          <Link href={`/outils/${QUESTS_TOOL_ID}`} className="text-link small">
            Ouvrir le journal des quêtes →
          </Link>
        )}
      </div>
    </dialog>
  );
}
