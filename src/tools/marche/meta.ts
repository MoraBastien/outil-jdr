// Marché des escales : constantes et calculs de monnaie partagés (client + serveur).
export const MARCHE_TOOL_ID = "marche";

export type Coins = { pp: number; po: number; pe: number; pa: number; pc: number };
/** Valeur de chaque pièce en pièces de cuivre (règles D&D : 1 po = 10 pa = 100 pc, 1 pp = 10 po, 1 pe = 5 pa). */
export const COIN_CP: Record<keyof Coins, number> = { pp: 1000, po: 100, pe: 50, pa: 10, pc: 1 };
const SMALL_TO_LARGE: (keyof Coins)[] = ["pc", "pa", "pe", "po", "pp"];

export const toCp = (c: Coins) => (Object.keys(COIN_CP) as (keyof Coins)[]).reduce((n, k) => n + (c[k] || 0) * COIN_CP[k], 0);

/** Espace fine insécable entre le nombre et l'unité (typographie française). */
const NNBSP = "\u202f";

/** « 50 po », « 1 po 5 pa », « 3 pc ». */
export function formatCp(cp: number): string {
  if (cp <= 0) return `0${NNBSP}po`;
  const po = Math.floor(cp / 100);
  const pa = Math.floor((cp % 100) / 10);
  const pc = cp % 10;
  return [po && `${po}${NNBSP}po`, pa && `${pa}${NNBSP}pa`, pc && `${pc}${NNBSP}pc`].filter(Boolean).join(" ");
}

/** Montant en po, arrondi (pour les résumés : « 86 po »). */
export const poOf = (cp: number) => (cp % 100 === 0 ? `${cp / 100}${NNBSP}po` : `${(cp / 100).toFixed(1).replace(".", ",")}${NNBSP}po`);

/** Ajoute de la monnaie rendue ou remboursée, en po / pa / pc. */
function addChange(c: Coins, cp: number): void {
  c.po += Math.floor(cp / 100);
  c.pa += Math.floor((cp % 100) / 10);
  c.pc += cp % 10;
}

/**
 * Paie `cost` avec la bourse : on dépense d'abord les petites pièces, et on rend la monnaie si une pièce dépasse.
 * Renvoie la nouvelle bourse, ou null si elle ne suffit pas.
 */
export function pay(coins: Coins, cost: number): Coins | null {
  if (toCp(coins) < cost) return null;
  const c = { ...coins };
  let rest = cost;
  for (const k of SMALL_TO_LARGE) {
    if (rest <= 0) break;
    const value = COIN_CP[k];
    const have = c[k] || 0;
    if (have * value >= rest) {
      const take = Math.ceil(rest / value);
      c[k] = have - take;
      addChange(c, take * value - rest);
      rest = 0;
    } else {
      rest -= have * value;
      c[k] = 0;
    }
  }
  return c;
}

export function refund(coins: Coins, cp: number): Coins {
  const c = { ...coins };
  addChange(c, cp);
  return c;
}

/** Prix saisi par le MJ (« 50 », « 0,5 », « 5 pa », « 3 pc ») → pièces de cuivre. null si illisible. */
export function parsePrice(text: string): number | null {
  const t = text.trim().toLowerCase().replace(",", ".");
  const m = /^(\d+(?:\.\d+)?)\s*(pp|po|pe|pa|pc)?$/.exec(t);
  if (!m) return null;
  const cp = Math.round(Number(m[1]) * COIN_CP[(m[2] as keyof Coins) ?? "po"]);
  return cp > 0 && cp <= 10_000_000 ? cp : null;
}

/** Prix tel qu'on le réécrit dans le formulaire du MJ. */
export const priceInput = (cp: number) => (cp % 100 === 0 ? String(cp / 100) : cp % 10 === 0 ? `${cp / 10} pa` : `${cp} pc`);
