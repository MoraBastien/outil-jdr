"use client";
// Ciel animé du thème « Astre déchu » (fond de toutes les pages d'une Entité) :
// - le ciel tourne lentement autour d'une étoile polaire (un tour en 12 minutes), sur trois profondeurs d'étoiles
//   qui scintillent ; la part d'étoiles rallumées suit l'Écho, les autres restent en cendre ;
// - une nébuleuse qui respire, la grille céleste, et la constellation de l'entité, fixe ;
// - des étoiles filantes, d'autant plus fréquentes que l'Écho est haut.
// Deux couches : le ciel (lent, redessiné 5 fois par seconde : il tourne en 12 minutes) et les étoiles filantes
// (30 images/s, seulement quand il y en a une). En pause quand l'onglet est caché ; image fixe si le système
// demande moins d'animations.
import { useEffect, useRef } from "react";

const CONS: [number, number][] = [[0.66, 0.14], [0.73, 0.26], [0.83, 0.22], [0.89, 0.38], [0.77, 0.45], [0.69, 0.57], [0.83, 0.66], [0.94, 0.55]];
const LINKS: [number, number][] = [[0, 1], [1, 2], [1, 4], [2, 3], [3, 7], [4, 5], [5, 6], [6, 7]];

/** Par Écho (1 à 4) : part d'étoiles rallumées, étoiles de la constellation, intervalle moyen entre deux étoiles filantes (ms). */
const LIT_SHARE = [0.18, 0.42, 0.7, 1];
const LIT_CONS = [1, 3, 5, 8];
const SHOOT_EVERY = [20000, 12000, 7000, 4000];
const TURN_MS = 12 * 60 * 1000;

type Star = { a: number; d: number; r: number; tw: number; ph: number; on: boolean; layer: 0 | 1 | 2 };
type Shooter = { x: number; y: number; vx: number; vy: number; len: number; born: number; life: number };

