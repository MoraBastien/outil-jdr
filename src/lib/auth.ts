import { redirect } from "next/navigation";
import { getUserById, type User } from "./db";
import { getSessionUserId } from "./session";
import { isAlwaysTool, isGroupTool, userGroupIds } from "./groups";
import { ATELIER_TOOL_ID, isEntityPlayer } from "@/tools/homunculus/entity";

export async function getCurrentUser(): Promise<User | null> {
  const id = await getSessionUserId();
  if (!id) return null;
  return (await getUserById(id)) ?? null;
}

/** Redirige vers la page de connexion si personne n'est connecté. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}

/** Réservé au MJ. À appeler aussi dans CHAQUE server action d'admin. */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/accueil");
  return user;
}

/** Outils « de groupe » (planning, fiche) : il faut être dans un groupe. Les autres : cochés par le MJ. */
export function canUseTool(user: User, toolId: string): boolean {
  if (user.role === "admin") return true;
  if (isAlwaysTool(toolId)) return true;
  // L'Atelier est réservé aux joueurs de type Entité ; leur fiche (celle de l'entité) ne dépend pas d'un groupe.
  if (toolId === ATELIER_TOOL_ID) return isEntityPlayer(user);
  if (toolId === "personnage" && isEntityPlayer(user)) return true;
  if (isGroupTool(toolId)) return userGroupIds(user).length > 0;
  return user.tools.includes(toolId);
}
