// Widget du tableau de bord « Mon groupe » : le personnage en jeu de chaque membre des groupes du joueur.
// Composant serveur. Reste neutre : la fiche d'un homunculus apparaît comme un personnage ordinaire
// (classe et niveau), et un joueur de l'Atelier sans homunculus actif « n'a pas encore de personnage ».
import { getCharacters, getGroups, getUsers, type User } from "@/lib/db";
import { membersOf, visibleGroups } from "@/lib/groups";
import { isEntityPlayer } from "@/tools/homunculus/entity";
import { shortLabel } from "./rules";
import type { CharacterState } from "./types";

export default async function GroupWidget({ user }: { user: User }) {
  const [chars, users, allGroups] = await Promise.all([getCharacters(), getUsers(), getGroups()]);
  const groups = visibleGroups(user, allGroups);
  if (groups.length === 0) return <p className="muted">Tu ne fais partie d&apos;aucun groupe pour l&apos;instant.</p>;
  const multi = groups.length > 1;
  // Pour le joueur lui-même seulement (rendu serveur) : une Entité sans homunculus actif le voit dit ainsi.
  const myEmpty = isEntityPlayer(user) ? "Aucun homunculus actif" : "Pas encore de personnage";

  return (
    <div className="grp-groups">
      {groups.map((g) => {
        const members = membersOf(users, g.id).map((m) => {
          const c = chars.find((x) => x.ownerId === m.id && x.groupId === g.id && !x.deadAt);
          return { m, s: c?.state as CharacterState | undefined, me: m.id === user.id };
        });
        // Toi d'abord, puis les personnages, puis les membres sans personnage.
        members.sort((a, b) => Number(b.me) - Number(a.me) || Number(Boolean(b.s)) - Number(Boolean(a.s)) || a.m.name.localeCompare(b.m.name, "fr"));
        const count = members.filter((x) => x.s).length;
        return (
          <section key={g.id} className="stack-xs" aria-label={`Groupe ${g.name}`}>
            <span className="label">
              {multi ? `👥 ${g.name} · ` : ""}
              {count} personnage{count > 1 ? "s" : ""} en jeu
            </span>
            <ul className="grp-grid">
              {members.map(({ m, s, me }) => (
                <li key={m.id} className={`grp-card${me ? " me" : ""}${s ? "" : " grp-none"}`}>
                  <span className="cs-portrait grp-portrait" aria-hidden="true">
                    {(s?.name || m.name).charAt(0).toUpperCase()}
                    {s && <span className="cs-level">{s.level}</span>}
                  </span>
                  <span className="stack-xs grp-text">
                    <strong className="grp-name">
                      {s ? s.name : m.name}
                      {me && <span className="chip chip-accent">toi</span>}
                    </strong>
                    <span className="muted small">{s ? `${shortLabel(s)} · ${m.name}` : me ? myEmpty : "Pas encore de personnage"}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
