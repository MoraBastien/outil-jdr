"use client";
// Le coffre : un atelier d'essais de personnages. Création plus libre, niveau choisi par le joueur.

import { useEffect, useState, useTransition } from "react";
import type { ToolPlayer } from "../registry";
import CreationWizard from "../character/components/CreationWizard";
import LevelUpWizard from "../character/components/LevelUpWizard";
import Sheet from "../character/components/Sheet";
import { shortLabel } from "../character/rules";
import { MAX_LEVEL } from "../character/types";
import {
  createDraftAction,
  deleteDraftAction,
  duplicateDraftAction,
  getVaultAction,
  levelUpDraftAction,
  revertDraftAction,
  saveDraftAction,
  type VaultEntry,
  type VaultResult,
} from "./actions";

type Screen = { kind: "list" } | { kind: "new" } | { kind: "open"; id: string };

export default function VaultTool({ player }: { player: ToolPlayer }) {
  const [entries, setEntries] = useState<VaultEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [screen, setScreen] = useState<Screen>({ kind: "list" });
  const [levelUpOpen, setLevelUpOpen] = useState(false);

  useEffect(() => {
    getVaultAction()
      .then(setEntries)
      .catch(() => setError("Impossible d'ouvrir le coffre."));
  }, []);

  const run = (p: Promise<VaultResult>) =>
    new Promise<VaultResult | null>((resolve) => {
      startTransition(async () => {
        try {
          const r = await p;
          if (r.ok) {
            setEntries(r.entries);
            setError(null);
          } else setError(r.error);
          resolve(r);
        } catch {
          setError("L'action a échoué. Réessaie.");
          resolve(null);
        }
      });
    });

  if (!entries) {
    return error ? (
      <p className="flash flash-error">{error}</p>
    ) : (
      <div className="skeleton cs-loading" aria-label="Chargement">
        <span />
        <span />
        <span />
      </div>
    );
  }

  const errorBox = error && (
    <p className="flash flash-error" role="alert">
      {error}
      <button type="button" className="toast-close" onClick={() => setError(null)} aria-label="Fermer">
        ×
      </button>
    </p>
  );

  /* ---------- Nouvel essai ---------- */
  if (screen.kind === "new") {
    return (
      <div className="cs-root stack-lg">
        {errorBox}
        <CreationWizard
          free
          busy={busy}
          onCancel={() => setScreen({ kind: "list" })}
          onCreate={async (input) => {
            const before = new Set(entries.map((e) => e.record.id));
            const r = await run(createDraftAction(input));
            if (r?.ok) {
              const created = r.entries.find((e) => !before.has(e.record.id));
              setScreen(created ? { kind: "open", id: created.record.id } : { kind: "list" });
            }
            return Boolean(r?.ok);
          }}
        />
      </div>
    );
  }

  /* ---------- Un essai ---------- */
  const open = screen.kind === "open" ? entries.find((e) => e.record.id === screen.id) : undefined;
  if (open) {
    const { record, levels } = open;
    const level = record.state.level;
    return (
      <div className="cs-root stack-lg">
        <div className="vault-bar">
          <button type="button" className="btn btn-ghost btn-small" onClick={() => (setScreen({ kind: "list" }), setLevelUpOpen(false))}>
            ← Retour au coffre
          </button>
          <div className="vault-levels" role="group" aria-label="Niveau de l'essai">
            <span className="label">Niveau</span>
            {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((n) => {
              const isCurrent = n === level;
              const canRevert = n < level && levels.includes(n);
              const isNext = n === level + 1;
              return (
                <button
                  key={n}
                  type="button"
                  className={`vault-level${isCurrent ? " on" : ""}${isNext ? " next" : ""}`}
                  disabled={busy || (!canRevert && !isNext)}
                  aria-pressed={isCurrent}
                  title={isCurrent ? "Niveau actuel" : canRevert ? `Revenir au niveau ${n}` : isNext ? `Monter au niveau ${n}` : "Monte d'abord au niveau précédent"}
                  onClick={() => {
                    if (isNext) setLevelUpOpen(true);
                    else if (canRevert && confirm(`Revenir au niveau ${n} ? Les choix faits aux niveaux suivants seront oubliés (tes textes et ton équipement sont gardés).`)) {
                      void run(revertDraftAction(record.id, n));
                    }
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <div className="pl-actions">
            <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={() => run(duplicateDraftAction(record.id))}>
              Dupliquer
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-small pl-delete"
              disabled={busy}
              onClick={() => {
                if (confirm(`Supprimer l'essai « ${record.state.name} » ?`)) {
                  void run(deleteDraftAction(record.id));
                  setScreen({ kind: "list" });
                }
              }}
            >
              Supprimer
            </button>
          </div>
        </div>
        <p className="muted small vault-note">
          🗝️ Essai du coffre : tu choisis toi-même ton niveau, et tu peux revenir en arrière à tout moment. Rien ici n&apos;affecte tes fiches de campagne.
        </p>
        {errorBox}
        <Sheet
          key={record.id}
          record={record}
          editable
          canLevelUp={level < MAX_LEVEL}
          onLevelUp={() => setLevelUpOpen(true)}
          onSave={async (patch) => Boolean((await run(saveDraftAction(record.id, patch)))?.ok)}
        />
        {levelUpOpen && (
          <LevelUpWizard
            state={record.state}
            busy={busy}
            onClose={() => setLevelUpOpen(false)}
            onConfirm={async (answers, hpMode) => {
              const r = await run(levelUpDraftAction(record.id, answers, hpMode));
              return r?.ok && r.levelUp ? r.levelUp : null;
            }}
          />
        )}
      </div>
    );
  }

  /* ---------- Le coffre ---------- */
  return (
    <div className="cs-root stack-lg">
      <header className="vault-head">
        <span className="vault-icon" aria-hidden="true">
          🗝️
        </span>
        <div className="stack-xs">
          <p className="eyebrow">Ton coffre, {player.name}</p>
          <h1 className="title">Essais de personnages</h1>
          <p className="muted">
            Expérimente librement : valeurs de caractéristiques à ta guise, autant de texte que tu veux, et le niveau que tu veux. Tes essais restent
            ici, rien n&apos;est envoyé dans une campagne.
          </p>
        </div>
      </header>
      {errorBox}

      <div className="vault-grid">
        <button type="button" className="vault-card vault-new" onClick={() => setScreen({ kind: "new" })}>
          <span className="vault-plus" aria-hidden="true">
            +
          </span>
          <strong>Nouvel essai</strong>
          <span className="muted small">Même assistant, en plus libre</span>
        </button>
        {entries.map(({ record }) => (
          <button key={record.id} type="button" className="vault-card" onClick={() => setScreen({ kind: "open", id: record.id })}>
            <span className="cs-portrait" aria-hidden="true">
              {record.state.name.charAt(0).toUpperCase()}
              <span className="cs-level">{record.state.level}</span>
            </span>
            <strong className="vault-name">{record.state.name}</strong>
            <span className="muted small">{shortLabel(record.state)}</span>
            <span className="muted small">Modifié le {new Date(record.updatedAt).toLocaleDateString("fr-FR")}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
