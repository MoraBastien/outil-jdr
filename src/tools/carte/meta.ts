// Carte de l'archipel : constantes partagées (client + serveur).
export const CARTE_TOOL_ID = "carte";

/** Bleu mer : couleur du site quand le Navire n'est amarré nulle part. */
export const SEA_COLOR = "#3fb0e6";

/**
 * Teintes proposées pour les îles. Toutes assez claires pour un texte sombre posé dessus (boutons),
 * et assez lumineuses sur le fond bleu nuit. La teinte de l'île où mouille le Navire colore tout le site.
 */
export const ISLE_COLORS = [
  { id: "#3fb0e6", name: "Mer" },
  { id: "#7fd6cf", name: "Brume" },
  { id: "#9fd6ff", name: "Givre" },
  { id: "#7ee08a", name: "Jungle" },
  { id: "#f2d25a", name: "Soufre" },
  { id: "#ff8a4c", name: "Braise" },
  { id: "#ff9fbf", name: "Corail" },
  { id: "#c3a6ff", name: "Améthyste" },
] as const;

export const isIsleColor = (c: unknown): c is string => typeof c === "string" && ISLE_COLORS.some((x) => x.id === c);
export const isleColorName = (c: string) => ISLE_COLORS.find((x) => x.id === c)?.name ?? "Mer";

/** Carte provisoire de l'archipel (sans noms), en attendant la vraie carte du MJ. */
export const PLACEHOLDER_MAP = "/cartes/archipel-provisoire.svg";

/** Image de carte acceptée : un chemin du site (« /cartes/… ») ou une URL https. */
export function cleanMapImage(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s || s.length > 500) return null;
  if (s.startsWith("/") && !s.startsWith("//") && !/[\\\s"'<>]/.test(s)) return s;
  try {
    const u = new URL(s);
    return u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

export const ISLAND_STATUS = {
  hidden: { label: "Cachée", hint: "Le MJ seul la voit." },
  seen: { label: "Aperçue", hint: "Les joueurs voient son nom, pas encore abordée." },
  visited: { label: "Visitée", hint: "Une escale déjà vécue." },
} as const;
export type IslandStatusId = keyof typeof ISLAND_STATUS;
export const isIslandStatus = (v: unknown): v is IslandStatusId => typeof v === "string" && v in ISLAND_STATUS;

/** Forme de l'île : un contour irrégulier tiré de son identifiant (toujours le même pour la même île). */
export function islandShape(id: string): string {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) % 1000) / 1000;
  const n = 9;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = 0.72 + rnd() * 0.38;
    return [Math.cos(a) * r, Math.sin(a) * r * 0.72] as const;
  });
  // Courbe lissée passant par les milieux des segments.
  const mid = (a: readonly number[], b: readonly number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const f = (v: number) => v.toFixed(3);
  let d = "";
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % n]);
    if (i === 0) {
      const m0 = mid(pts[n - 1], p);
      d += `M${f(m0[0])} ${f(m0[1])}`;
    }
    d += ` Q${f(p[0])} ${f(p[1])} ${f(m[0])} ${f(m[1])}`;
  }
  return `${d} Z`;
}
