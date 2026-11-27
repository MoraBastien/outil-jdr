"use client";
// Carte de l'archipel à deux niveaux : la carte de l'archipel et ses régions, puis la carte de chaque région et ses lieux.
// On y suit la route du Navire, l'île où il mouille et la prochaine escale.
// Le MJ dessine les régions, ajoute les îles et les lieux (clic sur la carte), les déplace, et fait avancer le Navire.

import { useEffect, useRef, useState, useTransition, type KeyboardEvent, type MouseEvent } from "react";
import Link from "next/link";
import type { ToolPlayer } from "../registry";
import {
  deleteIslandAction,
  deleteRegionAction,
  getMapAction,
  moveIslandAction,
  saveIslandAction,
  saveRegionAction,
  setHarborAction,
  setMapImageAction,
  setNextAction,
  type IslandView,
  type MapGroup,
  type MapResult,
  type MapView,
  type RegionView,
} from "./actions";
import { ISLAND_STATUS, ISLE_COLORS, PLACEHOLDER_MAP, REGION_COLORS, SEA_COLOR, islandShape, pairs, type IslandStatusId } from "./meta";

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

type Pt = { x: number; y: number };
type Mode = { kind: "idle" } | { kind: "add" } | { kind: "move"; id: string } | { kind: "draw"; id: string | null; pts: Pt[] };
const ZOOMS = [1, 1.5, 2, 3];

/** Retire les répétitions consécutives d'une suite (même clé). */
function dedupe<T>(list: T[], key: (t: T) => string): T[] {
  return list.filter((t, i) => i === 0 || key(t) !== key(list[i - 1]));
}

