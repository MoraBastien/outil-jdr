"use client";
// La Forge stellaire : dans la cuve, l'homunculus prend forme humaine, en constellation, choix après choix.
// - Avant la matière : un moule fantôme (articulations ternes, liens en pointillés).
// - Matière : les étoiles du corps s'allument des pieds à la tête, avec sa couleur et ses particules.
// - Classe : sceau gravé sur la poitrine, autour du cœur-étoile.
// - Caractéristiques : chaque partie du corps brille selon sa valeur (FOR bras, DEX jambes, CON torse, INT tête,
//   SAG cœur, CHA aura).
// - Écho : anneaux en orbite autour du corps. Anomalie : battement (Combat), dérive (Exploration), ondes (Social).
// - Fêlure : fissure lumineuse de l'épaule à la hanche. Nom : l'être ouvre les yeux (éveil).
// - Six étoiles autour du corps suivent les étapes ; à 6/6 l'hexagramme se trace.
// Performances : halos pré-dessinés (pas de shadowBlur), fond en cache, ~30 images/s, pause hors écran ;
// une image fixe si le système demande moins d'animations.
import { useEffect, useRef } from "react";
import { ANOMALIES } from "../data/anomalies";
import { CONSTELLATIONS } from "../data/constellations";
import { FAMILLE_FX, FORGE_DEFAULT, MATIERE_VISUALS, sigilPolylines } from "../data/forge";
import { STATS } from "../data/stats";
import type { DerivedSheet, HomunculusState } from "../types";

interface Props {
  state: HomunculusState;
  derived: DerivedSheet;
  /** Vrai pendant l'éveil (la fiche vient d'être terminée) : l'être ouvre les yeux, onde de choc. */
  awakening?: boolean;
}

type Pt = [number, number];
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; kind: "infuse" | "amb" | "void" | "dust" | "plume" };

const TAU = Math.PI * 2;

/** Squelette, en hauteur de corps (0 = sommet de la tête, 1 = pieds), centré en x = 0. */
const J: Record<string, Pt> = {
  head: [0, 0.075], neck: [0, 0.15], chest: [0, 0.27], heart: [0, 0.255],
  shL: [-0.118, 0.19], shR: [0.118, 0.19], elL: [-0.165, 0.355], elR: [0.165, 0.355], haL: [-0.18, 0.5], haR: [0.18, 0.5],
  waist: [0, 0.4], hipL: [-0.058, 0.53], hipR: [0.058, 0.53], knL: [-0.066, 0.735], knR: [0.066, 0.735], ftL: [-0.072, 0.945], ftR: [0.072, 0.945],
};
/** Étoiles visibles (le cœur est dessiné à part). */
const JOINTS = Object.keys(J).filter((k) => k !== "heart");
/** Liens de la constellation du corps. */
const LINKS: [string, string][] = [
  ["head", "neck"], ["neck", "shL"], ["neck", "shR"], ["shL", "elL"], ["elL", "haL"], ["shR", "elR"], ["elR", "haR"], ["neck", "chest"],
  ["chest", "waist"], ["waist", "hipL"], ["waist", "hipR"], ["hipL", "knL"], ["knL", "ftL"], ["hipR", "knR"], ["knR", "ftR"], ["shL", "hipL"], ["shR", "hipR"],
];
/** Membres effilés du voile (volume du corps) : départ, arrivée, rayon au départ, rayon à l'arrivée. */
const BONES: [string, string, number, number][] = [
  ["shL", "elL", 0.046, 0.034], ["elL", "haL", 0.033, 0.024], ["shR", "elR", 0.046, 0.034], ["elR", "haR", 0.033, 0.024],
  ["hipL", "knL", 0.062, 0.04], ["knL", "ftL", 0.04, 0.026], ["hipR", "knR", 0.062, 0.04], ["knR", "ftR", 0.04, 0.026], ["neck", "head", 0.032, 0.03],
];

