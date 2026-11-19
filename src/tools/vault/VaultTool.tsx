"use client";
// Le coffre : un atelier d'essais de personnages. Création plus libre, niveau choisi par le joueur.

import { useEffect, useState, useTransition } from "react";
import type { ToolPlayer } from "../registry";
import CreationWizard from "../character/components/CreationWizard";
import LevelUpWizard from "../character/components/LevelUpWizard";
import Sheet from "../character/components/Sheet";
import { proposalBlocker } from "../character/proposal";
import { shortLabel } from "../character/rules";
import { MAX_LEVEL } from "../character/types";
import {
  createDraftAction,
  deleteDraftAction,
  duplicateDraftAction,
  getVaultAction,
  levelUpDraftAction,
  proposeDraftAction,
  revertDraftAction,
  saveDraftAction,
  withdrawProposalAction,
  type VaultData,
  type VaultEntry,
  type VaultGroup,
  type VaultResult,
} from "./actions";

type Screen = { kind: "list" } | { kind: "new" } | { kind: "open"; id: string };

export default function VaultTool({ player }: { player: ToolPlayer }) {
  const [vault, setVault] = useState<VaultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [screen, setScreen] = useState<Screen>({ kind: "list" });
  const [levelUpOpen, setLevelUpOpen] = useState(false);
  const [proposeOpen, setProposeOpen] = useState(false);

  useEffect(() => {
    getVaultAction()
      .then(setVault)
      .catch(() => setError("Impossible d'ouvrir le coffre."));
  }, []);

  const run = (p: Promise<VaultResult>) =>
    new Promise<VaultResult | null>((resolve) => {
      startTransition(async () => {
        try {
          const r = await p;
          if (r.ok) {
            setVault({ entries: r.entries, groups: r.groups });
            setError(null);
          } else setError(r.error);
          resolve(r);
        } catch {
          setError("L'action a échoué. Réessaie.");
          resolve(null);
        }
      });
    });

  if (!vault) {
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

  const { entries, groups } = vault;
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
    // Fiche venue d'un autre outil : son niveau ne se règle pas ici (note écrite par le serveur).
    const extra = record.state.extra;
    return (
      <div className="cs-root stack-lg">
        <div className="vault-bar">
          <button type="button" className="btn btn-ghost btn-small" onClick={() => (setScreen({ kind: "list" }), setLevelUpOpen(false), setProposeOpen(false))}>
            ← Retour au coffre
          </button>
          {!extra && (
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
          )}
          <div className="pl-actions">
            {groups.length > 0 && (
              <button type="button" className="btn btn-small" onClick={() => setProposeOpen((o) => !o)} aria-expanded={proposeOpen}>
                🗝️ Proposer au MJ
              </button>
            )}
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
          {extra?.note ?? "🗝️ Essai du coffre : tu choisis toi-même ton niveau, et tu peux revenir en arrière à tout moment. Rien ici n'affecte tes fiches de campagne."}
        </p>
        {errorBox}
        <ProposalStatus draftId={record.id} groups={groups} busy={busy} onWithdraw={(g) => run(withdrawProposalAction(g))} />
        {proposeOpen && (
          <ProposeForm
            entry={open}
            groups={groups}
            busy={busy}
            onCancel={() => setProposeOpen(false)}
            onSend={async (groupId, message) => {
              const r = await run(proposeDraftAction(record.id, groupId, message));
              if (r?.ok) setProposeOpen(false);
            }}
          />
        )}
        <Sheet
          key={record.id}
          record={record}
          editable
          canLevelUp={!extra && level < MAX_LEVEL}
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
            {record.state.extra && <span className="muted small">{record.state.extra.tag}</span>}
            <span className="muted small">Modifié le {new Date(record.updatedAt).toLocaleDateString("fr-FR")}</span>
            {groups
              .filter((g) => g.proposal?.draftId === record.id)
              .map((g) => (
                <span key={g.id} className={`chip ${g.proposal!.status === "refused" ? "chip-danger" : "chip-accent"}`}>
                  {g.proposal!.status === "refused" ? "Refusé" : "Proposé"} · {g.name}
                </span>
              ))}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Proposer un essai au MJ ---------- */

function ProposalStatus({ draftId, groups, busy, onWithdraw }: { draftId: string; groups: VaultGroup[]; busy: boolean; onWithdraw: (groupId: string) => void }) {
  const mine = groups.filter((g) => g.proposal?.draftId === draftId);
  if (mine.length === 0) return null;
  return (
    <>
      {mine.map((g) => {
        const refused = g.proposal!.status === "refused";
        return (
          <div key={g.id} className={`cs-proposal${refused ? " refused" : ""}`}>
            <span aria-hidden="true">{refused ? "✗" : "⏳"}</span>
            <div className="stack-xs">
              <strong>{refused ? `Ton MJ n'a pas retenu cet essai pour « ${g.name} ».` : `Proposé pour « ${g.name} » : en attente de ton MJ.`}</strong>
              {refused && g.proposal!.reason && <em>« {g.proposal!.reason} »</em>}
              {refused && <span className="muted small">Ajuste ton essai et propose-le à nouveau si tu veux.</span>}
            </div>
            <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={() => onWithdraw(g.id)}>
              {refused ? "Effacer" : "Retirer"}
            </button>
          </div>
        );
      })}
    </>
  );
}

function ProposeForm({
  entry,
  groups,
  busy,
  onCancel,
  onSend,
}: {
  entry: VaultEntry;
  groups: VaultGroup[];
  busy: boolean;
  onCancel: () => void;
  onSend: (groupId: string, message: string) => void;
}) {
  const s = entry.record.state;
  const blocker = proposalBlocker(s);
  const choices = groups.filter((g) => !g.hasCharacter);
  const [groupId, setGroupId] = useState(choices[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const replacing = groups.find((g) => g.id === groupId)?.proposal;

  return (
    <form
      className="vault-propose"
      onSubmit={(e) => {
        e.preventDefault();
        if (groupId) onSend(groupId, message);
      }}
    >
      <strong>Proposer {s.name} à ton MJ</strong>
      <p className="muted small">
        Pour remplacer un personnage tombé, ou rejoindre un groupe où tu n&apos;as pas encore de personnage. Ton MJ voit la fiche et accepte ou
        refuse. Règles de campagne : pas de valeurs libres, et les PV des niveaux au-delà du 1er sont recalculés à la moyenne (dans le coffre, on peut
        relancer).
      </p>
      {blocker ? (
        <p className="flash flash-error">{blocker}</p>
      ) : choices.length === 0 ? (
        <p className="flash flash-error">Tu as déjà un personnage dans chacun de tes groupes. Une proposition sert quand ton personnage est mort ou absent.</p>
      ) : (
        <>
          <label className="field">
            <span className="label">Pour le groupe</span>
            <select className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              {choices.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          {replacing && <p className="muted small">Cette proposition remplacera « {replacing.name} » pour ce groupe.</p>}
          <label className="field">
            <span className="label">Un mot pour ton MJ (facultatif)</span>
            <textarea className="input textarea" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} placeholder="Ex. Le frère cadet de Brunhilde, venu la venger." />
          </label>
        </>
      )}
      <div className="pl-actions">
        {!blocker && choices.length > 0 && (
          <button className="btn btn-small" disabled={busy || !groupId}>
            Envoyer la proposition
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-small" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </form>
  );
}
