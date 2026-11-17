import Link from "next/link";
import { requireUser, canUseTool } from "@/lib/auth";
import { TOOLS } from "@/tools/registry";
import Header from "@/components/Header";
import { clampEcho } from "@/tools/homunculus/echo";
import { TOOL_META as HOMUNCULUS_META } from "@/tools/homunculus-creator/meta";

export default async function HomePage() {
  const user = await requireUser();
  const tools = TOOLS.filter((t) => canUseTool(user, t.id));
  const { notes } = user.profile;
  // L'Écho (Atelier de Rigel) s'affiche dans le profil des joueurs qui ont l'outil.
  const fields =
    user.role === "player" && user.tools.includes(HOMUNCULUS_META.id)
      ? [{ label: "Écho", value: String(clampEcho(user.echo)) }, ...user.profile.fields]
      : user.profile.fields;
  const hasProfile = fields.length > 0 || notes.trim() !== "";

  return (
    <>
      <Header user={user} />
      <main className="page stack-lg">
        <h1 className="title">{user.role === "admin" ? "Tous les outils" : user.name}</h1>

        {hasProfile && (
          <section className="card stack">
            <h2 className="subtitle">Profil</h2>
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
            {notes.trim() && <p className="notes">{notes}</p>}
          </section>
        )}

        <section className="stack">
          <h2 className="subtitle">Outils</h2>
          {tools.length === 0 ? (
            <p className="muted">Aucun outil pour l&apos;instant. Ton MJ t&apos;en donnera bientôt.</p>
          ) : (
            <div className="tool-grid">
              {tools.map((t) => (
                <Link key={t.id} href={`/outils/${t.id}`} className="card tool-card">
                  <span className="tool-icon">{t.icon}</span>
                  <strong>{t.name}</strong>
                  <span className="muted">{t.description}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
