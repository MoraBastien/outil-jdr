"use client";
// Chronique : la frise des séances de chaque groupe, avec résumé et moments marquants.

import { useEffect, useState, useTransition } from "react";
import type { ToolPlayer } from "../registry";
import {
  deleteSessionAction,
  getChronicleAction,
  saveSessionAction,
  type ChronicleGroup,
  type ChronicleResult,
  type ChronicleView,
  type SessionInput,
  type SessionView,
} from "./actions";
import type { DetectedEvent } from "./events";
import QuestSummary from "../quests/QuestSummary";
import { MAX_MOMENTS, MOMENT_KINDS, momentKind } from "./meta";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const fmtDate = (d: string) => {
  const s = dateFmt.format(new Date(`${d}T00:00:00Z`));
  return s.charAt(0).toUpperCase() + s.slice(1);
};

type Run = (p: Promise<ChronicleResult>) => Promise<boolean>;

export default function Chronicle({ player, initial }: { player: ToolPlayer; initial?: ChronicleView }) {
  // Préchargée par la page serveur : la chronique s'affiche dès le HTML.
  const [view, setView] = useState<ChronicleView | null>(initial ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [tab, setTab] = useState<string | null>(null);

  useEffect(() => {
    if (initial) return;
    getChronicleAction()
      .then(setView)
      .catch(() => setError("Impossible d'ouvrir la chronique."));
  }, [initial]);

  const run: Run = (p) =>
    new Promise((resolve) => {
      startTransition(async () => {
        try {
          const r = await p;
          if (r.ok) {
            setView(r.view);
            setError(null);
          } else setError(r.error);
          resolve(r.ok);
        } catch {
          setError("L'action a échoué. Réessaie.");
          resolve(false);
        }
      });
    });

  if (!view) return error ? <p className="flash flash-error">{error}</p> : <p className="muted">On dépoussière les vieux parchemins…</p>;
  if (view.groups.length === 0) return <p className="muted">{view.isAdmin ? "Crée d'abord un groupe de jeu dans l'administration." : "Tu ne fais partie d'aucun groupe."}</p>;

  const current = view.groups.find((g) => g.id === tab) ?? view.groups[0];

  return (
    <div className="stack-lg chr-root">
      <p className="muted">
        {view.isAdmin
          ? "Raconte chaque séance : un résumé et ses moments marquants. Les montées de niveau et les morts sont repérées pour toi."
          : `L'histoire de ${view.groups.length > 1 ? "tes campagnes" : "ta campagne"}, ${player.name}, séance après séance.`}
      </p>
      {view.groups.length > 1 && (
        <nav className="cs-group-tabs" role="tablist" aria-label="Groupes">
          {view.groups.map((g) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={g.id === current.id}
              className={`cs-group-tab${g.id === current.id ? " on" : ""}`}
              onClick={() => setTab(g.id)}
            >
              <span className="cs-group-tab-name">👥 {g.name}</span>
              <span className="muted small">
                {g.sessions.length} séance{g.sessions.length > 1 ? "s" : ""}
              </span>
            </button>
          ))}
        </nav>
      )}
      {error && (
        <p className="flash flash-error" role="alert">
          {error}
        </p>
      )}
      <GroupChronicle key={current.id} group={current} isAdmin={view.isAdmin} busy={busy} run={run} />
    </div>
  );
}

/* ---------- La frise d'un groupe ---------- */

function GroupChronicle({ group, isAdmin, busy, run }: { group: ChronicleGroup; isAdmin: boolean; busy: boolean; run: Run }) {
  // null : rien en cours ; "new" : nouvelle séance ; sinon l'id de la séance modifiée.
  const [editing, setEditing] = useState<string | null>(null);
  const editedSession = group.sessions.find((s) => s.id === editing);
  const [questId, setQuestId] = useState<string | null>(null);
  const openQuest = group.questSummaries.find((q) => q.id === questId);

  return (
    <div className="stack-lg">
      {isAdmin && editing === null && (
        <div className="chr-admin-bar">
          <button type="button" className="btn" onClick={() => setEditing("new")}>
            ＋ Raconter une séance
          </button>
          {group.pending.length > 0 && (
            <span className="chip chip-accent">
              {group.pending.length} événement{group.pending.length > 1 ? "s" : ""} à raconter
            </span>
          )}
        </div>
      )}

      {isAdmin && editing !== null && (
        <SessionEditor
          group={group}
          session={editedSession}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={async (input) => {
            if (await run(saveSessionAction(input))) setEditing(null);
          }}
        />
      )}

      {openQuest && <QuestSummary key={openQuest.id} quest={openQuest} onClose={() => setQuestId(null)} showLink />}

      {group.sessions.length === 0 ? (
        <div className="cem-empty">
          <span aria-hidden="true">📖</span>
          <p className="muted">{isAdmin ? "Aucune séance racontée pour l'instant." : "La première page reste à écrire. Ton MJ la remplira après la séance."}</p>
        </div>
      ) : (
        <ol className="chr-timeline">
          {group.sessions.map((s, i) =>
            s.id === editing ? null : (
              <SessionCard
                key={s.id}
                session={s}
                index={i}
                isAdmin={isAdmin}
                busy={busy}
                onEdit={() => setEditing(s.id)}
                onQuest={setQuestId}
                onDelete={() => {
                  if (confirm(`Supprimer la séance « ${s.title} » de la chronique ?`)) void run(deleteSessionAction(s.id));
                }}
              />
            ),
          )}
        </ol>
      )}
    </div>
  );
}

