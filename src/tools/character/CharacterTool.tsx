"use client";
// Outil « Fiche de personnage » : une fiche par joueur et par groupe de jeu.
// Joueur : un onglet par groupe (création, fiche, montée de niveau). MJ : les fiches de chaque groupe.

import { useEffect, useState, useTransition, type ReactNode } from "react";
import type { ToolPlayer } from "../registry";
import Link from "next/link";
import { withdrawProposalAction } from "../vault/actions";
import {
  acceptProposalAction,
  clearPreparedAction,
  createCharacterAction,
  declareDeathAction,
  foundryTodoAction,
  grantGroupLevelAction,
  prepareLevelUpAction,
  refuseProposalAction,
  resolveConceptAction,
  rollAbilityScoresAction,
  saveConceptAction,
  withdrawConceptAction,
  deleteCharacterAction,
  getCharacterViewAction,
  grantLevelAction,
  levelUpAction,
  saveCharacterAction,
  type ActionResult,
  type AdminEntry,
  type ConceptData,
  type CharacterView,
  type MyProposal,
  type PendingProposal,
} from "./actions";
import CreationWizard from "./components/CreationWizard";
import { CLASSES } from "./data/classes";
import { SPECIES } from "./data/origins";
import LevelUpWizard from "./components/LevelUpWizard";
import Sheet from "./components/Sheet";
import { shortLabel, type CreationInput } from "./rules";
import { MAX_LEVEL, type Answers, type CharacterRecord } from "./types";

type Run = (p: Promise<ActionResult>) => Promise<ActionResult | null>;

/** Retire une proposition depuis la fiche : action du coffre, puis on recharge la vue des fiches. */
async function withdrawFromCharacter(groupId: string): Promise<ActionResult> {
  const r = await withdrawProposalAction(groupId);
  if (!r.ok) return r;
  return { ok: true, view: await getCharacterViewAction() };
}

