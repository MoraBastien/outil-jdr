"use client";
// La Forge stellaire : la cuve où l'homunculus prend forme, choix après choix.
// - Écho : anneaux en orbite ; Matière : couleur du cœur et particules ; Classe : sceau gravé dans le cœur ;
//   caractéristiques : six faisceaux ; Anomalie : déformation (pulsation, dérive, ondes) ; Fêlure : coque fendue.
// - Six étoiles autour de la cuve : une par étape terminée ; à 6/6 elles se lient et l'être s'éveille.
// - Chaque choix injecte une gerbe de particules dans la cuve.
// Canvas ~30 images/s, en pause hors écran ; une seule image si le système demande moins d'animations.
import { useEffect, useRef } from "react";
import { ANOMALIES } from "../data/anomalies";
import { CONSTELLATIONS } from "../data/constellations";
import { FAMILLE_FX, FORGE_DEFAULT, MATIERE_VISUALS, sigilPolylines, type MatiereVisual } from "../data/forge";
import { STATS } from "../data/stats";
import type { DerivedSheet, HomunculusState } from "../types";

interface Props {
  state: HomunculusState;
  derived: DerivedSheet;
  /** Vrai pendant l'éveil (la fiche vient d'être terminée) : onde de choc dans la cuve. */
  awakening?: boolean;
}

type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; kind: "infuse" | "amb" | "spark" };

