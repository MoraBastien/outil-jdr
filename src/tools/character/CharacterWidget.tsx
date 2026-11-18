// Widget du tableau de bord : le personnage du joueur et le bouton « Monter de niveau ».
// MJ : les fiches de la table et les montées de niveau en attente.
import Link from "next/link";
import { getCharacter, getCharacters, getUsers, type User } from "@/lib/db";
import { derive, fmtMod, shortLabel } from "./rules";
import { CHARACTER_TOOL_ID, type CharacterState } from "./types";

const HREF = `/outils/${CHARACTER_TOOL_ID}`;

export default async function CharacterWidget({ user }: { user: User }) {
  if (user.role === "admin") {
    const [chars, users] = await Promise.all([getCharacters(), getUsers()]);
    const players = users.filter((u) => u.role === "player" && u.tools.includes(CHARACTER_TOOL_ID));
    if (players.length === 0) return <p className="muted">Aucun joueur n&apos;a encore accès aux fiches de personnage.</p>;
    return (
      <ul className="pw-list cs-widget-roster">
        {players.map((p) => {
          const c = chars.find((x) => x.ownerId === p.id);
          const s = c?.state as CharacterState | undefined;
          return (
            <li key={p.id}>
              <Link href={HREF} className="pw-poll">
                <span className="stack-xs">
                  <strong>{s?.name ?? p.name}</strong>
                  <span className="muted small">{s ? `${p.name} · ${shortLabel(s)}` : "Pas encore de fiche"}</span>
                </span>
                {c && s && c.grantedLevel > s.level ? (
                  <span className="chip chip-accent">Montée en attente</span>
                ) : (
                  s && <span className="chip">Niv. {s.level}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  const record = await getCharacter(user.id);
  if (!record) {
    return (
      <div className="cs-widget-empty">
        <p className="muted">Tu n&apos;as pas encore de personnage. L&apos;assistant t&apos;accompagne étape par étape.</p>
        <Link href={HREF} className="btn">
          Créer mon personnage
        </Link>
      </div>
    );
  }

  const s = record.state as CharacterState;
  const d = derive(s);
  const canLevelUp = record.grantedLevel > s.level;
  const hpRatio = d.hpMax ? s.play.hp / d.hpMax : 0;

  return (
    <div className="cs-widget">
      <Link href={HREF} className="cs-widget-id">
        <span className="cs-portrait" aria-hidden="true">
          {s.name.charAt(0).toUpperCase()}
          <span className="cs-level">{s.level}</span>
        </span>
        <span className="stack-xs">
          <strong className="cs-widget-name">{s.name}</strong>
          <span className="muted small">{shortLabel(s)}</span>
        </span>
      </Link>

      <div className="cs-widget-stats">
        <div className="cs-mini">
          <span className="label">PV</span>
          <strong>
            {s.play.hp}
            <span className="muted">/{d.hpMax}</span>
          </strong>
          <span className="cs-hpbar" aria-hidden="true">
            <i style={{ width: `${Math.max(0, Math.min(1, hpRatio)) * 100}%` }} className={hpRatio <= 0.25 ? "low" : hpRatio <= 0.5 ? "mid" : ""} />
          </span>
        </div>
        <div className="cs-mini">
          <span className="label">CA</span>
          <strong>{d.ac.value}</strong>
        </div>
        <div className="cs-mini">
          <span className="label">Initiative</span>
          <strong>{fmtMod(d.initiative)}</strong>
        </div>
        {d.spell && (
          <div className="cs-mini">
            <span className="label">DD sorts</span>
            <strong>{d.spell.dc}</strong>
          </div>
        )}
      </div>

      {canLevelUp && (
        <Link href={`${HREF}?levelup=1`} className="btn levelup-btn cs-widget-levelup">
          ✦ Monter de niveau
        </Link>
      )}
    </div>
  );
}
