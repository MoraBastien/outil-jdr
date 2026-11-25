"use client";
// Présence à la prochaine séance fixée (tableau de bord).
// Réponse donnée : un état plein (« À bord ce soir », « Peut-être », « Absent ») et « Changer ma réponse ».
// Choix : trois boutons ; la réponse actuelle est marquée et reçoit le focus ; « Garder ma réponse » ou Échap annule.
import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { setPresenceAction } from "@/tools/planning/actions";
import type { PollAnswer } from "@/tools/planning/types";

const CHOICES: { id: PollAnswer; label: string; cls: string }[] = [
  { id: "yes", label: "Je serai à bord", cls: "btn btn-small" },
  { id: "maybe", label: "Peut-être", cls: "btn btn-ghost btn-small" },
  { id: "no", label: "Pas cette fois", cls: "btn btn-ghost btn-small" },
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
            <span aria-hidden="true">{mine === "yes" ? "✓" : mine === "maybe" ? "?" : "✕"}</span>{" "}
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
              {c.id === mine ? `✓ ${c.label}` : c.label}
            </button>
          ))}
          {mine && (
            <button type="button" className="db-change" onClick={cancel}>
              Garder ma réponse
            </button>
          )}
        </div>
      )}
      {error && (
        <p id={errorId} className="danger-text small" role="alert">
          {error} Réessaie dans un instant, ou réponds depuis le planning.
        </p>
      )}
    </div>
  );
}
