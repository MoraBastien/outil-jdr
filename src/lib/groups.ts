// Groupes de jeu : un joueur peut appartenir à plusieurs groupes.
// Le planning et les fiches de personnage fonctionnent par groupe : ils sont ouverts
// à tout joueur membre d'au moins un groupe (et au MJ), sans case à cocher.
import type { Db, Group, User } from "./db";

export const GROUP_TOOL_IDS = ["planning", "personnage"];
export const isGroupTool = (toolId: string) => GROUP_TOOL_IDS.includes(toolId);

export const userGroupIds = (user: Pick<User, "groupIds">) => user.groupIds ?? [];

/** Joueurs membres d'un groupe. */
export const membersOf = (users: User[], groupId: string) =>
  users.filter((u) => u.role === "player" && userGroupIds(u).includes(groupId)).sort((a, b) => a.name.localeCompare(b.name, "fr"));

/** Groupes visibles : tous pour le MJ, les siens pour un joueur. */
export const visibleGroups = (user: User, groups: Group[]) =>
  user.role === "admin" ? groups : groups.filter((g) => userGroupIds(user).includes(g.id));

/**
 * Ajoute un joueur à un groupe (dans une transaction updateDb).
 * Les anciennes fiches de personnage sans groupe sont rattachées au premier groupe rejoint.
 */
export function addMember(db: Db, user: User, groupId: string) {
  if (!userGroupIds(user).includes(groupId)) user.groupIds = [...userGroupIds(user), groupId];
  for (const c of db.characters ?? []) if (c.ownerId === user.id && !c.groupId) c.groupId = groupId;
}

export function removeMember(user: User, groupId: string) {
  user.groupIds = userGroupIds(user).filter((g) => g !== groupId);
}
