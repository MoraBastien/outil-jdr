"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { updateDb, normalizeCode, generateCode, randomUUID, type ProfileField, type User } from "@/lib/db";
import { TOOLS } from "@/tools/registry";
import { clampEcho } from "@/tools/homunculus/echo";

function back(path: string, params: Record<string, string> = {}): never {
  const qs = new URLSearchParams(params).toString();
  redirect(qs ? `${path}?${qs}` : path);
}

const playerPath = (id: string) => `/admin/joueurs/${encodeURIComponent(id)}`;

function codeTaken(users: User[], code: string, exceptId?: string): boolean {
  const c = normalizeCode(code);
  return users.some((u) => u.id !== exceptId && normalizeCode(u.code) === c);
}

/** Lignes du formulaire (fieldLabel[i], fieldValue[i]) → champs de fiche, lignes vides ignorées. */
function parseFields(formData: FormData): ProfileField[] {
  const labels = formData.getAll("fieldLabel").map((v) => String(v).trim());
  const values = formData.getAll("fieldValue").map((v) => String(v).trim());
  return labels
    .map((label, i) => ({ label, value: values[i] ?? "" }))
    .filter((f) => f.label !== "" || f.value !== "");
}

export async function createPlayer(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  let code = String(formData.get("code") ?? "").trim();
  if (!name) back("/admin", { error: "Le nom est obligatoire." });

  const result = await updateDb((db): { error: string } | { id: string } => {
    if (!code) {
      do code = generateCode();
      while (codeTaken(db.users, code));
    } else if (codeTaken(db.users, code)) {
      return { error: `Le code « ${code} » est déjà utilisé.` };
    }
    const id = randomUUID();
    db.users.push({ id, name, code, role: "player", tools: [], profile: { fields: [], notes: "" } });
    return { id };
  });

  if ("error" in result) back("/admin", { error: result.error });
  back(playerPath(result.id), { ok: `${name} créé avec le code ${code}. Choisis maintenant ses outils.` });
}

export async function updatePlayer(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const validIds = new Set(TOOLS.map((t) => t.id));
  const tools = formData.getAll("tools").map(String).filter((t) => validIds.has(t));
  const echo = clampEcho(formData.get("echo"));
  const fields = parseFields(formData);
  const notes = String(formData.get("notes") ?? "");

  if (!name || !code) back(playerPath(id), { error: "Le nom et le code sont obligatoires." });

  const error = await updateDb((db) => {
    const user = db.users.find((u) => u.id === id && u.role === "player");
    if (!user) return "Joueur introuvable.";
    if (codeTaken(db.users, code, id)) return `Le code « ${code} » est déjà utilisé.`;
    Object.assign(user, { name, code, tools, echo, profile: { fields, notes } });
    return null;
  });

  if (error) back(playerPath(id), { error });
  back(playerPath(id), { ok: "Modifications enregistrées." });
}

export async function deletePlayer(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  let name = "";
  await updateDb((db) => {
    const user = db.users.find((u) => u.id === id && u.role === "player");
    if (!user) return;
    name = user.name;
    db.users = db.users.filter((u) => u.id !== id);
    // Données d'outils liées au joueur.
    db.homunculi = (db.homunculi ?? []).filter((h) => h.ownerId !== id);
    db.diceLog = (db.diceLog ?? []).filter((d) => d.userId !== id);
    for (const poll of db.polls ?? []) delete poll.responses[id];
  });
  back("/admin", { ok: name ? `${name} supprimé.` : "Joueur introuvable." });
}

export async function deleteHomunculus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const ownerId = String(formData.get("ownerId") ?? "");
  await updateDb((db) => {
    db.homunculi = (db.homunculi ?? []).filter((h) => !(h.id === id && h.ownerId === ownerId));
  });
  back(playerPath(ownerId), { ok: "Fiche d'homunculus supprimée." });
}