function SessionCard({
  session: s,
  index,
  isAdmin,
  busy,
  onEdit,
  onDelete,
  onQuest,
}: {
  session: SessionView;
  index: number;
  isAdmin: boolean;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onQuest: (id: string) => void;
}) {
  return (
    <li className={`chr-item${index === 0 ? " latest" : ""}${s.draft ? " draft" : ""}`} style={{ animationDelay: `${Math.min(index, 6) * 70}ms` }}>
      <span className="chr-node" aria-hidden="true">
        {s.number}
      </span>
      <article className="chr-card">
        <header className="chr-head">
          <div className="stack-xs">
            <span className="chr-date">
              Séance {s.number} · {fmtDate(s.date)}
              {s.island && (
                <>
                  {" · "}
                  <span className="chr-isle" style={{ ["--isle-c" as string]: s.island.color }}>
                    {s.island.name}
                  </span>
                </>
              )}
            </span>
            <h3 className="chr-title">{s.title}</h3>
          </div>
          <span className="chips">
            {index === 0 && !s.draft && <span className="chip chip-accent">Dernière séance</span>}
            {s.draft && <span className="chip chip-warn">Brouillon · invisible des joueurs</span>}
          </span>
        </header>
        {s.summary && <p className="chr-summary">{s.summary}</p>}
        {s.quests.length > 0 && (
          <ul className="chr-quests-line">
            {s.quests.map((q) => (
              <li key={`${q.id}-${q.event}`}>
                <button type="button" className={`chr-quest-ev e-${q.event}`} onClick={() => onQuest(q.id)} title="Voir le résumé de la quête">
                  <span aria-hidden="true">{q.event === "start" ? "📜" : q.event === "done" ? "✓" : "✗"}</span>
                  <span className="chr-grow">
                    {q.event === "start" ? "Nouvelle quête : " : q.event === "done" ? "Quête accomplie : " : "Quête échouée : "}
                    <b>{q.title}</b>
                  </span>
                  {q.hidden && <span className="chip chip-warn">🙈 Cachée</span>}
                  <span className="chr-quest-more" aria-hidden="true">
                    Résumé ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {s.moments.length > 0 && (
          <ul className="chr-moments">
            {s.moments.map((m) => {
              const k = momentKind(m.kind);
              return (
                <li key={m.id} className={`chr-moment k-${k.id}${m.mine ? " mine" : ""}`}>
                  <span className="chr-moment-icon" title={k.label} aria-label={k.label}>
                    {k.icon}
                  </span>
                  <span className="stack-xs">
                    <span>{m.text}</span>
                    {m.characters.length > 0 && <span className="muted small">{m.characters.map((c) => c.name).join(", ")}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {isAdmin && (
          <footer className="pl-actions">
            <button type="button" className="btn btn-ghost btn-small" onClick={onEdit} disabled={busy}>
              Modifier
            </button>
            <button type="button" className="btn btn-ghost btn-small pl-delete" onClick={onDelete} disabled={busy}>
              Supprimer
            </button>
          </footer>
        )}
      </article>
    </li>
  );
}

/* ---------- Écrire une séance (MJ) ---------- */

type Row = { key: number; kind: string; text: string; characterIds: string[]; source?: string };

function SessionEditor({
  group,
  session,
  busy,
  onCancel,
  onSave,
}: {
  group: ChronicleGroup;
  session?: SessionView;
  busy: boolean;
  onCancel: () => void;
  onSave: (input: SessionInput) => void;
}) {
  const [date, setDate] = useState(session?.date ?? group.suggestedDate);
  const [title, setTitle] = useState(session?.title ?? "");
  const [summary, setSummary] = useState(session?.summary ?? "");
  const [draft, setDraft] = useState(session?.draft ?? false);
  const [islandId, setIslandId] = useState<string>(session ? (session.island?.id ?? "") : (group.harborId ?? ""));
  const [rows, setRows] = useState<Row[]>(
    () => session?.moments.map((m, i) => ({ key: i, kind: m.kind, text: m.text, characterIds: m.characters.map((c) => c.id), source: m.source })) ?? [],
  );
  const [nextKey, setNextKey] = useState(rows.length + 1);
  const used = new Set(rows.map((r) => r.source).filter(Boolean));
  const pending = group.pending.filter((e) => !used.has(e.source));

  const add = (row: Omit<Row, "key">) => {
    setRows((r) => [...r, { ...row, key: nextKey }]);
    setNextKey((k) => k + 1);
  };
  const update = (key: number, patch: Partial<Row>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const addEvent = (e: DetectedEvent) => add({ kind: e.kind, text: e.text, characterIds: [e.character.id], source: e.source });

  return (
    <form
      className="chr-editor"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ id: session?.id ?? null, groupId: group.id, date, title, summary, draft, islandId: islandId || null, moments: rows.map(({ kind, text, characterIds, source }) => ({ kind, text, characterIds, source })) });
      }}
    >
      <h2 className="subtitle">{session ? `Modifier la séance ${session.number}` : `Nouvelle séance · ${group.name}`}</h2>
      <div className="chr-editor-row">
        <label className="field">
          <span className="label">Date</span>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="field chr-grow">
          <span className="label">Titre</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required placeholder="Ex. La crypte du roi-liche" autoFocus />
        </label>
        {group.islands.length > 0 && (
          <label className="field">
            <span className="label">Escale (île)</span>
            <select className="input" value={islandId} onChange={(e) => setIslandId(e.target.value)}>
              <option value="">Aucune</option>
              {group.islands.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <label className="field">
        <span className="label">Résumé</span>
        <textarea className="input textarea" rows={5} value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={8000} placeholder="Ce qui s'est passé, en quelques lignes…" />
      </label>

      {pending.length > 0 && (
        <div className="chr-pending">
          <span className="label">Événements repérés, pas encore racontés</span>
          <ul>
            {pending.map((e) => (
              <li key={e.source}>
                <span aria-hidden="true">{momentKind(e.kind).icon}</span>
                <span className="chr-grow">{e.text}</span>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => addEvent(e)}>
                  ＋ Ajouter
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="stack">
        <span className="label">Moments marquants</span>
        {rows.length === 0 && <p className="muted small">Aucun pour l&apos;instant. Choisis un type ci-dessous pour en ajouter un.</p>}
        {rows.map((r) => (
          <div key={r.key} className="chr-row">
            <select className="input chr-kind" value={r.kind} onChange={(e) => update(r.key, { kind: e.target.value })} aria-label="Type de moment">
              {MOMENT_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.icon} {k.label}
                </option>
              ))}
            </select>
            <input
              className="input chr-grow"
              value={r.text}
              onChange={(e) => update(r.key, { text: e.target.value })}
              maxLength={300}
              placeholder={PLACEHOLDERS[r.kind] ?? "Ce qui s'est passé"}
              aria-label="Description du moment"
            />
            <button type="button" className="icon-btn danger-text" onClick={() => setRows(rows.filter((x) => x.key !== r.key))} aria-label="Retirer ce moment">
              ×
            </button>
            {group.characters.length > 0 && (
              <div className="chr-who" role="group" aria-label="Personnages concernés">
                {group.characters.map((c) => {
                  const on = r.characterIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`chr-who-chip${on ? " on" : ""}`}
                      aria-pressed={on}
                      title={`${c.owner}${c.dead ? " · mort" : ""}`}
                      onClick={() => update(r.key, { characterIds: on ? r.characterIds.filter((x) => x !== c.id) : [...r.characterIds, c.id] })}
                    >
                      {c.dead && "🪦 "}
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        {rows.length < MAX_MOMENTS && (
          <div className="chr-add" role="group" aria-label="Ajouter un moment">
            {MOMENT_KINDS.map((k) => (
              <button key={k.id} type="button" className="chr-add-btn" onClick={() => add({ kind: k.id, text: "", characterIds: [] })} title={`Ajouter : ${k.label}`}>
                <span aria-hidden="true">{k.icon}</span> {k.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <label className="check">
        <input type="checkbox" checked={draft} onChange={(e) => setDraft(e.target.checked)} />
        <span>Brouillon (invisible des joueurs tant que tu ne le publies pas)</span>
      </label>
      <div className="pl-actions">
        <button className="btn" disabled={busy}>
          {draft ? "Enregistrer le brouillon" : session ? "Enregistrer" : "Publier la séance"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </form>
  );
}

const PLACEHOLDERS: Record<string, string> = {
  boss: "Ex. Victoire contre Vexoth le dragon noir",
  loot: "Ex. L'Épée des Murmures, trouvée dans la crypte",
  levelup: "Ex. Lyra devient Voleuse arcanique",
  death: "Ex. Brunhilde se sacrifie pour sauver le groupe",
  exploit: "Ex. Un 20 naturel pour désamorcer le piège",
  npc: "Ex. Maître Ossian, l'alchimiste aveugle",
  place: "Ex. La cité engloutie d'Ys",
  twist: "Ex. Le commanditaire était le méchant depuis le début",
  quote: "Ex. « J'ouvre la porte. » — célèbres derniers mots",
};

