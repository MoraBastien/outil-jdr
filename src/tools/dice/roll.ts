// Logique des jets, partagée par l'outil et son widget.

export type Roll = { id: number; formula: string; faces: number; rolls: number[]; modifier: number; total: number };

const FORMULA = /^(\d*)d(\d+)\s*([+-]\s*\d+)?$/i;
export const DICE = [4, 6, 8, 10, 12, 20, 100];
const MAX_COUNT = 100;
const STORAGE_KEY = "jdr:des:historique";
const MAX_HISTORY = 30;

export function roll(formula: string): Roll | null {
  const m = formula.trim().match(FORMULA);
  if (!m) return null;
  const count = Number(m[1] || 1);
  const faces = Number(m[2]);
  if (count < 1 || count > MAX_COUNT || faces < 2 || faces > 1000) return null;
  const modifier = m[3] ? Number(m[3].replace(/\s/g, "")) : 0;
  const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * faces));
  return {
    id: Date.now() + Math.random(),
    formula: formula.trim().toLowerCase().replace(/\s/g, ""),
    faces,
    rolls,
    modifier,
    total: rolls.reduce((a, b) => a + b, 0) + modifier,
  };
}

export const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "±0");

/** Réussite / échec critique : seulement pour un d20 seul. */
export function critical(r: Roll | undefined): "crit" | "fumble" | null {
  if (!r || r.faces !== 20 || r.rolls.length !== 1) return null;
  return r.rolls[0] === 20 ? "crit" : r.rolls[0] === 1 ? "fumble" : null;
}

/** Historique conservé dans le navigateur (facultatif : vide si le stockage est indisponible). */
export function loadHistory(): Roll[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(saved) ? saved.slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

export function saveHistory(history: Roll[]): Roll[] {
  const h = history.slice(0, MAX_HISTORY);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
  } catch {
    /* stockage indisponible */
  }
  return h;
}
