"use server";

import { redirect } from "next/navigation";
import { getUserByCode } from "@/lib/db";
import { createSession, destroySession } from "@/lib/session";

export type LoginState = { error?: string } | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const code = String(formData.get("code") ?? "");
  const user = await getUserByCode(code);
  if (!user) return { error: "Code inconnu." };

  await createSession(user.id);
  redirect(user.role === "admin" ? "/admin" : "/accueil");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}
