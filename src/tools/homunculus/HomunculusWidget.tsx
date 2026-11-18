// Widget du tableau de bord : fiches d'homunculus.
// Joueur : ses fiches. MJ : les dernières fiches modifiées, tous joueurs confondus.
import Link from "next/link";
import { getAllHomunculi, getHomunculi, getUsers, type User } from "@/lib/db";
import { summarize, type HomunculusSummary } from "@/app/admin/homunculus";
import { TOOL_META as HOMUNCULUS_META } from "@/tools/homunculus-creator/meta";
import { clampEcho } from "./echo";

const HREF = `/outils/${HOMUNCULUS_META.id}`;
const MAX = 3;

function SheetLine({ s, href, owner }: { s: HomunculusSummary; href: string; owner?: string }) {
  return (
    <li>
      <Link href={href} className="pw-poll">
        <span className="stack-xs">
          <strong>{s.nom}</strong>
          <span className="muted small">
            {owner && `${owner} · `}
            {[s.matiere, s.classe].filter(Boolean).join(" · ") || "Matière et classe à choisir"}
          </span>
        </span>
        <span className={`chip ${s.complete ? "chip-ok" : ""}`}>{s.complete ? "Complète" : `${s.stepsDone}/6`}</span>
      </Link>
    </li>
  );
}

const byUpdate = (a: { updatedAt: string }, b: { updatedAt: string }) => b.updatedAt.localeCompare(a.updatedAt);

export default async function HomunculusWidget({ user }: { user: User }) {
  if (user.role === "admin") {
    const [all, users] = await Promise.all([getAllHomunculi(), getUsers()]);
    if (all.length === 0) return <p className="muted">Aucun joueur n&apos;a encore créé d&apos;homunculus.</p>;
    const names = new Map(users.map((u) => [u.id, u.name]));
    const recent = [...all].sort(byUpdate).slice(0, MAX);
    return (
      <div className="stack">
        <p className="muted small">
          {all.length} fiche{all.length > 1 ? "s" : ""} · {all.filter((h) => h.complete).length} complète
          {all.filter((h) => h.complete).length > 1 ? "s" : ""}
        </p>
        <ul className="pw-list">
          {recent.map((h) => (
            <SheetLine key={h.id} s={summarize(h)} owner={names.get(h.ownerId)} href={`/admin/joueurs/${h.ownerId}/fiches/${h.id}`} />
          ))}
        </ul>
      </div>
    );
  }

  const sheets = (await getHomunculi(user.id)).sort(byUpdate).map(summarize);
  const echo = clampEcho(user.echo);

  if (sheets.length === 0) {
    return (
      <div className="stack">
        <p className="muted">Pas encore d&apos;homunculus. Ton Écho actuel : {echo}.</p>
        <div>
          <Link href={HREF} className="btn btn-small">
            Créer mon homunculus
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <p className="muted small">
        Écho {echo} · {sheets.length} fiche{sheets.length > 1 ? "s" : ""}
      </p>
      <ul className="pw-list">
        {sheets.slice(0, MAX).map((s) => (
          <SheetLine key={s.id} s={s} href={HREF} />
        ))}
      </ul>
      {sheets.length > MAX && (
        <Link href={HREF} className="text-link small">
          Voir les {sheets.length} fiches
        </Link>
      )}
    </div>
  );
}
