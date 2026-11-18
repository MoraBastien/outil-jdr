// Widget du tableau de bord : la dernière séance racontée de chaque groupe.
import Link from "next/link";
import { getCharacters, getChronicle, getGraves, getGroups, type User } from "@/lib/db";
import { visibleGroups } from "@/lib/groups";
import { detectedEvents } from "./events";
import { CHRONICLE_TOOL_ID, momentKind } from "./meta";

const HREF = `/outils/${CHRONICLE_TOOL_ID}`;
const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const excerpt = (t: string, n = 220) => (t.length > n ? `${t.slice(0, n).replace(/\s+\S*$/, "")}…` : t);

export default async function ChronicleWidget({ user }: { user: User }) {
  const [allGroups, sessions, chars, graves] = await Promise.all([getGroups(), getChronicle(), getCharacters(), getGraves()]);
  const isAdmin = user.role === "admin";
  const groups = visibleGroups(user, allGroups);
  const multi = groups.length > 1;
  const pending = isAdmin ? groups.reduce((n, g) => n + detectedEvents(g.id, chars, graves, sessions).length, 0) : 0;

  const latest = groups.flatMap((g) => {
    const list = sessions.filter((s) => s.groupId === g.id && !s.draft).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
    const last = list.at(-1);
    return last ? [{ group: g.name, number: list.length, s: last }] : [];
  });
  latest.sort((a, b) => b.s.date.localeCompare(a.s.date));

  return (
    <div className="stack">
      {latest.length === 0 ? (
        <p className="muted">{isAdmin ? "Aucune séance racontée pour l'instant." : "La chronique est encore vierge. Ton MJ la remplira après la séance."}</p>
      ) : (
        latest.slice(0, 2).map(({ group, number, s }) => (
          <Link key={s.id} href={HREF} className="chr-w">
            <span className="chr-w-date">
              Séance {number} · {fmt(s.date)}
              {multi && ` · ${group}`}
            </span>
            <strong className="chr-w-title">{s.title}</strong>
            {s.summary && <span className="muted small chr-w-summary">{excerpt(s.summary)}</span>}
            {s.moments.length > 0 && (
              <span className="chr-w-moments" aria-label={`${s.moments.length} moments marquants`}>
                {s.moments.slice(0, 8).map((m) => (
                  <span key={m.id} title={`${momentKind(m.kind).label} : ${m.text}`}>
                    {momentKind(m.kind).icon}
                  </span>
                ))}
                {s.moments.length > 8 && <span className="muted small">+{s.moments.length - 8}</span>}
              </span>
            )}
          </Link>
        ))
      )}
      {pending > 0 && (
        <Link href={HREF} className="cs-widget-hint">
          📖 {pending} événement{pending > 1 ? "s" : ""} à raconter (montées de niveau, morts)
        </Link>
      )}
    </div>
  );
}