export default function CharacterTool({ player }: { player: ToolPlayer }) {
  const [view, setView] = useState<CharacterView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [levelUpFor, setLevelUpFor] = useState<string | null>(null);
  const [prepareFor, setPrepareFor] = useState<string | null>(null);
  // Lien du tableau de bord : /outils/personnage?groupe=<id>&levelup=<idFiche>
  const [initial, setInitial] = useState<{ group: string | null; levelUp: string | null }>({ group: null, levelUp: null });
  const [groupTab, setGroupTab] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    // Seulement si le lien en contient : un 2e passage de l'effet (mode strict) ne doit pas effacer la cible.
    if (q.has("levelup") || q.has("groupe")) {
      setInitial({ group: q.get("groupe"), levelUp: q.get("levelup") });
      window.history.replaceState(null, "", window.location.pathname);
    }
    getCharacterViewAction()
      .then(setView)
      .catch(() => setError("Impossible de charger les fiches."));
  }, []);

  useEffect(() => {
    if (!view || view.isAdmin) return;
    if (initial.group && view.mine.some((m) => m.group.id === initial.group)) setGroupTab(initial.group);
    const target = view.mine.find((m) => m.record?.id === initial.levelUp)?.record;
    if (target && target.grantedLevel > target.state.level) {
      setGroupTab(target.groupId);
      setLevelUpFor(target.id);
    }
    if (initial.group || initial.levelUp) setInitial({ group: null, levelUp: null });
  }, [view, initial]);

  const run: Run = (p) =>
    new Promise((resolve) => {
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

  if (!view) {
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

  /** Fiche + assistant de montée de niveau (et préparation du niveau suivant). */
  const sheetFor = (record: CharacterRecord) => {
    const canLevelUp = record.grantedLevel > record.state.level;
    return (
      <>
        {/* Le MJ ne voit pas ces aides : elles concernent la fiche Foundry du joueur. */}
        {!view.isAdmin && record.foundryTodo && <FoundryTodoCard key={`${record.id}-${record.foundryTodo.level}`} record={record} busy={busy} run={run} />}
        {!view.isAdmin && !canLevelUp && record.state.level < MAX_LEVEL && (
          <PrepareCard record={record} busy={busy} onOpen={() => setPrepareFor(record.id)} onClear={() => run(clearPreparedAction(record.id))} />
        )}
        <Sheet
          key={record.id}
          record={record}
          editable
          canLevelUp={canLevelUp}
          onLevelUp={() => setLevelUpFor(record.id)}
          onSave={async (patch) => Boolean((await run(saveCharacterAction(record.id, patch)))?.ok)}
        />
        {/* Reste ouvert après la validation pour afficher l'écran final (la fiche est déjà au nouveau niveau). */}
        {levelUpFor === record.id && (
          <LevelUpWizard
            state={record.state}
            busy={busy}
            initial={record.prepared}
            onClose={() => setLevelUpFor(null)}
            onConfirm={async (answers: Answers, hpMode) => {
              const r = await run(levelUpAction(record.id, answers, hpMode));
              return r?.ok && r.levelUp ? r.levelUp : null;
            }}
          />
        )}
        {prepareFor === record.id && (
          <LevelUpWizard
            mode="prepare"
            state={record.state}
            busy={busy}
            initial={record.prepared}
            onClose={() => setPrepareFor(null)}
            onPrepare={async (answers: Answers, hpMode) => Boolean((await run(prepareLevelUpAction(record.id, answers, hpMode)))?.ok)}
          />
        )}
      </>
    );
  };

  if (view.isAdmin) return <AdminPanel view={view} busy={busy} run={run} errorBox={errorBox} sheetFor={sheetFor} />;

  // Joueur : un onglet par groupe.
  const current = view.mine.find((m) => m.group.id === groupTab) ?? view.mine[0];
  if (!current) return <p className="muted">Tu ne fais partie d&apos;aucun groupe pour l&apos;instant.</p>;
  const record = current.record;

  return (
    <div className="cs-root stack-lg">
      {view.mine.length > 1 && (
        <nav className="cs-group-tabs" role="tablist" aria-label="Mes groupes">
          {view.mine.map((m) => (
            <button
              key={m.group.id}
              type="button"
              role="tab"
              aria-selected={m.group.id === current.group.id}
              className={`cs-group-tab${m.group.id === current.group.id ? " on" : ""}`}
              onClick={() => setGroupTab(m.group.id)}
            >
              <span className="cs-group-tab-name">👥 {m.group.name}</span>
              <span className="muted small">{m.record ? `${m.record.state.name} · niv. ${m.record.state.level}` : "Pas encore de personnage"}</span>
              {m.record && m.record.grantedLevel > m.record.state.level && <span className="cs-tab-glow" aria-label="Montée de niveau disponible" />}
            </button>
          ))}
        </nav>
      )}
      {errorBox}

      <div key={current.group.id} className="stack-lg cs-group-panel">
        {record ? (
          <>
            {record.grantedLevel > record.state.level && (
              <div className="cs-levelup-banner">
                <span className="cs-levelup-glow" aria-hidden="true">
                  ✦
                </span>
                <div className="stack-xs">
                  <strong>Ton MJ t&apos;a accordé le niveau {record.state.level + 1} !</strong>
                  <span className="muted small">
                    {record.prepared
                      ? "Tes choix sont déjà prêts : vérifie le récapitulatif et valide."
                      : "L'assistant te guide pas à pas : nouvelles capacités, points de vie et choix."}
                  </span>
                </div>
                <button type="button" className="btn levelup-btn" onClick={() => setLevelUpFor(record.id)}>
                  Monter de niveau
                </button>
              </div>
            )}
            {sheetFor(record)}
          </>
        ) : (
          <>
            {current.fallen.map((f) => (
              <div key={f.diedAt} className="cs-dead-banner">
                <span aria-hidden="true">🪦</span>
                <div className="stack-xs">
                  <strong>{f.name} repose désormais au cimetière.</strong>
                  {f.epitaph && <em>« {f.epitaph} »</em>}
                  <span className="muted small">Tu peux créer un nouveau personnage pour continuer l&apos;aventure.</span>
                </div>
              </div>
            )).slice(0, 1)}
            {current.proposal && <ProposalBanner proposal={current.proposal} busy={busy} onWithdraw={() => run(withdrawFromCharacter(current.group.id))} />}
            <div className="cs-welcome">
              <p className="eyebrow">
                Bienvenue, {player.name}
                {view.mine.length > 1 && ` · ${current.group.name}`}
              </p>
              <p className="muted">
                Créons ta fiche de personnage pour Donjons &amp; Dragons (règles 2024)
                {view.mine.length > 1 ? ` pour le groupe « ${current.group.name} »` : ""}. Chaque étape est expliquée : tu peux cliquer sur les « ? » à
                tout moment.
              </p>
              <p className="muted small">
                Tu préfères expérimenter d&apos;abord ? Prépare-le dans ton{" "}
                <Link href="/outils/coffre" className="text-link">
                  Coffre
                </Link>{" "}
                puis propose-le à ton MJ.
              </p>
            </div>
            <NewCharacter
              key={current.group.id}
              concept={current.concept}
              busy={busy}
              onCreate={async (input: CreationInput) => Boolean((await run(createCharacterAction(input, current.group.id)))?.ok)}
              onSendConcept={async (c) => Boolean((await run(saveConceptAction(current.group.id, c)))?.ok)}
              onWithdrawConcept={() => run(withdrawConceptAction(current.group.id))}
            />
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Vue du MJ ---------- */

type Selection =
  | { kind: "sheet"; characterId: string }
  | { kind: "create"; ownerId: string; ownerName: string; groupId: string; groupName: string; initial?: { classId: string | null; speciesId: string | null } }
  | { kind: "concept"; concept: ConceptData; ownerId: string; ownerName: string; groupId: string; groupName: string }
  | { kind: "proposal"; proposalId: string }
  | null;

function AdminPanel({
  view,
  busy,
  run,
  errorBox,
  sheetFor,
}: {
  view: CharacterView;
  busy: boolean;
  run: Run;
  errorBox: ReactNode;
  sheetFor: (record: CharacterRecord) => ReactNode;
}) {
  const firstSheet = view.groups.flatMap((g) => g.members).find((m) => m.entry)?.entry?.record.id;
  const [sel, setSel] = useState<Selection>(firstSheet ? { kind: "sheet", characterId: firstSheet } : null);
  const [snapshotLevel, setSnapshotLevel] = useState<number | null>(null);
  const [deathOpen, setDeathOpen] = useState(false);
  const [epitaph, setEpitaph] = useState("");

  const allEntries: AdminEntry[] = [...view.groups.flatMap((g) => g.members.flatMap((m) => (m.entry ? [m.entry] : []))), ...view.archived];
  const selected = sel?.kind === "sheet" ? allEntries.find((e) => e.record.id === sel.characterId) : undefined;
  const isArchived = Boolean(selected && view.archived.some((a) => a.record.id === selected.record.id));
  const pick = (id: string) => (setSel({ kind: "sheet", characterId: id }), setSnapshotLevel(null), setDeathOpen(false));

  const proposals = view.groups.flatMap((g) => g.members.flatMap((m) => (m.proposal ? [{ ...m.proposal, ownerId: m.id, ownerName: m.name, groupId: g.id, groupName: g.name }] : [])));
  const openProposal = sel?.kind === "proposal" ? proposals.find((p) => p.id === sel.proposalId) : undefined;
  if (openProposal) {
    return (
      <div className="cs-root stack-lg">
        {errorBox}
        <ProposalReview
          proposal={openProposal}
          busy={busy}
          onBack={() => setSel(null)}
          onAccept={async () => {
            const r = await run(acceptProposalAction(openProposal.id));
            if (r?.ok) {
              const created = r.view.groups.find((g) => g.id === openProposal.groupId)?.members.find((m) => m.id === openProposal.ownerId)?.entry;
              setSel(created ? { kind: "sheet", characterId: created.record.id } : null);
            }
          }}
          onRefuse={async (reason) => {
            const r = await run(refuseProposalAction(openProposal.id, reason));
            if (r?.ok) setSel(null);
          }}
        />
      </div>
    );
  }

  if (sel?.kind === "create") {
    return (
      <div className="cs-root stack-lg">
        {errorBox}
        <CreationWizard
          forName={`${sel.ownerName} (${sel.groupName})`}
          busy={busy}
          initial={sel.initial}
          onRollScores={() => rollAbilityScoresAction()}
          onCancel={() => setSel(null)}
          onCreate={async (input) => {
            const r = await run(createCharacterAction(input, sel.groupId, sel.ownerId));
            if (r?.ok) {
              const created = r.view.groups.find((g) => g.id === sel.groupId)?.members.find((m) => m.id === sel.ownerId)?.entry;
              setSel(created ? { kind: "sheet", characterId: created.record.id } : null);
            }
            return Boolean(r?.ok);
          }}
        />
      </div>
    );
  }

  if (sel?.kind === "concept") {
    const c = sel.concept;
    return (
      <div className="cs-root stack-lg">
        {errorBox}
        <article className="cs-concept-review stack">
          <div className="stack-xs">
            <p className="eyebrow">Concept de personnage · {sel.groupName}</p>
            <h1 className="title">{sel.ownerName} a une idée</h1>
            <span className="muted small">
              Envoyé le {new Date(c.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
              {c.updatedAt !== c.createdAt ? ` · modifié le ${new Date(c.updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` : ""}
            </span>
          </div>
          <div className="chips">
            <span className="chip">Espèce : {c.speciesName ?? "à définir"}</span>
            <span className="chip">Classe : {c.className ?? "à définir"}</span>
          </div>
          <blockquote className="cs-concept-text">{c.text}</blockquote>
          <div className="pl-actions">
            <button
              type="button"
              className="btn"
              onClick={() => setSel({ kind: "create", ownerId: sel.ownerId, ownerName: sel.ownerName, groupId: sel.groupId, groupName: sel.groupName, initial: { classId: c.classId, speciesId: c.speciesId } })}
            >
              Créer la fiche pour {sel.ownerName}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={async () => {
                const r = await run(resolveConceptAction(c.id));
                if (r?.ok) setSel(null);
              }}
            >
              Marquer comme traité
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setSel(null)}>
              Retour
            </button>
          </div>
          <p className="muted small">
            « Créer la fiche » ouvre l&apos;assistant avec l&apos;espèce et la classe proposées. Le concept est marqué comme traité dès que la fiche du joueur
            existe dans ce groupe.
          </p>
        </article>
      </div>
    );
  }

  /** `archivedLabel` : fiche hors groupe (lecture seule, pas de montée de niveau). */
  /** `chip` : pastille fournie par le serveur (fiche d'un autre type). */
  const rosterItem = (key: string, name: string, entry: AdminEntry | null, onCreate?: () => void, archivedLabel?: string, proposal?: PendingProposal | null, chip?: string, onConcept?: () => void) => {
    const r = entry?.record;
    const pending = r && r.grantedLevel > r.state.level;
    // Fiche venue d'un autre outil : son niveau ne s'accorde pas ici.
    const live = r && archivedLabel === undefined && !r.state.extra;
    return (
      <li key={key} className={`cs-roster-item${r && selected?.record.id === r.id ? " on" : ""}`}>
        <button type="button" className="cs-roster-main" onClick={() => r && pick(r.id)} disabled={!r}>
          <span className="avatar avatar-lg" aria-hidden="true">
            {(r?.state.name || name).charAt(0).toUpperCase()}
          </span>
          <span className="stack-xs">
            <strong>{r ? r.state.name : name}</strong>
            <span className="muted small">
              {r
                ? `${name} · ${shortLabel(r.state)}${!archivedLabel && r.state.scoreRolls && r.state.scoreRolls > 1 ? ` · ${r.state.scoreRolls - 1} relance${r.state.scoreRolls > 2 ? "s" : ""} des caractéristiques` : ""}`
                : proposal
                  ? `Propose ${proposal.state.name} (${shortLabel(proposal.state)})`
                  : onConcept
                    ? "A envoyé un concept de personnage"
                    : "Pas encore de fiche"}
            </span>
            {archivedLabel && <span className="muted small">{archivedLabel}</span>}
          </span>
        </button>
        <div className="cs-roster-actions">
          {chip && <span className="chip chip-violet">{chip}</span>}
          {!r && onConcept && (
            <button type="button" className="btn btn-small" onClick={onConcept}>
              💡 Lire le concept
            </button>
          )}
          {!r && proposal && (
            <button type="button" className="btn btn-small" onClick={() => setSel({ kind: "proposal", proposalId: proposal.id })}>
              🗝️ Examiner la proposition
            </button>
          )}
          {!r && onCreate && (
            <button type="button" className="btn btn-ghost btn-small" onClick={onCreate}>
              Créer pour {name}
            </button>
          )}
          {live && r.prepared && <span className="chip chip-ok">Choix du niv. {r.prepared.level} prêts</span>}
          {live && pending && (
            <>
              <span className="chip chip-accent">Niveau {r.grantedLevel} accordé</span>
              <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={() => run(grantLevelAction(r.id, r.state.level))}>
                Annuler
              </button>
            </>
          )}
          {live && !pending && r.state.level < MAX_LEVEL && (
            <button type="button" className="btn btn-small" disabled={busy} onClick={() => run(grantLevelAction(r.id, r.state.level + 1))}>
              Accorder le niveau {r.state.level + 1}
            </button>
          )}
          {live && !pending && r.state.level >= MAX_LEVEL && <span className="chip">Niveau max ({MAX_LEVEL})</span>}
        </div>
      </li>
    );
  };

  const snapshot = selected?.snapshots.find((s) => s.level === snapshotLevel);

  return (
    <div className="cs-root stack-lg">
      <header className="stack-xs">
        <p className="eyebrow">Maître du jeu</p>
        <h1 className="title">Fiches des personnages</h1>
        <p className="muted">
          Chaque joueur a une fiche par groupe. Accorde un niveau : un bouton « Monter de niveau » s&apos;allume sur son tableau de bord. Une copie de chaque
          fiche est gardée à chaque niveau.
        </p>
      </header>
      {errorBox}

      {view.groups.length === 0 && <p className="flash flash-error">Aucun groupe de jeu : crée un groupe et ajoutes-y des joueurs dans l&apos;administration.</p>}

      {view.groups.map((g) => {
        // Personnages qui recevraient un niveau avec le bouton « tout le groupe ».
        const eligible = g.members.flatMap((m) => {
          const r = m.entry?.record;
          return r && !r.state.extra && r.state.level < MAX_LEVEL && r.grantedLevel <= r.state.level ? [r] : [];
        });
        return (
        <section key={g.id} className="stack">
          <div className="cs-row-between">
            <h2 className="subtitle">👥 {g.name}</h2>
            {eligible.length > 0 && (
              <button
                type="button"
                className="btn btn-small cs-group-levelup"
                disabled={busy}
                onClick={() => {
                  const names = eligible.map((r) => `• ${r.state.name} → niveau ${r.state.level + 1}`).join("\n");
                  if (confirm(`Accorder un niveau à tout le groupe « ${g.name} » ?\n\n${names}`)) void run(grantGroupLevelAction(g.id));
                }}
              >
                ✦ Un niveau pour tout le groupe ({eligible.length})
              </button>
            )}
          </div>
          {g.members.length === 0 ? (
            <p className="muted small">Aucun joueur dans ce groupe.</p>
          ) : (
            <ul className="cs-roster">
              {g.members.map((m) =>
                m.other && !m.entry ? (
                  // Fiche d'un autre type (textes fournis par le serveur) : rien à créer ni à accorder ici.
                  <li key={`${g.id}-${m.id}`} className="cs-roster-item">
                    <span className="cs-roster-main">
                      <span className="avatar avatar-lg" aria-hidden="true">
                        {m.other.title.charAt(0).toUpperCase()}
                      </span>
                      <span className="stack-xs">
                        <strong>{m.other.title}</strong>
                        <span className="muted small">{m.other.sub}</span>
                      </span>
                    </span>
                    <div className="cs-roster-actions">
                      <span className="chip chip-violet">{m.other.chip}</span>
                    </div>
                  </li>
                ) : rosterItem(
                  `${g.id}-${m.id}`,
                  m.name,
                  m.entry,
                  m.other ? undefined : () => setSel({ kind: "create", ownerId: m.id, ownerName: m.name, groupId: g.id, groupName: g.name }),
                  undefined,
                  m.proposal,
                  m.other?.chip,
                  m.concept ? () => setSel({ kind: "concept", concept: m.concept!, ownerId: m.id, ownerName: m.name, groupId: g.id, groupName: g.name }) : undefined,
                ),
              )}
            </ul>
          )}
        </section>
        );
      })}

      {view.archived.length > 0 && (
        <details className="pl-archive">
          <summary className="subtitle">Fiches archivées ({view.archived.length})</summary>
          <p className="muted small">
            Personnages morts, fiches dont le groupe a été supprimé ou dont le joueur a quitté le groupe. Le joueur ne peut plus les modifier.
          </p>
          <ul className="cs-roster">
            {view.archived.map((a) =>
              rosterItem(
                a.record.id,
                a.record.ownerName,
                a,
                undefined,
                a.dead ? `🪦 Mort${a.groupName ? ` · ${a.groupName}` : ""}` : a.groupName ? `Ancien groupe : ${a.groupName}` : "Sans groupe",
              ),
            )}
          </ul>
        </details>
      )}

      {selected && (
        <section className="stack">
          <div className="cs-row-between">
            <div className="segmented-tabs" role="tablist" aria-label="Version de la fiche">
              <button type="button" role="tab" aria-selected={snapshotLevel === null} className={snapshotLevel === null ? "on" : ""} onClick={() => setSnapshotLevel(null)}>
                Fiche actuelle
              </button>
              {selected.snapshots.map((s) => (
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
                  const st = snapshot?.state ?? selected.record.state;
                  const url = URL.createObjectURL(new Blob([JSON.stringify(st, null, 2)], { type: "application/json" }));
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${(st.name || "personnage").replace(/[^\p{L}\p{N}-]+/gu, "-")}-niv${st.level}.json`;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                Télécharger (JSON)
              </button>
              {!isArchived && (
                <button type="button" className="btn btn-ghost btn-small cs-death-btn" onClick={() => setDeathOpen((o) => !o)} aria-expanded={deathOpen}>
                  🪦 Déclarer mort
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-small pl-delete"
                disabled={busy}
                onClick={() => {
                  if (confirm(`Supprimer la fiche de ${selected.record.state.name} et toutes ses copies ? Irréversible.`)) {
                    void run(deleteCharacterAction(selected.record.id));
                    setSel(null);
                  }
                }}
              >
                Supprimer la fiche
              </button>
            </div>
          </div>

          {deathOpen && !isArchived && (
            <form
              className="cs-death-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const r = await run(declareDeathAction(selected.record.id, epitaph));
                if (r?.ok) {
                  setDeathOpen(false);
                  setEpitaph("");
                }
              }}
            >
              <strong>{selected.record.state.name} tombe au combat ?</strong>
              <p className="muted small">
                Le personnage rejoint le cimetière du groupe et sa fiche devient inutilisable pour {selected.record.ownerName}, qui pourra en créer un nouveau.
              </p>
              <label className="field">
                <span className="label">Épitaphe (facultative, modifiable ensuite dans le cimetière)</span>
                <input className="input" value={epitaph} onChange={(e) => setEpitaph(e.target.value)} maxLength={300} placeholder="Ex. Il a ouvert la mauvaise porte." autoFocus />
              </label>
              <div className="pl-actions">
                <button className="btn btn-danger btn-small" disabled={busy}>
                  Confirmer la mort
                </button>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => setDeathOpen(false)}>
                  Annuler
                </button>
              </div>
            </form>
          )}

          {snapshot || isArchived ? (
            <>
              <p className="muted small">
                {snapshot
                  ? `Copie en lecture seule, enregistrée le ${new Date(snapshot.at).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}.`
                  : selected.dead
                    ? "Personnage mort, fiche en lecture seule."
                    : "Fiche archivée, en lecture seule."}
              </p>
              <Sheet
                key={`ro-${selected.record.id}-${snapshot?.level ?? "now"}`}
                record={snapshot ? { ...selected.record, state: snapshot.state } : selected.record}
                editable={false}
                canLevelUp={false}
                dead={snapshot ? undefined : selected.dead}
                onSave={async () => false}
              />
            </>
          ) : (
            sheetFor(selected.record)
          )}
        </section>
      )}
    </div>
  );
}

/* ---------- Préparer le prochain niveau ---------- */

function PrepareCard({ record, busy, onOpen, onClear }: { record: CharacterRecord; busy: boolean; onOpen: () => void; onClear: () => void }) {
  const next = record.state.level + 1;
  const ready = Boolean(record.prepared);
  return (
    <div className={`cs-prepare${ready ? " ready" : ""}`}>
      <span className="cs-prepare-badge" aria-hidden="true">
        {ready ? "✓" : next}
      </span>
      <div className="stack-xs">
        <strong>{ready ? `Choix du niveau ${next} prêts` : `Prochain niveau : ${next}`}</strong>
        <span className="muted small">
          {ready
            ? "Le jour où ton MJ t'accorde le niveau, il suffira de valider."
            : "Fais tes choix dès maintenant (sous-classe, amélioration, sorts…). Ils seront appliqués d'un clic quand ton MJ t'accordera le niveau."}
        </span>
      </div>
      <div className="pl-actions">
        <button type="button" className={`btn btn-small${ready ? " btn-ghost" : ""}`} onClick={onOpen} disabled={busy}>
          {ready ? "Modifier" : "Préparer"}
        </button>
        {ready && (
          <button type="button" className="link-btn small" onClick={onClear} disabled={busy}>
            Effacer
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- À reporter dans Foundry ---------- */

function FoundryTodoCard({ record, busy, run }: { record: CharacterRecord; busy: boolean; run: Run }) {
  const todo = record.foundryTodo!;
  // Cases cochées tout de suite à l'écran, puis enregistrées.
  const [done, setDone] = useState(() => todo.items.map((i) => i.done));
  const count = done.filter(Boolean).length;
  const all = count === todo.items.length;
  const toggle = (i: number) => {
    const next = done.map((d, j) => (j === i ? !d : d));
    setDone(next);
    void run(foundryTodoAction(record.id, next));
  };
  return (
    <section className={`cs-foundry${all ? " all" : ""}`} aria-label="À reporter dans Foundry">
      <header className="cs-row-between">
        <div className="stack-xs">
          <strong>🧭 À reporter dans Foundry · niveau {todo.level}</strong>
          <span className="muted small">
            Ta fiche est à jour ici. Refais ces étapes sur ta fiche Foundry avant la prochaine session ({count}/{todo.items.length}).
          </span>
        </div>
        <span className="cs-foundry-bar" aria-hidden="true">
          <i style={{ width: `${(count / todo.items.length) * 100}%` }} />
        </span>
      </header>
      <ul className="cs-foundry-list">
        {todo.items.map((it, i) => (
          <li key={i}>
            <label className={`check${done[i] ? " done" : ""}`}>
              <input type="checkbox" checked={done[i]} onChange={() => toggle(i)} />
              <span>{it.text}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="pl-actions">
        <button type="button" className={`btn btn-small${all ? "" : " btn-ghost"}`} disabled={busy} onClick={() => run(foundryTodoAction(record.id, null))}>
          {all ? "C'est tout bon, retirer la liste" : "Masquer la liste"}
        </button>
      </div>
    </section>
  );
}

/* ---------- Propositions venues du coffre ---------- */

function ProposalBanner({ proposal, busy, onWithdraw }: { proposal: MyProposal; busy: boolean; onWithdraw: () => void }) {
  const refused = proposal.status === "refused";
  return (
    <div className={`cs-proposal${refused ? " refused" : ""}`}>
      <span aria-hidden="true">🗝️</span>
      <div className="stack-xs">
        <strong>
          {refused ? `Ton MJ n'a pas retenu ${proposal.name}.` : `Tu as proposé ${proposal.name} (${proposal.label}) à ton MJ.`}
        </strong>
        {refused && proposal.reason && <em>« {proposal.reason} »</em>}
        <span className="muted small">
          {refused ? "Tu peux modifier ton essai dans le Coffre et le proposer à nouveau, ou créer un personnage ici." : "En attente de sa réponse : elle s'affichera ici."}
        </span>
      </div>
      <button type="button" className="btn btn-ghost btn-small" onClick={onWithdraw} disabled={busy}>
        {refused ? "Effacer" : "Retirer"}
      </button>
    </div>
  );
}

function ProposalReview({
  proposal,
  busy,
  onBack,
  onAccept,
  onRefuse,
}: {
  proposal: PendingProposal & { ownerName: string; groupName: string };
  busy: boolean;
  onBack: () => void;
  onAccept: () => void;
  onRefuse: (reason: string) => void;
}) {
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState("");
  const s = proposal.state;
  return (
    <section className="stack-lg">
      <div>
        <button type="button" className="btn btn-ghost btn-small" onClick={onBack}>
          ← Retour aux fiches
        </button>
      </div>
      <div className="cs-proposal-review">
        <div className="stack-xs">
          <p className="eyebrow">Proposition venue du coffre · {proposal.groupName}</p>
          <h1 className="title">
            {s.name} <span className="muted">· {proposal.ownerName}</span>
          </h1>
          <p className="muted">
            {shortLabel(s)}. Les règles de campagne ont été vérifiées (pas de valeurs libres) et les PV des niveaux au-delà du 1er sont à la moyenne. En
            acceptant, ce personnage devient la fiche de {proposal.ownerName} dans ce groupe, au niveau {s.level}.
          </p>
          {proposal.message && <blockquote className="cs-proposal-msg">« {proposal.message} »</blockquote>}
        </div>
        {refusing ? (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              onRefuse(reason);
            }}
          >
            <label className="field">
              <span className="label">Un mot pour {proposal.ownerName} (facultatif)</span>
              <textarea className="input textarea" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} autoFocus placeholder="Ex. Plutôt un lanceur de sorts pour équilibrer le groupe ?" />
            </label>
            <div className="pl-actions">
              <button className="btn btn-danger btn-small" disabled={busy}>
                Refuser
              </button>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => setRefusing(false)}>
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <div className="pl-actions">
            <button type="button" className="btn" disabled={busy} onClick={onAccept}>
              ✓ Accepter {s.name}
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setRefusing(true)}>
              Refuser…
            </button>
          </div>
        )}
      </div>
      <Sheet
        key={`proposal-${proposal.id}`}
        record={{ id: proposal.id, ownerId: "", groupId: null, ownerName: proposal.ownerName, state: s, grantedLevel: s.level, updatedAt: proposal.createdAt }}
        editable={false}
        canLevelUp={false}
        onSave={async () => false}
      />
    </section>
  );
}

/* ---------- Joueur : nouveau personnage (création classique ou concept) ---------- */

function NewCharacter({
  concept,
  busy,
  onCreate,
  onSendConcept,
  onWithdrawConcept,
}: {
  concept: ConceptData | null;
  busy: boolean;
  onCreate: (input: CreationInput) => Promise<boolean>;
  onSendConcept: (c: { speciesId: string | null; classId: string | null; text: string }) => Promise<boolean>;
  onWithdrawConcept: () => void;
}) {
  const [mode, setMode] = useState<"choose" | "classic" | "concept">("choose");

  if (mode === "classic") {
    return (
      <div className="stack">
        <div>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => setMode("choose")}>
            ← Changer de méthode
          </button>
        </div>
        <CreationWizard busy={busy} onCreate={onCreate} onRollScores={() => rollAbilityScoresAction()} />
      </div>
    );
  }

  if (mode === "concept") {
    return (
      <ConceptForm
        initial={concept}
        busy={busy}
        onCancel={() => setMode("choose")}
        onSend={async (c) => {
          const ok = await onSendConcept(c);
          if (ok) setMode("choose");
          return ok;
        }}
      />
    );
  }

  return (
    <div className="stack-lg">
      {concept && (
        <div className="cs-concept-banner">
          <span className="cs-concept-icon" aria-hidden="true">
            💡
          </span>
          <div className="stack-xs cs-concept-grow">
            <strong>Ton concept attend ton MJ.</strong>
            <span className="muted small">
              {[concept.speciesName, concept.className].filter(Boolean).join(" · ") || "Espèce et classe à définir"} · « {concept.text.length > 140 ? `${concept.text.slice(0, 140)}…` : concept.text} »
            </span>
          </div>
          <div className="pl-actions">
            <button type="button" className="btn btn-ghost btn-small" onClick={() => setMode("concept")}>
              Modifier
            </button>
            <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={onWithdrawConcept}>
              Retirer
            </button>
          </div>
        </div>
      )}
      <div className="cs-start-grid">
        <button type="button" className="cs-start-card" onClick={() => setMode("classic")}>
          <span className="cs-start-icon" aria-hidden="true">
            🛡️
          </span>
          <strong>Création classique</strong>
          <span className="muted">L&apos;assistant te guide pas à pas : classe, espèce, historique, caractéristiques tirées aux dés, compétences.</span>
          <span className="text-link">Commencer →</span>
        </button>
        <button type="button" className="cs-start-card" onClick={() => setMode("concept")}>
          <span className="cs-start-icon" aria-hidden="true">
            💡
          </span>
          <strong>J&apos;ai un concept</strong>
          <span className="muted">Tu as une idée de personnage mais pas encore les règles en tête ? Décris-la : ton MJ t&apos;aidera à créer la fiche.</span>
          <span className="text-link">{concept ? "Modifier mon concept →" : "Décrire mon concept →"}</span>
        </button>
      </div>
    </div>
  );
}

function ConceptForm({
  initial,
  busy,
  onCancel,
  onSend,
}: {
  initial: ConceptData | null;
  busy: boolean;
  onCancel: () => void;
  onSend: (c: { speciesId: string | null; classId: string | null; text: string }) => Promise<boolean>;
}) {
  const [speciesId, setSpeciesId] = useState(initial?.speciesId ?? "");
  const [classId, setClassId] = useState(initial?.classId ?? "");
  const [text, setText] = useState(initial?.text ?? "");
  const tooShort = text.trim().length < 10;
  return (
    <form
      className="cs-concept-form stack-lg"
      onSubmit={(e) => {
        e.preventDefault();
        if (!tooShort) void onSend({ speciesId: speciesId || null, classId: classId || null, text });
      }}
    >
      <div className="stack-xs">
        <p className="eyebrow">J&apos;ai un concept</p>
        <h2 className="title">Raconte-nous ton personnage</h2>
        <p className="muted">L&apos;espèce et la classe sont facultatives : laisse « Je ne sais pas encore » si tu hésites. Ton MJ lira ton message et t&apos;aidera à créer la fiche.</p>
      </div>
      <div className="grid-2">
        <label className="field">
          <span className="label">Espèce (facultatif)</span>
          <select className="input" value={speciesId} onChange={(e) => setSpeciesId(e.target.value)}>
            <option value="">Je ne sais pas encore</option>
            {SPECIES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Classe (facultatif)</span>
          <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Je ne sais pas encore</option>
            {CLASSES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span className="label">Ton concept</span>
        <textarea
          className="input cs-concept-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={3000}
          rows={8}
          placeholder="Qui est-il ? D'où vient-il ? Ce qu'il sait faire, ce qu'il cherche, une image qui te plaît… Par exemple : « une ancienne garde du temple qui a perdu la foi et se bat avec un bouclier fendu »."
          required
        />
        <span className="muted small">{text.trim().length < 10 ? "Quelques phrases suffisent." : `${text.length} / 3000`}</span>
      </label>
      <div className="pl-actions">
        <button type="submit" className="btn" disabled={busy || tooShort}>
          {initial ? "Mettre à jour mon concept" : "Envoyer à mon MJ"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Retour
        </button>
      </div>
    </form>
  );
}