function GroupMap({ group, isAdmin, busy, run }: { group: MapGroup; isAdmin: boolean; busy: boolean; run: Run }) {
  const byId = new Map(group.islands.map((i) => [i.id, i]));
  const regionById = new Map(group.regions.map((r) => [r.id, r]));
  const harbor = group.harborId ? byId.get(group.harborId) : undefined;
  const next = group.nextId ? byId.get(group.nextId) : undefined;

  // Niveau affiché : la carte de l'archipel (null) ou celle d'une région.
  const [regionId, setRegionId] = useState<string | null>(null);
  const region = regionId ? regionById.get(regionId) : undefined;
  const level = region?.id ?? null;
  const [selIsle, setSelIsle] = useState<string | null>(harbor && !harbor.regionId ? harbor.id : null);
  const [selRegion, setSelRegion] = useState<string | null>(harbor?.regionId ?? null);
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [draft, setDraft] = useState<Pt | null>(null);
  const [regionDraft, setRegionDraft] = useState<number[] | null>(null);
  const [bgOpen, setBgOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const svg = useRef<SVGSVGElement>(null);

  const img = region ? region.mapImage : group.mapImage;
  const ratio = useImageRatio(img);
  // Hauteur du dessin : celle de l'image s'il y en a une (les positions restent en % de la carte).
  const h = img ? Math.round(W * (ratio ?? H / W)) : H;
  const px = (p: Pt) => ({ x: (p.x / 100) * W, y: (p.y / 100) * h });
  /** Position d'une île sur la carte de l'archipel : la sienne, ou le centre de sa région. */
  const onArchipel = (i: IslandView): Pt => (i.regionId ? regionById.get(i.regionId)?.center : undefined) ?? i;
  const here = (i: IslandView) => (i.regionId ?? null) === level;
  const places = group.islands.filter(here);
  const selected = selIsle ? byId.get(selIsle) : undefined;
  const sel = selected && here(selected) ? selected : undefined;
  const selReg = !level && selRegion ? regionById.get(selRegion) : undefined;

  // Route : suite des îles des séances, puis l'escale actuelle si elle n'y est pas encore.
  const routeIds = [...group.route];
  if (harbor && routeIds.at(-1) !== harbor.id) routeIds.push(harbor.id);
  const routeIsles = routeIds.map((id) => byId.get(id)).filter((i): i is IslandView => Boolean(i));
  const routePts = level
    ? dedupe(routeIsles.filter(here), (i) => i.id).map((i) => px(i))
    : dedupe(routeIsles, (i) => i.regionId ?? i.id).map((i) => px(onArchipel(i)));
  const from = harbor ?? routeIsles.at(-1);
  const pos = (i: IslandView) => (level ? (here(i) ? px(i) : null) : px(onArchipel(i)));
  const fromPt = from ? pos(from) : null;
  const nextPt = next ? pos(next) : null;
  const sameSpot = !from || !next || (level ? from.id === next.id : (from.regionId ?? from.id) === (next.regionId ?? next.id));
  const shipAt = harbor ? pos(harbor) : null;

  const idle = mode.kind === "idle";
  const reset = () => (setMode({ kind: "idle" }), setDraft(null));
  const openRegion = (id: string) => {
    reset();
    setRegionDraft(null);
    setZoom(1);
    setRegionId(id);
    setSelIsle(harbor?.regionId === id ? harbor.id : null);
  };
  const backToArchipel = () => {
    reset();
    setZoom(1);
    setSelRegion(regionId);
    setSelIsle(null);
    setRegionId(null);
  };

  const pointer = (e: MouseEvent<SVGSVGElement>) => {
    const r = svg.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };
  const onMapClick = async (e: MouseEvent<SVGSVGElement>) => {
    if (!isAdmin || idle) return;
    const p = pointer(e);
    if (mode.kind === "add") {
      setDraft(p);
      setSelIsle(null);
    } else if (mode.kind === "draw") setMode({ ...mode, pts: [...mode.pts, p] });
    else if (await run(moveIslandAction(mode.id, p.x, p.y))) setMode({ kind: "idle" });
  };
  const finishDraw = async () => {
    if (mode.kind !== "draw" || mode.pts.length < 3) return;
    const flat = mode.pts.flatMap((p) => [p.x, p.y]);
    const r = mode.id ? regionById.get(mode.id) : undefined;
    if (r) {
      if (await run(saveRegionAction({ ...r, groupId: group.id, points: flat }))) setMode({ kind: "idle" });
    } else {
      setRegionDraft(flat);
      setSelRegion(null);
      setSelIsle(null);
      setMode({ kind: "idle" });
    }
  };
  const pickIsle = (id: string) => {
    if (!idle) return;
    setSelIsle(id);
    setSelRegion(null);
    setDraft(null);
  };
  const pickRegion = (id: string) => {
    if (!idle) return;
    setSelRegion(id);
    setSelIsle(null);
  };
  const keyPick = (fn: () => void) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };

  return (
    <div className="map-layout">
      <div className="map-frame">
        <div className="map-toolbar">
          {region && (
            <nav className="map-crumbs" aria-label="Niveau de la carte">
              <button type="button" className="btn btn-ghost btn-small" onClick={backToArchipel}>
                ← L&apos;archipel
              </button>
              <span className="map-crumb-here" style={{ color: region.color }}>
                {region.name}
              </span>
            </nav>
          )}
          {isAdmin &&
            (idle ? (
              <>
                <button type="button" className="btn btn-small" onClick={() => setMode({ kind: "add" })} disabled={busy}>
                  ＋ {level ? "Ajouter un lieu" : "Ajouter une île"}
                </button>
                {!level && (
                  <>
                    <button type="button" className="btn btn-ghost btn-small" onClick={() => (setMode({ kind: "draw", id: null, pts: [] }), setSelRegion(null), setSelIsle(null))} disabled={busy}>
                      Dessiner une région
                    </button>
                    <button type="button" className="btn btn-ghost btn-small" onClick={() => setBgOpen((o) => !o)} aria-expanded={bgOpen}>
                      Fond de carte
                    </button>
                  </>
                )}
              </>
            ) : mode.kind === "draw" ? (
              <>
                <span className="chip chip-accent">
                  Clique sur la carte pour poser le contour · {mode.pts.length} point{mode.pts.length > 1 ? "s" : ""}
                </span>
                <button type="button" className="btn btn-small" disabled={busy || mode.pts.length < 3} onClick={() => void finishDraw()}>
                  Terminer le contour
                </button>
                <button type="button" className="btn btn-ghost btn-small" disabled={mode.pts.length === 0} onClick={() => setMode({ ...mode, pts: mode.pts.slice(0, -1) })}>
                  Retirer le dernier point
                </button>
                <button type="button" className="btn btn-ghost btn-small" onClick={reset}>
                  Annuler
                </button>
              </>
            ) : (
              <>
                <span className="chip chip-accent">{mode.kind === "add" ? "Clique sur la carte pour le placer" : "Clique sur la carte pour le déplacer"}</span>
                <button type="button" className="btn btn-ghost btn-small" onClick={reset}>
                  Annuler
                </button>
              </>
            ))}
          <span className="map-zoom" role="group" aria-label="Zoom">
            <button type="button" className="btn btn-ghost btn-small" aria-label="Dézoomer" disabled={zoom === ZOOMS[0]} onClick={() => setZoom(ZOOMS[Math.max(0, ZOOMS.indexOf(zoom) - 1)])}>
              −
            </button>
            <span className="muted small">×{zoom}</span>
            <button type="button" className="btn btn-ghost btn-small" aria-label="Zoomer" disabled={zoom === ZOOMS.at(-1)} onClick={() => setZoom(ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(zoom) + 1)])}>
              ＋
            </button>
          </span>
        </div>
        {isAdmin && bgOpen && !level && <MapImageEditor group={group} busy={busy} run={run} onDone={() => setBgOpen(false)} />}
        <div className="map-scroll">
          <svg
            ref={svg}
            viewBox={`0 0 ${W} ${h}`}
            className={`map-sea${img ? " map-sea-image" : ""}${!idle ? " placing" : ""}`}
            style={{ width: `${zoom * 100}%` }}
            onClick={onMapClick}
            role="img"
            aria-label={region ? `Carte de la région ${region.name}` : `Carte de l'archipel de ${group.name}`}
          >
            <defs>
              <pattern id="map-waves" width="80" height="60" patternUnits="userSpaceOnUse">
                <path d="M8 18 q6 -5 12 0 q6 5 12 0 M48 48 q6 -5 12 0 q6 5 12 0" stroke="currentColor" strokeOpacity=".1" fill="none" strokeWidth="1.6" strokeLinecap="round" />
              </pattern>
            </defs>
            {img ? <image href={img} width={W} height={h} preserveAspectRatio="none" /> : <rect width={W} height={H} fill="url(#map-waves)" className="map-waves" />}
            {region && !img && (
              <text x={W / 2} y={H / 2} className="map-empty-note">
                {isAdmin ? "Ajoute la carte de la région (Modifier la région)" : "La carte de cette région reste à dessiner"}
              </text>
            )}

            {!level &&
              group.regions.map((r) => {
                const c = px(r.center);
                const on = r.id === selRegion;
                return (
                  <g
                    key={r.id}
                    className={`map-region map-region-${r.status}${on ? " on" : ""}`}
                    style={{ color: r.color }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Région ${r.name}${harbor?.regionId === r.id ? ", le Navire y mouille" : ""}`}
                    aria-pressed={on}
                    onClick={(e) => {
                      if (!idle) return;
                      e.stopPropagation();
                      pickRegion(r.id);
                    }}
                    onDoubleClick={() => idle && openRegion(r.id)}
                    onKeyDown={keyPick(() => (on ? openRegion(r.id) : pickRegion(r.id)))}
                  >
                    <polygon points={pairs(r.points).map((p) => `${(p.x / 100) * W},${(p.y / 100) * h}`).join(" ")} className="map-region-shape" />
                    <text x={c.x} y={c.y} className="map-region-label">
                      {r.name}
                    </text>
                  </g>
                );
              })}

            {routePts.length > 1 && <path d={smooth(routePts)} className="map-route" />}
            {fromPt && nextPt && !sameSpot && <path d={smooth([fromPt, nextPt])} className="map-route map-route-next" />}
            {!level && next?.regionId && nextPt && (
              <circle cx={nextPt.x} cy={nextPt.y} r={30} className="map-pulse" style={{ color: regionById.get(next.regionId)?.color }} />
            )}

            {places.map((i) => {
              const p = px(i);
              const size = i.id === group.harborId || i.id === group.nextId ? 34 : 26;
              return (
                <g
                  key={i.id}
                  transform={`translate(${p.x} ${p.y})`}
                  className={`map-isle map-isle-${i.status}${i.id === sel?.id ? " on" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${i.name}${i.id === group.harborId ? ", le Navire y mouille" : i.id === group.nextId ? ", prochaine escale" : ""}`}
                  aria-pressed={i.id === sel?.id}
                  onClick={(e) => {
                    if (!idle) return;
                    e.stopPropagation();
                    pickIsle(i.id);
                  }}
                  onKeyDown={keyPick(() => pickIsle(i.id))}
                  style={{ color: i.color }}
                >
                  {img ? (
                    // Sur une vraie carte, l'île est déjà dessinée : un simple repère suffit.
                    <>
                      {i.id === group.nextId && <circle r={size * 0.9} className="map-pulse" />}
                      <circle r={size * 0.75} className="map-hit" />
                      <circle r={size * 0.34} className="map-pin" />
                      {i.id === sel?.id && <circle r={size * 0.8} className="map-ring" />}
                    </>
                  ) : (
                    <>
                      {i.id === group.nextId && <circle r={size * 1.4} className="map-pulse" />}
                      <path d={islandShape(i.id)} transform={`scale(${size * 1.7})`} className="map-shallow" />
                      <path d={islandShape(i.id)} transform={`scale(${size})`} className="map-land" />
                      {i.id === sel?.id && <circle r={size * 1.55} className="map-ring" />}
                    </>
                  )}
                  <text y={img ? size * 0.34 + 20 : size + 20} className="map-label">
                    {i.name}
                  </text>
                </g>
              );
            })}
            {shipAt && <Ship at={shipAt} />}
            {draft && <circle cx={(draft.x / 100) * W} cy={(draft.y / 100) * h} r={14} className="map-draft" />}
            {mode.kind === "draw" && mode.pts.length > 0 && (
              <g className="map-drawing" style={{ color: (mode.id && regionById.get(mode.id)?.color) || "#fff" }}>
                <polygon points={mode.pts.map((p) => `${(p.x / 100) * W},${(p.y / 100) * h}`).join(" ")} className="map-drawing-shape" />
                {mode.pts.map((p, n) => (
                  <circle key={n} cx={(p.x / 100) * W} cy={(p.y / 100) * h} r={n === 0 ? 7 : 5} className="map-drawing-pt" />
                ))}
              </g>
            )}
          </svg>
        </div>
        <p className="map-legend muted small">
          {!level && group.regions.length > 0 && <span>Clique deux fois sur une région pour ouvrir sa carte</span>}
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
        {isAdmin && regionDraft ? (
          <RegionEditor key="new-region" group={group} points={regionDraft} busy={busy} run={run} onDone={(ok) => ok && setRegionDraft(null)} onCancel={() => setRegionDraft(null)} />
        ) : (
          <>
            {region && (
              <RegionPanel
                key={region.id}
                region={region}
                group={group}
                isAdmin={isAdmin}
                busy={busy}
                run={run}
                inside
                onOpen={() => {}}
                onRedraw={() => {}}
                onDeleted={backToArchipel}
              />
            )}
            {draft && isAdmin ? (
              <IslandEditor key="new" group={group} regionId={level} at={draft} busy={busy} run={run} onDone={(ok) => (ok && reset(), !ok)} onCancel={reset} />
            ) : sel ? (
              <IslandPanel key={sel.id} island={sel} group={group} isAdmin={isAdmin} busy={busy} run={run} onMove={() => setMode({ kind: "move", id: sel.id })} onDeleted={() => setSelIsle(null)} />
            ) : selReg ? (
              <RegionPanel
                key={selReg.id}
                region={selReg}
                group={group}
                isAdmin={isAdmin}
                busy={busy}
                run={run}
                onOpen={() => openRegion(selReg.id)}
                onRedraw={() => setMode({ kind: "draw", id: selReg.id, pts: [] })}
                onDeleted={() => setSelRegion(null)}
              />
            ) : (
              !region && (
                <div className="card stack">
                  <h2 className="subtitle">L&apos;archipel</h2>
                  <p className="muted">
                    {group.regions.length === 0 && group.islands.length === 0
                      ? isAdmin
                        ? "Rien sur la carte pour l'instant. Dessine les régions de l'archipel, ou ajoute la première escale du groupe."
                        : "Le MJ n'a pas encore dessiné la carte."
                      : "Choisis une région pour lire ce qu'on en sait et ouvrir sa carte."}
                  </p>
                </div>
              )
            )}
          </>
        )}
        {!level && group.regions.length > 0 && (
          <div className="card stack">
            <h2 className="subtitle">Les régions</h2>
            <ul className="map-list">
              {group.regions.map((r) => {
                const n = group.islands.filter((i) => i.regionId === r.id).length;
                return (
                  <li key={r.id}>
                    <button type="button" className={`map-list-item${r.id === selRegion ? " on" : ""}`} onClick={() => pickRegion(r.id)} onDoubleClick={() => openRegion(r.id)}>
                      <span className="map-dot" style={{ background: r.color }} aria-hidden="true" />
                      <span className="stack-xs">
                        <span>{r.name}</span>
                        <span className="muted small">
                          {harbor?.regionId === r.id ? "Le Navire y mouille" : next?.regionId === r.id ? "Prochaine escale" : ISLAND_STATUS[r.status].label}
                          {n > 0 && ` · ${n} lieu${n > 1 ? "x" : ""}`}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {places.length > 0 && (
          <div className="card stack">
            <h2 className="subtitle">{level ? "Les lieux" : group.regions.length ? "Hors des régions" : "Les îles"}</h2>
            <ul className="map-list">
              {places.map((i) => (
                <li key={i.id}>
                  <button type="button" className={`map-list-item${i.id === sel?.id ? " on" : ""}`} onClick={() => pickIsle(i.id)}>
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

function RegionPanel({
  region,
  group,
  isAdmin,
  busy,
  run,
  inside,
  onOpen,
  onRedraw,
  onDeleted,
}: {
  region: RegionView;
  group: MapGroup;
  isAdmin: boolean;
  busy: boolean;
  run: Run;
  /** Affiché depuis la carte de la région elle-même. */
  inside?: boolean;
  onOpen: () => void;
  onRedraw: () => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const harborHere = group.islands.some((i) => i.id === group.harborId && i.regionId === region.id);
  const nextHere = group.islands.some((i) => i.id === group.nextId && i.regionId === region.id);
  const places = group.islands.filter((i) => i.regionId === region.id).length;
  if (editing) return <RegionEditor group={group} region={region} points={region.points} busy={busy} run={run} onDone={(ok) => ok && setEditing(false)} onCancel={() => setEditing(false)} />;
  return (
    <div className="card stack map-panel" style={{ ["--isle-c" as string]: region.color }}>
      <div className="stack-xs">
        <span className="chips">
          <span className="chip">Région</span>
          {harborHere && <span className="chip chip-accent">⚓ Le Navire y mouille</span>}
          {nextHere && <span className="chip chip-accent">Prochaine escale</span>}
          {!harborHere && !nextHere && <span className="chip">{ISLAND_STATUS[region.status].label}</span>}
        </span>
        <h2 className="subtitle">{region.name}</h2>
      </div>
      {region.description ? <p className="map-desc">{region.description}</p> : <p className="muted">{isAdmin ? "Pas encore de description." : "On n'en sait pas encore grand-chose."}</p>}
      {!inside && (
        <button type="button" className="btn btn-small" onClick={onOpen}>
          Ouvrir la carte de la région{places > 0 ? ` (${places} lieu${places > 1 ? "x" : ""})` : ""}
        </button>
      )}
      {isAdmin && (
        <div className="chips map-admin">
          <button type="button" className="btn btn-ghost btn-small" onClick={() => setEditing(true)}>
            Modifier la région
          </button>
          {!inside && (
            <button type="button" className="btn btn-ghost btn-small" onClick={onRedraw}>
              Redessiner le contour
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-small danger-text"
            disabled={busy}
            onClick={async () => {
              if (!confirm(`Supprimer la région ${region.name} ? Ses lieux reviennent sur la carte de l'archipel.`)) return;
              if (await run(deleteRegionAction(region.id))) onDeleted();
            }}
          >
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}

function RegionEditor({
  group,
  region,
  points,
  busy,
  run,
  onDone,
  onCancel,
}: {
  group: MapGroup;
  region?: RegionView;
  points: number[];
  busy: boolean;
  run: Run;
  onDone: (ok: boolean) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(region?.name ?? "");
  const [color, setColor] = useState<string>(region?.color ?? REGION_COLORS[group.regions.length % REGION_COLORS.length].id);
  const [status, setStatus] = useState<IslandStatusId>(region?.status ?? "seen");
  const [description, setDescription] = useState(region?.description ?? "");
  const [mapImage, setMapImage] = useState(region?.mapImage ?? "");
  const save = async () => {
    onDone(await run(saveRegionAction({ id: region?.id ?? null, groupId: group.id, name, color, status, description, points, mapImage: mapImage.trim() || null })));
  };
  return (
    <form
      className="card stack"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <h2 className="subtitle">{region ? `Modifier ${region.name}` : "Nouvelle région"}</h2>
      <label className="field">
        <span className="label">Nom</span>
        <input className="input" id="region-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Les Eaux Grises" required autoFocus />
      </label>
      <fieldset className="field">
        <legend className="label">Couleur sur la carte de l&apos;archipel</legend>
        <div className="map-swatches">
          {REGION_COLORS.map((c) => (
            <button key={c.id} type="button" className={`map-swatch${color === c.id ? " on" : ""}`} style={{ background: c.id }} aria-pressed={color === c.id} title={c.name} aria-label={c.name} onClick={() => setColor(c.id)} />
          ))}
        </div>
      </fieldset>
      <label className="field">
        <span className="label">Visibilité</span>
        <select className="input" id="region-status" value={status} onChange={(e) => setStatus(e.target.value as IslandStatusId)}>
          {Object.entries(ISLAND_STATUS).map(([id, s]) => (
            <option key={id} value={id}>
              {s.label} : {s.hint}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="label">Ce qu&apos;on en sait</span>
        <textarea className="input textarea" id="region-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} placeholder="Le peuple, ses coutumes, ce qu'on raconte au port…" />
      </label>
      <label className="field">
        <span className="label">Carte de la région</span>
        <input className="input" id="region-map" value={mapImage} onChange={(e) => setMapImage(e.target.value)} maxLength={500} placeholder="/cartes/regions/ma-region.jpg" />
        <span className="muted small">Exporte la carte depuis Inkarnate, dépose-la dans public/cartes/regions/ du projet, puis écris son chemin ici.</span>
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
  regionId,
  at,
  busy,
  run,
  onDone,
  onCancel,
}: {
  group: MapGroup;
  island?: IslandView;
  /** Région où placer une nouvelle île (null : carte de l'archipel). */
  regionId?: string | null;
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
  const startRegion = island ? island.regionId : (regionId ?? null);
  const [where, setWhere] = useState<string>(startRegion ?? "");
  const save = async () => {
    // Changer de carte : l'île repart au centre de sa nouvelle carte, le MJ la déplace ensuite.
    const moved = (where || null) !== startRegion;
    const x = moved ? 50 : (island?.x ?? at?.x ?? 50);
    const y = moved ? 50 : (island?.y ?? at?.y ?? 50);
    const ok = await run(saveIslandAction({ id: island?.id ?? null, groupId: group.id, regionId: where || null, name, color, status, description, x, y }));
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
      <h2 className="subtitle">{island ? `Modifier ${island.name}` : regionId ? "Nouveau lieu" : "Nouvelle île"}</h2>
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
      {group.regions.length > 0 && (
        <label className="field">
          <span className="label">Sur quelle carte</span>
          <select className="input" value={where} onChange={(e) => setWhere(e.target.value)}>
            <option value="">La carte de l&apos;archipel</option>
            {group.regions.map((r) => (
              <option key={r.id} value={r.id}>
                Région : {r.name}
              </option>
            ))}
          </select>
          {(where || null) !== startRegion && island && <span className="muted small">L&apos;île sera placée au centre de cette carte : déplace-la ensuite.</span>}
        </label>
      )}
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
