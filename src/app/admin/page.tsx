import { requireAdmin } from "@/lib/auth";
import { getUsers, getAllHomunculi, getGroups } from "@/lib/db";
import { isGroupTool, membersOf, userGroupIds } from "@/lib/groups";
import { TOOLS } from "@/tools/registry";
import Header from "@/components/Header";
import Flash from "@/components/Flash";
import CountUp from "@/components/CountUp";
import { clampEcho } from "@/tools/homunculus/echo";
import { TOOL_META as HOMUNCULUS_META } from "@/tools/homunculus-creator/meta";
import { addGroupMember, createGroup, createPlayer, deleteGroup, removeGroupMember, renameGroup } from "./actions";
import PlayerList, { type PlayerRow } from "./PlayerList";
import PageMain from "@/components/PageMain";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const admin = await requireAdmin();
  const { error, ok } = await searchParams;
  const [users, homunculi, groups] = await Promise.all([getUsers(), getAllHomunculi(), getGroups()]);
  const players = users.filter((u) => u.role === "player");
  const groupName = new Map(groups.map((g) => [g.id, g.name]));

  const rows: PlayerRow[] = players
    .map((p) => {
      const sheets = homunculi.filter((h) => h.ownerId === p.id);
      return {
        id: p.id,
        name: p.name,
        code: p.code,
        echo: p.tools.includes(HOMUNCULUS_META.id) ? clampEcho(p.echo) : null,
        tools: TOOLS.filter((t) => !isGroupTool(t.id) && p.tools.includes(t.id)).map((t) => ({ id: t.id, name: t.name, icon: t.icon })),
        groups: userGroupIds(p).flatMap((g) => (groupName.has(g) ? [groupName.get(g)!] : [])),
        sheets: sheets.length,
        sheetsComplete: sheets.filter((h) => h.complete).length,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  const stats = [
    { label: "Joueurs", value: players.length },
    { label: "Groupes", value: groups.length },
    { label: "Fiches d'homunculus", value: homunculi.length },
    { label: "Fiches complètes", value: homunculi.filter((h) => h.complete).length },
  ];

  return (
    <>
      <Header user={admin} />
      <PageMain className="page stack-lg">
        <div className="page-head">
          <p className="eyebrow">Administration</p>
          <h1 className="title">Joueurs &amp; outils</h1>
          <p className="muted">
            Crée les joueurs et range-les dans des groupes de jeu. Être dans un groupe donne accès au planning et à la fiche de personnage de ce
            groupe ; les autres outils se cochent sur la page du joueur.
          </p>
        </div>

        {/* Clé unique à chaque rendu serveur : le message réapparaît même s'il est identique au précédent. */}
        <Flash key={Date.now()} ok={ok} error={error} />

        <section className="stat-grid" aria-label="Résumé">
          {stats.map((s) => (
            <div key={s.label} className="stat">
              <CountUp className="stat-value" value={s.value} />
              <span className="label">{s.label}</span>
            </div>
          ))}
        </section>

        <section className="card stack">
          <div className="section-head">
            <h2 className="subtitle">Nouveau joueur</h2>
            <span className="muted small">Laisse le code vide pour en générer un.</span>
          </div>
          <form action={createPlayer} className="inline-form">
            <input name="name" className="input" placeholder="Nom du joueur / personnage" required aria-label="Nom" />
            <input
              name="code"
              className="input input-code"
              placeholder="Code (vide = généré)"
              autoComplete="off"
              aria-label="Code d'accès"
            />
            {groups.length > 0 && (
              <select name="group" className="input" aria-label="Groupe" defaultValue={groups[0].id}>
                <option value="">Sans groupe</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            )}
            <button className="btn">+ Créer</button>
          </form>
        </section>

        <section className="stack">
          <div className="section-head">
            <h2 className="subtitle">Groupes de jeu</h2>
            <span className="muted small">Un joueur peut être dans plusieurs groupes : il aura un personnage par groupe.</span>
          </div>
          <div className="group-grid">
            {groups.map((g) => {
              const members = membersOf(users, g.id);
              const others = players.filter((p) => !userGroupIds(p).includes(g.id));
              return (
                <article key={g.id} className="card group-card">
                  <header className="group-head">
                    <h3 className="group-name">{g.name}</h3>
                    <span className="chip">
                      {members.length} joueur{members.length > 1 ? "s" : ""}
                    </span>
                  </header>
                  {members.length === 0 ? (
                    <p className="muted small">Aucun joueur pour l&apos;instant.</p>
                  ) : (
                    <ul className="group-members">
                      {members.map((m) => (
                        <li key={m.id}>
                          <span className="avatar" aria-hidden="true">
                            {m.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="group-member-name">{m.name}</span>
                          <form action={removeGroupMember}>
                            <input type="hidden" name="groupId" value={g.id} />
                            <input type="hidden" name="userId" value={m.id} />
                            <button className="icon-btn danger-text" aria-label={`Retirer ${m.name} du groupe`} title="Retirer du groupe">
                              ×
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                  {others.length > 0 && (
                    <form action={addGroupMember} className="inline-form">
                      <input type="hidden" name="groupId" value={g.id} />
                      <select name="userId" className="input" aria-label={`Ajouter un joueur à ${g.name}`} required defaultValue="">
                        <option value="" disabled>
                          Ajouter un joueur…
                        </option>
                        {others.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <button className="btn btn-ghost btn-small">Ajouter</button>
                    </form>
                  )}
                  <footer className="group-foot">
                    <details className="group-more">
                      <summary className="link-btn">Renommer</summary>
                      <form action={renameGroup} className="inline-form">
                        <input type="hidden" name="id" value={g.id} />
                        <input name="name" className="input" defaultValue={g.name} required maxLength={80} aria-label="Nouveau nom" />
                        <button className="btn btn-small">OK</button>
                      </form>
                    </details>
                    <details className="group-more danger">
                      <summary>Supprimer</summary>
                      <form action={deleteGroup}>
                        <input type="hidden" name="id" value={g.id} />
                        <p className="muted small">Les sondages du groupe seront supprimés. Les fiches de personnage sont gardées.</p>
                        <button className="btn btn-danger btn-small">Supprimer « {g.name} »</button>
                      </form>
                    </details>
                  </footer>
                </article>
              );
            })}
            <form action={createGroup} className="card group-card group-new">
              <h3 className="group-name">Nouveau groupe</h3>
              <input name="name" className="input" placeholder="Ex. Campagne du jeudi" required maxLength={80} aria-label="Nom du groupe" />
              <button className="btn">+ Créer le groupe</button>
            </form>
          </div>
        </section>

        <section className="stack">
          <h2 className="subtitle">Joueurs</h2>
          <PlayerList players={rows} />
        </section>
      </PageMain>
    </>
  );
}
