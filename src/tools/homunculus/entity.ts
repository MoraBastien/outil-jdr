// Joueurs de l'Atelier de Rigel : ils incarnent une entité qui crée des homunculus pour rejoindre le groupe.
// Ils ont donc deux choses : leurs fiches d'homunculus (l'Atelier) et la fiche de l'entité, qui remplace
// la fiche de personnage D&D. Seuls eux et le MJ en ont connaissance.
//
// Côté serveur uniquement : un composant client ne doit pas importer ce fichier, sinon le nom de l'Atelier
// se retrouve dans le JavaScript commun, téléchargé aussi par les autres joueurs.
//
// TODO(entité) : fiche complète quand les règles seront finies. Pour l'instant : le nom et l'Écho.
import type { User } from "@/lib/db";
import { TOOL_META as HOMUNCULUS_META } from "@/tools/homunculus-creator/meta";
import { clampEcho } from "./echo";

/** Longueur maximale du nom (même valeur dans le champ de EntitySheet.tsx). */
export const ENTITY_NAME_MAX = 60;

/** Outil réservé aux joueurs de type Entité (pas de case à cocher). */
export const ATELIER_TOOL_ID: string = HOMUNCULUS_META.id;

/**
 * Joueur de type « Entité » : il a l'Atelier, le thème « Astre déchu » et la fiche de l'entité.
 * Anciens comptes sans `kind` : déduit de l'ancienne case « Atelier de Rigel ».
 */
export const isEntityPlayer = (user: Pick<User, "role" | "tools" | "kind">) =>
  user.role === "player" && (user.kind === "entity" || (user.kind === undefined && user.tools.includes(ATELIER_TOOL_ID)));

export type EntitySheetData = { name: string; echo: number; atelierHref: string };

/** Fiche de l'entité d'un joueur (null s'il n'a pas l'Atelier). */
export function entitySheetOf(user: Pick<User, "role" | "tools" | "kind" | "echo" | "entitySheet">): EntitySheetData | null {
  if (!isEntityPlayer(user)) return null;
  return { name: user.entitySheet?.name ?? "", echo: clampEcho(user.echo), atelierHref: `/outils/${ATELIER_TOOL_ID}` };
}
