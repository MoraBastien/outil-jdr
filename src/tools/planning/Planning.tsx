"use client";

import { useEffect, useState, useTransition } from "react";
import type { ToolPlayer } from "../registry";
import {
  getPlanningAction,
  createPollAction,
  addSlotAction,
  removeSlotAction,
  confirmSlotAction,
  setPollClosedAction,
  setPollGroupAction,
  deletePollAction,
  answerAction,
  setWeeklyAction,
} from "./actions";
import {
  ANSWER_LABELS,
  addDays,
  slotEnd,
  slotKey,
  sortSlots,
  type PlanningData,
  type PlanningGroup,
  type PlanningResult,
  type Poll,
  type PollAnswer,
  type PollSlot,
  type SlotInput,
} from "./types";

/* ---------- Formatage ---------- */

const dateFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const shortDateFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const fmtDate = (d: string, short = false) => capitalize((short ? shortDateFmt : dateFmt).format(new Date(`${d}T00:00:00Z`)));
const fmtTime = (t: string) => t.replace(":", "h");
const fmtHours = (s: PollSlot) => (s.end ? `${fmtTime(s.start)} – ${fmtTime(s.end)}` : `à partir de ${fmtTime(s.start)}`);

/** Date/heure locale actuelle au format "AAAA-MM-JJTHH:MM", comparable aux créneaux. */
function nowKey(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
const isPast = (s: PollSlot, now: string) => {
  const e = slotEnd(s);
  return `${e.date}T${e.time}` < now;
};

/* ---------- Agenda (.ics) ---------- */

function downloadIcs(poll: Poll, slot: PollSlot) {
  const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);
  const stamp = (d: string, t: string) => `${d.replace(/-/g, "")}T${t.replace(":", "")}00`;
  const end = slotEnd(slot);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Outils JDR//Planning//FR",
    "BEGIN:VEVENT",
    `UID:${poll.id}-${slot.id}@outils-jdr`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART:${stamp(slot.date, slot.start)}`,
    `DTEND:${stamp(end.date, end.time)}`,
    `SUMMARY:${esc(poll.title)}`,
    ...(poll.note ? [`DESCRIPTION:${esc(poll.note)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `session-${slot.date}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Saisie des créneaux ---------- */

type Row = SlotInput & { key: number };

function SlotFields({ value, onChange }: { value: SlotInput; onChange: (v: SlotInput) => void }) {
  return (
    <>
      <label className="pl-f">
        <span className="label">Date</span>
        <input type="date" className="input" value={value.date} onChange={(e) => onChange({ ...value, date: e.target.value })} required />
      </label>
      <label className="pl-f">
        <span className="label">Début</span>
        <input type="time" className="input" value={value.start} onChange={(e) => onChange({ ...value, start: e.target.value })} required />
      </label>
      <label className="pl-f">
        <span className="label">Fin (facultatif)</span>
        <input type="time" className="input" value={value.end} onChange={(e) => onChange({ ...value, end: e.target.value })} />
      </label>
    </>
  );
}

function NewPollForm({
  busy,
  groupName,
  onCreate,
}: {
  busy: boolean;
  groupName: string;
  onCreate: (input: { title: string; note: string; slots: SlotInput[] }) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<Row[]>([{ key: 0, date: "", start: "20:00", end: "23:30" }]);
  const [nextKey, setNextKey] = useState(1);

  const addRow = () => {
    const last = rows[rows.length - 1];
    setRows([...rows, { key: nextKey, date: last?.date ? addDays(last.date, 1) : "", start: last?.start ?? "20:00", end: last?.end ?? "" }]);
    setNextKey(nextKey + 1);
  };

  if (!open) {
    return (
      <div>
        <button type="button" className="btn btn-small" onClick={() => setOpen(true)}>
          + Proposer des dates
        </button>
      </div>
    );
  }

  return (
    <form
      className="card stack pl-new"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await onCreate({ title, note, slots: rows.map(({ date, start, end }) => ({ date, start, end })) });
        if (ok) {
          setOpen(false);
          setTitle("");
          setNote("");
          setRows([{ key: nextKey, date: "", start: "20:00", end: "23:30" }]);
          setNextKey(nextKey + 1);
        }
      }}
    >
      <h2 className="subtitle">Nouveau sondage · {groupName}</h2>
      <label className="field">
        <span className="label">Titre</span>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. One-shot « La chute de Rigel »" required maxLength={120} />
      </label>
      <label className="field">
        <span className="label">Note pour les joueurs (facultatif)</span>
        <textarea className="input textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Lieu, durée, à apporter…" />
      </label>

      <div className="stack">
        <span className="label">Créneaux proposés</span>
        {rows.map((r, i) => (
          <div key={r.key} className="pl-slot-input">
            <SlotFields value={r} onChange={(v) => setRows(rows.map((x) => (x.key === r.key ? { ...x, ...v } : x)))} />
            <button
              type="button"
              className="icon-btn danger-text"
              onClick={() => setRows(rows.filter((x) => x.key !== r.key))}
              disabled={rows.length === 1}
              aria-label={`Retirer le créneau ${i + 1}`}
            >
              ×
            </button>
          </div>
        ))}
        <div>
          <button type="button" className="btn btn-ghost btn-small" onClick={addRow}>
            + Ajouter un créneau
          </button>
          <span className="muted small"> (reprend l&apos;horaire précédent, le jour suivant)</span>
        </div>
      </div>

      <div className="pl-actions">
        <button className="btn" disabled={busy}>
          Publier le sondage
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
          Annuler
        </button>
      </div>
    </form>
  );
}

function AddSlotForm({ busy, onAdd }: { busy: boolean; onAdd: (s: SlotInput) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<SlotInput>({ date: "", start: "20:00", end: "" });
  if (!open) {
    return (
      <button type="button" className="btn btn-ghost btn-small" onClick={() => setOpen(true)}>
        + Créneau
      </button>
    );
  }
  return (
    <form
      className="pl-slot-input pl-add"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await onAdd(value)) {
          setOpen(false);
          setValue({ ...value, date: addDays(value.date, 1) });
        }
      }}
    >
      <SlotFields value={value} onChange={setValue} />
      <div className="pl-actions">
        <button className="btn btn-small" disabled={busy}>
          Ajouter
        </button>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => setOpen(false)}>
          Annuler
        </button>
      </div>
    </form>
  );
}

/* ---------- Sondage ---------- */

type Handlers = {
  busy: boolean;
  answer: (pollId: string, slotId: string, a: PollAnswer | null) => void;
  run: (p: Promise<PlanningResult>) => Promise<boolean>;
};

function PollCard({ poll, data, now, h }: { poll: Poll; data: PlanningData; now: string; h: Handlers }) {
  const { me } = data;
  // Ceux qui répondent : les membres du groupe du sondage.
  const participants = data.groups.find((g) => g.id === poll.groupId)?.participants ?? [];
  const isAdmin = me.isAdmin;
  const isParticipant = participants.some((p) => p.id === me.id);
  const slots = sortSlots(poll.slots);
  const confirmed = poll.slots.find((s) => s.id === poll.confirmedSlotId) ?? null;

  const tally = (slotId: string) => {
    const out: Record<PollAnswer, string[]> = { yes: [], maybe: [], no: [] };
    for (const p of participants) {
      const a = poll.responses[p.id]?.[slotId];
      if (a) out[a].push(p.name);
    }
    return out;
  };
  const score = (slotId: string) => {
    const t = tally(slotId);
    return t.yes.length * 2 + t.maybe.length;
  };
  const best = Math.max(0, ...slots.filter((s) => !isPast(s, now)).map((s) => score(s.id)));

  const responded = participants.filter((p) => Object.keys(poll.responses[p.id] ?? {}).length > 0);
  const missing = participants.filter((p) => !responded.includes(p));

  const statusLabel = poll.status === "open" ? "Ouvert" : poll.status === "confirmed" ? "Confirmé" : "Clos";

  return (
    <article className={`card stack pl-poll pl-is-${poll.status}`}>
      <header className="section-head">
        <h3 className="pl-title">{poll.title}</h3>
        <span className={`chip ${poll.status === "confirmed" ? "chip-ok" : poll.status === "open" ? "chip-accent" : ""}`}>{statusLabel}</span>
      </header>
      {poll.note && <p className="notes muted">{poll.note}</p>}

      {confirmed && (
        <div className="pl-confirmed">
          <div className="stack-xs">
            <span className="label">Session retenue</span>
            <strong className="pl-confirmed-date">{fmtDate(confirmed.date)}</strong>
            <span>{fmtHours(confirmed)}</span>
          </div>
          <button type="button" className="btn btn-small" onClick={() => downloadIcs(poll, confirmed)}>
            Ajouter à mon agenda
          </button>
        </div>
      )}

      {poll.status === "open" && (
        <p className="muted small">
          {responded.length}/{participants.length} joueur{participants.length > 1 ? "s ont" : " a"} répondu
          {isAdmin && missing.length > 0 && ` · en attente : ${missing.map((p) => p.name).join(", ")}`}
          {!isAdmin && isParticipant && " · indique tes disponibilités pour chaque créneau"}
        </p>
      )}

      {slots.length === 0 && <p className="muted">Aucun créneau.</p>}

      <ul className="pl-slots">
        {slots.map((s) => {
          const t = tally(s.id);
          const mine = poll.responses[me.id]?.[s.id] ?? null;
          const auto = Boolean(mine && poll.autoFilled?.[me.id]?.includes(s.id));
          const past = isPast(s, now);
          const isBest = poll.status === "open" && best > 0 && score(s.id) === best && !past;
          const isChosen = s.id === poll.confirmedSlotId;
          return (
            <li key={s.id} className={`pl-slot${past ? " past" : ""}${isBest ? " best" : ""}${isChosen ? " chosen" : ""}`}>
              <div className="pl-when">
                <strong>{fmtDate(s.date)}</strong>
                <span className="muted">{fmtHours(s)}</span>
                <span className="chips">
                  {isChosen && <span className="chip chip-ok">Retenu</span>}
                  {isBest && <span className="chip chip-accent">Meilleur créneau</span>}
                  {past && <span className="chip">Passé</span>}
                </span>
              </div>

              <div className="pl-tally">
                <div className="pl-bar" aria-hidden="true">
                  {participants.length > 0 && (
                    <>
                      <i className="yes" style={{ width: `${(t.yes.length / participants.length) * 100}%` }} />
                      <i className="maybe" style={{ width: `${(t.maybe.length / participants.length) * 100}%` }} />
                      <i className="no" style={{ width: `${(t.no.length / participants.length) * 100}%` }} />
                    </>
                  )}
                </div>
                <div className="pl-names small">
                  {(["yes", "maybe", "no"] as const).map(
                    (a) =>
                      t[a].length > 0 && (
                        <span key={a} className={`pl-names-${a}`}>
                          {ANSWER_LABELS[a]} ({t[a].length}) : {t[a].join(", ")}
                        </span>
                      ),
                  )}
                  {t.yes.length + t.maybe.length + t.no.length === 0 && <span className="muted">Pas encore de réponse</span>}
                </div>
              </div>

              <div className="pl-slot-actions">
                {!isAdmin && isParticipant && poll.status === "open" && !past && (
                  <div className="pl-answers" role="group" aria-label={`Disponibilité le ${fmtDate(s.date)}`}>
                    {(["yes", "maybe", "no"] as const).map((a) => (
                      <button
                        key={a}
                        type="button"
                        className={`pl-answer ${a}${auto ? " auto" : ""}`}
                        aria-pressed={mine === a}
                        onClick={() => h.answer(poll.id, s.id, mine === a && !auto ? null : a)}
                      >
                        {ANSWER_LABELS[a]}
                      </button>
                    ))}
                  </div>
                )}
                {!isAdmin && isParticipant && poll.status === "open" && !past && auto && (
                  <span className="pl-auto small" title="Pré-rempli d'après tes disponibilités habituelles. Clique pour confirmer ou changer.">
                    ↻ d&apos;après tes habitudes
                  </span>
                )}
                {!isAdmin && mine && poll.status !== "open" && <span className="muted small">Ta réponse : {ANSWER_LABELS[mine]}</span>}
                {isAdmin && poll.status !== "closed" && (
                  <>
                    {!isChosen && (
                      <button type="button" className="btn btn-ghost btn-small" disabled={h.busy} onClick={() => h.run(confirmSlotAction(poll.id, s.id))}>
                        Retenir
                      </button>
                    )}
                    <button
                      type="button"
                      className="icon-btn danger-text"
                      disabled={h.busy}
                      aria-label="Retirer ce créneau"
                      title="Retirer ce créneau"
                      onClick={() => {
                        const n = t.yes.length + t.maybe.length + t.no.length;
                        if (n === 0 || confirm(`Retirer ce créneau et ses ${n} réponse(s) ?`)) void h.run(removeSlotAction(poll.id, s.id));
                      }}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {isAdmin && !poll.groupId && data.groups.length > 0 && (
        <div className="pl-admin">
          <label className="pl-f">
            <span className="label">Sondage créé avant les groupes : à quel groupe le rattacher ?</span>
            <select className="input" defaultValue="" disabled={h.busy} onChange={(e) => e.target.value && void h.run(setPollGroupAction(poll.id, e.target.value))}>
              <option value="" disabled>
                Choisir un groupe…
              </option>
              {data.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {isAdmin && (
        <footer className="pl-admin">
          {poll.status !== "closed" && <AddSlotForm busy={h.busy} onAdd={(s) => h.run(addSlotAction(poll.id, s))} />}
          {poll.status === "confirmed" && (
            <button type="button" className="btn btn-ghost btn-small" disabled={h.busy} onClick={() => h.run(confirmSlotAction(poll.id, null))}>
              Annuler la confirmation
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-small" disabled={h.busy} onClick={() => h.run(setPollClosedAction(poll.id, poll.status !== "closed"))}>
            {poll.status === "closed" ? "Rouvrir" : "Archiver"}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-small pl-delete"
            disabled={h.busy}
            onClick={() => {
              if (confirm(`Supprimer le sondage « ${poll.title} » et toutes ses réponses ?`)) void h.run(deletePollAction(poll.id));
            }}
          >
            Supprimer
          </button>
        </footer>
      )}
      {!isAdmin && !isParticipant && <p className="muted small">Lecture seule.</p>}
    </article>
  );
}

/* ---------- Outil ---------- */

export default function Planning({ player }: { player: ToolPlayer }) {
  const [data, setData] = useState<PlanningData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [now, setNow] = useState("");

  useEffect(() => {
    setNow(nowKey());
    getPlanningAction()
      .then(setData)
      .catch(() => setError("Impossible de charger le planning."));
  }, []);

  const run = (p: Promise<PlanningResult>) =>
    new Promise<boolean>((resolve) => {
      startTransition(async () => {
        try {
          const r = await p;
          if (r.ok) {
            setData(r.data);
            setError(null);
          } else setError(r.error);
          resolve(r.ok);
        } catch {
          setError("L'action a échoué. Réessaie.");
          resolve(false);
        }
      });
    });

  // Réponse : mise à jour immédiate à l'écran, puis confirmation du serveur.
  const answer = (pollId: string, slotId: string, a: PollAnswer | null) => {
    setData((d) => {
      if (!d) return d;
      return {
        ...d,
        polls: d.polls.map((p) => {
          if (p.id !== pollId) return p;
          const mine = { ...(p.responses[d.me.id] ?? {}) };
          if (a) mine[slotId] = a;
          else delete mine[slotId];
          const auto = (p.autoFilled?.[d.me.id] ?? []).filter((id) => id !== slotId);
          return { ...p, responses: { ...p.responses, [d.me.id]: mine }, autoFilled: { ...p.autoFilled, [d.me.id]: auto } };
        }),
      };
    });
    void run(answerAction(pollId, slotId, a));
  };

  if (!data) {
    return error ? <p className="flash flash-error">{error}</p> : <p className="muted">Chargement du planning…</p>;
  }

  const h: Handlers = { busy, answer, run };
  const legacy = data.polls.filter((p) => !p.groupId);
  const multi = data.groups.length > 1;

  return (
    <div className="stack-lg pl-root">
      {!data.me.isAdmin && (
        <p className="muted">
          Salut {player.name}, indique quand tu es disponible{multi ? " pour chacun de tes groupes" : ""}.
        </p>
      )}
      {!data.me.isAdmin && <WeeklyCard weekly={data.me.weekly} busy={busy} onSave={(w) => run(setWeeklyAction(w))} />}
      {data.me.isAdmin && data.groups.length === 0 && (
        <p className="flash flash-error">Aucun groupe de jeu : crée un groupe et ajoutes-y des joueurs dans l&apos;administration.</p>
      )}
      {error && (
        <p className="flash flash-error" role="alert">
          {error}
        </p>
      )}

      {data.groups.map((g) => (
        <GroupSection key={g.id} group={g} data={data} now={now} h={h} showHead={multi || data.me.isAdmin} />
      ))}

      {data.me.isAdmin && legacy.length > 0 && (
        <section className="stack pl-group">
          <header className="pl-group-head">
            <h2 className="subtitle">Anciens sondages sans groupe</h2>
          </header>
          {legacy.map((p) => (
            <PollCard key={p.id} poll={p} data={data} now={now} h={h} />
          ))}
        </section>
      )}
    </div>
  );
}

/* ---------- Un groupe ---------- */

function GroupSection({ group, data, now, h, showHead }: { group: PlanningGroup; data: PlanningData; now: string; h: Handlers; showHead: boolean }) {
  const polls = data.polls.filter((p) => p.groupId === group.id);
  const firstSlot = (p: Poll) => sortSlots(p.slots)[0];
  const confirmedKey = (p: Poll) => {
    const s = p.slots.find((x) => x.id === p.confirmedSlotId);
    return s ? slotKey(s) : "";
  };
  const confirmed = polls.filter((p) => p.status === "confirmed").sort((a, b) => confirmedKey(a).localeCompare(confirmedKey(b)));
  const open = polls
    .filter((p) => p.status === "open")
    .sort((a, b) => (firstSlot(a) ? slotKey(firstSlot(a)) : "").localeCompare(firstSlot(b) ? slotKey(firstSlot(b)) : ""));
  const closed = polls.filter((p) => p.status === "closed").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <section className="stack pl-group" aria-label={group.name}>
      {showHead && (
        <header className="pl-group-head">
          <h2 className="subtitle">👥 {group.name}</h2>
          <span className="chips">
            {group.participants.length === 0 ? (
              <span className="muted small">Aucun joueur dans ce groupe</span>
            ) : (
              group.participants.map((p) => (
                <span key={p.id} className="chip">
                  {p.name}
                </span>
              ))
            )}
          </span>
        </header>
      )}

      {data.me.isAdmin && <NewPollForm busy={h.busy} groupName={group.name} onCreate={(input) => h.run(createPollAction({ ...input, groupId: group.id }))} />}

      {confirmed.length > 0 && (
        <div className="stack">
          <h3 className="pl-section-title">Sessions confirmées</h3>
          {confirmed.map((p) => (
            <PollCard key={p.id} poll={p} data={data} now={now} h={h} />
          ))}
        </div>
      )}

      <div className="stack">
        <h3 className="pl-section-title">Sondages en cours</h3>
        {open.length === 0 ? (
          <p className="muted">{data.me.isAdmin ? "Aucun sondage en cours." : "Aucune date à choisir pour l'instant. Ton MJ en proposera bientôt."}</p>
        ) : (
          open.map((p) => <PollCard key={p.id} poll={p} data={data} now={now} h={h} />)
        )}
      </div>

      {closed.length > 0 && (
        <details className="pl-archive">
          <summary className="pl-section-title">Archives ({closed.length})</summary>
          <div className="stack">
            {closed.map((p) => (
              <PollCard key={p.id} poll={p} data={data} now={now} h={h} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

/* ---------- Disponibilités habituelles ---------- */

// Lundi d'abord ; l'index est celui de Date.getDay() (0 = dimanche).
const WEEK = [
  { i: 1, name: "Lundi" },
  { i: 2, name: "Mardi" },
  { i: 3, name: "Mercredi" },
  { i: 4, name: "Jeudi" },
  { i: 5, name: "Vendredi" },
  { i: 6, name: "Samedi" },
  { i: 0, name: "Dimanche" },
];

function WeeklyCard({ weekly, busy, onSave }: { weekly: (PollAnswer | null)[]; busy: boolean; onSave: (w: (PollAnswer | null)[]) => Promise<boolean> }) {
  const [draft, setDraft] = useState(weekly);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = weekly.filter(Boolean).length;
  const changed = draft.join() !== weekly.join();
  const summary =
    set === 0
      ? "Pas encore renseignées"
      : WEEK.filter((d) => weekly[d.i])
          .map((d) => `${d.name.slice(0, 3)}. ${weekly[d.i] === "yes" ? "✓" : weekly[d.i] === "maybe" ? "?" : "✗"}`)
          .join(" · ");

  return (
    <details className="card pl-weekly" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>
        <span className="stack-xs">
          <strong>🗓️ Mes disponibilités habituelles</strong>
          <span className="muted small">{summary}</span>
        </span>
      </summary>
      <div className="stack">
        <p className="muted small">
          Indique tes habitudes : tes réponses aux sondages sont pré-remplies pour ces jours-là (tu peux toujours les changer une par une). Ton MJ voit
          ainsi tes disponibilités sans attendre que tu passes.
        </p>
        <ul className="pl-weekly-grid">
          {WEEK.map((d) => (
            <li key={d.i}>
              <span className="pl-weekly-day">{d.name}</span>
              <div className="pl-answers" role="group" aria-label={`Habitude du ${d.name.toLowerCase()}`}>
                {(["yes", "maybe", "no"] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    className={`pl-answer ${a}`}
                    aria-pressed={draft[d.i] === a}
                    onClick={() => (setDraft(draft.map((v, j) => (j === d.i ? (v === a ? null : a) : v))), setSaved(false))}
                  >
                    {ANSWER_LABELS[a]}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <div className="pl-actions">
          <button
            type="button"
            className="btn btn-small"
            disabled={busy || !changed}
            onClick={async () => {
              if (await onSave(draft)) setSaved(true);
            }}
          >
            Enregistrer
          </button>
          {changed && (
            <button type="button" className="btn btn-ghost btn-small" onClick={() => setDraft(weekly)}>
              Annuler
            </button>
          )}
          {saved && !changed && <span className="muted small">✓ Enregistré, sondages ouverts mis à jour.</span>}
        </div>
      </div>
    </details>
  );
}
