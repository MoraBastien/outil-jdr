// Illustration vectorielle d'une île (vignettes d'épisodes du tableau de bord joueur).
// Déterministe : la même île donne toujours la même scène. Le nom choisit les motifs (phare, port, brume, forêt, pic),
// la couleur de l'île teinte le ciel, la silhouette et la mer. Aplats seulement : pas de dégradé, pas de halo.
import type { ReactNode } from "react";

export type Mood = "dusk" | "day" | "fog" | "dawn";

const hexToRgb = (h: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
  const n = m ? parseInt(m[1], 16) : 0x3fb0e6;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** Mélange deux couleurs hexadécimales (t = 0 : a, t = 1 : b). */
const mix = (a: string, b: string, t: number) => {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`;
};

/** Générateur pseudo-aléatoire graine → [0, 1). */
function seeded(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const NIGHT = "#0b0d12";

export default function IsleScene({ id, name, color, mood = "day", label }: { id: string; name: string; color: string; mood?: Mood; label?: string }) {
  const rnd = seeded(id + name);
  const n = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const has = (re: RegExp) => re.test(n);
  const fog = mood === "fog" || has(/brume|brouillard|givre/);
  const dusk = mood === "dusk";
  const dawn = mood === "dawn";
  // Le sujet de la scène : un seul motif fort, lu dans le nom de l'île, sinon tiré.
  const pick = rnd();
  const subject: "phare" | "port" | "pic" | "foret" = has(/phare|lantern|fanal/)
    ? "phare"
    : has(/port|bourg|ville|cite|marqu/)
      ? "port"
      : has(/mont|pic|volcan|crete/)
        ? "pic"
        : has(/foret|bois|jungle|sylve/)
          ? "foret"
          : (["phare", "port", "pic", "foret"] as const)[Math.floor(pick * 4)];

  // Cadrage : horizon et taille de l'île varient d'une île à l'autre (proche ou lointaine).
  const horizon = 52 + Math.round(rnd() * 12);
  const near = rnd() < 0.5;
  const islandX0 = dusk ? 74 + rnd() * 6 : near ? 40 + rnd() * 20 : 70 + rnd() * 16;
  const islandX1 = near ? 164 : 132 + rnd() * 22;
  const islandTop = subject === "pic" ? horizon - (near ? 40 : 30) : horizon - (near ? 22 : 15);

  // Couleurs : la teinte de l'île porte le ciel ; la terre reste une silhouette sombre.
  const top = dusk ? mix(NIGHT, color, 0.22) : dawn ? mix("#2a1a24", color, 0.35) : mix(NIGHT, color, 0.38);
  const bands = dusk ? [0.32, 0.48, 0.64, 0.8] : fog ? [0.38, 0.44, 0.5, 0.56] : dawn ? [0.45, 0.58, 0.7, 0.82] : [0.42, 0.52, 0.62, 0.72];
  const warm = dusk || dawn ? "#f5b841" : mix(color, "#ffffff", 0.6);
  const land = mix(NIGHT, color, dusk ? 0.08 : 0.16);
  const landFar = mix(NIGHT, color, dusk ? 0.34 : 0.46);
  const sea = mix(NIGHT, color, dusk ? 0.16 : 0.26);
  const glint = mix(color, "#ffffff", 0.45);
  // Le soleil reste visible, et toujours à droite du premier tiers : la partie gauche passe sous le texte du bandeau.
  const sunX = Math.max(60, islandX0 - 12 - rnd() * 14);
  const sunY = dusk || dawn ? horizon - 9 : 18 + rnd() * 8;

  const ridge = (base: number, amp: number, x0: number, x1: number, steps: number) => {
    const pts: string[] = [`${x0},${horizon}`];
    for (let i = 0; i <= steps; i++) {
      const x = x0 + ((x1 - x0) * i) / steps;
      const edge = Math.sin((Math.PI * i) / steps);
      pts.push(`${x.toFixed(1)},${(base - amp * edge * (0.55 + rnd() * 0.45)).toFixed(1)}`);
    }
    pts.push(`${x1},${horizon}`);
    return pts.join(" ");
  };
  const summitX = islandX0 + (islandX1 - islandX0) * (0.4 + rnd() * 0.2);
  const ink = mix(NIGHT, color, 0.04);

  const features: ReactNode[] = [];
  if (subject === "pic") features.push(<polygon key="peak" points={`${summitX - 22},${horizon - 3} ${summitX},${islandTop} ${summitX + 18},${horizon - 3}`} fill={land} />);
  if (subject === "foret")
    for (let i = 0; i < 9; i++) {
      const x = islandX0 + 6 + i * ((islandX1 - islandX0 - 12) / 9);
      const h = 5 + rnd() * 6;
      features.push(<polygon key={`t${i}`} points={`${x - 2.4},${horizon - 5} ${x},${horizon - 5 - h} ${x + 2.4},${horizon - 5}`} fill={ink} />);
    }
  if (subject === "port") {
    for (let i = 0; i < 6; i++) {
      const x = islandX0 + 4 + i * 6;
      const h = 4 + rnd() * 7;
      features.push(<rect key={`h${i}`} x={x} y={horizon - 3 - h} width={5} height={h} fill={ink} />);
      if ((dusk || dawn) && i % 2 === 0) features.push(<rect key={`w${i}`} x={x + 1.8} y={horizon - 1.5 - h * 0.65} width={1.3} height={1.3} fill="#f5b841" />);
    }
    features.push(<rect key="m1" x={islandX0 - 7} y={horizon - 18} width={0.8} height={16} fill={ink} />);
    features.push(<polygon key="s1" points={`${islandX0 - 6.2},${horizon - 17} ${islandX0 + 1},${horizon - 5} ${islandX0 - 6.2},${horizon - 5}`} fill={mix(NIGHT, color, 0.22)} />);
  }
  if (subject === "phare" || dusk) {
    // Au crépuscule, la destination a toujours son phare : le faisceau éclaire la mer vers le spectateur.
    const lx = islandX1 - (near ? 30 : 12);
    const ly = Math.min(islandTop + 4, horizon - 18);
    features.push(<polygon key="lh" points={`${lx - 2.6},${horizon - 3} ${lx - 1.4},${ly} ${lx + 1.4},${ly} ${lx + 2.6},${horizon - 3}`} fill={ink} />);
    features.push(<rect key="lhb" x={lx - 2.2} y={ly + 4} width={4.4} height={1.6} fill={mix(color, "#ffffff", 0.2)} opacity={0.5} />);
    features.push(<rect key="lhl" x={lx - 1.8} y={ly - 3.4} width={3.6} height={3.4} fill="#f5b841" />);
    if (dusk) features.push(<polygon key="beam" points={`${lx},${ly - 1.7} ${lx - 70},${ly - 16} ${lx - 70},${ly + 8}`} fill="#f5b841" opacity={0.13} />);
  }

  // Le Navire, au premier plan de la mer.
  // À droite de la scène : la partie gauche passe sous le texte du bandeau.
  const shipX = 112 + rnd() * 30;
  const shipY = horizon + 12 + rnd() * 6;
  const ship = (
    <g key="ship" fill={mix(NIGHT, color, 0.02)}>
      <polygon points={`${shipX - 7},${shipY} ${shipX + 7},${shipY} ${shipX + 5},${shipY + 2.6} ${shipX - 5},${shipY + 2.6}`} />
      <rect x={shipX - 0.35} y={shipY - 11} width={0.7} height={11} />
      <polygon points={`${shipX + 0.6},${shipY - 10} ${shipX + 6},${shipY - 1.2} ${shipX + 0.6},${shipY - 1.2}`} fill={mix(color, "#ffffff", 0.3)} opacity={0.85} />
      <polygon points={`${shipX - 0.6},${shipY - 8} ${shipX - 4.6},${shipY - 1.2} ${shipX - 0.6},${shipY - 1.2}`} fill={mix(color, "#ffffff", 0.3)} opacity={0.7} />
    </g>
  );

  return (
    <svg className="sv-scene" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label ?? `Illustration : ${name}`}>
      <rect width="160" height="90" fill={top} />
      {bands.map((t, i) => (
        <rect key={i} y={10 + i * ((horizon - 10) / 4)} width="160" height={horizon - 10 - i * ((horizon - 10) / 4)} fill={mix(NIGHT, color, t)} opacity={0.6} />
      ))}
      {dusk &&
        Array.from({ length: 16 }, (_, i) => (
          <circle key={`st${i}`} cx={(rnd() * 160).toFixed(1)} cy={(2 + rnd() * (horizon - 30)).toFixed(1)} r={rnd() < 0.2 ? 0.5 : 0.3} fill="#f2f3f5" opacity={0.5 + rnd() * 0.4} />
        ))}
      <circle cx={sunX} cy={sunY} r={dusk || dawn ? 7.5 : 5} fill={warm} opacity={fog ? 0.45 : 0.95} />
      <polygon points={ridge(horizon - 2, 9, near ? 0 : 20, near ? 50 : 90, 6)} fill={landFar} />
      <polygon points={ridge(horizon - 3, horizon - 3 - islandTop, islandX0, islandX1, 9)} fill={land} />
      {features}
      <rect y={horizon} width="160" height={90 - horizon} fill={sea} />
      {[3, 8, 15, 24].map((dy, i) => (
        <rect key={`r${i}`} x={(i * 41 + 70) % 130} y={horizon + dy} width={16 + i * 7} height={0.5} fill={glint} opacity={0.18} />
      ))}
      {/* Reflet du soleil, sous le soleil. */}
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={sunX - 7 + i * 1.6} y={horizon + 2.5 + i * 4} width={14 - i * 3.2} height={0.9} fill={warm} opacity={(fog ? 0.25 : 0.55) - i * 0.1} />
      ))}
      {ship}
      {fog && [0, 1, 2].map((i) => <rect key={`f${i}`} y={horizon - 22 + i * 9} width="160" height={4} fill="#c9d3dc" opacity={0.14} />)}
    </svg>
  );
}
