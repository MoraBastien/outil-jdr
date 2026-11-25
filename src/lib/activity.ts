// Journal « Activité à bord » : ce qui se passe dans un groupe entre deux séances.
// À appeler DANS une transaction updateDb (on reçoit le document en cours de modification).
// Rien ne doit y apparaître qui concerne l'Atelier de Rigel (les autres joueurs n'en ont pas connaissance).
import { randomUUID, type Activity, type Db } from "./db";

/** Lignes gardées par groupe (les plus anciennes sont oubliées). */
const KEEP_PER_GROUP = 200;

export function logActivity(db: Db, entry: Omit<Activity, "id" | "at"> & { at?: string }): void {
  const list = (db.activity ??= []);
  // Une ligne déjà écrite pour la même clé est remplacée (remontée en tête) plutôt que dupliquée.
  if (entry.key) {
    const i = list.findIndex((a) => a.groupId === entry.groupId && a.key === entry.key);
    if (i >= 0) list.splice(i, 1);
  }
  list.push({ id: randomUUID(), at: entry.at ?? new Date().toISOString(), ...entry });

  const mine = list.filter((a) => a.groupId === entry.groupId);
  if (mine.length > KEEP_PER_GROUP) {
    const drop = new Set(mine.sort((a, b) => a.at.localeCompare(b.at)).slice(0, mine.length - KEEP_PER_GROUP).map((a) => a.id));
    db.activity = list.filter((a) => !drop.has(a.id));
  }
}

/** Nom affiché d'un joueur dans un groupe : son personnage en vie s'il en a un, sinon son nom. */
export function crewName(db: Db, groupId: string, userId: string): string {
  const c = (db.characters ?? []).find((x) => x.groupId === groupId && x.ownerId === userId && !x.deadAt);
  const name = (c?.state as { name?: string } | undefined)?.name?.trim();
  return name || db.users.find((u) => u.id === userId)?.name || "Un marin";
}

/** Retire les lignes d'une clé (ex. un achat annulé). */
export function forgetActivity(db: Db, groupId: string, key: string): void {
  db.activity = (db.activity ?? []).filter((a) => !(a.groupId === groupId && a.key === key));
}
