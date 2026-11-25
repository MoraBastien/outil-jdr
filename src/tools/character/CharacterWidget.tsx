// Widget du tableau de bord : les personnages du joueur (un par groupe) et le bouton « Monter de niveau ».
// MJ : les fiches de chaque groupe et les montées de niveau en attente.
import Link from "next/link";
import { getCharacters, getConcepts, getGroups, getProposals, getUsers, type StoredCharacter, type User } from "@/lib/db";
import { membersOf, visibleGroups } from "@/lib/groups";
import { derive, fmtMod, shortLabel } from "./rules";
import { entitySheetOf, type EntitySheetData } from "@/tools/homunculus/entity";
import EntityConstellation, { litStars } from "@/tools/homunculus/astral/EntityConstellation";
import { CHARACTER_TOOL_ID, MAX_LEVEL, type CharacterState } from "./types";

const HREF = `/outils/${CHARACTER_TOOL_ID}`;

export default async function CharacterWidget({ user }: { user: User }) {
  const [chars, users, allGroups, proposals, concepts] = await Promise.all([getCharacters(), getUsers(), getGroups(), getProposals(), getConcepts()]);
  const hasConcept = (ownerId: string, groupId: string) => concepts.some((x) => x.ownerId === ownerId && x.groupId === groupId && x.status === "pending");
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
                    const entity = entitySheetOf(p);
                    if (entity) {
                      const active = chars.find((x) => x.ownerId === p.id && x.groupId === g.id && !x.deadAt && (x.state as CharacterState).extra);
                      const hs = active?.state as CharacterState | undefined;
                      return (
                        <li key={p.id}>
                          <Link href={HREF} className="pw-poll">
                            <span className="stack-xs">
                              <strong>{hs ? hs.name : entity.name || p.name}</strong>
                              <span className="muted small">
                                {hs ? `${p.name} · ${shortLabel(hs)} · homunculus de ${entity.name || "l'entité"}` : `${entity.name || "Entité"} · ${p.name} · aucun homunculus actif`}
                              </span>
                            </span>
                            <span className="chip chip-violet">✨ Écho {entity.echo}</span>
                          </Link>
                        </li>
                      );
                    }
                    const c = chars.find((x) => x.ownerId === p.id && x.groupId === g.id && !x.deadAt);
                    const s = c?.state as CharacterState | undefined;
                    const proposal = !c && proposals.find((x) => x.ownerId === p.id && x.groupId === g.id && x.status === "pending");
                    return (
                      <li key={p.id}>
                        <Link href={HREF} className="pw-poll">
                          <span className="stack-xs">
                            <strong>{s?.name ?? p.name}</strong>
                            <span className="muted small">
                              {s ? `${p.name} · ${shortLabel(s)}` : proposal ? `Propose ${(proposal.state as CharacterState).name}` : hasConcept(p.id, g.id) ? `${p.name} · a envoyé un concept` : "Pas encore de fiche"}
                            </span>
                          </span>
                          {proposal ? (
                            <span className="chip chip-accent">🗝️ À examiner</span>
                          ) : !c && hasConcept(p.id, g.id) ? (
                            <span className="chip chip-accent">💡 Concept à lire</span>
                          ) : c && s && c.grantedLevel > s.level ? (
                            <span className="chip chip-accent">Montée en attente</span>
                          ) : (
                            s && <span className="chip">Niv. {s.level}</span>
                          )}
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

  // Joueur de l'Atelier : sa fiche est celle de son entité, la même dans tous ses groupes.
  const entity = entitySheetOf(user);
  if (entity) {
    // Sous l'entité : l'homunculus actif de chaque groupe (fiche classique), ou une invitation à le choisir.
    return (
      <div className="cs-widget-groups">
        <EntityLine sheet={entity} />
        {groups.map((g) => {
          const c = chars.find((x) => x.ownerId === user.id && x.groupId === g.id && !x.deadAt && (x.state as CharacterState).extra);
          return (
            <div key={g.id} className="stack-xs">
              <span className="label">{groups.length > 1 ? `👥 ${g.name} · homunculus actif` : "Homunculus actif"}</span>
              {c ? (
                <CharacterLine c={c} groupId={g.id} />
              ) : (
                <Link href={HREF} className="cs-widget-hint">
                  Choisir l&apos;homunculus qui rejoint le groupe
                </Link>
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
            ) : proposals.some((x) => x.ownerId === user.id && x.groupId === g.id && x.status === "pending") ? (
              <p className="muted small">🗝️ Ton personnage proposé depuis le coffre attend la réponse de ton MJ.</p>
            ) : hasConcept(user.id, g.id) ? (
              <p className="muted small">
                💡 Ton concept de personnage attend la réponse de ton MJ.{" "}
                <Link href={`${HREF}?groupe=${g.id}`} className="text-link">
                  Le relire
                </Link>
              </p>
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
  // Fiche d'un homunculus : son niveau suit l'Écho, pas de montée de niveau ici.
  const extra = Boolean(s.extra);
  const canLevelUp = !extra && c.grantedLevel > s.level;
  const ready = c.prepared?.level === s.level + 1;
  const todo = c.foundryTodo?.items.filter((i) => !i.done).length ?? 0;
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
          ✦ Monter de niveau{ready && " · choix prêts"}
        </Link>
      )}
      {!extra && !canLevelUp && todo > 0 && (
        <Link href={`${HREF}?groupe=${groupId}`} className="cs-widget-hint">
          🧭 {todo} chose{todo > 1 ? "s" : ""} à reporter dans Foundry
        </Link>
      )}
      {!extra && !canLevelUp && todo === 0 && s.level < MAX_LEVEL && (
        <Link href={`${HREF}?groupe=${groupId}`} className="cs-widget-hint">
          {ready ? `✓ Choix du niveau ${s.level + 1} prêts` : `Préparer le niveau ${s.level + 1}`}
        </Link>
      )}
    </div>
  );
}

/** Fiche de l'entité (TODO(entité) : fiche complète) : nom, niveau d'Écho et sa constellation. */
function EntityLine({ sheet }: { sheet: EntitySheetData }) {
  const lit = litStars(sheet.echo);
  return (
    <div className="cs-widget">
      <Link href={HREF} className="entity-sky">
        <EntityConstellation echo={sheet.echo} />
        <span className="stack-xs">
          <strong className="cs-widget-name">{sheet.name || "Entité sans nom"}</strong>
          <span className="muted small">
            Écho {sheet.echo} · {lit} étoile{lit > 1 ? "s" : ""} sur 8 rallumée{lit > 1 ? "s" : ""}
          </span>
        </span>
      </Link>
      {!sheet.name && (
        <Link href={HREF} className="cs-widget-hint">
          Donner un nom à ton entité
        </Link>
      )}
    </div>
  );
}
