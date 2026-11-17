import { redirect } from "next/navigation";
import { getUserById, type User } from "./db";
import { getSessionUserId } from "./session";

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

export function canUseTool(user: User, toolId: string): boolean {
  return user.role === "admin" || user.tools.includes(toolId);
}
