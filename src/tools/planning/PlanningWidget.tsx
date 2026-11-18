// Widget du tableau de bord : sessions confirmées et sondages en cours.
import Link from "next/link";
import type { User } from "@/lib/db";
import { getPlanningOverview, tableToday } from "./summary";
import { PLANNING_TOOL_ID, type PollSlot } from "./types";

const HREF = `/outils/${PLANNING_TOOL_ID}`;
const longFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const shortFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const fmtDate = (d: string, short = false) => cap((short ? shortFmt : longFmt).format(new Date(`${d}T00:00:00Z`)));
const fmtTime = (t: string) => t.replace(":", "h");
const fmtHours = (s: PollSlot) => (s.end ? `${fmtTime(s.start)} – ${fmtTime(s.end)}` : `dès ${fmtTime(s.start)}`);

/** « Dans 3 jours », « Demain », « Aujourd'hui ». */
function countdown(date: string, today: string): string {
  const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Demain";
  return `Dans ${days} jours`;
}

const MINE_LABEL = { todo: "À remplir", partial: "Incomplet", done: "Répondu" } as const;
const MINE_CHIP = { todo: "chip-accent", partial: "chip-warn", done: "chip-ok" } as const;

export default async function PlanningWidget({ user }: { user: User }) {
  const { isAdmin, upcoming, open } = await getPlanningOverview(user);
  const today = tableToday();
  const [next, ...later] = upcoming;

  if (!next && open.length === 0) {
    return (
      <p className="muted">
        {isAdmin ? "Aucune session prévue. " : "Aucune session prévue pour l'instant. Ton MJ proposera des dates bientôt."}
        {isAdmin && (
          <Link href={HREF} className="text-link">
            Proposer des dates
          </Link>
        )}
      </p>
    );
  }

  return (
    <div className="pw">
      {next ? (
        <Link href={HREF} className="pw-next">
          <span className="pw-countdown">{countdown(next.slot.date, today)}</span>
          <strong className="pw-date">{fmtDate(next.slot.date)}</strong>
          <span className="muted">
            {fmtHours(next.slot)} · {next.title}
          </span>
          {later.length > 0 && (
            <span className="pw-later small">
              Ensuite : {later.slice(0, 2).map((u) => `${fmtDate(u.slot.date, true)} (${u.title})`).join(", ")}
            </span>
          )}
        </Link>
      ) : (
        <div className="pw-next pw-next-empty">
          <span className="pw-countdown">Pas encore de date</span>
          <span className="muted small">La prochaine session sera fixée à partir des sondages.</span>
        </div>
      )}

      {open.length > 0 && (
        <div className="pw-polls">
          <span className="label">Sondages en cours</span>
          <ul className="pw-list">
            {open.slice(0, 4).map((p) => (
              <li key={p.id}>
                <Link href={HREF} className="pw-poll">
                  <span className="stack-xs">
                    <strong>{p.title}</strong>
                    <span className="muted small">
                      {p.slots.length} créneau{p.slots.length > 1 ? "x" : ""} · {fmtDate(p.slots[0].date, true)}
                      {p.slots.length > 1 && ` → ${fmtDate(p.slots[p.slots.length - 1].date, true)}`}
                    </span>
                    {isAdmin && p.best && (
                      <span className="small pw-best">Meilleur : {fmtDate(p.best.date, true)}, {fmtHours(p.best)}</span>
                    )}
                  </span>
                  {isAdmin ? (
                    <span className={`chip ${p.responded === p.participants && p.participants > 0 ? "chip-ok" : ""}`}>
                      {p.responded}/{p.participants} réponses
                    </span>
                  ) : (
                    <span className={`chip ${MINE_CHIP[p.mine]}`}>{MINE_LABEL[p.mine]}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