export default function AstralSky({ level }: { level: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const fastRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    const fast = fastRef.current;
    const fctx = fast?.getContext("2d");
    if (!canvas || !ctx || !fast || !fctx) return;
    const echo = Math.min(Math.max(level, 1), 4);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    // Halo pré-dessiné pour les étoiles les plus proches (évite un dégradé par étoile et par image).
    const glow = document.createElement("canvas");
    glow.width = glow.height = 32;
    const g = glow.getContext("2d")!;
    const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, "rgba(255,231,172,0.55)");
    gr.addColorStop(1, "rgba(255,231,172,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 32, 32);

    let w = 0, h = 0, px = 0, py = 0, reach = 0, raf = 0;
    let stars: Star[] = [];
    const shooters: Shooter[] = [];
    let nextShot = 0;

    const build = () => {
      seed = 11;
      // Étoiles réparties sur le disque autour du pôle, jusqu'au coin le plus éloigné : l'écran reste couvert
      // pendant la rotation. Densité d'environ une étoile pour 1 700 px² (≈ 650 visibles sur un écran de portable).
      const count = Math.round(Math.min(3500, (Math.PI * reach * reach) / 1900));
      stars = Array.from({ length: count }, () => {
        const layer = (rnd() < 0.62 ? 0 : rnd() < 0.75 ? 1 : 2) as Star["layer"];
        return {
          a: rnd() * Math.PI * 2,
          d: Math.sqrt(rnd()) * reach,
          r: layer === 0 ? 0.45 + rnd() * 0.4 : layer === 1 ? 0.8 + rnd() * 0.5 : 1.2 + rnd() * 0.8,
          tw: 0.6 + rnd() * 1.6,
          ph: rnd() * Math.PI * 2,
          on: rnd() < LIT_SHARE[echo - 1],
          layer,
        };
      });
    };
    let slowAt = -1e9;
    let fastDirty = false;
    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = innerWidth;
      h = innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fast.width = w * dpr;
      fast.height = h * dpr;
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      slowAt = -1e9;
      // Étoile polaire hors champ, en haut à gauche : les étoiles décrivent de grands arcs à travers l'écran.
      px = w * 0.18;
      py = -h * 0.25;
      reach = Math.hypot(Math.max(px, w - px), h - py) * 1.05;
      build();
    };

    const spawn = (t: number) => {
      const fromLeft = Math.random() < 0.5;
      const speed = 0.55 + Math.random() * 0.45; // px/ms
      const angle = (fromLeft ? 0.35 : Math.PI - 0.35) + (Math.random() - 0.5) * 0.4;
      shooters.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.45,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        len: 90 + Math.random() * 140,
        born: t,
        life: 700 + Math.random() * 700,
      });
      // Intervalle aléatoire autour de la moyenne de l'Écho.
      nextShot = t + SHOOT_EVERY[echo - 1] * (0.5 + Math.random());
    };

    /** Couche lente : nébuleuse, grille, étoiles, constellation. */
    const drawSlow = (t: number) => {
      ctx.clearRect(0, 0, w, h);

      // Nébuleuse qui respire lentement.
      const breathe = reduce ? 0 : Math.sin(t / 9000);
      const neb = ctx.createRadialGradient(w * (0.8 + breathe * 0.02), h * 0.3, 0, w * 0.8, h * 0.3, Math.max(w, h) * (0.62 + breathe * 0.04));
      neb.addColorStop(0, `rgba(157,140,255,${0.035 + echo * 0.035})`);
      neb.addColorStop(1, "rgba(157,140,255,0)");
      ctx.fillStyle = neb;
      ctx.fillRect(0, 0, w, h);
      const neb2 = ctx.createRadialGradient(w * 0.15, h * 0.85, 0, w * 0.15, h * 0.85, Math.max(w, h) * 0.5);
      neb2.addColorStop(0, `rgba(90,120,220,${0.03 + echo * 0.015})`);
      neb2.addColorStop(1, "rgba(90,120,220,0)");
      ctx.fillStyle = neb2;
      ctx.fillRect(0, 0, w, h);

      // Grille céleste (cercles de déclinaison autour du pôle).
      ctx.strokeStyle = "rgba(170,185,255,0.04)";
      ctx.lineWidth = 1;
      for (let i = 1; i <= 7; i++) {
        ctx.beginPath();
        ctx.arc(px, py, (reach / 7) * i, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Étoiles en rotation autour du pôle.
      const rot = reduce ? 0 : ((t % TURN_MS) / TURN_MS) * Math.PI * 2;
      const cos = Math.cos(rot), sin = Math.sin(rot);
      for (const s of stars) {
        const x0 = Math.cos(s.a) * s.d, y0 = Math.sin(s.a) * s.d;
        const x = px + x0 * cos - y0 * sin;
        const y = py + x0 * sin + y0 * cos;
        if (x < -4 || y < -4 || x > w + 4 || y > h + 4) continue;
        const tw = reduce ? 0.8 : 0.55 + 0.45 * Math.sin((t / 1000) * s.tw + s.ph);
        if (s.on) {
          if (s.layer === 2) {
            ctx.globalAlpha = 0.5 * tw;
            ctx.drawImage(glow, x - 9, y - 9, 18, 18);
          }
          ctx.globalAlpha = (s.layer === 0 ? 0.5 : s.layer === 1 ? 0.65 : 0.85) * tw + 0.15;
          ctx.fillStyle = "rgb(255,236,190)";
        } else {
          ctx.globalAlpha = 0.35 + 0.25 * tw;
          ctx.fillStyle = "rgb(110,120,175)";
        }
        // Petites étoiles : un carré (bien moins coûteux qu'un arc).
        if (s.r < 1) ctx.fillRect(x - s.r, y - s.r, s.r * 2, s.r * 2);
        else {
          ctx.beginPath();
          ctx.arc(x, y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // Constellation de l'entité, fixe, qui pulse doucement.
      const lit = LIT_CONS[echo - 1];
      const pulse = reduce ? 1 : 0.85 + 0.15 * Math.sin(t / 1400);
      for (const [a, b] of LINKS) {
        const on = a < lit && b < lit;
        ctx.strokeStyle = on ? `rgba(242,198,109,${(echo >= 3 ? 0.42 : 0.3) * pulse})` : "rgba(74,83,133,0.3)";
        ctx.setLineDash(on && echo < 3 ? [4, 5] : on ? [] : [2, 6]);
        ctx.beginPath();
        ctx.moveTo(CONS[a][0] * w, CONS[a][1] * h);
        ctx.lineTo(CONS[b][0] * w, CONS[b][1] * h);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      CONS.forEach(([cx, cy], i) => {
        const on = i < lit;
        const x = cx * w, y = cy * h;
        if (on) {
          ctx.globalAlpha = pulse;
          ctx.drawImage(glow, x - 16, y - 16, 32, 32);
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = on ? "#ffe7ac" : "#4a5385";
        ctx.beginPath();
        ctx.arc(x, y, on ? 2.6 : 1.8, 0, Math.PI * 2);
        ctx.fill();
      });

    };

    /** Couche rapide : les étoiles filantes, dessinées seulement quand il y en a. */
    const drawFast = (t: number) => {
      if (!nextShot) nextShot = t + 1500 + Math.random() * 2500;
      if (t >= nextShot) spawn(t);
      if (!shooters.length && !fastDirty) return;
      fctx.clearRect(0, 0, w, h);
      fastDirty = shooters.length > 0;
      for (let i = shooters.length - 1; i >= 0; i--) {
        const s = shooters[i];
        const age = t - s.born;
        if (age > s.life) {
          shooters.splice(i, 1);
          continue;
        }
        const k = age / s.life;
        const fade = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
        const hx = s.x + s.vx * age, hy = s.y + s.vy * age;
        const sp = Math.hypot(s.vx, s.vy);
        const tx = hx - (s.vx / sp) * s.len, ty = hy - (s.vy / sp) * s.len;
        const trail = fctx.createLinearGradient(tx, ty, hx, hy);
        const tone = echo === 1 ? "205,190,150" : "255,236,190";
        trail.addColorStop(0, `rgba(${tone},0)`);
        trail.addColorStop(1, `rgba(${tone},${0.85 * fade})`);
        fctx.strokeStyle = trail;
        fctx.lineWidth = 1.6;
        fctx.beginPath();
        fctx.moveTo(tx, ty);
        fctx.lineTo(hx, hy);
        fctx.stroke();
        fctx.globalAlpha = fade;
        fctx.drawImage(glow, hx - 8, hy - 8, 16, 16);
        fctx.globalAlpha = 1;
      }
    };

    let last = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || t - last < 33) return;
      last = t;
      if (t - slowAt >= 200) {
        slowAt = t;
        drawSlow(t);
      }
      drawFast(t);
    };
    const onResize = () => {
      size();
      if (reduce) drawSlow(0);
    };
    size();
    if (reduce) drawSlow(0);
    else raf = requestAnimationFrame(loop);
    addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", onResize);
    };
  }, [level]);

  const style = { position: "fixed", inset: 0, width: "100vw", height: "100vh", zIndex: -1, pointerEvents: "none" } as const;
  return (
    <>
      <canvas ref={ref} aria-hidden="true" style={style} />
      <canvas ref={fastRef} aria-hidden="true" style={style} />
    </>
  );
}
