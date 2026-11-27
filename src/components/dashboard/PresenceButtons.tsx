"use client";
// Présence à la prochaine séance fixée (tableau de bord).
// Réponse donnée : un état plein (« À bord ce soir », « Peut-être », « Absent ») et « Changer ma réponse ».
// Choix : trois boutons ; la réponse actuelle est marquée et reçoit le focus ; « Garder ma réponse » ou Échap annule.
import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { setPresenceAction } from "@/tools/planning/actions";
import type { PollAnswer } from "@/tools/planning/types";

/** Icônes au trait des réponses (même dessin que le reste du tableau de bord). */
const MARKS: Record<PollAnswer, string> = { yes: "M5 12.5l4.2 4.2L19 7", maybe: "M9.5 9a2.6 2.6 0 1 1 3.6 2.4c-.7.3-1.1.9-1.1 1.6v.5M12 17.2v.3", no: "M7 7l10 10M17 7L7 17" };
const Mark = ({ a }: { a: PollAnswer }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={MARKS[a]} />
  </svg>
);

const CHOICES: { id: PollAnswer; label: string; cls: string }[] = [
  { id: "yes", label: "À bord", cls: "btn btn-small" },
  { id: "maybe", label: "Peut-être", cls: "btn btn-ghost btn-small" },
  { id: "no", label: "Absent", cls: "btn btn-ghost btn-small" },
];

export default function PresenceButtons({ pollId, mine, when }: { pollId: string; mine: PollAnswer | null; when: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const choiceRefs = useRef<Partial<Record<PollAnswer, HTMLButtonElement | null>>>({});
  const changeRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const errorId = useId();

  // En entrant dans le choix : le focus va sur la réponse actuelle (jamais sur un autre bouton par hasard).
  // En revenant à l'état « répondu » : le focus revient sur « Changer ma réponse ».
  useEffect(() => {
    if (editing) choiceRefs.current[mine ?? "yes"]?.focus();
    else if (returnFocus.current) {
      returnFocus.current = false;
      changeRef.current?.focus();
    }
  }, [editing, mine]);

  const cancel = () => {
    returnFocus.current = true;
    setEditing(false);
  };
  const answer = (a: PollAnswer) => {
    if (a === mine && editing) return cancel();
    start(async () => {
      const r = await setPresenceAction(pollId, a);
      if (r.ok) {
        setError(null);
        returnFocus.current = true;
        setEditing(false);
        router.refresh();
      } else setError(r.error);
    });
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && editing && mine) {
      e.preventDefault();
      cancel();
    }
  };

  const answered = mine !== null && !editing;
  return (
    <div className="stack-xs" aria-live="polite">
      {answered ? (
        <div key="answered" className="db-answered">
          <span className={`db-answer a-${mine}`}>
            <Mark a={mine} />
            {mine === "yes" ? `À bord ${when}` : mine === "maybe" ? `Peut-être ${when}` : `Absent ${when}`}
          </span>
          <button ref={changeRef} type="button" className="db-change" onClick={() => setEditing(true)}>
            Changer ma réponse
          </button>
        </div>
      ) : (
        <div key="choice" className="db-presence" role="group" aria-label="Ma présence" aria-describedby={error ? errorId : undefined} onKeyDown={onKeyDown}>
          {CHOICES.map((c) => (
            <button
              key={c.id}
              ref={(el) => {
                choiceRefs.current[c.id] = el;
              }}
              type="button"
              className={`${c.cls}${c.id === mine ? " db-current" : ""}`}
              aria-pressed={c.id === mine}
              disabled={busy}
              onClick={() => answer(c.id)}
            >
              {c.id === mine && <Mark a="yes" />}
              {c.label}
            </button>
          ))}
          {mine && (
            <button type="button" className="db-change" onClick={cancel}>
              Garder ma réponse
            </button>
          )}
        </div>
      )}
      {busy && (
        <p className="muted small" role="status">
          Envoi de ta réponse…
        </p>
      )}
      {error && (
        <p id={errorId} className="danger-text small" role="alert">
          {error} Réessaie dans un instant, ou réponds depuis le planning.
        </p>
      )}
    </div>
  );
}
