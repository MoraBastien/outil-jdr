"use client";
// Assistant de montée de niveau : ce qu'on gagne, les PV, les choix, le récapitulatif, puis la fête.

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { getClass } from "../data/classes";
import { getFeat } from "../data/feats";
import { FEAT_SKILLED_KEY, applyLevelUp, averageHp, derive, fmtMod, nextLevelFeatures } from "../rules";
import type { Answers, CharacterState, Choice } from "../types";
import { ChoicePicker, isComplete } from "./ChoicePicker";
import Hint from "./Hint";

type Result = { hpDie: number; rolled: boolean; summary: string[] };

export default function LevelUpWizard({
  state: initialState,
  busy,
  onConfirm,
  onClose,
}: {
  state: CharacterState;
  busy: boolean;
  onConfirm: (answers: Answers, hpMode: "average" | "roll") => Promise<Result | null>;
  onClose: () => void;
}) {
  // Fiche figée à l'ouverture : après validation, le parent reçoit déjà la fiche au nouveau niveau.
  const [state] = useState(initialState);
  const cls = getClass(state.classId)!;
  const { level, features, choices } = nextLevelFeatures(state);
  const before = useMemo(() => derive(state), [state]);
  const [answers, setAnswers] = useState<Answers>({});
  const [hpMode, setHpMode] = useState<"average" | "roll">("average");
  const [result, setResult] = useState<Result | null>(null);
  const avg = averageHp(cls.hitDie);

  // Le don Doué (niveau 4) demande 3 compétences en plus.
  const extraChoices: Choice[] =
    answers.asi?.[0] === "feat" && getFeat(answers.asi[1])?.skills
      ? [{ kind: "skills", key: FEAT_SKILLED_KEY, label: "Doué : 3 compétences", count: 3, from: "any" }]
      : [];
  const allChoices = [...choices, ...extraChoices];
  const steps = ["intro", "hp", ...(allChoices.length ? ["choices"] : []), "recap"] as const;
  const [stepIndex, setStepIndex] = useState(0);
  const step = result ? "done" : steps[stepIndex];

  // Aperçu avec la moyenne (le vrai jet est fait par le serveur).
  const preview = useMemo(() => {
    if (step !== "recap") return null;
    try {
      return { ...applyLevelUp(state, answers, avg), error: null };
    } catch (e) {
      return { state: null, summary: [], hpGain: 0, error: (e as Error).message };
    }
  }, [step, state, answers, avg]);
  const after = preview?.state ? derive(preview.state) : null;

  // Échap ferme l'assistant (sauf pendant l'envoi).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const canNext =
    step === "intro" || step === "hp" || (step === "choices" && allChoices.every((c) => isComplete(c, answers[c.key])));

  // Portail vers <body> : la page a des parents animés qui décaleraient une fenêtre en position fixe.
  return createPortal(
    <div className="lu-overlay" role="dialog" aria-modal="true" aria-labelledby="lu-title">
      <div className="lu-modal">
        {step !== "done" && (
          <button type="button" className="lu-close" onClick={onClose} aria-label="Fermer" disabled={busy}>
            ×
          </button>
        )}

        {step === "intro" && (
          <div className="lu-step lu-intro">
            <div className="lu-badge" aria-hidden="true">
              <span>{level}</span>
            </div>
            <p className="eyebrow">Montée de niveau</p>
            <h2 className="title" id="lu-title">
              {state.name} passe au niveau {level} !
            </h2>
            <p className="muted">Voici ce que ton {cls.name.toLowerCase()} apprend. Prends le temps de lire : on t&apos;explique tout.</p>
            <ul className="lu-features">
              {features.map((f) => (
                <li key={f.name}>
                  <strong>{f.name}</strong>
                  <span className="muted">{f.desc}</span>
                  {f.tip && <span className="lu-tip">💡 {f.tip}</span>}
                  {f.choice && <span className="chip chip-accent">Un choix t&apos;attend</span>}
                </li>
              ))}
              <li>
                <strong>Points de vie</strong>
                <span className="muted">Tu gagnes un dé de vie (d{cls.hitDie}) et des points de vie en plus.</span>
              </li>
            </ul>
          </div>
        )}

        {step === "hp" && (
          <div className="lu-step">
            <h2 className="title" id="lu-title">
              Tes nouveaux points de vie
            </h2>
            <p className="muted">
              À chaque niveau, tu ajoutes ton dé de vie (d{cls.hitDie}) + ton modificateur de Constitution ({fmtMod(before.mods.con)}) à tes PV max.{" "}
              <Hint>La moyenne est sûre. Lancer le dé peut rapporter plus… ou moins. Le dé est lancé par le serveur, impossible de relancer.</Hint>
            </p>
            <div className="lu-hp-options">
              <button type="button" className={`lu-hp${hpMode === "average" ? " on" : ""}`} aria-pressed={hpMode === "average"} onClick={() => setHpMode("average")}>
                <span className="chip chip-ok">Conseillé</span>
                <strong className="lu-hp-value">+{Math.max(1, avg + before.mods.con)}</strong>
                <span>Prendre la moyenne</span>
                <span className="muted small">
                  {avg} {fmtMod(before.mods.con)} (CON)
                </span>
              </button>
              <button type="button" className={`lu-hp${hpMode === "roll" ? " on" : ""}`} aria-pressed={hpMode === "roll"} onClick={() => setHpMode("roll")}>
                <span className="chip chip-accent">Risqué</span>
                <strong className="lu-hp-value">
                  +{Math.max(1, 1 + before.mods.con)} à +{cls.hitDie + before.mods.con}
                </strong>
                <span>Lancer le d{cls.hitDie}</span>
                <span className="muted small">Le serveur lance le dé à la validation</span>
              </button>
            </div>
          </div>
        )}

        {step === "choices" && (
          <div className="lu-step">
            <h2 className="title" id="lu-title">
              Tes choix
            </h2>
            {allChoices.map((c) => (
              <ChoicePicker
                key={c.key}
                state={state}
                choice={c}
                value={answers[c.key] ?? []}
                onChange={(v) => setAnswers((a) => ({ ...a, [c.key]: v }))}
              />
            ))}
          </div>
        )}

        {step === "recap" && (
          <div className="lu-step">
            <h2 className="title" id="lu-title">
              Récapitulatif
            </h2>
            {preview?.error ? (
              <p className="flash flash-error">{preview.error}</p>
            ) : (
              after && (
                <>
                  <div className="lu-compare">
                    <Compare label="Niveau" from={String(state.level)} to={String(level)} />
                    <Compare
                      label="PV max"
                      from={String(before.hpMax)}
                      to={hpMode === "average" ? String(after.hpMax) : `${before.hpMax + Math.max(1, 1 + before.mods.con)}–${before.hpMax + cls.hitDie + before.mods.con}`}
                    />
                    <Compare label="Dés de vie" from={`${state.level}d${cls.hitDie}`} to={`${level}d${cls.hitDie}`} />
                    <Compare label="Maîtrise" from={fmtMod(before.prof)} to={fmtMod(after.prof)} />
                    {after.spell && before.spell && <Compare label="Sorts préparés" from={String(before.spell.prepared)} to={String(after.spell.prepared)} />}
                    {after.spell && <Compare label="Emplacements" from={before.spell?.slots.join(" / ") ?? "—"} to={after.spell.slots.join(" / ")} />}
                  </div>
                  <ul className="lu-summary">
                    {preview!.summary
                      .filter((l) => !l.startsWith("PV max"))
                      .map((l) => (
                        <li key={l}>{l}</li>
                      ))}
                  </ul>
                  {after.spell && after.spell.prepared > (before.spell?.prepared ?? 0) && (
                    <p className="muted small">💡 Pense à ajouter tes nouveaux sorts dans l&apos;onglet « Sorts » de ta fiche.</p>
                  )}
                </>
              )
            )}
          </div>
        )}

        {step === "done" && result && (
          <div className="lu-step lu-done">
            <div className="lu-burst" aria-hidden="true">
              {Array.from({ length: 24 }, (_, i) => (
                <i key={i} style={{ "--a": `${i * 15}deg`, "--d": `${110 + (i % 4) * 30}px`, "--delay": `${(i % 6) * 40}ms` } as React.CSSProperties} />
              ))}
            </div>
            <div className="lu-badge big" aria-hidden="true">
              <span>{level}</span>
            </div>
            <h2 className="title" id="lu-title">
              Niveau {level} atteint !
            </h2>
            {result.rolled && (
              <p className="lu-roll">
                Ton d{cls.hitDie} a donné <b>{result.hpDie}</b>
              </p>
            )}
            <ul className="lu-summary">
              {result.summary.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <button type="button" className="btn" onClick={onClose} autoFocus>
              Voir ma fiche
            </button>
          </div>
        )}

        {step !== "done" && (
          <footer className="lu-foot">
            <span className="lu-progress" aria-hidden="true">
              {steps.map((s, i) => (
                <i key={s} className={i <= stepIndex ? "on" : ""} />
              ))}
            </span>
            <div className="pl-actions">
              {stepIndex > 0 && (
                <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setStepIndex(stepIndex - 1)}>
                  ← Retour
                </button>
              )}
              {step === "recap" ? (
                <button
                  type="button"
                  className="btn levelup-btn"
                  disabled={busy || Boolean(preview?.error)}
                  onClick={async () => {
                    const r = await onConfirm(answers, hpMode);
                    if (r) setResult(r);
                  }}
                >
                  {busy ? "Validation…" : `✦ Passer au niveau ${level}`}
                </button>
              ) : (
                <button type="button" className="btn" disabled={!canNext} onClick={() => setStepIndex(stepIndex + 1)}>
                  Continuer →
                </button>
              )}
            </div>
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Compare({ label, from, to }: { label: string; from: string; to: string }) {
  const changed = from !== to;
  return (
    <div className={`lu-cmp${changed ? " changed" : ""}`}>
      <span className="label">{label}</span>
      <span>
        {changed && <span className="muted lu-from">{from}</span>} <b>{to}</b>
      </span>
    </div>
  );
}
