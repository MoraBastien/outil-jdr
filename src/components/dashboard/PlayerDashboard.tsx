// Tableau de bord d'un joueur (composant serveur) : l'histoire, mon personnage, l'escale.
// Une grille de panneaux lisible d'un coup d'œil ; l'univers marin n'est qu'en touches (route, couleurs d'île).
import Link from "next/link";
import type { CSSProperties } from "react";
import type { PlayerDashboard as Data } from "@/lib/dashboard";
import { tableToday } from "@/tools/planning/summary";
import { formatCp } from "@/tools/marche/meta";
import PresenceButtons from "./PresenceButtons";
import { NAV_ICONS } from "../navIcons";

/** Petite icône au trait (même dessin que la navigation). */
const Glyph = ({ d }: { d: string }) => (
  <svg className="db-glyph" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const ANCHOR = "M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 8v13M8 12h8M5 15a7 7 0 0 0 14 0";

const fmtDay = (date: string) => new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
const fmtShort = (date: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
const daysUntil = (date: string) => Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${tableToday()}T12:00:00Z`)) / 86_400_000);
const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "hier" : `il y a ${d} j`;
};
/** Minutes avant le début d'une séance (heure de la table, Europe/Paris). */
const minutesUntil = (date: string, start: string) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  const now = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00Z`);
  return Math.round((Date.parse(`${date}T${start}:00Z`) - now) / 60_000);
};
/** « Dans 3 h », « Dans 40 min », « En cours » le jour même ; sinon « Demain », « Dans 4 jours ». */
const countdown = (days: number | null, date: string, start: string) => {
  if (days === null) return "";
  if (days > 1) return `Dans ${days} jours`;
  if (days === 1) return "Demain";
  const m = minutesUntil(date, start);
  if (m <= 0) return m > -240 ? "En cours" : "Ce soir";
  if (m < 60) return `Dans ${m} min`;
  const h = Math.floor(m / 60);
  return `Dans ${h} h${m % 60 >= 30 && h < 3 ? " 30" : ""}`;
};
const isle = (color: string) => ({ ["--isle-c" as string]: color }) as CSSProperties;
const hour = (start: string) => start.replace(":", " h ").replace(/ 00$/, "").replace(" h 00", " h");

