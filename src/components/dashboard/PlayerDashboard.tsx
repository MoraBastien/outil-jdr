// Tableau de bord d'un joueur (composant serveur) : « Saison en cours ».
// La campagne se regarde comme une série : la prochaine séance est l'épisode suivant mis en avant (date, présence,
// à faire), chaque séance vécue est un épisode illustré de son île ; à côté, mon personnage, les quêtes, le port.
import Link from "next/link";
import type { PlayerDashboard as Data } from "@/lib/dashboard";
import { formatCp } from "@/tools/marche/meta";
import PresenceButtons from "./PresenceButtons";
import IsleScene, { type Mood } from "./IsleScene";
import RailFocus from "./RailFocus";
import { NAV_ICONS } from "../navIcons";
import { ANCHOR, ARROW, Glyph, STAR, clip, countdown, daysUntil, fmtDay, fmtShortDay, groupByAgo, hour, isle, missingLine } from "./shared";

/** Icône de chaque tâche avant le départ : celle de l'outil où elle se fait. */
const TASK_ICON: Record<string, string> = { niveau: STAR, sorts: NAV_ICONS.grimoire, achats: NAV_ICONS.marche };
const fmtDate = (date: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
const SEA = { id: "mer", name: "Pleine mer", color: "#3fb0e6" };
/** Moment de la journée de chaque épisode : deux épisodes qui se suivent ne partagent jamais la même lumière. */
const MOODS: Mood[] = ["day", "dawn", "fog"];

export default function PlayerDashboard({ data, greeting, name }: { data: Data; greeting: string; name: string }) {
  if (!data.group)
    return (
      <div className="sv">
        <section className="sv-hero sv-hero-empty">
          <div className="sv-hero-copy">
            <h1 className="sv-title">
              {greeting}, {name}
            </h1>
            <p className="sv-meta">Tu ne fais partie d&apos;aucun équipage pour l&apos;instant. Ton MJ t&apos;ajoutera bientôt à un groupe.</p>
          </div>
        </section>
      </div>
    );

  const next = data.sessions[0];
  const days = next ? daysUntil(next.date) : null;
  const when = days !== null && days <= 0 ? "ce soir" : days === 1 ? "demain" : next ? fmtShortDay(next.date) : "";
  // La présence se donne avec les boutons : elle n'est jamais une tâche de la liste.
  const todo = data.checklist.filter((c) => !c.done && c.id !== "presence");
  const nextNumber = (data.story?.number ?? 0) + 1;
  // Le décor du bandeau : l'île de destination, sinon celle où mouille le Navire, sinon la pleine mer.
  const stage = next ? (data.nextIsland ?? data.harbor ?? SEA) : (data.harbor ?? data.nextIsland ?? SEA);
  const last = data.story;

  return (
    <div className="sv">
      <div className="sv-topline">
        <p>
          {greeting}, {name}.{" "}
          {data.harbor ? (
            <>
              Le Navire est à quai à <span className="sv-isle" style={isle(data.harbor.color)}>{data.harbor.name}</span>
            </>
          ) : (
            "Le Navire vogue en pleine mer"
          )}
          {data.nextIsland && (
            <>
              , cap sur <span className="sv-isle" style={isle(data.nextIsland.color)}>{data.nextIsland.name}</span>
            </>
          )}
          .
        </p>
        <div className="sv-topline-tools">
          {data.groups.length > 1 && (
            <nav className="sv-groups" aria-label="Équipage affiché">
              {data.groups.map((g) => (
                <Link key={g.id} href={`/accueil?groupe=${g.id}`} className={`sv-chip${g.id === data.group!.id ? " on" : ""}`} aria-current={g.id === data.group!.id ? "true" : undefined}>
                  {g.name}
                </Link>
              ))}
            </nav>
          )}
          {data.tools.map && (
            <Link href="/outils/carte" className="sv-link">
              Carte de l&apos;archipel <Glyph d={ARROW} size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* ---------- L'épisode suivant (ou, sans date, le dernier épisode) ---------- */}
      <section className="sv-hero" style={isle(stage.color)} aria-labelledby="db-today">
        <div className="sv-hero-art" aria-hidden="true">
          <IsleScene id={stage.id} name={stage.name} color={stage.color} mood={next ? "dusk" : "day"} />
        </div>
        <div className="sv-hero-copy">
          {next?.confirmed ? (
            <>
              <h1 id="db-today" className="sv-title">
                {next.title}
                {data.nextIsland && (<><span className="visually-hidden"> : </span><span className="sv-title-sub">{data.nextIsland.name}</span></>)}
              </h1>
              <p className="sv-meta">
                <span className="sv-badge">Épisode suivant</span>
                <span className="sv-cap">{fmtDay(next.date)}</span>
                <span>{hour(next.start)}</span>
                <strong className="sv-soon">{countdown(days, next.date, next.start).toLowerCase()}</strong>
              </p>
              <div className="sv-presence">
                <PresenceButtons pollId={next.pollId} mine={next.mine} when={when} />
                <p className="sv-aboard">
                  <strong className="num">{next.aboard}</strong> sur {next.crew} à bord
                </p>
              </div>
              {data.missing.length > 0 && <p className="sv-missing">{missingLine(data.missing.map((m) => m.name), next.mine === null)}</p>}
            </>
          ) : next ? (
            <>
              <h1 id="db-today" className="sv-title">
                {next.title}
                {data.nextIsland && (<><span className="visually-hidden"> : </span><span className="sv-title-sub">{data.nextIsland.name}</span></>)}
              </h1>
              <p className="sv-meta">
                <span className="sv-badge">Date à choisir</span>
                <span>la plus demandée : {fmtDay(next.date)}</span>
              </p>
              <Link href="/outils/planning" className={`sv-btn${next.answered === "done" ? " ghost" : ""}`}>
                {next.answered === "done" ? "Revoir mes disponibilités" : "Donner mes disponibilités"}
              </Link>
            </>
          ) : (
            <>
              <h1 id="db-today" className="sv-title">
                {data.harbor ? `Escale à ${data.harbor.name}` : "En pleine mer"}
              </h1>
              <p className="sv-meta">
                <span className="sv-badge quiet">Entre deux épisodes</span>
                <span>Pas encore de date : le MJ ouvrira bientôt un sondage.</span>
              </p>
              {last?.summary && (
                <p className="sv-recap">
                  <strong>
                    Précédemment, séance {last.number}
                    {last.island ? ` à ${last.island.name}` : ""} :
                  </strong>{" "}
                  {clip(last.summary, 190)}{" "}
                  {data.tools.chronicle && (
                    <Link href="/outils/chronique" className="sv-link inline">
                      Lire la chronique
                    </Link>
                  )}
                </p>
              )}
            </>
          )}

          {todo.length > 0 && (
            <ul className="sv-todo" aria-label="À faire avant le départ">
              {todo.map((c) => (
                <li key={c.id}>
                  <Link href={c.href} className="sv-task">
                    <span className="sv-task-ico" aria-hidden="true">
                      <Glyph d={TASK_ICON[c.id] ?? NAV_ICONS.personnage} size={14} />
                    </span>
                    <span>
                      <strong>À faire :</strong> {c.label.charAt(0).toLowerCase() + c.label.slice(1)}
                      {c.id === "niveau" && <span className="sv-task-sub"> · le MJ te l&apos;a accordé</span>}
                    </span>
                    <span className="sv-task-go">
                      {c.id === "niveau" ? "Monter de niveau" : c.hint} <Glyph d={ARROW} size={13} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="sv-deck">
        <div className="sv-main">
          {/* ---------- Les épisodes de la saison ---------- */}
          <section className="sv-row" aria-labelledby="sv-season">
            <header className="sv-row-head">
              <h2 id="sv-season" className="sv-h">
                Épisodes de la saison
              </h2>
              {data.tools.chronicle && (
                <Link href="/outils/chronique" className="sv-link">
                  Chronique complète <Glyph d={ARROW} size={14} />
                </Link>
              )}
            </header>
            {data.episodes.length === 0 && !next ? (
              <p className="sv-quiet">La saison n&apos;a pas encore commencé : le premier épisode apparaîtra après la première séance.</p>
            ) : (
              <ol className="sv-rail" id="sv-rail">
                {data.episodes.map((e) => (
                  <li key={e.number}>
                    <Link href="/outils/chronique" className="sv-tile">
                      <span className="sv-tile-art">
                        <IsleScene id={e.island?.id ?? `s${e.number}`} name={e.island?.name ?? "Pleine mer"} color={e.island?.color ?? SEA.color} mood={e.island ? MOODS[e.number % MOODS.length] : "fog"} />
                        <span className="sv-tile-num">Séance {e.number}</span>
                        {/* Au survol ou au focus : le résumé en surimpression, sans déplacer la rangée. */}
                        {e.summary && (
                          <span className="sv-tile-peek" aria-hidden="true">
                            <span>{clip(e.summary, 170)}</span>
                          </span>
                        )}
                      </span>
                      <span className="sv-tile-body">
                        <strong>{e.island?.name ?? (e.title || `Séance ${e.number}`)}</strong>
                        <span className="sv-tile-date">
                          {fmtDate(e.date)}
                          {e.title && e.island ? ` · ${e.title}` : ""}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
                {next && (
                  <li>
                    <a href="#db-today" className="sv-tile next">
                      <span className="sv-tile-art">
                        <IsleScene id={stage.id} name={stage.name} color={stage.color} mood="dusk" />
                        <span className="sv-tile-num">Séance {nextNumber}</span>
                      </span>
                      <span className="sv-tile-body">
                        <strong>{data.nextIsland?.name ?? "Destination inconnue"}</strong>
                        <span className="sv-tile-date">{next.confirmed ? `Prochain épisode · ${fmtDate(next.date)} · ${hour(next.start)}` : "Prochain épisode · date à choisir"}</span>
                      </span>
                    </a>
                  </li>
                )}
                {data.sessions.slice(1).map((s, i) => (
                  <li key={s.pollId}>
                    <Link href="/outils/planning" className="sv-tile later">
                      <span className="sv-tile-art blank" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        <span className="sv-tile-num">Séance {nextNumber + i + 1}</span>
                      </span>
                      <span className="sv-tile-body">
                        <strong>À venir</strong>
                        <span className="sv-tile-date">{s.confirmed ? `${fmtDate(s.date)} · ${hour(s.start)}` : s.answered === "done" ? "Sondage · tu as répondu" : "Sondage · à toi de répondre"}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
            <RailFocus railId="sv-rail" />
          </section>

          {/* ---------- L'équipage ---------- */}
          <section className="sv-row" aria-labelledby="sv-crew">
            <header className="sv-row-head">
              <h2 id="sv-crew" className="sv-h">
                L&apos;équipage
              </h2>
              <span className="sv-quiet small">{data.group.name}</span>
            </header>
            <ul className="sv-crew">
              {data.crew.map((c) => (
                <li key={`${c.player}-${c.name}`} className={`sv-mate${c.me ? " me" : ""}`}>
                  <span className="sv-avatar" aria-hidden="true">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="sv-mate-id">
                    <strong>
                      {c.name}
                      {c.me && <span className="sv-quiet"> (toi)</span>}
                    </strong>
                    <span className="sv-mate-meta">
                      {!c.me && <span>{c.player}</span>}
                      {c.label.split(" · ").map((part) => (
                        <span key={part}>{part}</span>
                      ))}
                    </span>
                    {next?.confirmed &&
                      (c.me && c.presence === null ? (
                        <a href="#db-today" className="sv-state todo">
                          À répondre
                        </a>
                      ) : (
                        <span className={`sv-state p-${c.presence ?? "none"}`}>
                          {c.presence === "yes" ? "À bord" : c.presence === "no" ? "Absent" : c.presence === "maybe" ? "Peut-être" : "Sans réponse"}
                        </span>
                      ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="sv-side" aria-label="Mon personnage et l'escale">
          {/* ---------- Mon personnage ---------- */}
          <section className="sv-panel" aria-labelledby="sv-sheet">
            <header className="sv-row-head">
              <h2 id="sv-sheet" className="sv-h small">
                {data.character ? data.character.name : "Mon personnage"}
              </h2>
              <Link href="/outils/personnage" className="sv-link">
                Ma fiche <Glyph d={ARROW} size={14} />
              </Link>
            </header>
            {data.character ? (
              <>
                <p className="sv-sub">
                  {data.character.label}
                  {data.character.levelUp ? (
                    <>
                      {" "}
                      <Link href="/outils/personnage" className="sv-level">
                        niv. {data.character.level} → {data.character.levelUp} en attente
                      </Link>
                    </>
                  ) : (
                    <span className="sv-ok"> · fiche à jour</span>
                  )}
                </p>
                <dl className="sv-stats" style={{ gridTemplateColumns: `repeat(${data.character.spellDc !== null ? 4 : 3}, minmax(0, 1fr))` }}>
                  <div>
                    <dt>PV max</dt>
                    <dd className="num">{data.character.hpMax}</dd>
                  </div>
                  <div>
                    <dt>CA</dt>
                    <dd className="num">{data.character.ac}</dd>
                  </div>
                  <div>
                    <dt>Initiative</dt>
                    <dd className="num">{data.character.initiative >= 0 ? `+${data.character.initiative}` : `−${Math.abs(data.character.initiative)}`}</dd>
                  </div>
                  {data.character.spellDc !== null && (
                    <div>
                      <dt>DD sorts</dt>
                      <dd className="num">{data.character.spellDc}</dd>
                    </div>
                  )}
                </dl>
                {data.character.bag.length > 0 && (
                  <p className="sv-bag">
                    <span className="sv-quiet">Sac :</span> {data.character.bag.join(", ")}
                    {data.character.bagMore > 0 && ` et ${data.character.bagMore} autre${data.character.bagMore > 1 ? "s" : ""}`}
                  </p>
                )}
                <p className="sv-bag">
                  <span className="sv-quiet">Bourse :</span> <strong className={`num${data.character.purseCp > 0 ? " sv-gold" : ""}`}>{formatCp(data.character.purseCp)}</strong>
                </p>
              </>
            ) : (
              <p className="sv-quiet">Pas encore de personnage dans cet équipage. Crée-le depuis ta fiche.</p>
            )}
          </section>

          {/* ---------- Les quêtes ---------- */}
          {data.quests.length > 0 && (
            <section className="sv-panel" aria-labelledby="sv-quests">
              <header className="sv-row-head">
                <h2 id="sv-quests" className="sv-h small">
                  Quêtes en cours
                </h2>
                <Link href="/outils/quetes" className="sv-link">
                  Toutes <Glyph d={ARROW} size={14} />
                </Link>
              </header>
              <ul className="sv-list">
                {data.quests.slice(0, 4).map((q) => (
                  <li key={q.id}>
                    <Link href={`/outils/quetes?quete=${q.id}`}>
                      <span>{q.title}</span>
                      {q.giver && <span className="sv-quiet">{q.giver}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ---------- Le port ---------- */}
          {data.harbor && data.shops.length > 0 ? (
            <section className="sv-panel" aria-labelledby="sv-port">
              <header className="sv-row-head">
                <h2 id="sv-port" className="sv-h small">
                  Le port de <span className="sv-isle" style={isle(data.harbor.color)}>{data.harbor.name}</span>
                </h2>
                {data.tools.market && (
                  <Link href="/outils/marche" className="sv-link">
                    Le marché <Glyph d={ARROW} size={14} />
                  </Link>
                )}
              </header>
              <p className="sv-sub">{data.portCloses ? `Ouvert jusqu'au départ, ${data.portCloses}` : "Ouvert jusqu'au prochain départ"}</p>
              <ul className="sv-list">
                {data.shops.slice(0, 3).map((s) => (
                  <li key={s.name}>
                    <Link href="/outils/marche">
                      <span>
                        {s.name} <span className="sv-quiet">· {s.featured ? s.featured.name : s.kind}</span>
                      </span>
                      {s.featured && <span className="num sv-gold">{formatCp(s.featured.priceCp)}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="sv-portline">
              {data.harbor ? (
                <>
                  Le port de <span className="sv-isle" style={isle(data.harbor.color)}>{data.harbor.name}</span> n&apos;a pas d&apos;échoppe ouverte.
                </>
              ) : (
                "Le Navire est en mer : les échoppes rouvriront à la prochaine escale."
              )}
            </p>
          )}

          {/* ---------- Activité à bord ---------- */}
          <section className="sv-panel" aria-labelledby="sv-feed">
            <header className="sv-row-head">
              <h2 id="sv-feed" className="sv-h small">
                Activité à bord
              </h2>
            </header>
            {data.activity.length === 0 ? (
              <p className="sv-quiet">Calme plat. Les achats, présences et journaux publiés apparaîtront ici.</p>
            ) : (
              <ol className="sv-feed">
                {groupByAgo(data.activity.slice(0, 3)).map((g) => (
                  <li key={g.label}>
                    <p className="sv-feed-when">{g.label}</p>
                    <ul>
                      {g.items.map((a) => {
                        const line = (
                          <>
                            <span className="sv-feed-icon" aria-hidden="true">
                              {a.initial === "⚓" ? <Glyph d={ANCHOR} size={13} /> : a.initial}
                            </span>
                            <span>{a.text}</span>
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
        </aside>
      </div>
    </div>
  );
}
