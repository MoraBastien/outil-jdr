// Écho de l'homunculus d'un joueur : fixé par le MJ dans la page admin du joueur (champ `echo`).
// Logique pure, utilisée à la fois côté client et côté serveur.

export const MAX_ECHO = 4; // les données de l'outil couvrent les Échos 1 à 4

/** Écho effectif d'un joueur (1 par défaut), borné à [1, MAX_ECHO]. */
export function clampEcho(echo: unknown): number {
  const n = typeof echo === "number" ? echo : parseInt(String(echo ?? ""), 10);
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(1, Math.round(n)), MAX_ECHO);
}