/** Hachage simple d'une chaîne (graine stable pour la fissure de la Fêlure). */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function seeded(seed: number) {
  let x = seed || 1;
  return () => ((x = Math.imul(x ^ (x >>> 15), 2246822507) ^ Math.imul(x ^ (x >>> 13), 3266489909)) >>> 0) / 4294967296;
}
/** Luminosité approximative d'une couleur #rrggbb (0 à 1). */
function luma(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

/** Membre effilé : deux cercles reliés par leurs tangentes. */
function capsule(g: CanvasRenderingContext2D, [x1, y1]: Pt, [x2, y2]: Pt, r1: number, r2: number) {
  const n = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
  g.moveTo(x1 + Math.cos(n) * r1, y1 + Math.sin(n) * r1);
  g.arc(x1, y1, r1, n, n + Math.PI);
  g.lineTo(x2 - Math.cos(n) * r2, y2 - Math.sin(n) * r2);
  g.arc(x2, y2, r2, n + Math.PI, n + TAU);
  g.closePath();
}

/** Voile du corps (torse galbé, tête, membres, mains, pieds), rempli avec le style courant. */
function bodyVeil(g: CanvasRenderingContext2D, P: Record<string, Pt>, S: number) {
  const u = (k: string, dx = 0, dy = 0): Pt => [P[k][0] + dx * S, P[k][1] + dy * S];
  const [nx, ny] = P.neck, [wx, wy] = P.waist;
  const L = (dx: number, dy: number): Pt => [nx + dx * S, ny + dy * S];
  g.beginPath();
  g.moveTo(...L(-0.032, 0));
  g.quadraticCurveTo(...L(-0.05, 0.03), ...u("shL", 0.005, -0.03));
  g.quadraticCurveTo(...u("shL", -0.05, -0.02), ...u("shL", -0.04, 0.05));
  g.quadraticCurveTo(...u("shL", -0.015, 0.1), wx - 0.068 * S, wy);
  g.quadraticCurveTo(wx - 0.085 * S, wy + 0.07 * S, ...u("hipL", -0.045, 0.02));
  g.quadraticCurveTo(...u("hipL", 0, 0.07), wx, P.hipL[1] + 0.04 * S);
  g.quadraticCurveTo(...u("hipR", 0, 0.07), ...u("hipR", 0.045, 0.02));
  g.quadraticCurveTo(wx + 0.085 * S, wy + 0.07 * S, wx + 0.068 * S, wy);
  g.quadraticCurveTo(...u("shR", 0.015, 0.1), ...u("shR", 0.04, 0.05));
  g.quadraticCurveTo(...u("shR", 0.05, -0.02), ...u("shR", -0.005, -0.03));
  g.quadraticCurveTo(...L(0.05, 0.03), ...L(0.032, 0));
  g.closePath();
  // Torse rempli à part : tracé dans l'autre sens que les membres, il ferait des trous aux chevauchements.
  g.fill();
  g.beginPath();
  g.moveTo(P.head[0] + 0.056 * S, P.head[1]);
  g.ellipse(P.head[0], P.head[1], 0.056 * S, 0.066 * S, 0, 0, TAU);
  for (const [a, b, r1, r2] of BONES) capsule(g, P[a], P[b], r1 * S, r2 * S);
  for (const k of ["haL", "haR"]) {
    g.moveTo(P[k][0] + 0.022 * S, P[k][1] + 0.02 * S);
    g.ellipse(P[k][0], P[k][1] + 0.02 * S, 0.022 * S, 0.034 * S, 0, 0, TAU);
  }
  for (const [k, d] of [["ftL", -1], ["ftR", 1]] as const) {
    g.moveTo(P[k][0] + d * 0.012 * S + 0.034 * S, P[k][1] + 0.012 * S);
    g.ellipse(P[k][0] + d * 0.012 * S, P[k][1] + 0.012 * S, 0.034 * S, 0.018 * S, 0, 0, TAU);
  }
  g.fill();
}

export function Forge({ state, derived, awakening = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ state, derived });
  live.current = { state, derived };
  // Événements déclenchés par les choix (lus par la boucle d'animation).
  const events = useRef<{ infuse: number; awaken: number }>({ infuse: 0, awaken: 0 });
  const prev = useRef<string | null>(null);

  // Une gerbe à chaque choix ; l'éveil quand la fiche devient complète.
  const key = [state.echo, state.matiereId, state.classeId, state.pool?.join(","), state.assign.join(","), state.anomalieId, state.felureId, state.felJets, state.jets, state.nom.trim() !== ""].join("|");
  useEffect(() => {
    const p = prev.current;
    prev.current = key;
    if (p !== null && state.id && p !== key) events.current.infuse = performance.now();
  }, [key, state.id]);
  useEffect(() => {
    if (awakening) events.current.awaken = performance.now();
  }, [awakening]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0, visible = true, last = 0;
    let lastInfuse = 0, lastAwaken = 0;
    // Remplissage par la matière (0 → 1), relancé quand la matière change.
    let fill = 0, fillMatter: string | null = null;
    const parts: Particle[] = [];
    const rndBg = seeded(42);
    const bgStars = Array.from({ length: 110 }, () => ({ x: rndBg(), y: rndBg(), r: rndBg() * 1.1 + 0.2, p: rndBg() * TAU }));

    // Halos pré-dessinés (un par couleur) et fond en cache : pas de shadowBlur ni de dégradé par élément et par image.
    const sprites = new Map<string, HTMLCanvasElement>();
    const sprite = (color: string) => {
      let c = sprites.get(color);
      if (!c) {
        c = document.createElement("canvas");
        c.width = c.height = 64;
        const g = c.getContext("2d")!;
        const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, color);
        gr.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = gr;
        g.fillRect(0, 0, 64, 64);
        sprites.set(color, c);
      }
      return c;
    };
    const glowAt = (color: string, x: number, y: number, r: number, alpha = 1) => {
      if (r <= 0 || alpha <= 0) return;
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.drawImage(sprite(color), x - r, y - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
    };
    let bgCache: { key: string; canvas: HTMLCanvasElement } | null = null;
    const background = (veil: string) => {
      const k = `${w}x${h}|${veil}`;
      if (bgCache?.key === k) return bgCache.canvas;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(w * dpr));
      c.height = Math.max(1, Math.round(h * dpr));
      const g = c.getContext("2d")!;
      g.scale(dpr, dpr);
      const bg = g.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, Math.max(w, h) * 0.75);
      bg.addColorStop(0, veil);
      bg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      for (const b of bgStars) {
        g.fillStyle = `rgba(230,236,255,${0.25 + 0.45 * Math.abs(Math.sin(b.p))})`;
        g.fillRect(b.x * w - b.r / 2, b.y * h - b.r / 2, b.r, b.r);
      }
      bgCache = { key: k, canvas: c };
      return c;
    };

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduce) draw(performance.now());
    };

    const draw = (t: number) => {
      const { state: s, derived: d } = live.current;
      const v = (s.matiereId && MATIERE_VISUALS[s.matiereId]) || FORGE_DEFAULT;
      const hasMatter = Boolean(s.matiereId && MATIERE_VISUALS[s.matiereId]);
      const anomalie = ANOMALIES.find((a) => a.id === s.anomalieId);
      const fx = anomalie ? FAMILLE_FX[anomalie.famille] : undefined;
      const sec = reduce ? 0 : t / 1000;

      // Remplissage : repart de zéro à chaque nouvelle matière.
      if (s.matiereId !== fillMatter) {
        fillMatter = s.matiereId;
        fill = 0;
      }
      const target = hasMatter ? 1 : 0;
      fill = reduce ? target : fill + (target - fill) * 0.035;

      // Événements.
      if (events.current.infuse !== lastInfuse) lastInfuse = events.current.infuse;
      if (events.current.awaken !== lastAwaken) lastAwaken = events.current.awaken;
      const infuseAge = lastInfuse ? (t - lastInfuse) / 1000 : 99;
      const awakenAge = lastAwaken ? (t - lastAwaken) / 1000 : 99;

      // Pose : le corps flotte et respire, les bras se balancent ; « Exploration » le fait dériver.
      const S = Math.min(h * 0.64, w * 1.25);
      const ox = w / 2 + (!reduce && fx === "wobble" ? Math.sin(sec * 0.6) * w * 0.03 : 0);
      // Corps centré verticalement dans la cuve (il mesure S de haut).
      const oy = (h - S) / 2 + h * 0.01 + Math.sin(sec * 0.9) * h * 0.008;
      const P: Record<string, Pt> = {};
      for (const [k, [x, y]] of Object.entries(J)) {
        let xx = x, yy = y;
        if (/^(el|ha)/.test(k)) {
          const side = k.endsWith("L") ? -1 : 1;
          xx += side * Math.sin(sec * 0.8 + (side > 0 ? 1 : 0)) * (k.startsWith("ha") ? 0.018 : 0.01);
        }
        if (k === "chest") yy -= Math.sin(sec * 1.6) * 0.003;
        P[k] = [ox + xx * S, oy + yy * S];
      }
      // Allumage des pieds vers la tête : chaque articulation s'allume quand la matière atteint sa hauteur.
      const lit = (k: string) => Math.min(1, Math.max(0, (fill * 1.2 - (1 - J[k][1])) * 5));
      // « Combat » : le cœur bat.
      let beat = 0;
      if (!reduce && fx === "pulse") {
        const b = sec % 1.05;
        beat = b < 0.1 ? b * 10 : b < 0.3 ? 1 - (b - 0.1) * 5 : 0;
      }

      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      ctx.lineCap = "butt";
      ctx.setLineDash([]);
      ctx.drawImage(background(v.veil), 0, 0, w, h);

      // Six étoiles de progression autour du corps.
      const cx = w / 2, cy = oy + S * 0.47;
      const R = Math.min(w * 0.45, S * 0.6);
      const stepStar = (i: number): Pt => {
        const a = -Math.PI / 2 + (i * TAU) / 6;
        return [cx + Math.cos(a) * R, cy + Math.sin(a) * R * 1.02];
      };
      for (let i = 0; i < 6; i++) {
        const j = (i + 1) % 6, on = d.steps[i] && d.steps[j];
        const [x1, y1] = stepStar(i), [x2, y2] = stepStar(j);
        ctx.strokeStyle = on ? v.edge : "rgba(150,160,210,.14)";
        ctx.globalAlpha = on ? 0.5 : 1;
        ctx.setLineDash(on ? [] : [2, 6]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      if (d.complete) {
        const k = reduce ? 1 : Math.min(1, Math.max(0, awakenAge < 99 ? awakenAge / 1.2 : 1));
        ctx.strokeStyle = v.edge;
        ctx.globalAlpha = 0.4;
        for (const tri of [[0, 2, 4], [1, 3, 5]]) {
          for (let n = 0; n < 3; n++) {
            const [x1, y1] = stepStar(tri[n]), [x2, y2] = stepStar(tri[(n + 1) % 3]);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 + (x2 - x1) * k, y1 + (y2 - y1) * k);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }
      for (let i = 0; i < 6; i++) {
        const [x, y] = stepStar(i), on = d.steps[i];
        if (on) glowAt(v.glow, x, y, 14 * (reduce ? 1 : 0.8 + 0.2 * Math.sin(sec * 2 + i)));
        ctx.fillStyle = on ? "#fff3d0" : "rgba(110,120,175,.55)";
        ctx.beginPath();
        ctx.arc(x, y, on ? 3 : 2.2, 0, TAU);
        ctx.fill();
      }

      // Anneaux de l'Écho autour du corps : moitié arrière d'abord, moitié avant après le corps.
      const rings = Array.from({ length: s.echo }, (_, i) => {
        const e = i + 1, rx = S * (0.26 + e * 0.06);
        return { rx, ry: rx * 0.22, tilt: -0.22 + e * 0.14, yy: P.waist[1] - S * 0.08 + e * S * 0.03, ma: (reduce ? e : sec * (0.45 + e * 0.12)) + e * 1.9 };
      });
      const ring = (r: (typeof rings)[number], back: boolean) => {
        ctx.save();
        ctx.translate(cx, r.yy);
        ctx.rotate(r.tilt);
        ctx.strokeStyle = "rgba(200,210,255,.22)";
        ctx.beginPath();
        ctx.ellipse(0, 0, r.rx, r.ry, 0, back ? Math.PI : 0, back ? TAU : Math.PI);
        ctx.stroke();
        ctx.restore();
        const mx = Math.cos(r.ma) * r.rx, my = Math.sin(r.ma) * r.ry;
        if (my < 0 === back) {
          const px = cx + mx * Math.cos(r.tilt) - my * Math.sin(r.tilt), py = r.yy + mx * Math.sin(r.tilt) + my * Math.cos(r.tilt);
          glowAt(v.glow, px, py, 9);
          ctx.fillStyle = "#fff3d0";
          ctx.beginPath();
          ctx.arc(px, py, 2.2, 0, TAU);
          ctx.fill();
        }
      };
      rings.forEach((r) => ring(r, true));

      // Aura (CHA) et voile du corps.
      const statOf = (i: number) => d.stats[i]?.final;
      const level = (i: number) => {
        const f = statOf(i);
        return f == null ? 0 : Math.max(0.05, (f - 5) / 12);
      };
      if (hasMatter) glowAt(v.glow, cx, P.chest[1] + S * 0.12, S * (0.42 + level(5) * 0.25), (0.45 + level(5) * 0.35) * fill);
      ctx.fillStyle = hasMatter ? v.edge : "rgba(170,185,255,1)";
      ctx.globalAlpha = hasMatter ? 0.08 + 0.1 * fill : 0.05;
      bodyVeil(ctx, P, S);
      ctx.globalAlpha = 1;

      // Liens de la constellation (pointillés tant que la matière n'est pas là).
      ctx.lineWidth = 1.2;
      for (const [a, b] of LINKS) {
        const k = hasMatter ? Math.min(lit(a), lit(b)) : 0;
        ctx.strokeStyle = k > 0 ? v.edge : "rgba(170,185,255,.25)";
        ctx.globalAlpha = k > 0 ? 0.3 + 0.45 * k : 1;
        ctx.setLineDash(k > 0 ? [] : [2, 5]);
        ctx.beginPath();
        ctx.moveTo(...P[a]);
        ctx.lineTo(...P[b]);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;

      // Articulations-étoiles, et la tête cerclée.
      const darkCore = luma(v.core) < 0.3;
      for (const k of JOINTS) {
        const [x, y] = P[k], l = hasMatter ? lit(k) : 0;
        if (l > 0) glowAt(v.glow, x, y, 3 + 9 * l);
        ctx.fillStyle = l > 0 ? (darkCore ? v.edge : "#fff8e6") : "rgba(170,185,255,.4)";
        ctx.beginPath();
        ctx.arc(x, y, k === "head" ? 4 : 2.4, 0, TAU);
        ctx.fill();
      }
      if (hasMatter && lit("head") > 0) {
        ctx.strokeStyle = v.edge;
        ctx.globalAlpha = 0.5 * lit("head");
        ctx.beginPath();
        ctx.ellipse(P.head[0], P.head[1], 0.056 * S, 0.066 * S, 0, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Caractéristiques : chaque partie du corps s'allume selon sa valeur.
      if (hasMatter && d.stats.some((x) => x.final != null)) {
        const spots: [number, string[], number][] = [[0, ["haL", "haR", "elL", "elR"], 0.07], [1, ["knL", "knR", "ftL", "ftR"], 0.07], [2, ["chest", "waist"], 0.12], [3, ["head"], 0.11], [4, ["heart"], 0.08]];
        for (const [i, keys, r] of spots) {
          if (statOf(i) == null) continue;
          for (const k of keys) glowAt(v.glow, P[k][0], P[k][1], S * r * (0.7 + level(i)), (0.35 + level(i) * 0.6) * lit(k));
        }
        ctx.font = "500 10px ui-monospace, 'IBM Plex Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(220,228,255,.78)";
        const labels: [number, Pt, number, number][] = [[0, P.haR, 30, 6], [1, P.ftR, 34, -2], [2, P.waist, 0, 0.02 * S + 14], [3, P.head, 0, -0.066 * S - 10], [4, P.shL, -34, 6], [5, [cx, P.haL[1]], -S * 0.33, 0]];
        for (const [i, [x, y], dx, dy] of labels) {
          const f = statOf(i);
          if (f != null) ctx.fillText(`${STATS[i].abbr} ${f}`, x + dx, y + dy);
        }
      }

      // Cœur-étoile et sceau de la classe sur la poitrine.
      if (hasMatter) {
        const [hx, hy] = P.heart, pulse = 1 + beat * 0.35 + (reduce ? 0 : 0.08 * Math.sin(sec * 2.2));
        const heart = lit("heart");
        glowAt(v.glow, hx, hy, S * 0.09 * pulse, 0.9 * heart);
        glowAt("rgba(255,252,240,.9)", hx, hy, S * 0.03 * pulse, heart);
        const lines = sigilPolylines(s.classeId, S * 0.06);
        if (lines.length && heart > 0) {
          ctx.save();
          ctx.translate(hx, hy);
          ctx.rotate(sec * 0.25);
          ctx.globalAlpha = heart;
          const trace = () => {
            for (const line of lines) {
              ctx.beginPath();
              line.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
              ctx.stroke();
            }
          };
          ctx.strokeStyle = v.glow;
          ctx.lineWidth = 4;
          trace();
          ctx.strokeStyle = "rgba(255,246,220,.92)";
          ctx.lineWidth = 1.3;
          trace();
          ctx.restore();
          ctx.lineWidth = 1;
        }
      }

      // Fêlure : fissure lumineuse de l'épaule gauche à la hanche droite (forme stable, tirée de la Fêlure).
      if (s.felureId && hasMatter) {
        const rnd = seeded(hash(s.felureId));
        const [ax, ay] = P.shL, [bx, by] = P.hipR;
        const pts: Pt[] = [];
        for (let k = 0; k <= 7; k++) {
          const f = k / 7, j = k === 0 || k === 7 ? 0 : (rnd() - 0.5) * S * 0.05;
          pts.push([ax + (bx - ax) * f + j, ay + (by - ay) * f + j * 0.4]);
        }
        const gl = (reduce ? 0.8 : 0.6 + 0.4 * Math.sin(sec * 2.4)) * Math.min(lit("shL"), lit("hipR"));
        const crack = () => {
          ctx.beginPath();
          pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.stroke();
        };
        ctx.strokeStyle = v.glow;
        ctx.lineWidth = 6;
        ctx.globalAlpha = gl;
        crack();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = `rgba(255,250,235,${gl})`;
        ctx.lineWidth = 1.5;
        crack();
        ctx.lineWidth = 1;
      }

      // « Social » : des ondes partent de la tête.
      if (fx === "ripples") {
        for (let i = 0; i < 3; i++) {
          const k = reduce ? i / 3 : (sec * 0.45 + i / 3) % 1;
          ctx.strokeStyle = v.edge;
          ctx.globalAlpha = (1 - k) * 0.4;
          ctx.beginPath();
          ctx.arc(P.head[0], P.head[1], 0.07 * S + k * S * 0.22, 0, TAU);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // Les yeux s'ouvrent quand l'être est complet.
      if (d.complete) {
        const open = reduce || awakenAge >= 99 ? 1 : Math.min(1, Math.max(0, (awakenAge - 0.4) / 0.6));
        for (const side of [-1, 1]) {
          const ex = P.head[0] + side * 0.022 * S, ey = P.head[1] + 0.004 * S;
          glowAt("rgba(255,255,255,.9)", ex, ey, 7 * open, open);
          ctx.fillStyle = "#fff";
          ctx.globalAlpha = open;
          ctx.fillRect(ex - 3, ey - open, 6, 2 * open);
          ctx.globalAlpha = 1;
        }
      }

      rings.forEach((r) => ring(r, false));

      // Particules de la matière, émises par le corps une fois rempli.
      if (hasMatter && !reduce && fill > 0.3) {
        const r = Math.random;
        for (let n = 0; n < 2; n++) {
          const [a, b] = BONES[Math.floor(r() * BONES.length)], f = r();
          const x0 = P[a][0] + (P[b][0] - P[a][0]) * f, y0 = P[a][1] + (P[b][1] - P[a][1]) * f;
          const p: Particle = { x: x0, y: y0, vx: (r() - 0.5) * 0.6, vy: (r() - 0.5) * 0.6, life: 0, max: 50 + r() * 50, size: 0.8 + r() * 1.4, color: r() < 0.5 ? v.edge : "#fff3d0", kind: "amb" };
          switch (v.particles) {
            case "embers":
              p.vy = -0.6 - r() * 0.8;
              break;
            case "plumes":
              p.x = P[r() < 0.5 ? "shL" : "shR"][0];
              p.y = P.shL[1];
              p.vy = -2 - r() * 1.2;
              p.vx = (r() - 0.5) * 1.2;
              p.color = r() < 0.6 ? "#e8fbff" : v.edge;
              p.kind = "plume";
              break;
            case "void": {
              const ang = r() * TAU, dist = S * (0.45 + r() * 0.3);
              Object.assign(p, { x: P.heart[0] + Math.cos(ang) * dist, y: P.heart[1] + Math.sin(ang) * dist, vx: 0, vy: 0, max: 110, kind: "void" });
              break;
            }
            case "dust": {
              const ang = r() * TAU, dist = S * (0.18 + r() * 0.2);
              Object.assign(p, { x: P.waist[0] + Math.cos(ang) * dist, y: P.waist[1] + Math.sin(ang) * dist * 0.3, vx: 0, vy: 0, max: 140, kind: "dust" });
              break;
            }
            case "rays":
            case "corona":
            case "shards":
              p.vx *= 1.5;
              p.vy *= 1.5;
              break;
          }
          parts.push(p);
        }
      }
      // Gerbe d'infusion : à chaque choix, des étincelles convergent vers le cœur.
      if (!reduce && infuseAge < 0.05 && hasMatter) {
        for (let i = 0; i < 40; i++) {
          const ang = Math.random() * TAU, dist = R * (1 + Math.random() * 0.2);
          parts.push({ x: cx + Math.cos(ang) * dist, y: cy + Math.sin(ang) * dist, vx: 0, vy: 0, life: 0, max: 55, size: 1.3 + Math.random() * 1.4, color: Math.random() < 0.5 ? v.edge : "#fff3d0", kind: "infuse" });
        }
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life++;
        if (p.life > p.max) {
          parts.splice(i, 1);
          continue;
        }
        const [hx, hy] = P.heart;
        if (p.kind === "infuse") {
          p.vx += (hx - p.x) * 0.006;
          p.vy += (hy - p.y) * 0.006;
          p.vx *= 0.9;
          p.vy *= 0.9;
          if (Math.hypot(hx - p.x, hy - p.y) < S * 0.03) p.life = p.max;
        } else if (p.kind === "void") {
          const dx = hx - p.x, dy = hy - p.y, dist = Math.hypot(dx, dy) || 1;
          p.vx = (dx / dist) * 1.1 - (dy / dist) * 1.3;
          p.vy = (dy / dist) * 1.1 + (dx / dist) * 1.3;
          if (dist < S * 0.03) p.life = p.max;
        } else if (p.kind === "dust") {
          const dx = p.x - P.waist[0], dy = (p.y - P.waist[1]) / 0.3, ang = Math.atan2(dy, dx) + 0.012, dist = Math.hypot(dx, dy);
          p.x = P.waist[0] + Math.cos(ang) * dist;
          p.y = P.waist[1] + Math.sin(ang) * dist * 0.3;
        } else if (p.kind === "plume") p.vy += 0.06;
        p.x += p.vx;
        p.y += p.vy;
        ctx.globalAlpha = Math.min(1, (1 - p.life / p.max) * 1.6);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
      if (parts.length > 500) parts.splice(0, parts.length - 500);

      // Éclat d'infusion au cœur, puis éveil : onde de choc et éclat blanc.
      if (!reduce && infuseAge < 0.5 && hasMatter) glowAt("rgba(255,250,235,.7)", P.heart[0], P.heart[1], S * 0.22, 1 - infuseAge / 0.5);
      if (!reduce && awakenAge < 2.2) {
        const k = awakenAge / 2.2;
        ctx.strokeStyle = v.edge;
        ctx.lineWidth = 3 * (1 - k) + 0.5;
        ctx.globalAlpha = 1 - k;
        ctx.beginPath();
        ctx.arc(P.heart[0], P.heart[1], S * 0.05 + k * Math.max(w, h), 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
        if (awakenAge < 0.5) {
          ctx.fillStyle = `rgba(255,252,240,${0.6 * (1 - awakenAge / 0.5)})`;
          ctx.fillRect(0, 0, w, h);
        }
      }
    };

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden || t - last < 33) return;
      last = t;
      draw(t);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    resize();
    if (!reduce) raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  // Moins d'animations : on redessine une image fixe à chaque changement.
  useEffect(() => {
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    window.dispatchEvent(new Event("resize"));
  }, [key]);

  const cons = CONSTELLATIONS.find((c) => c.id === state.constellationId) ?? CONSTELLATIONS[0];
  const v = (state.matiereId && MATIERE_VISUALS[state.matiereId]) || FORGE_DEFAULT;
  const n = derived.steps.filter(Boolean).length;
  return (
    <div className={"hc-forge" + (derived.complete ? " hc-awake" : "")}>
      <canvas ref={canvasRef} className="hc-forge-canvas" role="img" aria-label={`La cuve : un être en constellation, ${n} étapes sur 6 terminées. ${v.murmure}`} />
      <div className="hc-forge-caption">
        <span className="hc-forge-coord">
          {cons.nom}
          {derived.complete ? ` · ${cons.alpha}` : ""} · {n}/6
        </span>
        <strong className="hc-forge-name" key={state.nom.trim() || "_"}>
          {state.nom.trim() ? Array.from(state.nom.trim()).map((ch, i) => <span key={i} style={{ animationDelay: `${i * 35}ms` }}>{ch}</span>) : "Sans nom"}
        </strong>
        <em className="hc-forge-murmur" key={v.murmure}>
          {derived.complete ? "Il ouvre les yeux. Il attend son premier ordre." : v.murmure}
        </em>
      </div>
    </div>
  );
}
