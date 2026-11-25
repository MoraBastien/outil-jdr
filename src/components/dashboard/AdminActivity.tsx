// MJ : l'activité à bord de tous ses groupes (achats, présences, journaux publiés…), la plus récente d'abord.
import Link from "next/link";
import { getActivity, getGroups } from "@/lib/db";

const when = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(iso));

export default async function AdminActivity() {
  const groups = await getGroups();
  const lines = (await Promise.all(groups.map(async (g) => (await getActivity(g.id, 10)).map((a) => ({ ...a, group: g.name })))))
    .flat()
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 12);
  if (lines.length === 0) return <p className="muted">Calme plat : rien ne s&apos;est passé entre les séances pour l&apos;instant.</p>;
  const multi = groups.length > 1;
  return (
    <ul className="db-feed">
      {lines.map((a) => (
        <li key={a.id}>
          <Link href={a.href ?? "/accueil"}>
            <span className={`db-feed-icon k-${a.kind} sys`} aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 8v13M8 12h8M5 15a7 7 0 0 0 14 0" />
              </svg>
            </span>
            <span className="db-feed-text">
              {a.text}
              {multi && <span className="muted small"> · {a.group}</span>}
            </span>
            <time className="muted small" dateTime={a.at}>
              {when(a.at)}
            </time>
          </Link>
        </li>
      ))}
    </ul>
  );
}
