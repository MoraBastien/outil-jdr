// Thème « Astre déchu » des joueurs de l'Atelier : le site devient la carte du ciel de leur entité,
// un presque-dieu qui a perdu ses pouvoirs. Chaque niveau d'Écho rallume une partie du ciel.
//
// Côté serveur uniquement. La feuille de style est servie par /s/perso.css (route qui vérifie la session) :
// les autres joueurs ne la téléchargent jamais et rien de ce thème n'est dans le CSS commun.
//
// Toutes les règles sont conditionnées par le marqueur #astral-mark, rendu par Header seulement pour une Entité :
// React garde une feuille <link precedence> chargée d'une page à l'autre (changement de compte sans rechargement
// compris). Sans le marqueur, la feuille reste inerte.

/** Or de l'accent selon l'Écho : terni au début, plein éclat à l'Écho 4. */
const ACCENTS: Record<number, [string, string, string]> = {
  1: ["#b8a57e", "#cdbb92", "rgba(184, 165, 126, 0.12)"],
  2: ["#d9b871", "#ecca86", "rgba(217, 184, 113, 0.13)"],
  3: ["#ecc06a", "#f6d68f", "rgba(236, 192, 106, 0.14)"],
  4: ["#f2c66d", "#ffe7ac", "rgba(242, 198, 109, 0.16)"],
};

export function astralCss(echo: number): string {
  const [accent, strong, soft] = ACCENTS[echo] ?? ACCENTS[1];
  return `@import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=IBM+Plex+Mono:wght@400;500&display=swap");

html:root:has(#astral-mark) {
  --bg: #070a1a;
  --surface: #0e1430;
  --surface-2: #151c40;
  --surface-3: #1d2552;
  --border: #232c5a;
  --border-strong: #38437c;
  --text: #e9ecff;
  --muted: #9aa5d6;
  --accent: ${accent};
  --accent-strong: ${strong};
  --accent-soft: ${soft};
  --accent-text: #1c1406;
  --nebula: #9d8cff;
  --ash: #4a5385;
  --shadow: 0 1px 0 rgba(200, 210, 255, 0.04) inset, 0 10px 30px -12px rgba(0, 0, 12, 0.7);
  --shadow-lg: 0 24px 60px -20px rgba(0, 0, 12, 0.8);
  --font-title: "Cormorant Garamond", var(--font-display), Georgia, serif;
  --font-mono: "IBM Plex Mono", ui-monospace, "SF Mono", Consolas, monospace;
}
html:root:has(#astral-mark) body { background-color: var(--bg); }
html:root:has(#astral-mark) ::selection { background: ${soft.replace(/0\.1\d\)/, "0.35)")}; }

/* Le ciel dessiné (AstralSky) remplace l'aurore et les étoiles du site. */
html:root:has(#astral-mark) .sky .aurora, html:root:has(#astral-mark) .sky .stars { display: none; }

/* Barres de navigation et onglets : couleurs écrites en dur dans le CSS commun, réalignées sur la nuit. */
html:root:has(#astral-mark) .sidebar, html:root:has(#astral-mark) .tabbar { background: rgba(9, 13, 34, 0.86); }
html:root:has(#astral-mark) .topbar, html:root:has(#astral-mark) .cs-tabs { background: rgba(7, 10, 26, 0.85); }
@supports (animation-timeline: scroll()) {
  html:root:has(#astral-mark) .topbar { animation-name: astral-header-scrolled; }
  @keyframes astral-header-scrolled { to { background: rgba(7, 10, 26, 0.95); box-shadow: 0 12px 30px -14px rgba(0, 0, 12, 0.85); } }
}
html:root:has(#astral-mark) .pl-group { background: rgba(14, 20, 48, 0.5); }
html:root:has(#astral-mark) .palette-overlay { background: rgba(4, 6, 18, 0.6); }

/* Panneaux : la voûte laisse deviner le ciel. */
html:root:has(#astral-mark) .widget, html:root:has(#astral-mark) .card { background: linear-gradient(180deg, rgba(200, 210, 255, 0.03), transparent 40%), color-mix(in srgb, var(--surface) 72%, transparent); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }

/* Titres en Cormorant : un peu plus de corps, c'est une police fine. */
html:root:has(#astral-mark) .title { font-weight: 600; letter-spacing: 0.005em; }
html:root:has(#astral-mark) .subtitle, html:root:has(#astral-mark) .widget-title { font-weight: 600; font-size: 1.22rem; }
html:root:has(#astral-mark) .eyebrow { font-family: var(--font-mono); font-weight: 500; letter-spacing: 0.16em; }

/* Glyphes planétaires de la navigation, à l'or de l'accent. */
html:root:has(#astral-mark) .sb-icon, html:root:has(#astral-mark) .tab-icon { color: var(--accent); font-family: "Segoe UI Symbol", "Noto Sans Symbols 2", "Apple Symbols", var(--font-body); font-size: 1.05em; }

/* Constellation de l'entité (EntityConstellation). */
html:has(#astral-mark) .ec { display: block; width: 100%; height: auto; overflow: visible; }
html:has(#astral-mark) .ec-line { stroke: var(--ash); stroke-opacity: 0.5; stroke-width: 1; stroke-dasharray: 1.5 4; }
html:has(#astral-mark) .ec-line.on { stroke: var(--accent); stroke-opacity: 0.7; stroke-dasharray: ${echo < 3 ? "3 4" : "none"}; }
html:has(#astral-mark) .ec-star { fill: var(--ash); }
html:has(#astral-mark) .ec-star.on { fill: var(--accent-strong); }
html:has(#astral-mark) .ec-glow { fill: var(--accent); fill-opacity: 0.18; }
html:has(#astral-mark) .ec-halo { fill: none; stroke: var(--accent); stroke-width: 1.2; stroke-opacity: 0.85; }
html:has(#astral-mark) .entity-sky { display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 16px; align-items: center; }
html:has(#astral-mark) .entity-sky .ec { max-width: 120px; }
html:has(#astral-mark) .cs-banner .ec { width: 110px; flex: 0 0 auto; }
html:has(#astral-mark) .ent-group { padding-top: 8px; }
html:has(#astral-mark) .ent-actions { display: flex; flex-wrap: wrap; gap: 6px; }
html:has(#astral-mark) .ent-pick { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
@media (max-width: 420px) { html:has(#astral-mark) .entity-sky { grid-template-columns: 90px minmax(0, 1fr); } }
`;
}