const TAU = Math.PI * 2;

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
    const parts: P[] = [];
    const rndBg = seeded(42);
    const bgStars = Array.from({ length: 90 }, () => ({ x: rndBg(), y: rndBg(), r: rndBg() * 1.1 + 0.2, p: rndBg() * TAU }));

    // Performances : pas de shadowBlur ni de dégradé par élément et par image. Les halos sont des images
    // pré-dessinées (une par couleur) et le fond (voile + étoiles) est dessiné une fois par taille et par matière.
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
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprite(color), x - r, y - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
    };
    let bgCache: { key: string; canvas: HTMLCanvasElement } | null = null;
    const background = (veil: string) => {
      const key = `${w}x${h}|${veil}`;
      if (bgCache?.key === key) return bgCache.canvas;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(w * dpr));
      c.height = Math.max(1, Math.round(h * dpr));
      const g = c.getContext("2d")!;
      g.scale(dpr, dpr);
      const bg = g.createRadialGradient(w / 2, h * 0.47, 0, w / 2, h * 0.47, Math.max(w, h) * 0.75);
      bg.addColorStop(0, veil);
      bg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      for (const b of bgStars) {
        g.fillStyle = `rgba(230,236,255,${0.25 + 0.45 * Math.abs(Math.sin(b.p))})`;
        g.beginPath();
        g.arc(b.x * w, b.y * h, b.r, 0, TAU);
        g.fill();
      }
      bgCache = { key, canvas: c };
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

    const emitAmbient = (v: MatiereVisual, cx: number, cy: number, core: number, t: number) => {
      const r = Math.random;
      const a = r() * TAU;
      switch (v.particles) {
        case "sparks": {
          const d = core * (1.1 + r() * 0.5);
          parts.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, vx: -Math.sin(a) * 0.9, vy: Math.cos(a) * 0.9, life: 0, max: 50 + r() * 40, size: 1 + r() * 1.4, color: v.accent1, kind: "spark" });
          break;
        }
        case "embers":
          parts.push({ x: cx + (r() - 0.5) * core * 1.6, y: cy + core * 0.4, vx: (r() - 0.5) * 0.3, vy: -0.6 - r() * 0.8, life: 0, max: 60 + r() * 50, size: 1 + r() * 2, color: r() < 0.5 ? v.edge : v.accent1, kind: "amb" });
          break;
        case "plumes": {
          const sx = cx + (r() - 0.5) * core * 0.8;
          parts.push({ x: sx, y: cy - core * 0.8, vx: (r() - 0.5) * 0.7, vy: -2.2 - r() * 1.4, life: 0, max: 70 + r() * 30, size: 1 + r() * 1.5, color: r() < 0.6 ? "#e8fbff" : v.edge, kind: "amb" });
          break;
        }
        case "void": {
          const d = core * (2.4 + r() * 1.2);
          parts.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, vx: 0, vy: 0, life: 0, max: 90, size: 0.8 + r() * 1.4, color: r() < 0.5 ? v.edge : v.accent1, kind: "amb" });
          break;
        }
        case "dust": {
          const d = core * (1.2 + r() * 1.6);
          parts.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * 0.45, vx: 0, vy: 0, life: 0, max: 120 + r() * 80, size: 0.6 + r() * 1.2, color: r() < 0.5 ? v.edge : v.accent1, kind: "amb" });
          break;
        }
        case "shards":
        case "corona":
        case "rays":
          if (r() < 0.4) {
            const d = core * 1.05;
            parts.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, vx: Math.cos(a) * 0.6, vy: Math.sin(a) * 0.6, life: 0, max: 40, size: 1 + r(), color: v.accent1, kind: "amb" });
          }
          break;
      }
      void t;
    };

    const draw = (t: number) => {
      const { state: s, derived: d } = live.current;
      const v = (s.matiereId && MATIERE_VISUALS[s.matiereId]) || FORGE_DEFAULT;
      const hasMatter = Boolean(s.matiereId && MATIERE_VISUALS[s.matiereId]);
      const anomalie = ANOMALIES.find((a) => a.id === s.anomalieId);
      const fx = anomalie ? FAMILLE_FX[anomalie.famille] : undefined;
      const sec = t / 1000;
      const cx0 = w / 2, cy0 = h * 0.47;
      const R = Math.min(w, h) * 0.4;
      const core = R * 0.33;

      // Événements.
      if (events.current.infuse !== lastInfuse) {
        lastInfuse = events.current.infuse;
        for (let i = 0; i < 46; i++) {
          const a = Math.random() * TAU, dd = R * (1.05 + Math.random() * 0.25);
          parts.push({ x: cx0 + Math.cos(a) * dd, y: cy0 + Math.sin(a) * dd, vx: 0, vy: 0, life: 0, max: 40 + Math.random() * 20, size: 1.2 + Math.random() * 1.6, color: Math.random() < 0.5 ? v.accent1 : v.edge, kind: "infuse" });
        }
      }
      if (events.current.awaken !== lastAwaken) lastAwaken = events.current.awaken;
      const infuseAge = (t - lastInfuse) / 1000;
      const awakenAge = lastAwaken ? (t - lastAwaken) / 1000 : 99;

      // Déformation de l'Anomalie.
      let cx = cx0, cy = cy0, scale = 1;
      if (!reduce && fx === "wobble") (cx += Math.sin(sec * 0.9) * core * 0.12), (cy += Math.sin(sec * 1.3) * core * 0.08);
      if (!reduce && fx === "pulse") {
        const beat = sec % 1.1;
        scale += beat < 0.12 ? beat * 0.6 : beat < 0.3 ? 0.072 - (beat - 0.12) * 0.4 : 0;
      }
      if (!reduce && infuseAge < 0.6) scale += (0.6 - infuseAge) * 0.12;
      const cr = core * scale;

      ctx.clearRect(0, 0, w, h);

      // Fond : voile coloré par la matière et petites étoiles (image en cache).
      ctx.drawImage(background(v.veil), 0, 0, w, h);

      // Anneaux de l'Écho, avec leur lune.
      for (let e = 1; e <= s.echo; e++) {
        const rx = cr * (1.5 + e * 0.32), ry = rx * (0.28 + e * 0.06);
        const tilt = -0.35 + e * 0.22;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(tilt);
        ctx.strokeStyle = `rgba(200,210,255,${0.12 + e * 0.03})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
        ctx.stroke();
        const ma = (reduce ? e : sec * (0.5 + e * 0.15)) + e * 1.7;
        const mx = Math.cos(ma) * rx, my = Math.sin(ma) * ry;
        ctx.restore();
        // Lune : position dans le repère tourné, ramenée dans le repère de la page.
        const px = cx + mx * Math.cos(tilt) - my * Math.sin(tilt), py = cy + mx * Math.sin(tilt) + my * Math.cos(tilt);
        glowAt(v.glow, px, py, 9);
        ctx.fillStyle = v.accent1;
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, TAU);
        ctx.fill();
      }

      // Étoiles de progression (une par étape) et leurs liens.
      const stepStar = (i: number): [number, number] => {
        const a = -Math.PI / 2 + (i * TAU) / 6;
        return [cx0 + Math.cos(a) * R, cy0 + Math.sin(a) * R];
      };
      const full = d.complete;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 6; i++) {
        const j = (i + 1) % 6;
        const on = d.steps[i] && d.steps[j];
        const [x1, y1] = stepStar(i), [x2, y2] = stepStar(j);
        ctx.strokeStyle = on ? v.edge : "rgba(150,160,210,.14)";
        ctx.globalAlpha = on ? 0.75 : 1;
        ctx.setLineDash(on ? [] : [2, 6]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      if (full) {
        // Hexagramme : les deux triangles se tracent à l'éveil.
        const k = reduce ? 1 : Math.min(1, Math.max(0, awakenAge < 99 ? awakenAge / 1.2 : 1));
        ctx.strokeStyle = v.accent1;
        ctx.globalAlpha = 0.55;
        for (const tri of [[0, 2, 4], [1, 3, 5]]) {
          for (let n = 0; n < 3; n++) {
            const [x1, y1] = stepStar(tri[n]);
            const [x2, y2] = stepStar(tri[(n + 1) % 3]);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 + (x2 - x1) * k, y1 + (y2 - y1) * k);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }
      for (let i = 0; i < 6; i++) {
        const [x, y] = stepStar(i);
        const on = d.steps[i];
        if (on) glowAt(v.glow, x, y, 14 * (reduce ? 1 : 0.8 + 0.2 * Math.sin(sec * 2 + i)));
        ctx.fillStyle = on ? v.accent1 : "rgba(110,120,175,.55)";
        ctx.beginPath();
        ctx.arc(x, y, on ? 3.2 : 2.2, 0, TAU);
        ctx.fill();
      }

      // Faisceaux des caractéristiques.
      d.stats.forEach((st, i) => {
        if (st.final == null) return;
        const a = -Math.PI / 2 + (i * TAU) / 6 + Math.PI / 6;
        const len = cr + (R * 0.92 - cr) * Math.min(1, Math.max(0.1, (st.final - 5) / 12));
        const x1 = cx + Math.cos(a) * cr, y1 = cy + Math.sin(a) * cr;
        const x2 = cx + Math.cos(a) * len, y2 = cy + Math.sin(a) * len;
        const g = ctx.createLinearGradient(x1, y1, x2, y2);
        g.addColorStop(0, v.edge);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 3 + (st.final - 8) * 0.25;
        ctx.globalAlpha = reduce ? 0.7 : 0.55 + 0.2 * Math.sin(sec * 1.5 + i);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "rgba(220,228,255,.75)";
        ctx.font = "500 10px ui-monospace, 'IBM Plex Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${STATS[i].abbr} ${st.final}`, cx + Math.cos(a) * (len + 16), cy + Math.sin(a) * (len + 16));
      });
      ctx.lineWidth = 1;

      // Particules propres à la matière (derrière le cœur pour certaines).
      if (hasMatter && !reduce) for (let n = 0; n < 2; n++) emitAmbient(v, cx, cy, cr, t);
      if (hasMatter && (v.particles === "rays" || v.particles === "corona")) {
        const count = v.particles === "rays" ? 12 : 28;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * TAU + (reduce ? 0 : sec * (v.particles === "rays" ? 0.15 : -0.1));
          const flick = reduce ? 1 : 0.6 + 0.4 * Math.sin(sec * 3 + i * 1.7);
          const inner = cr * (v.particles === "rays" ? 1.05 : 1.0);
          const outer = cr * (v.particles === "rays" ? 2.1 + flick * 0.5 : 1.25 + flick * 0.22);
          // Deux traits superposés (épais et pâle, fin et vif) plutôt qu'un dégradé par rayon.
          ctx.strokeStyle = v.particles === "rays" ? v.accent1 : v.edge;
          const mid = inner + (outer - inner) * 0.55;
          ctx.globalAlpha = 0.18 * flick;
          ctx.lineWidth = v.particles === "rays" ? 5 : 3;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
          ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
          ctx.stroke();
          ctx.globalAlpha = 0.55 * flick;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
          ctx.lineTo(cx + Math.cos(a) * mid, cy + Math.sin(a) * mid);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
      }
      if (hasMatter && v.particles === "shards") {
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * TAU + (reduce ? 0 : sec * 0.6);
          const dd = cr * (1.5 + (i % 3) * 0.18);
          const x = cx + Math.cos(a) * dd, y = cy + Math.sin(a) * dd * 0.8;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(a * 2 + i);
          ctx.fillStyle = i % 2 ? v.accent1 : v.edge;
          ctx.beginPath();
          ctx.moveTo(0, -6);
          ctx.lineTo(3, 4);
          ctx.lineTo(-3, 3);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      // Ondes de l'Anomalie « Social ».
      if (fx === "ripples") {
        for (let i = 0; i < 3; i++) {
          const k = reduce ? i / 3 : (sec * 0.45 + i / 3) % 1;
          ctx.strokeStyle = v.edge;
          ctx.globalAlpha = (1 - k) * 0.45;
          ctx.beginPath();
          ctx.arc(cx, cy, cr * (1.05 + k * 1.4), 0, TAU);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // Le cœur.
      if (hasMatter) {
        glowAt(v.glow, cx, cy, cr * 2.4);
        const body = ctx.createRadialGradient(cx - cr * 0.3, cy - cr * 0.35, cr * 0.1, cx, cy, cr);
        body.addColorStop(0, v.core);
        body.addColorStop(0.75, v.particles === "corona" ? v.core : v.edge);
        body.addColorStop(1, v.edge);
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, TAU);
        ctx.fill();
        if (v.particles === "corona") {
          ctx.strokeStyle = v.edge;
          ctx.globalAlpha = 0.25;
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.arc(cx, cy, cr, 0, TAU);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, cr, 0, TAU);
          ctx.stroke();
          ctx.lineWidth = 1;
        }
      } else {
        // Cuve vide : un globe de verre où ondule un liquide stellaire.
        ctx.fillStyle = "rgba(160,175,255,.06)";
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, TAU);
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, cr - 1, 0, TAU);
        ctx.clip();
        const level = cy + cr * 0.35;
        const liquid = ctx.createLinearGradient(0, level - cr * 0.2, 0, cy + cr);
        liquid.addColorStop(0, "rgba(242,198,109,.35)");
        liquid.addColorStop(1, "rgba(120,100,220,.35)");
        ctx.fillStyle = liquid;
        ctx.beginPath();
        ctx.moveTo(cx - cr, cy + cr);
        for (let x = -cr; x <= cr; x += 4) ctx.lineTo(cx + x, level + Math.sin(x / 9 + (reduce ? 0 : sec * 2)) * 3);
        ctx.lineTo(cx + cr, cy + cr);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = "rgba(200,210,255,.35)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,.35)";
        ctx.beginPath();
        ctx.arc(cx, cy, cr * 0.82, -2.5, -1.7);
        ctx.stroke();
        ctx.lineWidth = 1;
      }

      // Sceau de la classe, gravé dans le cœur.
      const lines = sigilPolylines(s.classeId, cr * 0.68);
      if (lines.length) {
        const dark = hasMatter && luma(v.core) > 0.55;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(reduce ? 0 : sec * 0.12);
        const trace = () => {
          for (const line of lines) {
            ctx.beginPath();
            line.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
            ctx.stroke();
          }
        };
        if (!dark) {
          // Lueur : un trait large et pâle sous le trait net.
          ctx.strokeStyle = v.glow;
          ctx.lineWidth = 5;
          trace();
        }
        ctx.strokeStyle = dark ? "rgba(40,24,10,.6)" : "rgba(255,246,220,.85)";
        ctx.lineWidth = 1.4;
        trace();
        ctx.restore();
      }

      // Fissure de la Fêlure (forme stable, tirée de la Fêlure).
      if (s.felureId) {
        const rnd = seeded(hash(s.felureId));
        const a0 = rnd() * TAU;
        const pts: [number, number][] = [];
        for (let k = 0; k <= 6; k++) {
          const f = -1 + (k / 6) * 2;
          const along = f * cr * 0.95, side = (rnd() - 0.5) * cr * 0.35 * (1 - Math.abs(f) * 0.6);
          pts.push([cx + Math.cos(a0) * along - Math.sin(a0) * side, cy + Math.sin(a0) * along + Math.cos(a0) * side]);
        }
        const glow = reduce ? 0.8 : 0.6 + 0.4 * Math.sin(sec * 2.4);
        const crack = () => {
          ctx.beginPath();
          pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.stroke();
        };
        ctx.strokeStyle = v.glow;
        ctx.lineWidth = 6;
        ctx.globalAlpha = glow;
        crack();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = `rgba(255,250,235,${glow})`;
        ctx.lineWidth = 1.6;
        crack();
        ctx.lineWidth = 1;
      }

      // Particules (ambiance, gerbes d'infusion).
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life++;
        if (p.life > p.max) {
          parts.splice(i, 1);
          continue;
        }
        if (p.kind === "infuse") {
          // Attirées vers le cœur, de plus en plus vite.
          p.vx += (cx - p.x) * 0.006;
          p.vy += (cy - p.y) * 0.006;
          p.vx *= 0.9;
          p.vy *= 0.9;
          if (Math.hypot(cx - p.x, cy - p.y) < cr * 0.8) p.life = p.max;
        } else if (v.particles === "void" && p.kind === "amb") {
          // Matière noire : spirale vers le centre.
          const dx = cx - p.x, dy = cy - p.y, dist = Math.hypot(dx, dy) || 1;
          p.vx = (dx / dist) * 1.1 + (-dy / dist) * 1.4;
          p.vy = (dy / dist) * 1.1 + (dx / dist) * 1.4;
          if (dist < cr * 0.9) p.life = p.max;
        } else if (v.particles === "dust" && p.kind === "amb") {
          const dx = p.x - cx, dy = (p.y - cy) / 0.45;
          const a = Math.atan2(dy, dx) + 0.012, dist = Math.hypot(dx, dy);
          p.x = cx + Math.cos(a) * dist;
          p.y = cy + Math.sin(a) * dist * 0.45;
        } else if (v.particles === "plumes" && p.kind === "amb") {
          p.vy += 0.06;
        } else if (p.kind === "spark") {
          // Étincelles en orbite qui ralentissent.
          const dx = p.x - cx, dy = p.y - cy;
          p.vx += -dx * 0.0016;
          p.vy += -dy * 0.0016;
        }
        p.x += p.vx;
        p.y += p.vy;
        const k = 1 - p.life / p.max;
        ctx.globalAlpha = Math.min(1, k * 1.6);
        ctx.fillStyle = p.color;
        // Petites particules : un carré suffit (bien moins coûteux qu'un arc).
        if (p.size < 1.6) ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
        else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (parts.length > 500) parts.splice(0, parts.length - 500);

      // Éclair d'infusion au cœur.
      if (!reduce && infuseAge < 0.5) {
        glowAt("rgba(255,250,235,.6)", cx, cy, cr * 2, 1 - infuseAge / 0.5);
      }

      // Éveil : onde de choc et éclat blanc.
      if (!reduce && awakenAge < 2.2) {
        const k = awakenAge / 2.2;
        ctx.strokeStyle = v.accent1;
        ctx.lineWidth = 3 * (1 - k) + 0.5;
        ctx.globalAlpha = 1 - k;
        ctx.beginPath();
        ctx.arc(cx, cy, cr + k * Math.max(w, h), 0, TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, cr + k * Math.max(w, h) * 0.6, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
        if (awakenAge < 0.6) {
          ctx.fillStyle = `rgba(255,252,240,${0.7 * (1 - awakenAge / 0.6)})`;
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
      <canvas ref={canvasRef} className="hc-forge-canvas" role="img" aria-label={`La cuve : ${n} étapes sur 6 terminées. ${v.murmure}`} />
      <div className="hc-forge-caption">
        <span className="hc-forge-coord">
          {cons.nom}
          {derived.complete ? ` · ${cons.alpha}` : ""} · {n}/6
        </span>
        <strong className="hc-forge-name" key={state.nom.trim() || "_"}>
          {state.nom.trim() ? Array.from(state.nom.trim()).map((ch, i) => <span key={i} style={{ animationDelay: `${i * 35}ms` }}>{ch}</span>) : "Sans nom"}
        </strong>
        <em className="hc-forge-murmur" key={v.murmure}>
          {derived.complete ? "L'être s'éveille. Il attend son premier ordre." : v.murmure}
        </em>
      </div>
    </div>
  );
}