export default function PlayerDashboard({ data, greeting, name }: { data: Data; greeting: string; name: string }) {
  if (!data.group)
    return (
      <div className="db">
        <header className="db-head">
          <h1 className="title">
            {greeting}, {name}
          </h1>
        </header>
        <div className="empty">
          <p>Tu ne fais partie d&apos;aucun équipage pour l&apos;instant. Ton MJ t&apos;ajoutera bientôt à un groupe.</p>
        </div>
      </div>
    );

  const next = data.sessions[0];
  const days = next ? daysUntil(next.date) : null;
  const doneCount = data.checklist.filter((c) => c.done).length;

  return (
    <div className="db">
      {/* ---------- En tête : le voyage à gauche, l'action du jour à droite ---------- */}
      <section className="db-hero" aria-labelledby="db-today">
        <div className="db-hero-voyage">
          <div className="stack-xs">
            <h1 className="title">
              {greeting}, {name}
            </h1>
            <p className="db-hero-line">
              {data.harbor ? (
                <>
                  Le Navire mouille à <span className="db-isle-name" style={isle(data.harbor.color)}>{data.harbor.name}</span>
                </>
              ) : (
                "Le Navire vogue en pleine mer"
              )}
              {data.nextIsland && <> · cap sur {data.nextIsland.name}</>}
            </p>
          </div>
          {data.groups.length > 1 && (
            <nav className="db-groups" aria-label="Équipage affiché">
              {data.groups.map((g) => (
                <Link key={g.id} href={`/accueil?groupe=${g.id}`} className={`chip${g.id === data.group!.id ? " chip-accent" : ""}`} aria-current={g.id === data.group!.id ? "true" : undefined}>
                  {g.name}
                </Link>
              ))}
            </nav>
          )}
        </div>

        <div className="db-hero-action">
          {next?.confirmed ? (
            <>
              <h2 id="db-today" className="db-today">
                {countdown(days, next.date, next.start)}
                <span className="db-today-when">
                  {fmtDay(next.date)} · {hour(next.start)}
                </span>
              </h2>
              <p className="muted db-aboard">
                <span>
                  {next.title} · {next.aboard} sur {next.crew} à bord
                </span>
                {data.missing.length > 0 && (
                  <span className="db-missing">
                    <span>
                      · {data.missing.length} sans réponse
                    </span>
                    <span className="db-missing-faces" aria-hidden="true">
                      {data.missing.map((m) => (
                        <span key={m.name} title={m.name}>
                          {m.initial}
                        </span>
                      ))}
                    </span>
                    <span className="visually-hidden">: {data.missing.map((m) => m.name).join(", ")}</span>
                  </span>
                )}
              </p>
              <PresenceButtons pollId={next.pollId} mine={next.mine} when={days !== null && days <= 0 ? "ce soir" : days === 1 ? "demain" : fmtDay(next.date)} />
            </>
          ) : next ? (
            <>
              <h2 id="db-today" className="db-today">
                Date à choisir
                <span className="db-today-when">La plus demandée pour l&apos;instant : {fmtDay(next.date)}</span>
              </h2>
              <p className="muted">
                {next.title} · {next.answered === "done" ? "tu as répondu, le MJ fixera la date." : "dis au MJ quand tu es libre."}
              </p>
              <Link href="/outils/planning" className={`btn${next.answered === "done" ? " btn-ghost" : ""}`}>
                {next.answered === "done" ? "Revoir mes disponibilités" : "Donner mes disponibilités"}
              </Link>
            </>
          ) : (
            <>
              <h2 id="db-today" className="db-today">
                Pas encore de date
              </h2>
              <p className="muted">Le MJ ouvrira bientôt un sondage pour la prochaine traversée.</p>
            </>
          )}
        </div>
        {data.route.length + (data.nextIsland ? 1 : 0) > 0 && <Route data={data} />}
      </section>

      <div className="db-grid">
        {/* ---------- Avant de lever l'ancre ---------- */}
        <section className="card db-card db-span-4" aria-labelledby="db-todo">
          <div className="db-card-head">
            <h2 id="db-todo" className="db-h">
              Avant de lever l&apos;ancre
            </h2>
            {data.checklist.length > 0 && (
              <span className="muted small num">
                {doneCount}/{data.checklist.length}
              </span>
            )}
          </div>
          <p className="muted small db-sub">À faire avant le départ du Navire.</p>
          {data.checklist.length === 0 ? (
            <p className="muted">Rien à préparer pour l&apos;instant.</p>
          ) : (
            <>
              <span className="db-progress" aria-hidden="true">
                <span style={{ width: `${(doneCount / data.checklist.length) * 100}%` }} />
              </span>
              <ul className="db-checklist">
                {data.checklist.map((c) => (
                  <li key={c.id}>
                    <Link href={c.href} className={`db-check${c.done ? " done" : ""}`}>
                      <span className="db-state" aria-hidden="true">
                        {c.done ? "✓" : ""}
                      </span>
                      <span className="db-check-label">
                        {c.label}
                        <span className="visually-hidden">{c.done ? " : fait." : " : à faire."}</span>
                      </span>
                      {!c.done && <span className="db-check-go small">{`${c.hint} →`}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* ---------- Le port ---------- */}
        <section className={`card db-card db-span-4${data.harbor ? " db-port" : ""}`} style={data.harbor ? isle(data.harbor.color) : undefined} aria-labelledby="db-port">
          <div className="db-card-head">
            <h2 id="db-port" className="db-h">
              {data.harbor ? `Le port · ${data.harbor.name}` : "Le port"}
            </h2>
          </div>
          {data.harbor && data.shops.length > 0 && (
            <p className="muted small db-sub">{data.portCloses ? `Ouvert jusqu'au départ du Navire · ${data.portCloses}` : "Ouvert jusqu'au prochain départ du Navire"}</p>
          )}
          {data.character && (
            <p className="db-purse">
              <span className="muted small">Ma bourse</span>
              <strong className="gold">{formatCp(data.character.purseCp)}</strong>
            </p>
          )}
          {!data.harbor ? (
            <p className="muted">Le Navire est en mer : les échoppes rouvriront à la prochaine escale.</p>
          ) : data.shops.length === 0 ? (
            <p className="muted">Aucune échoppe ouverte sur cette île.</p>
          ) : (
            <>
              <ul className="db-rows">
                {data.shops.slice(0, 3).map((s) => (
                  <li key={s.name}>
                    <Link href="/outils/marche" className="db-row">
                      <span className="stack-xs">
                        <span>{s.name}</span>
                        <span className="muted small">{s.featured ? s.featured.name : s.kind}</span>
                      </span>
                      {s.featured && <span className="num gold small">{formatCp(s.featured.priceCp)}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
              {data.tools.market && (
                <Link href="/outils/marche" className="btn btn-ghost btn-small db-port-btn">
                  Entrer au marché
                </Link>
              )}
            </>
          )}
        </section>

        {/* ---------- Ma fiche ---------- */}
        <section className="card db-card db-span-4" aria-labelledby="db-sheet">
          <div className="db-card-head">
            <h2 id="db-sheet" className="db-h">
              {data.character ? data.character.name : "Mon personnage"}
            </h2>
            <Link href="/outils/personnage" className="db-link">
              Fiche
            </Link>
          </div>
          {data.character ? (
            <>
              <p className="muted small db-sub">{data.character.label}</p>
              <dl className="db-stats">
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
              {data.character.slots.some((n) => n > 0) && (
                <p className="db-slots small">
                  <span className="muted">Emplacements de sorts</span>
                  {data.character.slots.map((n, i) =>
                    n > 0 ? (
                      <span key={i}>
                        Niv. {i + 1} <span className="db-pips" role="img" aria-label={`${n} emplacement${n > 1 ? "s" : ""}`}>{"●".repeat(n)}</span>
                      </span>
                    ) : null,
                  )}
                </p>
              )}
              {data.character.bag.length > 0 && (
                <div className="stack-xs">
                  <span className="muted small">Dans mon sac</span>
                  <ul className="db-bag">
                    {data.character.bag.map((b, i) => (
                      <li key={i} title={b}>
                        {b}
                      </li>
                    ))}
                  </ul>
                  {data.character.bagMore > 0 && (
                    <Link href="/outils/personnage" className="db-link small">
                      +{data.character.bagMore} autre{data.character.bagMore > 1 ? "s" : ""} dans la fiche
                    </Link>
                  )}
                </div>
              )}
              {data.character.levelUp && (
                <Link href="/outils/personnage" className="btn btn-small">
                  ✦ Monter au niveau {data.character.levelUp}
                </Link>
              )}
            </>
          ) : (
            <p className="muted">Pas encore de personnage dans cet équipage.</p>
          )}
        </section>

        {/* ---------- L'histoire ---------- */}
        <section className="card db-card db-story db-span-12" aria-labelledby="db-story">
          <div className="db-card-head">
            <h2 id="db-story" className="db-h">
              Où en est l&apos;histoire
              {data.quests.length > 0 && (
                <span className="db-h-count">
                  {" "}
                  · {data.quests.length} quête{data.quests.length > 1 ? "s" : ""} en cours
                </span>
              )}
            </h2>
            {data.tools.chronicle && (
              <Link href="/outils/chronique" className="db-link">
                Journal de bord
              </Link>
            )}
          </div>
          <div className="db-story-body">
            {data.story ? (
              <p className="db-story-text">
                <strong>
                  Séance {data.story.number}
                  {data.story.island ? `, ${data.story.island.name}` : ""}
                  {data.story.title ? ` · ${data.story.title}` : ""}.
                </strong>{" "}
                {data.story.summary ? clip(data.story.summary, 320) : <span className="muted">Le résumé n&apos;est pas encore écrit.</span>}
                {data.tools.chronicle && data.story.summary && (
                  <>
                    {" "}
                    <Link href="/outils/chronique" className="db-link">
                      Lire la suite →
                    </Link>
                  </>
                )}
              </p>
            ) : (
              <p className="muted">L&apos;histoire n&apos;a pas encore commencé : la première séance apparaîtra ici.</p>
            )}
            {data.quests.length > 0 && (
              <ul className="db-quests">
                {data.quests.slice(0, 3).map((q) => (
                  <li key={q.id}>
                    <Link href={`/outils/quetes?quete=${q.id}`}>
                      <Glyph d={NAV_ICONS.quetes} /> {q.title}
                      {q.giver && <span className="muted small"> · {q.giver}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ---------- L'équipage ---------- */}
        <section className="card db-card db-span-8" aria-labelledby="db-crew">
          <div className="db-card-head">
            <h2 id="db-crew" className="db-h">
              L&apos;équipage
            </h2>
            <span className="muted small">{data.group.name}</span>
          </div>
          <ul className="db-crew">
            {data.crew.map((c) => (
              <li key={`${c.player}-${c.name}`} className={`db-post${c.me ? " me" : ""}`}>
                <span className="db-avatar" aria-hidden="true">
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <span className="stack-xs db-post-text">
                  <strong>{c.name}</strong>
                  <span className="muted small">{c.level !== null ? `${c.label}${c.hpMax !== null ? ` · ${c.hpMax} PV` : ""}` : c.label}</span>
                  <span className="muted small">{c.me ? "Toi" : c.player}</span>
                </span>
                <span className={`db-presence-tag p-${c.presence ?? "none"}`}>
                  {c.presence === "yes" ? "À bord" : c.presence === "no" ? "Absent" : c.presence === "maybe" ? "Peut-être" : next?.confirmed ? "Sans réponse" : "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- Activité à bord ---------- */}
        <section className="card db-card db-span-4" aria-labelledby="db-feed">
          <div className="db-card-head">
            <h2 id="db-feed" className="db-h">
              Activité à bord
            </h2>
          </div>
          {data.activity.length === 0 ? (
            <p className="muted">Calme plat. Les achats, présences et journaux publiés apparaîtront ici.</p>
          ) : (
            <div className="db-feed-groups">
              {groupByAgo(data.activity).map((g) => (
                <div key={g.label} className="db-feed-group">
                  <h3 className="db-feed-when">{g.label}</h3>
                  <ul className="db-feed">
                    {g.items.map((a) => {
                      const line = (
                        <>
                          <span className={`db-feed-icon k-${a.kind}${a.initial === "⚓" ? " sys" : ""}`} aria-hidden="true">
                            {a.initial === "⚓" ? <Glyph d={ANCHOR} /> : a.initial}
                          </span>
                          <span className="db-feed-text">{a.text}</span>
                        </>
                      );
                      return <li key={a.id}>{a.href ? <Link href={a.href}>{line}</Link> : <span>{line}</span>}</li>;
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ---------- Les traversées suivantes (la prochaine est en tête de page) ---------- */}
        {data.sessions.length > 1 && (
        <section className="card db-card db-span-12" aria-labelledby="db-cal">
          <div className="db-card-head">
            <h2 id="db-cal" className="db-h">
              Traversées suivantes
            </h2>
            {data.tools.planning && (
              <Link href="/outils/planning" className="db-link">
                Planning
              </Link>
            )}
          </div>
          {data.sessions.length <= 1 ? (
            <p className="muted">{data.sessions.length === 0 ? "Aucune date proposée. Le MJ ouvrira bientôt un sondage." : "Rien d'autre de prévu après la prochaine séance."}</p>
          ) : (
            <ul className="db-cal">
              {data.sessions.slice(1).map((s) => {
                const [, , d] = s.date.split("-");
                return (
                  <li key={s.pollId}>
                    <span className={`db-date${s.confirmed ? " on" : ""}`}>
                      <strong className="num">{Number(d)}</strong>
                      <span className="small">{fmtShort(s.date).replace(/^\d+\s*/, "")}</span>
                    </span>
                    <span className="stack-xs">
                      <strong>{s.title}</strong>
                      <span className="muted small">{s.confirmed ? `Fixée · ${hour(s.start)}` : s.answered === "done" ? "Sondage ouvert · tu as répondu" : "Sondage ouvert · à toi de répondre"}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        )}
      </div>
    </div>
  );
}

function Route({ data }: { data: Data }) {
  type Stop = (typeof data.route)[number] & { kind: "here" | "past" | "next" };
  const stops: Stop[] = data.route.map((r) => ({ ...r, kind: r.here ? "here" : "past" }));
  if (data.nextIsland && !stops.some((s) => s.id === data.nextIsland!.id)) stops.push({ ...data.nextIsland, here: false, kind: "next" as const });
  const shown = stops.slice(-6);
  const hereIndex = shown.findIndex((s) => s.kind === "here");
  const nextIndex = shown.findIndex((s) => s.kind === "next");
  return (
    <div className="db-route" role="group" aria-label="La route du Navire">
      <ol style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }}>
        {shown.map((s, i) => (
          <li key={`${s.id}-${i}`} className={`db-stop ${s.kind}${i === shown.length - 1 ? " last" : ""}${nextIndex > 0 && i === nextIndex - 1 ? " before-next" : ""}`} style={isle(s.color)}>
            <span className="db-stop-isle" aria-hidden="true" />
            <span className="db-stop-name">{s.name}</span>
            <span className="muted small">{s.kind === "here" ? "le Navire y mouille" : s.kind === "next" ? "prochaine escale" : `escale ${i + 1 + (stops.length - shown.length)}`}</span>
            {s.kind === "here" && nextIndex < 0 && hereIndex === i && <span className="visually-hidden">Escale actuelle</span>}
          </li>
        ))}
      </ol>
      <Link href="/outils/carte" className="db-link db-route-link">
        Carte de l&apos;archipel →
      </Link>
    </div>
  );
}

/** Regroupe les lignes d'activité par moment (« il y a 7 h », « hier »…), dans l'ordre. */
function groupByAgo<T extends { at: string }>(items: T[]): { label: string; items: T[] }[] {
  const out: { label: string; items: T[] }[] = [];
  for (const it of items) {
    const label = ago(it.at);
    const last = out.at(-1);
    if (last && last.label === label) last.items.push(it);
    else out.push({ label, items: [it] });
  }
  return out.map((g) => ({ ...g, label: g.label.charAt(0).toUpperCase() + g.label.slice(1) }));
}

function clip(text: string, n: number) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, n).replace(/\s+\S*$/, "")}…`;
}
