"use client";
// Outil « Fiche de personnage » : une fiche par joueur et par groupe de jeu.
// Joueur : un onglet par groupe (création, fiche, montée de niveau). MJ : les fiches de chaque groupe.

import { useEffect, useState, useTransition, type ReactNode } from "react";
import type { ToolPlayer } from "../registry";
import {
  createCharacterAction,
  declareDeathAction,
  deleteCharacterAction,
  getCharacterViewAction,
  grantLevelAction,
  levelUpAction,
  saveCharacterAction,
  type ActionResult,
  type AdminEntry,
  type CharacterView,
} from "./actions";
import CreationWizard from "./components/CreationWizard";
import LevelUpWizard from "./components/LevelUpWizard";
import Sheet from "./components/Sheet";
import { shortLabel, type CreationInput } from "./rules";
import { MAX_LEVEL, type Answers, type CharacterRecord } from "./types";

type Run = (p: Promise<ActionResult>) => Promise<ActionResult | null>;

export default function CharacterTool({ player }: { player: ToolPlayer }) {
  const [view, setView] = useState<CharacterView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [levelUpFor, setLevelUpFor] = useState<string | null>(null);
  // Lien du tableau de bord : /outils/personnage?groupe=<id>&levelup=<idFiche>
  const [initial, setInitial] = useState<{ group: string | null; levelUp: string | null }>({ group: null, levelUp: null });
  const [groupTab, setGroupTab] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setInitial({ group: q.get("groupe"), levelUp: q.get("levelup") });
    if (q.has("levelup") || q.has("groupe")) window.history.replaceState(null, "", window.location.pathname);
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

  /** Fiche + assistant de montée de niveau. */
  const sheetFor = (record: CharacterRecord) => {
    const canLevelUp = record.grantedLevel > record.state.level;
    return (
      <>
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
            onClose={() => setLevelUpFor(null)}
            onConfirm={async (answers: Answers, hpMode) => {
              const r = await run(levelUpAction(record.id, answers, hpMode));
              return r?.ok && r.levelUp ? r.levelUp : null;
            }}
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
                  <span className="muted small">L&apos;assistant te guide pas à pas : nouvelles capacités, points de vie et choix.</span>
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
            </div>
            <CreationWizard busy={busy} onCreate={async (input: CreationInput) => Boolean((await run(createCharacterAction(input, current.group.id)))?.ok)} />
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Vue du MJ ---------- */

type Selection = { kind: "sheet"; characterId: string } | { kind: "create"; ownerId: string; ownerName: string; groupId: string; groupName: string } | null;

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

  if (sel?.kind === "create") {
    return (
      <div className="cs-root stack-lg">
        {errorBox}
        <CreationWizard
          forName={`${sel.ownerName} (${sel.groupName})`}
          busy={busy}
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

  /** `archivedLabel` : fiche hors groupe (lecture seule, pas de montée de niveau). */
  const rosterItem = (key: string, name: string, entry: AdminEntry | null, onCreate?: () => void, archivedLabel?: string) => {
    const r = entry?.record;
    const pending = r && r.grantedLevel > r.state.level;
    const live = r && archivedLabel === undefined;
    return (
      <li key={key} className={`cs-roster-item${r && selected?.record.id === r.id ? " on" : ""}`}>
        <button type="button" className="cs-roster-main" onClick={() => r && pick(r.id)} disabled={!r}>
          <span className="avatar avatar-lg" aria-hidden="true">
            {(r?.state.name || name).charAt(0).toUpperCase()}
          </span>
          <span className="stack-xs">
            <strong>{r ? r.state.name : name}</strong>
            <span className="muted small">{r ? `${name} · ${shortLabel(r.state)}` : "Pas encore de fiche"}</span>
            {archivedLabel && <span className="muted small">{archivedLabel}</span>}
          </span>
        </button>
        <div className="cs-roster-actions">
          {!r && onCreate && (
            <button type="button" className="btn btn-ghost btn-small" onClick={onCreate}>
              Créer pour {name}
            </button>
          )}
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

      {view.groups.map((g) => (
        <section key={g.id} className="stack">
          <h2 className="subtitle">👥 {g.name}</h2>
          {g.members.length === 0 ? (
            <p className="muted small">Aucun joueur dans ce groupe.</p>
          ) : (
            <ul className="cs-roster">
              {g.members.map((m) =>
                rosterItem(`${g.id}-${m.id}`, m.name, m.entry, () => setSel({ kind: "create", ownerId: m.id, ownerName: m.name, groupId: g.id, groupName: g.name })),
              )}
            </ul>
          )}
        </section>
      ))}

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
