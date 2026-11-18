import Link from "next/link";
import { requireUser, canUseTool } from "@/lib/auth";
import { TOOLS } from "@/tools/registry";
import Header from "@/components/Header";
import Widget from "@/components/Widget";
import { clampEcho } from "@/tools/homunculus/echo";
import { TOOL_META as HOMUNCULUS_META } from "@/tools/homunculus-creator/meta";
import PageMain from "@/components/PageMain";

function greeting(): string {
  const hour = Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hour12: false, timeZone: "Europe/Paris" }).format(new Date()));
  return hour >= 18 || hour < 5 ? "Bonsoir" : "Bonjour";
}

export default async function HomePage() {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const tools = TOOLS.filter((t) => canUseTool(user, t.id));
  // Tableau de bord : un panneau par outil qui en propose un, dans l'ordre demandé.
  const widgets = tools
    .filter((t) => t.widget)
    .sort((a, b) => (a.widget!.order ?? 100) - (b.widget!.order ?? 100));

  const { notes } = user.profile;
  // L'Écho (Atelier de Rigel) s'affiche dans le profil des joueurs qui ont l'outil.
  const fields =
    !isAdmin && user.tools.includes(HOMUNCULUS_META.id)
      ? [{ label: "Écho", value: String(clampEcho(user.echo)) }, ...user.profile.fields]
      : user.profile.fields;
  const hasProfile = fields.length > 0 || notes.trim() !== "";

  return (
    <>
      <Header user={user} />
      <PageMain className="page page-dash stack-lg">
        <section className="hero">
          <p className="eyebrow">{greeting()}</p>
          <h1 className="title">{isAdmin ? "Maître du jeu" : user.name}</h1>
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
            {widgets.map((t) => {
              const W = t.widget!.component;
              return (
                <Widget key={t.id} title={t.widget!.title ?? t.name} icon={t.icon} href={`/outils/${t.id}`} wide={t.widget!.wide} transitionName={`tool-${t.id}`}>
                  <W user={user} />
                </Widget>
              );
            })}

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

            {tools.length > 0 && (
              <Widget title="Tous les outils" icon="🧰">
                <ul className="tool-links">
                  {tools.map((t) => (
                    <li key={t.id}>
                      <Link href={`/outils/${t.id}`} className="tool-link">
                        <span className="tool-icon" aria-hidden="true">
                          {t.icon}
                        </span>
                        <span className="stack-xs">
                          <strong>{t.name}</strong>
                          <span className="muted small">{t.description}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Widget>
            )}
          </div>
        )}
      </PageMain>
    </>
  );
}
