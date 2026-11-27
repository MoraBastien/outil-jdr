// Tableau de bord du MJ (composant serveur) : le poste de commandement d'un groupe.
// Même passerelle que les joueurs (le voyage, la prochaine traversée), puis ce qui attend le MJ, la table et l'histoire ;
// à droite le port, l'activité et le cimetière.
import Link from "next/link";
import type { AdminDashboard as Data } from "@/lib/adminDashboard";
import { formatCp } from "@/tools/marche/meta";
import { NAV_ICONS } from "../navIcons";
import { ANCHOR, ARROW, CHECK, Glyph, Route, clip, countdown, daysUntil, fmtDay, fmtMonth, groupByAgo, hour, isle } from "./shared";

const fmtDate = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" }).format(new Date(iso));
const WEIGHT = { now: "À faire", soon: "Avant la séance", note: "Pour mémoire" } as const;

export default function AdminDashboard({ data, greeting }: { data: Data; greeting: string }) {
  if (!data.group)
    return (
      <div className="nv">
        <section className="nv-voyage">
          <div className="nv-voyage-head">
            <div className="stack-xs">
              <h1 className="nv-hello">{greeting}, maître du jeu</h1>
              <p className="nv-voyage-line">Aucun groupe pour l&apos;instant. Crée ta première table dans l&apos;administration.</p>
            </div>
            <Link href="/admin" className="btn btn-small">
              Créer un groupe
            </Link>
          </div>
        </section>
      </div>
    );

  const next = data.next;
  const days = next ? daysUntil(next.date) : null;
  const hasRoute = data.route.length + (data.nextIsland ? 1 : 0) > 0;
  // Dates à proposer ou à fixer : la barre de la prochaine traversée porte déjà ce bouton.
  const todos = data.todos.filter((t) => t.id !== "dates" && t.id !== "fixer");
  const pressing = todos.filter((t) => t.weight !== "note").length;

  return (
    <div className="nv nv-admin">
      {/* ---------- Le voyage du groupe ---------- */}
      <section className="nv-voyage" aria-labelledby="nv-hello">
        <div className="nv-voyage-head">
          <div className="stack-xs">
            <h1 id="nv-hello" className="nv-hello">
              {data.group.name}
            </h1>
            <p className="nv-voyage-line">
              {greeting}, maître du jeu.{" "}
              {data.harbor ? (
                <>
                  Le Navire mouille à <span className="nv-isle" style={isle(data.harbor.color)}>{data.harbor.name}</span>
                </>
              ) : (
                "Le Navire vogue en pleine mer"
              )}
              {data.nextIsland && (
                <>
                  {" "}
                  · cap sur <span className="nv-isle" style={isle(data.nextIsland.color)}>{data.nextIsland.name}</span>
                </>
              )}
            </p>
          </div>
          <div className="nv-voyage-tools">
            {data.groups.length > 1 && (
              <nav className="nv-groups" aria-label="Groupe affiché">
                {data.groups.map((g) => (
                  <Link key={g.id} href={`/accueil?groupe=${g.id}`} className={`chip${g.id === data.group!.id ? " chip-accent" : ""}`} aria-current={g.id === data.group!.id ? "true" : undefined}>
                    {g.name}
                    {g.todo > 0 && (
                      <span className="nv-tab-count num" aria-label={`${g.todo} à faire`}>
                        {g.todo}
                      </span>
                    )}
                  </Link>
                ))}
              </nav>
            )}
            <Link href="/outils/carte" className="nv-link">
              Carte de l&apos;archipel <Glyph d={ARROW} size={14} />
            </Link>
          </div>
        </div>
        {hasRoute && <Route data={data} />}

        <div className={`nv-crossing${next ? " fixed" : ""}`} role="region" aria-labelledby="nv-next">
          {next ? (
            <>
              <div className="nv-crossing-when">
                <h2 id="nv-next" className="nv-countdown">
                  {next.confirmed ? countdown(days, next.date, next.start) : "Date à fixer"}
                </h2>
                <p className="nv-crossing-meta">
                  {next.confirmed ? (
                    <>
                      <span className="nv-cap">{fmtDay(next.date)}</span> à {hour(next.start)} · {next.title}
                    </>
                  ) : (
                    <>
                      {next.title} · la plus demandée : {fmtDay(next.date)}
                    </>
                  )}
                </p>
              </div>
              <div className="nv-crossing-crew">
                <p className="nv-aboard">
                  <strong className="num">{next.confirmed ? next.aboard : next.answered}</strong>
                  <span>
                    sur {next.crew} {next.confirmed ? "à bord" : "ont répondu"}
                  </span>
                </p>
                {next.missing.length > 0 && (
                  <p className="nv-missing">
                    <span className="nv-faces" aria-hidden="true">
                      {next.missing.map((m) => (
                        <span key={m} title={m}>
                          {m.charAt(0).toUpperCase()}
                        </span>
                      ))}
                    </span>
                    <span>
                      {next.missing.length} sans réponse<span className="visually-hidden"> : {next.missing.join(", ")}</span>
                    </span>
                  </p>
                )}
              </div>
              <div className="nv-crossing-act">
                <Link href="/outils/planning" className={`btn btn-small${next.confirmed ? " btn-ghost" : ""}`}>
                  {next.confirmed ? "Ouvrir le planning" : "Fixer la date"}
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="nv-crossing-when">
                <h2 id="nv-next" className="nv-countdown quiet">
                  Pas encore de date
                </h2>
                <p className="nv-crossing-meta">Aucun sondage ouvert : les joueurs attendent tes propositions.</p>
              </div>
              <div className="nv-crossing-act">
                <Link href="/outils/planning" className="btn btn-small">
                  Proposer des dates
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      <div className="nv-deck">
        <div className="nv-main">
          {/* ---------- Ce qui attend le MJ ---------- */}
          {todos.length === 0 ? (
            <p className="nv-ready">
              <span className="nv-ready-mark" aria-hidden="true">
                <Glyph d={CHECK} size={16} />
              </span>
              <span>
                <strong>{next ? "Tout est prêt pour la prochaine traversée" : "Rien d'autre ne t'attend"}</strong>
                <span className="nv-ready-sub">Fiches, journal et port sont à jour.</span>
              </span>
            </p>
          ) : (
            <section className="nv-panel nv-todo" aria-labelledby="nv-todo">
              <header className="nv-head">
                <h2 id="nv-todo" className="nv-h">
                  À préparer
                </h2>
                <span className="nv-side">{pressing > 0 ? `${pressing} avant la séance` : "Rien d'urgent"}</span>
              </header>
              <ul className="nv-checks">
                {todos.map((t) => (
                  <li key={t.id}>
                    <Link href={t.href} className={`nv-check nv-task w-${t.weight}`}>
                      <span className="nv-dot" aria-hidden="true" />
                      <span className="nv-row-main">
                        <span>
                          {t.label}
                          <span className="visually-hidden"> ({WEIGHT[t.weight]})</span>
                        </span>
                        <span className="nv-row-under">{t.detail}</span>
                      </span>
                      <Glyph d={ARROW} size={14} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ---------- La table ---------- */}
          <section className="nv-panel" aria-labelledby="nv-table">
            <header className="nv-head">
              <h2 id="nv-table" className="nv-h">
                La table
              </h2>
              <Link href="/outils/personnage" className="nv-link">
                Personnages <Glyph d={ARROW} size={14} />
              </Link>
            </header>
            {data.seats.length === 0 ? (
              <p className="nv-quiet">Aucun joueur dans ce groupe. Ajoute-les depuis l&apos;administration.</p>
            ) : (
              <div className="nv-table-wrap">
                <table className="nv-table">
                  <thead>
                    <tr>
                      <th scope="col">Personnage</th>
                      <th scope="col" className="nv-col-class">
                        Classe
                      </th>
                      <th scope="col" className="num">
                        PV
                      </th>
                      <th scope="col" className="num">
                        CA
                      </th>
                      <th scope="col">{next?.confirmed ? "Présence" : "Suivi"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.seats.map((s) => (
                      <tr key={s.player}>
                        <td>
                          <span className="nv-who">
                            <span className="nv-avatar" aria-hidden="true">
                              {(s.character?.name ?? s.player).charAt(0).toUpperCase()}
                            </span>
                            <span className="nv-mate-id">
                              <strong>{s.character?.name ?? <span className="nv-quiet">Pas de personnage</span>}</strong>
                              <span>{s.player}</span>
                            </span>
                          </span>
                        </td>
                        <td className="nv-col-class">{s.character?.label ?? "—"}</td>
                        <td className="num">{s.character?.hpMax ?? "—"}</td>
                        <td className="num">{s.character?.ac ?? "—"}</td>
                        <td>
                          {next?.confirmed && s.character ? (
                            <span className={`nv-pill p-${s.presence ?? "none"}`}>{s.presence === "yes" ? "À bord" : s.presence === "no" ? "Absent" : s.presence === "maybe" ? "Peut-être" : "Sans réponse"}</span>
                          ) : s.waiting === "proposal" ? (
                            <span className="nv-pill p-maybe">Fiche à valider</span>
                          ) : s.waiting === "concept" ? (
                            <span className="nv-pill p-maybe">Concept</span>
                          ) : s.character?.levelReady ? (
                            <span className="nv-pill p-maybe">Niv. {s.character.levelReady} préparé</span>
                          ) : s.character?.levelGranted ? (
                            <span className="nv-pill p-none">Niv. accordé, pas monté</span>
                          ) : (
                            <span className="nv-quiet small">À jour</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ---------- L'histoire ---------- */}
          <section className="nv-panel nv-story" aria-labelledby="nv-story">
            <header className="nv-head">
              <h2 id="nv-story" className="nv-h">
                Où en est l&apos;histoire
              </h2>
              <Link href="/outils/chronique" className="nv-link">
                Chronique <Glyph d={ARROW} size={14} />
              </Link>
            </header>
            {data.story ? (
              <article className="nv-entry">
                <p className="nv-entry-title">
                  <span className="num">Séance {data.story.number}</span>
                  {data.story.title && <span> · {data.story.title}</span>}
                  {data.story.island && (
                    <span className="nv-isle-tag" style={isle(data.story.island.color)}>
                      {data.story.island.name}
                    </span>
                  )}
                </p>
                {data.story.summary ? <p className="nv-entry-text">{clip(data.story.summary, 300)}</p> : <p className="nv-quiet">Résumé pas encore écrit.</p>}
              </article>
            ) : (
              <p className="nv-quiet">Aucune séance publiée. Le journal de la première séance apparaîtra ici.</p>
            )}
            <div className="nv-quests">
              <h3 className="nv-h3">
                Quêtes en cours <span className="num nv-count">{data.quests.length}</span>
                {data.questsReady > 0 && <span className="nv-row-under">· {data.questsReady} prête{data.questsReady > 1 ? "s" : ""} à lancer</span>}
              </h3>
              {data.quests.length === 0 ? (
                <p className="nv-quiet">Aucune quête en cours.</p>
              ) : (
                <ul className="nv-rows">
                  {data.quests.slice(0, 5).map((q) => (
                    <li key={q.id}>
                      <Link href={`/outils/quetes?quete=${q.id}`} className="nv-row">
                        <Glyph d={NAV_ICONS.quetes} />
                        <span className="nv-row-main">{q.title}</span>
                        {q.hidden && <span className="nv-pill p-none">Cachée</span>}
                        {q.giver && <span className="nv-row-side">{q.giver}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        <aside className="nv-rail" aria-label="Le port et la vie à bord">
          {/* ---------- Le port ---------- */}
          <section className={`nv-panel${data.harbor ? " nv-port" : ""}`} style={data.harbor ? isle(data.harbor.color) : undefined} aria-labelledby="nv-port">
            <header className="nv-head">
              <h2 id="nv-port" className="nv-h">
                {data.harbor ? <>Le port de <span className="nv-isle">{data.harbor.name}</span></> : "Le port"}
              </h2>
              {data.port && data.port.spentCp > 0 && <strong className="gold num nv-purse" title="Dépensé depuis l'arrivée au port">{formatCp(data.port.spentCp)}</strong>}
            </header>
            {!data.port ? (
              <p className="nv-quiet">Le Navire est en mer. Fais-le jeter l&apos;ancre depuis la carte pour ouvrir un port.</p>
            ) : (
              <>
                <p className="nv-sub">
                  {data.port.shops === 0 ? "Aucune échoppe ouverte" : `${data.port.shops} échoppe${data.port.shops > 1 ? "s" : ""} ouverte${data.port.shops > 1 ? "s" : ""}`} ·{" "}
                  {data.port.purchases.length === 0 ? "aucun achat depuis l'arrivée" : "achats depuis l'arrivée"}
                </p>
                {data.port.purchases.length > 0 && (
                  <ul className="nv-rows">
                    {data.port.purchases.map((p, i) => (
                      <li key={i} className="nv-row">
                        <span className="nv-row-main">
                          {p.who}
                          <span className="nv-row-under">{p.what}</span>
                        </span>
                        <span className="nv-row-side gold num">{formatCp(p.totalCp)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href="/outils/marche" className="btn btn-ghost btn-small nv-port-btn">
                  {data.port.shops === 0 ? "Ouvrir une échoppe" : "Gérer le marché"}
                </Link>
              </>
            )}
          </section>

          {/* ---------- Les traversées suivantes ---------- */}
          {data.later.length > 0 && (
            <section className="nv-panel" aria-labelledby="nv-cal">
              <header className="nv-head">
                <h2 id="nv-cal" className="nv-h">
                  Traversées suivantes
                </h2>
              </header>
              <ul className="nv-rows">
                {data.later.map((s, i) => (
                  <li key={i} className="nv-row">
                    <span className={`nv-date${s.confirmed ? " on" : ""}`}>
                      <strong className="num">{Number(s.date.split("-")[2])}</strong>
                      <span>{fmtMonth(s.date)}</span>
                    </span>
                    <span className="nv-row-main">{s.title}</span>
                    <span className="nv-row-side">{s.confirmed ? hour(s.start) : "Sondage"}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ---------- Activité à bord ---------- */}
          <section className="nv-panel" aria-labelledby="nv-feed">
            <header className="nv-head">
              <h2 id="nv-feed" className="nv-h">
                Activité à bord
              </h2>
            </header>
            {data.activity.length === 0 ? (
              <p className="nv-quiet">Calme plat : rien ne s&apos;est passé entre les séances pour l&apos;instant.</p>
            ) : (
              <ol className="nv-feed">
                {groupByAgo(data.activity).map((g) => (
                  <li key={g.label}>
                    <p className="nv-feed-when">{g.label}</p>
                    <ul>
                      {g.items.map((a) => {
                        const line = (
                          <>
                            <span className={`nv-feed-icon k-${a.kind}${a.initial === "⚓" ? " sys" : ""}`} aria-hidden="true">
                              {a.initial === "⚓" ? <Glyph d={ANCHOR} size={13} /> : a.initial}
                            </span>
                            <span className="nv-feed-text">{a.text}</span>
                          </>
                        );
                        return <li key={a.id}>{a.href ? <Link href={a.href}>{line}</Link> : <span>{line}</span>}</li>;
                      })}
                    </ul>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* ---------- Le cimetière ---------- */}
          {data.graves.length > 0 && (
            <section className="nv-panel" aria-labelledby="nv-graves">
              <header className="nv-head">
                <h2 id="nv-graves" className="nv-h">
                  Cimetière
                </h2>
                <Link href="/outils/cimetiere" className="nv-link">
                  Tout voir <Glyph d={ARROW} size={14} />
                </Link>
              </header>
              <ul className="nv-rows">
                {data.graves.map((g, i) => (
                  <li key={i} className="nv-row">
                    <span className="nv-row-main">
                      {g.name}
                      <span className="nv-row-under">{g.label}</span>
                    </span>
                    <span className="nv-row-side">{fmtDate(g.diedAt)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
