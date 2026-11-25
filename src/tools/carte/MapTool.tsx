"use client";
// Carte de l'archipel : les îles du groupe, la route du Navire, l'île où il mouille et la prochaine escale.
// Le MJ ajoute les îles (clic sur la carte), les déplace, les colore, et fait avancer le Navire.

import { useEffect, useRef, useState, useTransition, type KeyboardEvent, type MouseEvent } from "react";
import Link from "next/link";
import type { ToolPlayer } from "../registry";
import {
  deleteIslandAction,
  getMapAction,
  moveIslandAction,
  saveIslandAction,
  setHarborAction,
  setMapImageAction,
  setNextAction,
  type IslandView,
  type MapGroup,
  type MapResult,
  type MapView,
} from "./actions";
import { ISLAND_STATUS, ISLE_COLORS, PLACEHOLDER_MAP, SEA_COLOR, islandShape, type IslandStatusId } from "./meta";

type Run = (p: Promise<MapResult>) => Promise<boolean>;
const W = 1000;
const H = 600;

export default function MapTool({ player }: { player: ToolPlayer }) {
  const [view, setView] = useState<MapView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [tab, setTab] = useState<string | null>(null);

  useEffect(() => {
    getMapAction()
      .then(setView)
      .catch(() => setError("Impossible de déplier la carte."));
  }, []);

  const run: Run = (p) =>
    new Promise((resolve) => {
      startTransition(async () => {
        try {
          const r = await p;
          if (r.ok) {
            setView(r.view);
            setError(null);
          } else setError(r.error);
          resolve(r.ok);
        } catch {
          setError("L'action a échoué. Réessaie.");
          resolve(false);
        }
      });
    });

  if (!view) return error ? <p className="flash flash-error">{error}</p> : <p className="muted">On déplie la carte…</p>;
  if (view.groups.length === 0) return <p className="muted">{view.isAdmin ? "Crée d'abord un groupe de jeu dans l'administration." : "Tu ne fais partie d'aucun groupe."}</p>;
  const current = view.groups.find((g) => g.id === tab) ?? view.groups[0];

  return (
    <div className="stack-lg">
      <p className="muted">
        {view.isAdmin
          ? "Clique « Ajouter une île » puis un endroit de la carte. Rattache chaque séance de la chronique à son île : la route du Navire se trace toute seule."
          : `L'archipel tel que ton équipage le connaît, ${player.name}. Choisis une île pour lire ce qu'on en sait.`}
      </p>
      {view.groups.length > 1 && (
        <nav className="cs-group-tabs" role="tablist" aria-label="Groupes">
          {view.groups.map((g) => (
            <button key={g.id} type="button" role="tab" aria-selected={g.id === current.id} className={`cs-group-tab${g.id === current.id ? " on" : ""}`} onClick={() => setTab(g.id)}>
              <span className="cs-group-tab-name">👥 {g.name}</span>
              <span className="muted small">{g.islands.length} îles</span>
            </button>
          ))}
        </nav>
      )}
      {error && (
        <p className="flash flash-error" role="alert">
          {error}
        </p>
      )}
      <GroupMap key={current.id} group={current} isAdmin={view.isAdmin} busy={busy} run={run} />
    </div>
  );
}

type Mode = { kind: "idle" } | { kind: "add" } | { kind: "move"; id: string };

