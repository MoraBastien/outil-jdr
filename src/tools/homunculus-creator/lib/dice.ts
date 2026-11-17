import type { DiceProvider } from "../types";

/** Entier aléatoire dans [0, n) avec un générateur cryptographique si disponible. */
export function randomInt(n: number): number {
  try {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % n;
  } catch {
    return Math.floor(Math.random() * n);
  }
}

/** 4d5, on retire le plus bas. (Un d5 s'obtient avec un d10 divisé par 2, arrondi au supérieur.) */
export function roll4d5(): number {
  const d = [0, 1, 2, 3].map(() => randomInt(5) + 1).sort((a, b) => a - b);
  return d[1] + d[2] + d[3];
}

/**
 * Dés côté navigateur. ATTENTION : un joueur peut les falsifier. En production, fournir un
 * `DiceProvider` qui appelle le serveur (voir README, « Anti-triche »).
 */
export const clientDice: DiceProvider = {
  async rollStats() {
    return Array.from({ length: 6 }, roll4d5).sort((a, b) => b - a);
  },
  async rollFelure(sides) {
    return randomInt(sides) + 1;
  },
};
