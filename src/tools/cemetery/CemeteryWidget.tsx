// Widget du tableau de bord : les dernières tombes des campagnes de l'utilisateur.
import Link from "next/link";
import { getGraves, getGroups, type User } from "@/lib/db";
import { visibleGroups } from "@/lib/groups";
import { CEMETERY_TOOL_ID } from "./meta";

const HREF = `/outils/${CEMETERY_TOOL_ID}`;
const MAX = 3;
const fmt = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default async function CemeteryWidget({ user }: { user: User }) {
  const [groups, graves] = await Promise.all([getGroups(), getGraves()]);
  const visible = visibleGroups(user, groups);
  const groupName = new Map(visible.map((g) => [g.id, g.name]));
  // Les plus récentes d'abord (getGraves trie déjà par date de mort).
  const mine = graves.filter((g) => groupName.has(g.groupId));
  const multi = visible.length > 1;

  if (mine.length === 0) {
    return (
      <div className="cem-w-empty">
        <span aria-hidden="true">🌙</span>
        <p className="muted small">Personne ne repose encore ici. Pourvu que ça dure.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <ul className="cem-w-list">
        {mine.slice(0, MAX).map((g, i) => (
          <li key={g.id} style={{ animationDelay: `${i * 80}ms` }}>
            <Link href={HREF} className="cem-w-stone">
              <span className="cem-w-cross" aria-hidden="true">
                ✝
              </span>
              <span className="stack-xs">
                <strong className="cem-w-name">{g.name}</strong>
                <span className="cem-w-meta">
                  {g.label} · † {fmt(g.diedAt)}
                  {multi && ` · ${groupName.get(g.groupId)}`}
                </span>
                {g.epitaph && <em className="cem-w-epitaph">« {g.epitaph} »</em>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {mine.length > MAX && (
        <Link href={HREF} className="text-link small">
          Voir les {mine.length} tombes
        </Link>
      )}
    </div>
  );
}