/** Glyphes de navigation (U+FE0E : affichage en texte, pas en emoji). */
export const NAV_GLYPHS: Record<string, string> = {
  home: "☉︎",
  personnage: "♄︎",
  planning: "☽︎",
  chronique: "♃︎",
  quetes: "♀︎",
  cimetiere: "♇︎",
  coffre: "♁︎",
  "homunculus-creator": "✶︎",
  des: "☿︎",
};

/** Libellés propres à ce thème. */
export const ASTRAL_LABELS = { home: "Observatoire", personnage: "Mon entité" };

const PHASES = ["nouvelle lune", "lune croissante", "premier quartier", "lune gibbeuse croissante", "pleine lune", "lune gibbeuse décroissante", "dernier quartier", "dernier croissant"];

/** Phase de la lune (approximation : nouvelle lune de référence du 6 janvier 2000, mois synodique). */
export function moonPhase(d: Date): string {
  const days = (d.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86_400_000;
  const age = ((days % 29.530588853) + 29.530588853) % 29.530588853;
  return PHASES[Math.floor((age / 29.530588853) * 8 + 0.5) % 8];
}

/** Salut de l'accueil : « Ciel du 19 novembre · lune croissante ». */
export function skyLine(d = new Date()): string {
  const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(d);
  return `Ciel du ${day} · ${moonPhase(d)}`;
}