function GroupMap({ group, isAdmin, busy, run }: { group: MapGroup; isAdmin: boolean; busy: boolean; run: Run }) {
  const [selected, setSelected] = useState<string | null>(group.harborId ?? group.nextId ?? null);
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const byId = new Map(group.islands.map((i) => [i.id, i]));
  const sel = selected ? byId.get(selected) : undefined;
  const harbor = group.harborId ? byId.get(group.harborId) : undefined;
  const next = group.nextId ? byId.get(group.nextId) : undefined;
  const img = group.mapImage;
  const ratio = useImageRatio(img);
  // Hauteur du dessin : celle de l'image si le groupe en a une (les positions restent en % de la carte).
  const h = img ? Math.round(W * (ratio ?? H / W)) : H;
  const px = (i: { x: number; y: number }) => ({ x: (i.x / 100) * W, y: (i.y / 100) * h });
  const [bgOpen, setBgOpen] = useState(false);

  // Route : suite des îles des séances, puis l'escale actuelle si elle n'y est pas encore.
  const routeIds = [...group.route];
  if (harbor && routeIds.at(-1) !== harbor.id) routeIds.push(harbor.id);
  const routePts = routeIds.map((id) => byId.get(id)).filter((i): i is IslandView => Boolean(i)).map(px);
  const from = harbor ?? (routePts.length ? byId.get(routeIds.at(-1)!) : undefined);

  const pointer = (e: MouseEvent<SVGSVGElement>) => {
    const r = svg.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };
  const onMapClick = async (e: MouseEvent<SVGSVGElement>) => {
    if (!isAdmin || mode.kind === "idle") return;
    const p = pointer(e);
    if (mode.kind === "add") {
      setDraft(p);
      setSelected(null);
    } else if (await run(moveIslandAction(mode.id, p.x, p.y))) setMode({ kind: "idle" });
  };
  const pick = (id: string) => {
    if (mode.kind !== "idle") return;
    setSelected(id);
    setDraft(null);
  };
  const keyPick = (id: string) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(id);
    }
  };

  return (
    <div className="map-layout">
      <div className="map-frame">
        {isAdmin && (
          <div className="map-toolbar">
            {mode.kind === "idle" ? (
              <>
                <button type="button" className="btn btn-small" onClick={() => setMode({ kind: "add" })} disabled={busy}>
                  ＋ Ajouter une île
                </button>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => setBgOpen((o) => !o)} aria-expanded={bgOpen}>
                  Fond de carte
                </button>
              </>
            ) : (
              <>
                <span className="chip chip-accent">{mode.kind === "add" ? "Clique sur la carte pour placer l'île" : "Clique sur la carte pour déplacer l'île"}</span>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => (setMode({ kind: "idle" }), setDraft(null))}>
                  Annuler
                </button>
              </>
            )}
          </div>
        )}
        {isAdmin && bgOpen && <MapImageEditor group={group} busy={busy} run={run} onDone={() => setBgOpen(false)} />}
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${h}`}
          className={`map-sea${img ? " map-sea-image" : ""}${mode.kind !== "idle" ? " placing" : ""}`}
          onClick={onMapClick}
          role="img"
          aria-label={`Carte de l'archipel de ${group.name}`}
        >
          <defs>
            <pattern id="map-waves" width="80" height="60" patternUnits="userSpaceOnUse">
              <path d="M8 18 q6 -5 12 0 q6 5 12 0 M48 48 q6 -5 12 0 q6 5 12 0" stroke="currentColor" strokeOpacity=".1" fill="none" strokeWidth="1.6" strokeLinecap="round" />
            </pattern>
          </defs>
          {img ? <image href={img} width={W} height={h} preserveAspectRatio="none" /> : <rect width={W} height={H} fill="url(#map-waves)" className="map-waves" />}
          {routePts.length > 1 && <path d={smooth(routePts)} className="map-route" />}
          {from && next && from.id !== next.id && <path d={smooth([px(from), px(next)])} className="map-route map-route-next" />}

          {group.islands.map((i) => {
            const p = px(i);
            const size = i.id === group.harborId || i.id === group.nextId ? 34 : 26;
            return (
              <g
                key={i.id}
                transform={`translate(${p.x} ${p.y})`}
                className={`map-isle map-isle-${i.status}${i.id === selected ? " on" : ""}`}
                role="button"
                tabIndex={0}
                aria-label={`${i.name}${i.id === group.harborId ? ", le Navire y mouille" : i.id === group.nextId ? ", prochaine escale" : ""}`}
                aria-pressed={i.id === selected}
                onClick={(e) => (e.stopPropagation(), pick(i.id))}
                onKeyDown={keyPick(i.id)}
                style={{ color: i.color }}
              >
                {img ? (
                  // Sur une vraie carte, l'île est déjà dessinée : un simple repère suffit.
                  <>
                    {i.id === group.nextId && <circle r={size * 0.9} className="map-pulse" />}
                    <circle r={size * 0.75} className="map-hit" />
                    <circle r={size * 0.34} className="map-pin" />
                    {i.id === selected && <circle r={size * 0.8} className="map-ring" />}
                  </>
                ) : (
                  <>
                    {i.id === group.nextId && <circle r={size * 1.4} className="map-pulse" />}
                    <path d={islandShape(i.id)} transform={`scale(${size * 1.7})`} className="map-shallow" />
                    <path d={islandShape(i.id)} transform={`scale(${size})`} className="map-land" />
                    {i.id === selected && <circle r={size * 1.55} className="map-ring" />}
                  </>
                )}
                <text y={img ? size * 0.34 + 20 : size + 20} className="map-label">
                  {i.name}
                </text>
              </g>
            );
          })}
          {harbor && <Ship at={px(harbor)} />}
          {draft && <circle cx={(draft.x / 100) * W} cy={(draft.y / 100) * h} r={14} className="map-draft" />}
        </svg>
        <p className="map-legend muted small">
          <span>
            <i className="map-key map-key-route" /> Route du Navire
          </span>
          <span>
            <i className="map-key map-key-next" /> Prochaine escale
          </span>
          {isAdmin && (
            <span>
              <i className="map-key map-key-hidden" /> Cachée aux joueurs
            </span>
          )}
        </p>
      </div>

      <aside className="map-side stack">
        {draft && isAdmin ? (
          <IslandEditor key="new" group={group} at={draft} busy={busy} run={run} onDone={(ok) => (ok && (setDraft(null), setMode({ kind: "idle" })), !ok)} onCancel={() => (setDraft(null), setMode({ kind: "idle" }))} />
        ) : sel ? (
          <IslandPanel
            key={sel.id}
            island={sel}
            group={group}
            isAdmin={isAdmin}
            busy={busy}
            run={run}
            onMove={() => setMode({ kind: "move", id: sel.id })}
            onDeleted={() => setSelected(null)}
          />
        ) : (
          <div className="card stack">
            <h2 className="subtitle">L&apos;archipel</h2>
            <p className="muted">
              {group.islands.length === 0
                ? isAdmin
                  ? "Aucune île pour l'instant. Ajoute la première escale du groupe."
                  : "Le MJ n'a pas encore dessiné la carte."
                : "Choisis une île pour lire ce qu'on en sait."}
            </p>
          </div>
        )}
        {group.islands.length > 0 && (
          <div className="card stack">
            <h2 className="subtitle">Les îles</h2>
            <ul className="map-list">
              {group.islands.map((i) => (
                <li key={i.id}>
                  <button type="button" className={`map-list-item${i.id === selected ? " on" : ""}`} onClick={() => pick(i.id)}>
                    <span className="map-dot" style={{ background: i.color }} aria-hidden="true" />
                    <span className="stack-xs">
                      <span>{i.name}</span>
                      <span className="muted small">
                        {i.id === group.harborId ? "Le Navire y mouille" : i.id === group.nextId ? "Prochaine escale" : ISLAND_STATUS[i.status].label}
                        {i.visits.length > 0 && ` · ${i.visits.length} séance${i.visits.length > 1 ? "s" : ""}`}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

function IslandPanel({ island, group, isAdmin, busy, run, onMove, onDeleted }: { island: IslandView; group: MapGroup; isAdmin: boolean; busy: boolean; run: Run; onMove: () => void; onDeleted: () => void }) {
  const [editing, setEditing] = useState(false);
  const isHarbor = island.id === group.harborId;
  const isNext = island.id === group.nextId;
  if (editing) return <IslandEditor group={group} island={island} busy={busy} run={run} onDone={(ok) => (ok && setEditing(false), !ok)} onCancel={() => setEditing(false)} />;
  return (
    <div className="card stack map-panel" style={{ ["--isle-c" as string]: island.color }}>
      <div className="stack-xs">
        <span className="chips">
          {isHarbor && <span className="chip chip-accent">⚓ Le Navire y mouille</span>}
          {isNext && <span className="chip chip-accent">Prochaine escale</span>}
          {!isHarbor && !isNext && <span className="chip">{ISLAND_STATUS[island.status].label}</span>}
        </span>
        <h2 className="subtitle">{island.name}</h2>
      </div>
      {island.description ? <p className="map-desc">{island.description}</p> : <p className="muted">{isAdmin ? "Pas encore de description." : "On n'en sait pas encore grand-chose."}</p>}
      {island.visits.length > 0 && (
        <div className="stack-xs">
          <span className="label">Séances vécues ici</span>
          {island.visits.map((v) => (
            <Link key={v.number} href="/outils/chronique" className="map-visit">
              Séance {v.number} · {v.title}
            </Link>
          ))}
        </div>
      )}
      {(isHarbor || isAdmin) && island.shops > 0 && (
        <Link href="/outils/marche" className="btn btn-small">
          {isHarbor ? `Entrer au marché (${island.shops} échoppe${island.shops > 1 ? "s" : ""})` : `${island.shops} échoppe${island.shops > 1 ? "s" : ""} sur cette île`}
        </Link>
      )}
      {isAdmin && (
        <div className="stack map-admin">
          <div className="chips">
            <button type="button" className="btn btn-small" disabled={busy} onClick={() => run(setHarborAction(group.id, isHarbor ? null : island.id))}>
              {isHarbor ? "Lever l'ancre" : "⚓ Le Navire mouille ici"}
            </button>
            <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={() => run(setNextAction(group.id, isNext ? null : island.id))}>
              {isNext ? "Annuler l'annonce" : "Annoncer comme prochaine escale"}
            </button>
          </div>
          <div className="chips">
            <button type="button" className="btn btn-ghost btn-small" onClick={() => setEditing(true)}>
              Modifier
            </button>
            <button type="button" className="btn btn-ghost btn-small" onClick={onMove}>
              Déplacer
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-small danger-text"
              disabled={busy}
              onClick={async () => {
                if (!confirm(`Supprimer ${island.name} ? Ses échoppes disparaissent aussi.`)) return;
                if (await run(deleteIslandAction(island.id))) onDeleted();
              }}
            >
              Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function IslandEditor({
  group,
  island,
  at,
  busy,
  run,
  onDone,
  onCancel,
}: {
  group: MapGroup;
  island?: IslandView;
  at?: { x: number; y: number };
  busy: boolean;
  run: Run;
  onDone: (ok: boolean) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(island?.name ?? "");
  const [color, setColor] = useState(island?.color ?? SEA_COLOR);
  const [status, setStatus] = useState<IslandStatusId>(island?.status ?? "seen");
  const [description, setDescription] = useState(island?.description ?? "");
  const save = async () => {
    const ok = await run(
      saveIslandAction({ id: island?.id ?? null, groupId: group.id, name, color, status, description, x: island?.x ?? at?.x ?? 50, y: island?.y ?? at?.y ?? 50 }),
    );
    onDone(ok);
  };
  return (
    <form
      className="card stack"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <h2 className="subtitle">{island ? `Modifier ${island.name}` : "Nouvelle île"}</h2>
      <label className="field">
        <span className="label">Nom</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Île Givre" required autoFocus />
      </label>
      <fieldset className="field">
        <legend className="label">Couleur (le site la prend quand le Navire y mouille)</legend>
        <div className="map-swatches">
          {ISLE_COLORS.map((c) => (
            <button key={c.id} type="button" className={`map-swatch${color === c.id ? " on" : ""}`} style={{ background: c.id }} aria-pressed={color === c.id} title={c.name} aria-label={c.name} onClick={() => setColor(c.id)} />
          ))}
        </div>
      </fieldset>
      <label className="field">
        <span className="label">Visibilité</span>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value as IslandStatusId)}>
          {Object.entries(ISLAND_STATUS).map(([id, s]) => (
            <option key={id} value={id}>
              {s.label} : {s.hint}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="label">Ce qu&apos;on en sait</span>
        <textarea className="input textarea" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1200} placeholder="Un phare brillerait sous la glace…" />
      </label>
      <div className="chips">
        <button className="btn" disabled={busy}>
          Enregistrer
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </form>
  );
}

/** Proportions (hauteur / largeur) de l'image de fond, une fois chargée. */
function useImageRatio(src: string | null): number | null {
  const [ratio, setRatio] = useState<{ src: string; r: number } | null>(null);
  useEffect(() => {
    if (!src) return;
    const im = new Image();
    im.onload = () => im.naturalWidth > 0 && setRatio({ src, r: Math.min(2, Math.max(0.3, im.naturalHeight / im.naturalWidth)) });
    im.src = src;
    return () => void (im.onload = null);
  }, [src]);
  return ratio && ratio.src === src ? ratio.r : null;
}

function MapImageEditor({ group, busy, run, onDone }: { group: MapGroup; busy: boolean; run: Run; onDone: () => void }) {
  const [value, setValue] = useState(group.mapImage ?? "");
  const save = async (image: string | null) => {
    if (await run(setMapImageAction(group.id, image))) onDone();
  };
  return (
    <form
      className="card stack map-bg-editor"
      onSubmit={(e) => {
        e.preventDefault();
        void save(value.trim() || null);
      }}
    >
      <label className="field">
        <span className="label">Image de la carte de {group.name}</span>
        <input className="input" value={value} onChange={(e) => setValue(e.target.value)} maxLength={500} placeholder="/cartes/ma-carte.jpg ou https://…" />
        <span className="muted small">Dépose l&apos;image dans public/cartes/ du projet, ou colle une adresse https. Les îles gardent leur position en % de la carte.</span>
      </label>
      <div className="chips">
        <button className="btn btn-small" disabled={busy}>
          Enregistrer
        </button>
        <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={() => save(PLACEHOLDER_MAP)}>
          Carte provisoire
        </button>
        {group.mapImage && (
          <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={() => save(null)}>
            Retirer l&apos;image
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-small" onClick={onDone}>
          Fermer
        </button>
      </div>
    </form>
  );
}

function Ship({ at }: { at: { x: number; y: number } }) {
  return (
    <g transform={`translate(${at.x + 30} ${at.y - 34})`} className="map-ship" aria-hidden="true">
      <g className="map-ship-rock">
        <path d="M-16 4 L16 4 L11 12 L-11 12 Z" className="map-ship-hull" />
        <path d="M0 -20 L0 4" stroke="currentColor" strokeWidth="2" />
        <path d="M2 -18 L14 0 L2 0 Z" className="map-ship-sail" />
      </g>
    </g>
  );
}

/** Courbe douce passant par les points (Catmull-Rom → Bézier). */
function smooth(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  if (pts.length === 2) {
    const [a, b] = pts;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2 - Math.abs(b.x - a.x) * 0.12;
    return `M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}`;
  }
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`;
  }
  return d;
}
