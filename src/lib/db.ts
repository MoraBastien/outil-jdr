// Stockage très simple dans un fichier JSON (data/db.json).
// Suffisant pour une table de JDR ; à remplacer par une vraie base si besoin.
import { promises as fs } from "fs";
import path from "path";
import { randomUUID, randomInt } from "crypto";

export type Role = "admin" | "player";

export type ProfileField = { label: string; value: string };

export type User = {
  id: string;
  name: string;
  code: string;
  role: Role;
  /** Identifiants des outils accessibles (voir src/tools/registry.ts). Ignoré pour l'admin. */
  tools: string[];
  /** Écho de l'homunculus du joueur (Atelier de Rigel), fixé par le MJ. Absent = 1. */
  echo?: number;
  profile: {
    fields: ProfileField[];
    notes: string;
  };
};

/** Fiche d'homunculus (outil « Atelier de Rigel »). `state` = HomunculusState sérialisé. */
export type StoredHomunculus = {
  id: string;
  ownerId: string;
  state: unknown;
  echo: number;
  complete: boolean;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
};

/** Journal des jets faits côté serveur (anti-triche : une fiche ne peut utiliser que des jets enregistrés ici). */
export type DiceLogEntry = {
  userId: string;
  tool: string;
  kind: string;
  values: number[];
  createdAt: string;
};

/** Planning des sessions : un sondage de dates proposé par le MJ. */
export type PollAnswer = "yes" | "maybe" | "no";
/** Créneau en heure locale de la table : date "AAAA-MM-JJ", heures "HH:MM" (fin facultative, peut passer minuit). */
export type PollSlot = { id: string; date: string; start: string; end: string | null };
export type Poll = {
  id: string;
  title: string;
  note: string;
  slots: PollSlot[];
  /** userId → (slotId → réponse) */
  responses: Record<string, Record<string, PollAnswer>>;
  status: "open" | "confirmed" | "closed";
  confirmedSlotId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Db = { users: User[]; homunculi?: StoredHomunculus[]; diceLog?: DiceLogEntry[]; polls?: Poll[] };

const DB_PATH = path.join(process.cwd(), "data", "db.json");

async function save(db: Db): Promise<void> {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  const tmp = `${DB_PATH}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_PATH);
}

async function load(): Promise<Db> {
  try {
    return JSON.parse(await fs.readFile(DB_PATH, "utf8")) as Db;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    // Premier lancement : on crée la base avec le compte MJ.
    const db: Db = {
      users: [
        {
          id: randomUUID(),
          name: "Maître du jeu",
          code: process.env.ADMIN_CODE ?? "MJ-SECRET",
          role: "admin",
          tools: [],
          profile: { fields: [], notes: "" },
        },
      ],
    };
    await save(db);
    return db;
  }
}

// Les écritures sont sérialisées pour éviter que deux requêtes s'écrasent.
let queue: Promise<unknown> = Promise.resolve();

export function updateDb<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await load();
    const result = await fn(db);
    await save(db);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

export async function getHomunculi(ownerId: string): Promise<StoredHomunculus[]> {
  return ((await load()).homunculi ?? [])
    .filter((h) => h.ownerId === ownerId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getAllHomunculi(): Promise<StoredHomunculus[]> {
  return ((await load()).homunculi ?? []).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getPolls(): Promise<Poll[]> {
  return (await load()).polls ?? [];
}

export async function getDiceLog(userId: string, tool: string): Promise<DiceLogEntry[]> {
  return ((await load()).diceLog ?? []).filter((d) => d.userId === userId && d.tool === tool);
}

export async function getUsers(): Promise<User[]> {
  return (await load()).users;
}

export async function getUserById(id: string): Promise<User | undefined> {
  return (await load()).users.find((u) => u.id === id);
}

export const normalizeCode = (code: string) => code.trim().toUpperCase();

export async function getUserByCode(code: string): Promise<User | undefined> {
  const wanted = normalizeCode(code);
  if (!wanted) return undefined;
  return (await load()).users.find((u) => normalizeCode(u.code) === wanted);
}

/** Code lisible, sans caractères ambigus (0/O, 1/I/L). */
export function generateCode(length = 6): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[randomInt(alphabet.length)];
  return out;
}

export { randomUUID };
