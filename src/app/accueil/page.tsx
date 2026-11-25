import { requireUser, canUseTool } from "@/lib/auth";
import { TOOLS } from "@/tools/registry";
import Header from "@/components/Header";
import Widget from "@/components/Widget";
import { clampEcho } from "@/tools/homunculus/echo";
import PageMain from "@/components/PageMain";
import { entitySheetOf, isEntityPlayer } from "@/tools/homunculus/entity";
import { ASTRAL_LABELS, NAV_GLYPHS, skyLine } from "@/tools/homunculus/astral/theme";
import { getPlayerDashboard } from "@/lib/dashboard";
import PlayerDashboard from "@/components/dashboard/PlayerDashboard";
import AdminActivity from "@/components/dashboard/AdminActivity";

function greeting(): string {
  const hour = Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hour12: false, timeZone: "Europe/Paris" }).format(new Date()));
  return hour >= 18 || hour < 5 ? "Bonsoir" : "Bonjour";
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ groupe?: string }> }) {
  const user = await requireUser();
  const isAdmin = user.role === "admin";

  // Joueur (hors Entité) : le tableau de bord du Navire (l'histoire, mon personnage, l'escale).
  if (!isAdmin && !isEntityPlayer(user)) {
    const { groupe } = await searchParams;
    const data = await getPlayerDashboard(user, groupe);
    return (
      <>
        <Header user={user} />
        <PageMain className="page page-dash">
          <PlayerDashboard data={data} greeting={greeting()} name={user.name} />
        </PageMain>
      </>
    );
  }
  const tools = TOOLS.filter((t) => canUseTool(user, t.id));
  // Tableau de bord : un panneau par outil qui en propose un, dans l'ordre demandé.
  const widgets = tools
    .flatMap((t) => [...(t.widget ? [t.widget] : []), ...(t.extraWidgets ?? [])].map((w, i) => ({ t, w, main: i === 0 && Boolean(t.widget), key: i === 0 ? t.id : `${t.id}-${i}` })))
    .filter(({ w }) => !(isAdmin && w.playersOnly))
    .sort((a, b) => (a.w.order ?? 100) - (b.w.order ?? 100));

  const { notes } = user.profile;
  // L'Écho (Atelier de Rigel) s'affiche dans le profil des joueurs qui ont l'outil.
  const fields =
    !isAdmin && isEntityPlayer(user)
      ? [{ label: "Écho", value: String(clampEcho(user.echo)) }, ...user.profile.fields]
      : user.profile.fields;
  const hasProfile = fields.length > 0 || notes.trim() !== "";
  // Joueur de l'Atelier : thème « Astre déchu » (salut céleste, nom de l'entité, glyphes, « Mon entité »).
  const entity = entitySheetOf(user);
  // Seul le panneau principal de la fiche devient « Mon entité » ; les glyphes suivent l'outil ou l'id du panneau.
  const titleOf = (id: string, main: boolean, title: string) => (entity && main && id === "personnage" ? ASTRAL_LABELS.personnage : title);
  const glyphOf = (id: string, main: boolean, widgetId?: string) => (entity ? (widgetId ? NAV_GLYPHS[widgetId] : main ? NAV_GLYPHS[id] : undefined) : undefined);

  return (
    <>
      <Header user={user} />
      <PageMain className="page page-dash stack-lg">
        <section className="hero">
          <p className="eyebrow">{entity ? skyLine() : greeting()}</p>
          <h1 className="title">{isAdmin ? "Maître du jeu" : entity?.name || user.name}</h1>
        </section>

        {tools.length === 0 && !hasProfile ? (
          <div className="empty">
            <span className="empty-icon" aria-hidden="true">
              🕯️
            </span>
            <p>Aucun outil pour l&apos;instant. Ton MJ t&apos;en donnera bientôt.</p>
          </div>
        ) : (
          <div className="dashboard">
            {widgets.map(({ t, w, key, main }) => {
              const W = w.component;
              return (
                <Widget key={key} title={titleOf(t.id, main, (isAdmin && w.adminTitle) || w.title || t.name)} icon={glyphOf(t.id, main, w.id) || w.icon || t.icon} href={`/outils/${t.id}`} wide={w.wide} transitionName={`tool-${key}`}>
                  <W user={user} />
                </Widget>
              );
            })}

            {isAdmin && (
              <Widget title="Activité à bord" icon="⚓" wide>
                <AdminActivity />
              </Widget>
            )}

            {hasProfile && (
              <Widget title="Ma fiche" icon="📜">
                <div className="stack">
                  {fields.length > 0 && (
                    <dl className="profile">
                      {fields.map((f, i) => (
                        <div key={i} className="profile-row">
                          <dt>{f.label}</dt>
                          <dd>{f.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {notes.trim() && <p className="notes muted">{notes}</p>}
                </div>
              </Widget>
            )}

          </div>
        )}
      </PageMain>
    </>
  );
}
