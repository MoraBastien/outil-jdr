"use client";
// Quêtes : le MJ les écrit (cachées ou visibles) et les fait avancer ; les joueurs consultent leur journal.

import { useEffect, useState, useTransition } from "react";
import type { ToolPlayer } from "../registry";
import {
  deleteQuestAction,
  getQuestsAction,
  saveQuestAction,
  setQuestStatusAction,
  setQuestVisibleAction,
  type QuestGroup,
  type QuestInput,
  type QuestsResult,
  type QuestsView,
  type QuestView,
} from "./actions";
import { QUEST_STATUS, type QuestStatus } from "./meta";
import QuestSummary, { type QuestSummaryData } from "./QuestSummary";

type Run = (p: Promise<QuestsResult>) => Promise<boolean>;

export default function QuestsTool({ player, initial }: { player: ToolPlayer; initial?: QuestsView }) {
  // Données préchargées par la page serveur : l'outil s'affiche dès le HTML, sans aller-retour.
  const [view, setView] = useState<QuestsView | null>(initial ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [tab, setTab] = useState<string | null>(null);

  // Lien du tableau de bord : /outils/quetes?quete=<id> ouvre le résumé de la quête.
  const [peek, setPeek] = useState<string | null>(null);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("quete");
    if (id) {
      setPeek(id);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!initial)
      getQuestsAction()
        .then(setView)
        .catch(() => setError("Impossible d'ouvrir le journal des quêtes."));
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

  if (!view) return error ? <p className="flash flash-error">{error}</p> : <p className="muted">On déroule les parchemins…</p>;
  if (view.groups.length === 0) return <p className="muted">{view.isAdmin ? "Crée d'abord un groupe de jeu dans l'administration." : "Tu ne fais partie d'aucun groupe."}</p>;
  const peekGroup = peek ? view.groups.find((g) => g.quests.some((q) => q.id === peek)) : undefined;
  const current = view.groups.find((g) => g.id === tab) ?? peekGroup ?? view.groups[0];
  const peekQuest = peekGroup?.quests.find((q) => q.id === peek);

  return (
    <div className="stack-lg">
      <p className="muted">
        {view.isAdmin
          ? "Écris tes quêtes à l'avance : une quête cachée n'est visible que de toi. Quand tu la lances, elle devient visible et apparaît dans la frise de la chronique, à la séance choisie."
          : `Le journal de quêtes de ${view.groups.length > 1 ? "tes groupes" : "ton groupe"}, ${player.name}.`}
      </p>
      {view.groups.length > 1 && (
        <nav className="cs-group-tabs" role="tablist" aria-label="Groupes">
          {view.groups.map((g) => (
            <button key={g.id} type="button" role="tab" aria-selected={g.id === current.id} className={`cs-group-tab${g.id === current.id ? " on" : ""}`} onClick={() => setTab(g.id)}>
              <span className="cs-group-tab-name">👥 {g.name}</span>
              <span className="muted small">{g.quests.filter((q) => q.status === "open").length} en cours</span>
            </button>
          ))}
        </nav>
      )}
      {error && (
        <p className="flash flash-error" role="alert">
          {error}
        </p>
      )}
      <GroupQuests key={current.id} group={current} isAdmin={view.isAdmin} busy={busy} run={run} onPeek={setPeek} />
      {peekQuest && <QuestSummary key={peekQuest.id} quest={toSummary(peekQuest)} onClose={() => setPeek(null)} />}
    </div>
  );
}

function GroupQuests({ group, isAdmin, busy, run, onPeek }: { group: QuestGroup; isAdmin: boolean; busy: boolean; run: Run; onPeek: (id: string) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const edited = group.quests.find((q) => q.id === editing);
  const open = group.quests.filter((q) => q.status === "open");
  const todo = group.quests.filter((q) => q.status === "todo");
  const ended = group.quests.filter((q) => q.status === "done" || q.status === "failed");

  const card = (q: QuestView) =>
    q.id === editing ? null : <QuestCard key={q.id} quest={q} group={group} isAdmin={isAdmin} busy={busy} run={run} onEdit={() => setEditing(q.id)} onPeek={() => onPeek(q.id)} />;

  return (
    <div className="stack-lg">
      {isAdmin &&
        (editing === null ? (
          <div>
            <button type="button" className="btn" onClick={() => setEditing("new")}>
              ＋ Écrire une quête
            </button>
          </div>
        ) : (
          <QuestEditor
            group={group}
            quest={edited}
            busy={busy}
            onCancel={() => setEditing(null)}
            onSave={async (input) => {
              if (await run(saveQuestAction(input))) setEditing(null);
            }}
          />
        ))}

      {group.quests.length === 0 && (
        <div className="cem-empty">
          <span aria-hidden="true">📜</span>
          <p className="muted">{isAdmin ? "Aucune quête écrite pour ce groupe." : "Aucune quête connue pour l'instant."}</p>
        </div>
      )}

      {open.length > 0 && (
        <section className="stack">
          <h2 className="pl-section-title">En cours</h2>
          <div className="qt-grid">{open.map(card)}</div>
        </section>
      )}
      {todo.length > 0 && (
        <section className="stack">
          <h2 className="pl-section-title">{isAdmin ? "À venir" : "Rumeurs et pistes"}</h2>
          <div className="qt-grid">{todo.map(card)}</div>
        </section>
      )}
      {ended.length > 0 && (
        <details className="pl-archive">
          <summary className="pl-section-title">Terminées ({ended.length})</summary>
          <div className="qt-grid">{ended.map(card)}</div>
        </details>
      )}
    </div>
  );
}

/* ---------- Une quête ---------- */

/** Transitions proposées au MJ selon le statut. */
const NEXT: Record<QuestStatus, { to: QuestStatus; label: string; session: string | null }[]> = {
  todo: [{ to: "open", label: "▶ Lancer la quête", session: "Elle commence à quelle séance ?" }],
  open: [
    { to: "done", label: "✓ Accomplie", session: "Accomplie à quelle séance ?" },
    { to: "failed", label: "✗ Échouée", session: "Échouée à quelle séance ?" },
    { to: "todo", label: "Remettre à venir", session: null },
  ],
  done: [{ to: "open", label: "Rouvrir", session: null }],
  failed: [{ to: "open", label: "Rouvrir", session: null }],
};

function QuestCard({
  quest: q,
  group,
  isAdmin,
  busy,
  run,
  onEdit,
  onPeek,
}: {
  quest: QuestView;
  group: QuestGroup;
  isAdmin: boolean;
  busy: boolean;
  run: Run;
  onEdit: () => void;
  onPeek: () => void;
}) {
  // Transition en attente du choix de la séance.
  const [pending, setPending] = useState<{ to: QuestStatus; question: string } | null>(null);
  const [sessionId, setSessionId] = useState(group.sessions[0]?.id ?? "");
  const st = QUEST_STATUS[q.status];

  const go = async (to: QuestStatus, sid: string | null) => {
    if (await run(setQuestStatusAction(q.id, to, sid))) setPending(null);
  };

  return (
    <article className={`qt-card s-${q.status}${q.visible ? "" : " hidden"}${q.mine ? " mine" : ""}`}>
      <header className="qt-head">
        <h3 className="qt-title">
          <button type="button" className="qt-title-btn" onClick={onPeek} title="Voir le résumé">
            {q.title}
          </button>
        </h3>
        <span className="chips">
          {!q.visible && <span className="chip chip-warn">🙈 Cachée</span>}
          <span className={`chip ${st.chip}`}>
            {st.icon} {st.label}
          </span>
        </span>
      </header>
      {(q.giver || q.reward) && (
        <dl className="qt-meta">
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
      {q.description && <p className="qt-desc">{q.description}</p>}
      {(q.characters.length > 0 || q.start || q.end) && (
        <p className="muted small">
          {q.characters.length > 0 && `${q.characters.map((c) => c.name).join(", ")}`}
          {q.characters.length > 0 && (q.start || q.end) && " · "}
          {q.start && `Commencée à la séance ${q.start.number}`}
          {q.end && ` · ${q.status === "failed" ? "échouée" : "accomplie"} à la séance ${q.end.number}`}
        </p>
      )}

      {isAdmin &&
        (pending ? (
          <form
            className="qt-session"
            onSubmit={(e) => {
              e.preventDefault();
              void go(pending.to, sessionId || null);
            }}
          >
            <label className="field">
              <span className="label">{pending.question}</span>
              <select className="input" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
                {group.sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    Séance {s.number} · {s.title}
                  </option>
                ))}
                <option value="">Aucune séance (hors frise)</option>
              </select>
            </label>
            {pending.to === "open" && !q.visible && <p className="muted small">La quête deviendra visible des joueurs.</p>}
            <div className="pl-actions">
              <button className="btn btn-small" disabled={busy}>
                Valider
              </button>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => setPending(null)}>
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <footer className="pl-actions">
            {NEXT[q.status].map((n) => (
              <button
                key={n.to}
                type="button"
                className={`btn btn-small${n.to === "open" && q.status === "todo" ? "" : " btn-ghost"}`}
                disabled={busy}
                onClick={() => (n.session ? setPending({ to: n.to, question: n.session }) : void go(n.to, null))}
              >
                {n.label}
              </button>
            ))}
            <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={() => run(setQuestVisibleAction(q.id, !q.visible))}>
              {q.visible ? "🙈 Cacher" : "👁 Révéler"}
            </button>
            <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={onEdit}>
              Modifier
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-small pl-delete"
              disabled={busy}
              onClick={() => confirm(`Supprimer la quête « ${q.title} » ? Elle disparaîtra aussi de la frise.`) && void run(deleteQuestAction(q.id))}
            >
              Supprimer
            </button>
          </footer>
        ))}
    </article>
  );
}

/* ---------- Écrire une quête (MJ) ---------- */

function QuestEditor({ group, quest, busy, onCancel, onSave }: { group: QuestGroup; quest?: QuestView; busy: boolean; onCancel: () => void; onSave: (input: QuestInput) => void }) {
  const [title, setTitle] = useState(quest?.title ?? "");
  const [giver, setGiver] = useState(quest?.giver ?? "");
  const [reward, setReward] = useState(quest?.reward ?? "");
  const [description, setDescription] = useState(quest?.description ?? "");
  const [visible, setVisible] = useState(quest?.visible ?? false);
  const [ids, setIds] = useState<string[]>(quest?.characters.map((c) => c.id) ?? []);

  return (
    <form
      className="chr-editor"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ id: quest?.id ?? null, groupId: group.id, title, giver, reward, description, visible, characterIds: ids });
      }}
    >
      <h2 className="subtitle">{quest ? "Modifier la quête" : `Nouvelle quête · ${group.name}`}</h2>
      <label className="field">
        <span className="label">Titre</span>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} required autoFocus placeholder="Ex. Retrouver la fille du bourgmestre" />
      </label>
      <div className="chr-editor-row">
        <label className="field chr-grow">
          <span className="label">Confiée par (facultatif)</span>
          <input className="input" value={giver} onChange={(e) => setGiver(e.target.value)} maxLength={140} placeholder="Ex. Le bourgmestre Aldric" />
        </label>
        <label className="field chr-grow">
          <span className="label">Récompense (facultatif)</span>
          <input className="input" value={reward} onChange={(e) => setReward(e.target.value)} maxLength={300} placeholder="Ex. 200 po et une faveur" />
        </label>
      </div>
      <label className="field">
        <span className="label">Description</span>
        <textarea className="input textarea" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={6000} placeholder="Ce que savent les personnages, les pistes…" />
      </label>
      {group.characters.length > 0 && (
        <div className="stack-xs">
          <span className="label">Personnages concernés (facultatif)</span>
          <div className="chr-who">
            {group.characters.map((c) => {
              const on = ids.includes(c.id);
              return (
                <button key={c.id} type="button" className={`chr-who-chip${on ? " on" : ""}`} aria-pressed={on} onClick={() => setIds(on ? ids.filter((x) => x !== c.id) : [...ids, c.id])}>
                  {c.dead && "🪦 "}
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <label className="check">
        <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
        <span>Visible des joueurs (sinon, cachée : toi seul la vois)</span>
      </label>
      <div className="pl-actions">
        <button className="btn" disabled={busy}>
          {quest ? "Enregistrer" : "Créer la quête"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </form>
  );
}

const toSummary = (q: QuestView): QuestSummaryData => ({
  id: q.id,
  title: q.title,
  description: q.description,
  giver: q.giver,
  reward: q.reward,
  status: q.status,
  visible: q.visible,
  start: q.start,
  end: q.status === "done" || q.status === "failed" ? q.end : null,
  characters: q.characters.map((c) => c.name),
});
