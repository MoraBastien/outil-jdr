// Fichier de données : apparence de la Forge stellaire (couleurs, particules, sceaux). Modifiable sans toucher au code.
// Chaque choix de création change l'aspect de l'être (forme humaine en constellation) et la couleur de l'Atelier.

/** Comportement des particules autour du cœur. */
export type ParticleKind = "sparks" | "embers" | "corona" | "shards" | "rays" | "plumes" | "void" | "dust";

export interface MatiereVisual {
  /** Couleurs du cœur : centre, bord, halo. */
  core: string;
  edge: string;
  glow: string;
  /** Teinte de l'Atelier quand cette matière est choisie (accent clair, accent foncé, voile du fond). */
  accent1: string;
  accent2: string;
  veil: string;
  particles: ParticleKind;
  /** Une phrase d'ambiance affichée sous la cuve. */
  murmure: string;
}

/** Aspect par défaut (cuve vide) : l'or de Rigel. */
export const FORGE_DEFAULT: MatiereVisual = {
  core: "#fff3d0",
  edge: "#f2c66d",
  glow: "rgba(242,198,109,.45)",
  accent1: "#ffe7ac",
  accent2: "#e9ab45",
  veil: "rgba(120,110,220,.18)",
  particles: "sparks",
  murmure: "Le moule attend sa matière.",
};

export const MATIERE_VISUALS: Record<string, MatiereVisual> = {
  "etoile-filante": {
    core: "#fffbe8",
    edge: "#ffd36e",
    glow: "rgba(255,214,120,.55)",
    accent1: "#fff0b8",
    accent2: "#f0b545",
    veil: "rgba(255,200,110,.16)",
    particles: "sparks",
    murmure: "Des traînées d'or filent autour de son corps.",
  },
  "roche-de-meteorite": {
    core: "#ffd2a8",
    edge: "#c8602e",
    glow: "rgba(230,110,50,.45)",
    accent1: "#ffc59a",
    accent2: "#d9723c",
    veil: "rgba(200,90,40,.16)",
    particles: "embers",
    murmure: "Sa peau de roche brûle encore de sa chute.",
  },
  eclipse: {
    core: "#05060f",
    edge: "#f6e6b4",
    glow: "rgba(246,230,180,.5)",
    accent1: "#f4ead0",
    accent2: "#c9b67a",
    veil: "rgba(60,50,90,.25)",
    particles: "corona",
    murmure: "Un corps d'ombre, cerclé de lumière.",
  },
  "metal-asteroide": {
    core: "#f2f6ff",
    edge: "#8fa3c4",
    glow: "rgba(170,190,230,.45)",
    accent1: "#e2eaff",
    accent2: "#9cb0d3",
    veil: "rgba(140,160,210,.16)",
    particles: "shards",
    murmure: "Des éclats de métal tournent autour de lui.",
  },
  "rayonnement-solaire": {
    core: "#ffffff",
    edge: "#ffb52e",
    glow: "rgba(255,190,60,.6)",
    accent1: "#fff1a8",
    accent2: "#ff9f1c",
    veil: "rgba(255,160,40,.18)",
    particles: "rays",
    murmure: "Il rayonne comme un petit soleil.",
  },
  "geysers-d-encelade": {
    core: "#f2fdff",
    edge: "#5ec8ea",
    glow: "rgba(110,210,245,.5)",
    accent1: "#d4f6ff",
    accent2: "#4fb6dc",
    veil: "rgba(80,190,235,.16)",
    particles: "plumes",
    murmure: "Du givre jaillit de ses épaules.",
  },
  "matiere-noire": {
    core: "#1a0d33",
    edge: "#9a6bff",
    glow: "rgba(140,90,255,.5)",
    accent1: "#dccbff",
    accent2: "#8e5cf5",
    veil: "rgba(110,60,220,.22)",
    particles: "void",
    murmure: "La lumière tombe en lui et n'en ressort pas.",
  },
  "poussiere-cosmique": {
    core: "#fff0f6",
    edge: "#e889c0",
    glow: "rgba(240,140,200,.45)",
    accent1: "#ffd9ec",
    accent2: "#d873ad",
    veil: "rgba(230,120,190,.16)",
    particles: "dust",
    murmure: "Une nébuleuse tourne autour de ses hanches.",
  },
};

/**
 * Sceau de chaque classe : polygone étoilé {points/saut} gravé dans le cœur.
 * saut = 1 : polygone simple ; saut > 1 : étoile.
 */
export const CLASSE_SIGILS: Record<string, { points: number; skip: number; inner?: boolean }> = {
  barbare: { points: 3, skip: 1, inner: true },
  barde: { points: 7, skip: 3 },
  clerc: { points: 6, skip: 2, inner: true },
  druide: { points: 5, skip: 1, inner: true },
  guerrier: { points: 4, skip: 1, inner: true },
  moine: { points: 8, skip: 1 },
  paladin: { points: 5, skip: 2 },
  rodeur: { points: 4, skip: 1 },
  roublard: { points: 7, skip: 2 },
  ensorceleur: { points: 9, skip: 4 },
  occultiste: { points: 8, skip: 3 },
  magicien: { points: 6, skip: 1 },
};

/** Effet de l'Anomalie sur le cœur, selon sa famille. */
export const FAMILLE_FX: Record<string, "pulse" | "wobble" | "ripples"> = {
  Combat: "pulse",
  Exploration: "wobble",
  Social: "ripples",
};

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/**
 * Tracés d'un sceau (centre 0,0, rayon r), pour un dessin SVG ou canvas.
 * Une étoile {n/k} se compose de pgcd(n, k) polygones fermés (ex. {6/2} = deux triangles).
 */
export function sigilPolylines(classeId: string | null, r: number): [number, number][][] {
  const s = classeId ? CLASSE_SIGILS[classeId] : undefined;
  if (!s) return [];
  const { points: n, skip: k } = s;
  const pt = (i: number): [number, number] => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [Math.cos(a) * r, Math.sin(a) * r];
  };
  const g = gcd(n, k);
  const lines: [number, number][][] = [];
  for (let j = 0; j < g; j++) {
    const line: [number, number][] = [];
    for (let m = 0; m <= n / g; m++) line.push(pt((j + m * k) % n));
    lines.push(line);
  }
  // Cercle intérieur suggéré par un polygone réduit, pour les sceaux « pleins ».
  if (s.inner) {
    const line: [number, number][] = [];
    for (let m = 0; m <= n; m++) {
      const a = -Math.PI / 2 + Math.PI / n + (m * 2 * Math.PI) / n;
      line.push([Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45]);
    }
    lines.push(line);
  }
  return lines;
}
