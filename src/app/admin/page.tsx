import { requireAdmin } from "@/lib/auth";
import { getUsers, getAllHomunculi } from "@/lib/db";
import { TOOLS } from "@/tools/registry";
import Header from "@/components/Header";
import Flash from "@/components/Flash";
import CountUp from "@/components/CountUp";
import { clampEcho } from "@/tools/homunculus/echo";
import { TOOL_META as HOMUNCULUS_META } from "@/tools/homunculus-creator/meta";
import { createPlayer } from "./actions";
import PlayerList, { type PlayerRow } from "./PlayerList";
import PageMain from "@/components/PageMain";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const admin = await requireAdmin();
  const { error, ok } = await searchParams;
  const players = (await getUsers()).filter((u) => u.role === "player");
  const homunculi = await getAllHomunculi();

  const rows: PlayerRow[] = players
    .map((p) => {
      const sheets = homunculi.filter((h) => h.ownerId === p.id);
      return {
        id: p.id,
        name: p.name,
        code: p.code,
        echo: p.tools.includes(HOMUNCULUS_META.id) ? clampEcho(p.echo) : null,
        tools: TOOLS.filter((t) => p.tools.includes(t.id)).map((t) => ({ id: t.id, name: t.name, icon: t.icon })),
        sheets: sheets.length,
        sheetsComplete: sheets.filter((h) => h.complete).length,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  const stats = [
    { label: "Joueurs", value: players.length },
    { label: "Outils", value: TOOLS.length },
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
          <p className="muted">Crée les joueurs, donne-leur un code et choisis les outils auxquels ils ont accès.</p>
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
            <button className="btn">+ Créer</button>
          </form>
        </section>

        <section className="stack">
          <h2 className="subtitle">Joueurs</h2>
          <PlayerList players={rows} />
        </section>
      </PageMain>
    </>
  );
}
