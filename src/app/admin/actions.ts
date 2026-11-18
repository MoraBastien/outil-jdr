"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { updateDb, normalizeCode, generateCode, randomUUID, type ProfileField, type User } from "@/lib/db";
import { TOOLS } from "@/tools/registry";
import { addMember, isGroupTool, removeMember } from "@/lib/groups";
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
  const groupId = String(formData.get("group") ?? "");
  if (!name) back("/admin", { error: "Le nom est obligatoire." });

  const result = await updateDb((db): { error: string } | { id: string } => {
    if (!code) {
      do code = generateCode();
      while (codeTaken(db.users, code));
    } else if (codeTaken(db.users, code)) {
      return { error: `Le code « ${code} » est déjà utilisé.` };
    }
    const id = randomUUID();
    const user: User = { id, name, code, role: "player", tools: [], groupIds: [], profile: { fields: [], notes: "" } };
    db.users.push(user);
    if (groupId && (db.groups ?? []).some((g) => g.id === groupId)) addMember(db, user, groupId);
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
  // Le planning et la fiche de personnage dépendent des groupes, pas d'une case à cocher.
  const tools = formData.getAll("tools").map(String).filter((t) => validIds.has(t) && !isGroupTool(t));
  const groupIds = formData.getAll("groups").map(String);
  const echo = clampEcho(formData.get("echo"));
  const fields = parseFields(formData);
  const notes = String(formData.get("notes") ?? "");

  if (!name || !code) back(playerPath(id), { error: "Le nom et le code sont obligatoires." });

  const error = await updateDb((db) => {
    const user = db.users.find((u) => u.id === id && u.role === "player");
    if (!user) return "Joueur introuvable.";
    if (codeTaken(db.users, code, id)) return `Le code « ${code} » est déjà utilisé.`;
    Object.assign(user, { name, code, tools, echo, profile: { fields, notes } });
    const valid = new Set((db.groups ?? []).map((g) => g.id));
    for (const g of [...(user.groupIds ?? [])]) if (!groupIds.includes(g)) removeMember(user, g);
    for (const g of groupIds) if (valid.has(g)) addMember(db, user, g);
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
    db.characters = (db.characters ?? []).filter((c) => c.ownerId !== id);
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

/* ---------- Groupes de jeu ---------- */

export async function createGroup(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!name) back("/admin", { error: "Le nom du groupe est obligatoire." });
  await updateDb((db) => {
    (db.groups ??= []).push({ id: randomUUID(), name, createdAt: new Date().toISOString() });
  });
  back("/admin", { ok: `Groupe « ${name} » créé. Ajoute-lui des joueurs.` });
}

export async function renameGroup(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!name) back("/admin", { error: "Le nom du groupe est obligatoire." });
  await updateDb((db) => {
    const g = (db.groups ?? []).find((x) => x.id === id);
    if (g) g.name = name;
  });
  back("/admin", { ok: "Groupe renommé." });
}

/** Supprime le groupe et ses sondages. Les fiches de personnage sont gardées (archive du MJ). */
export async function deleteGroup(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  let name = "";
  await updateDb((db) => {
    name = (db.groups ?? []).find((g) => g.id === id)?.name ?? "";
    db.groups = (db.groups ?? []).filter((g) => g.id !== id);
    for (const u of db.users) removeMember(u, id);
    db.polls = (db.polls ?? []).filter((p) => p.groupId !== id);
  });
  back("/admin", { ok: name ? `Groupe « ${name} » supprimé.` : "Groupe introuvable." });
}

export async function addGroupMember(formData: FormData): Promise<void> {
  await requireAdmin();
  const groupId = String(formData.get("groupId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const error = await updateDb((db) => {
    const group = (db.groups ?? []).find((g) => g.id === groupId);
    const user = db.users.find((u) => u.id === userId && u.role === "player");
    if (!group || !user) return "Groupe ou joueur introuvable.";
    addMember(db, user, groupId);
    return null;
  });
  back("/admin", error ? { error } : { ok: "Joueur ajouté au groupe." });
}

export async function removeGroupMember(formData: FormData): Promise<void> {
  await requireAdmin();
  const groupId = String(formData.get("groupId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  await updateDb((db) => {
    const user = db.users.find((u) => u.id === userId);
    if (user) removeMember(user, groupId);
  });
  back("/admin", { ok: "Joueur retiré du groupe. Sa fiche de personnage est conservée." });
}
