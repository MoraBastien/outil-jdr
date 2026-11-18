// Widget du tableau de bord : les personnages du joueur (un par groupe) et le bouton « Monter de niveau ».
// MJ : les fiches de chaque groupe et les montées de niveau en attente.
import Link from "next/link";
import { getCharacters, getGroups, getUsers, type StoredCharacter, type User } from "@/lib/db";
import { membersOf, visibleGroups } from "@/lib/groups";
import { derive, fmtMod, shortLabel } from "./rules";
import { CHARACTER_TOOL_ID, type CharacterState } from "./types";

const HREF = `/outils/${CHARACTER_TOOL_ID}`;

export default async function CharacterWidget({ user }: { user: User }) {
  const [chars, users, allGroups] = await Promise.all([getCharacters(), getUsers(), getGroups()]);
  const groups = visibleGroups(user, allGroups);

  if (user.role === "admin") {
    if (groups.length === 0) return <p className="muted">Aucun groupe de jeu pour l&apos;instant.</p>;
    return (
      <div className="cs-widget-groups">
        {groups.map((g) => {
          const members = membersOf(users, g.id);
          return (
            <div key={g.id} className="stack-xs">
              <span className="label">👥 {g.name}</span>
              {members.length === 0 ? (
                <span className="muted small">Aucun joueur.</span>
              ) : (
                <ul className="pw-list cs-widget-roster">
                  {members.map((p) => {
                    const c = chars.find((x) => x.ownerId === p.id && x.groupId === g.id && !x.deadAt);
                    const s = c?.state as CharacterState | undefined;
                    return (
                      <li key={p.id}>
                        <Link href={HREF} className="pw-poll">
                          <span className="stack-xs">
                            <strong>{s?.name ?? p.name}</strong>
                            <span className="muted small">{s ? `${p.name} · ${shortLabel(s)}` : "Pas encore de fiche"}</span>
                          </span>
                          {c && s && c.grantedLevel > s.level ? <span className="chip chip-accent">Montée en attente</span> : s && <span className="chip">Niv. {s.level}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const multi = groups.length > 1;
  return (
    <div className="cs-widget-groups">
      {groups.map((g) => {
        const c = chars.find((x) => x.ownerId === user.id && x.groupId === g.id && !x.deadAt);
        return (
          <div key={g.id} className="stack-xs">
            {multi && <span className="label">👥 {g.name}</span>}
            {c ? (
              <CharacterLine c={c} groupId={g.id} />
            ) : (
              <div className="cs-widget-empty">
                <p className="muted">
                  Tu n&apos;as pas encore de personnage{multi ? " dans ce groupe" : ""}. L&apos;assistant t&apos;accompagne étape par étape.
                </p>
                <Link href={`${HREF}?groupe=${g.id}`} className="btn">
                  Créer mon personnage
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CharacterLine({ c, groupId }: { c: StoredCharacter; groupId: string }) {
  const s = c.state as CharacterState;
  const d = derive(s);
  const canLevelUp = c.grantedLevel > s.level;
  const hpRatio = d.hpMax ? s.play.hp / d.hpMax : 0;
  return (
    <div className="cs-widget">
      <Link href={`${HREF}?groupe=${groupId}`} className="cs-widget-id">
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
        <Link href={`${HREF}?groupe=${groupId}&levelup=${c.id}`} className="btn levelup-btn cs-widget-levelup">
          ✦ Monter de niveau
        </Link>
      )}
    </div>
  );
}
