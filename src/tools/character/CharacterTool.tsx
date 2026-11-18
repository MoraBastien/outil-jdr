"use client";
// Outil « Fiche de personnage » : création, fiche, montée de niveau ; pour le MJ, toutes les fiches.

import { useEffect, useState, useTransition } from "react";
import type { ToolPlayer } from "../registry";
import {
  createCharacterAction,
  deleteCharacterAction,
  getCharacterViewAction,
  grantLevelAction,
  levelUpAction,
  saveCharacterAction,
  type ActionResult,
  type CharacterView,
} from "./actions";
import CreationWizard from "./components/CreationWizard";
import LevelUpWizard from "./components/LevelUpWizard";
import Sheet from "./components/Sheet";
import { shortLabel, type CreationInput } from "./rules";
import { MAX_LEVEL, type Answers, type CharacterRecord, type CharacterState } from "./types";

export default function CharacterTool({ player }: { player: ToolPlayer }) {
  const [view, setView] = useState<CharacterView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [levelUpFor, setLevelUpFor] = useState<string | null>(null);
  const [wantLevelUp, setWantLevelUp] = useState(false);

  useEffect(() => {
    // Lien « Monter de niveau » du tableau de bord : /outils/personnage?levelup=1
    if (new URLSearchParams(window.location.search).has("levelup")) {
      setWantLevelUp(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
    getCharacterViewAction()
      .then(setView)
      .catch(() => setError("Impossible de charger la fiche."));
  }, []);

  useEffect(() => {
    if (wantLevelUp && view?.mine && view.mine.grantedLevel > view.mine.state.level) {
      setLevelUpFor(view.meId);
      setWantLevelUp(false);
    }
  }, [wantLevelUp, view]);

  const run = (p: Promise<ActionResult>) =>
    new Promise<ActionResult | null>((resolve) => {
      startTransition(async () => {
        try {
          const r = await p;
          if (r.ok) {
            setView(r.view);
            setError(null);
          } else setError(r.error);
          resolve(r);
        } catch {
          setError("L'action a échoué. Réessaie.");
          resolve(null);
        }
      });
    });

  if (!view) return error ? <p className="flash flash-error">{error}</p> : <div className="skeleton cs-loading" aria-label="Chargement"><span /><span /><span /></div>;

  const errorBox = error && (
    <p className="flash flash-error" role="alert">
      {error}
      <button type="button" className="toast-close" onClick={() => setError(null)} aria-label="Fermer">
        ×
      </button>
    </p>
  );

  // Fiche (avec montée de niveau) pour un propriétaire donné.
  const sheetFor = (record: CharacterRecord, ownerId: string | null) => {
    const canLevelUp = record.grantedLevel > record.state.level;
    return (
      <>
        <Sheet
          key={record.id}
          record={record}
          editable
          canLevelUp={canLevelUp}
          onLevelUp={() => setLevelUpFor(record.ownerId)}
          onSave={async (patch) => Boolean((await run(saveCharacterAction(patch, ownerId)))?.ok)}
        />
        {/* Reste ouvert après la validation pour afficher l'écran final (la fiche est déjà au nouveau niveau). */}
        {levelUpFor === record.ownerId && (
          <LevelUpWizard
            state={record.state}
            busy={busy}
            onClose={() => setLevelUpFor(null)}
            onConfirm={async (answers: Answers, hpMode) => {
              const r = await run(levelUpAction(answers, hpMode, ownerId));
              return r?.ok && r.levelUp ? r.levelUp : null;
            }}
          />
        )}
      </>
    );
  };

  if (view.isAdmin) return <AdminPanel view={view} busy={busy} run={run} errorBox={errorBox} sheetFor={sheetFor} />;

  return (
    <div className="cs-root stack-lg">
      {errorBox}
      {view.mine ? (
        <>
          {view.mine.grantedLevel > view.mine.state.level && (
            <div className="cs-levelup-banner">
              <span className="cs-levelup-glow" aria-hidden="true">
                ✦
              </span>
              <div className="stack-xs">
                <strong>Ton MJ t&apos;a accordé le niveau {view.mine.state.level + 1} !</strong>
                <span className="muted small">L&apos;assistant te guide pas à pas : nouvelles capacités, points de vie et choix.</span>
              </div>
              <button type="button" className="btn levelup-btn" onClick={() => setLevelUpFor(view.mine!.ownerId)}>
                Monter de niveau
              </button>
            </div>
          )}
          {sheetFor(view.mine, null)}
        </>
      ) : (
        <>
          <div className="cs-welcome">
            <p className="eyebrow">Bienvenue, {player.name}</p>
            <p className="muted">
              Créons ta fiche de personnage pour Donjons &amp; Dragons (règles 2024). Chaque étape est expliquée : tu peux cliquer sur les « ? » à tout moment.
            </p>
          </div>
          <CreationWizard busy={busy} onCreate={async (input: CreationInput) => Boolean((await run(createCharacterAction(input)))?.ok)} />
        </>
      )}
    </div>
  );
}

/* ---------- Vue du MJ ---------- */

function AdminPanel({
  view,
  busy,
  run,
  errorBox,
  sheetFor,
}: {
  view: CharacterView;
  busy: boolean;
  run: (p: Promise<ActionResult>) => Promise<ActionResult | null>;
  errorBox: React.ReactNode;
  sheetFor: (record: CharacterRecord, ownerId: string | null) => React.ReactNode;
}) {
  const [selected, setSelected] = useState<string | null>(view.players.find((p) => p.record)?.id ?? null);
  const [creating, setCreating] = useState<string | null>(null);
  const [snapshotLevel, setSnapshotLevel] = useState<number | null>(null);
  const current = view.players.find((p) => p.id === selected);
  const creatingFor = view.players.find((p) => p.id === creating);

  if (creatingFor) {
    return (
      <div className="cs-root stack-lg">
        {errorBox}
        <CreationWizard
          forName={creatingFor.name}
          busy={busy}
          onCancel={() => setCreating(null)}
          onCreate={async (input) => {
            const ok = Boolean((await run(createCharacterAction(input, creatingFor.id)))?.ok);
            if (ok) {
              setCreating(null);
              setSelected(creatingFor.id);
            }
            return ok;
          }}
        />
      </div>
    );
  }

  const snapshot = current?.snapshots.find((s) => s.level === snapshotLevel);

  return (
    <div className="cs-root stack-lg">
      <header className="stack-xs">
        <p className="eyebrow">Maître du jeu</p>
        <h1 className="title">Fiches des personnages</h1>
        <p className="muted">
          Accorde un niveau à un joueur : un bouton « Monter de niveau » s&apos;allume sur son tableau de bord. Une copie de chaque fiche est gardée à chaque
          niveau.
        </p>
      </header>
      {errorBox}

      {view.players.length === 0 ? (
        <p className="flash flash-error">Aucun joueur n&apos;a accès à cet outil : autorise-le sur leur page dans l&apos;administration.</p>
      ) : (
        <ul className="cs-roster">
          {view.players.map((p) => {
            const r = p.record;
            const pending = r && r.grantedLevel > r.state.level;
            return (
              <li key={p.id} className={`cs-roster-item${selected === p.id ? " on" : ""}`}>
                <button type="button" className="cs-roster-main" onClick={() => (setSelected(p.id), setSnapshotLevel(null))} disabled={!r}>
                  <span className="avatar avatar-lg" aria-hidden="true">
                    {(r?.state.name || p.name).charAt(0).toUpperCase()}
                  </span>
                  <span className="stack-xs">
                    <strong>{r ? r.state.name : p.name}</strong>
                    <span className="muted small">{r ? `${p.name} · ${shortLabel(r.state)}` : "Pas encore de fiche"}</span>
                  </span>
                </button>
                <div className="cs-roster-actions">
                  {!r && (
                    <button type="button" className="btn btn-ghost btn-small" onClick={() => setCreating(p.id)}>
                      Créer pour {p.name}
                    </button>
                  )}
                  {r && pending && (
                    <>
                      <span className="chip chip-accent">Niveau {r.grantedLevel} accordé</span>
                      <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={() => run(grantLevelAction(p.id, r.state.level))}>
                        Annuler
                      </button>
                    </>
                  )}
                  {r && !pending && r.state.level < MAX_LEVEL && (
                    <button type="button" className="btn btn-small" disabled={busy} onClick={() => run(grantLevelAction(p.id, r.state.level + 1))}>
                      Accorder le niveau {r.state.level + 1}
                    </button>
                  )}
                  {r && !pending && r.state.level >= MAX_LEVEL && <span className="chip">Niveau max ({MAX_LEVEL})</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {current?.record && (
        <section className="stack">
          <div className="cs-row-between">
            <div className="segmented-tabs" role="tablist" aria-label="Version de la fiche">
              <button type="button" role="tab" aria-selected={snapshotLevel === null} className={snapshotLevel === null ? "on" : ""} onClick={() => setSnapshotLevel(null)}>
                Fiche actuelle
              </button>
              {current.snapshots.map((s) => (
                <button
                  key={s.level}
                  type="button"
                  role="tab"
                  aria-selected={snapshotLevel === s.level}
                  className={snapshotLevel === s.level ? "on" : ""}
                  onClick={() => setSnapshotLevel(s.level)}
                  title={`Copie du ${new Date(s.at).toLocaleDateString("fr-FR")}`}
                >
                  Copie niv. {s.level}
                </button>
              ))}
            </div>
            <div className="pl-actions">
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => {
                  const data = JSON.stringify(snapshot?.state ?? current.record!.state, null, 2);
                  const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${(current.record!.state.name || "personnage").replace(/[^\p{L}\p{N}-]+/gu, "-")}-niv${snapshot?.level ?? current.record!.state.level}.json`;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                Télécharger (JSON)
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-small pl-delete"
                disabled={busy}
                onClick={() => {
                  if (confirm(`Supprimer la fiche de ${current.record!.state.name} et toutes ses copies ? Irréversible.`)) {
                    void run(deleteCharacterAction(current.id));
                    setSelected(null);
                  }
                }}
              >
                Supprimer la fiche
              </button>
            </div>
          </div>

          {snapshot ? (
            <>
              <p className="muted small">
                Copie en lecture seule, enregistrée le {new Date(snapshot.at).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}.
              </p>
              <Sheet
                key={`snap-${snapshot.level}`}
                record={{ ...current.record, state: snapshot.state as CharacterState }}
                editable={false}
                canLevelUp={false}
                onSave={async () => false}
              />
            </>
          ) : (
            sheetFor(current.record, current.id)
          )}
        </section>
      )}
    </div>
  );
}
