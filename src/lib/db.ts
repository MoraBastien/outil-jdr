// Stockage très simple : un seul document JSON, dans Redis (Vercel) ou dans data/db.json (local).
// Suffisant pour une table de JDR.
import { promises as fs } from "fs";
import path from "path";
import { randomUUID, randomInt } from "crypto";
import { createClient } from "redis";

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
  /** Groupes de jeu du joueur (voir `groups`). Donnent accès au planning et aux fiches de personnage. */
  groupIds?: string[];
  /**
   * Disponibilités habituelles, par jour de la semaine (index 0 = dimanche, comme Date.getDay()).
   * Servent à pré-remplir les réponses aux sondages du planning. `null` = pas d'habitude.
   */
  weekly?: (PollAnswer | null)[];
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
  /** Groupe concerné (absent pour les sondages créés avant les groupes). */
  groupId?: string;
  title: string;
  note: string;
  slots: PollSlot[];
  /** userId → (slotId → réponse) */
  responses: Record<string, Record<string, PollAnswer>>;
  /** userId → créneaux dont la réponse a été pré-remplie d'après ses disponibilités habituelles. */
  autoFilled?: Record<string, string[]>;
  status: "open" | "confirmed" | "closed";
  confirmedSlotId: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Fiche de personnage D&D (outil « personnage »). `state` = CharacterState sérialisé. */
export type StoredCharacter = {
  id: string;
  ownerId: string;
  /** Groupe (campagne) du personnage : un joueur a une fiche par groupe. Absent pour les anciennes fiches. */
  groupId?: string;
  state: unknown;
  /** Niveau autorisé par le MJ (le joueur peut monter jusqu'à ce niveau). */
  grantedLevel: number;
  /** Date de la mort, déclarée par le MJ : la fiche n'est plus modifiable (voir `graves`). */
  deadAt?: string;
  /** Copie de la fiche à chaque niveau atteint (archive du MJ). */
  snapshots: { level: number; at: string; state: unknown }[];
  /** Choix du prochain niveau, préparés par le joueur avant que le MJ ne l'accorde. */
  prepared?: PreparedLevelUp;
  /** Ce que le joueur doit reporter dans Foundry après sa dernière montée de niveau. */
  foundryTodo?: FoundryTodo;
  createdAt: string;
  updatedAt: string;
};

export type PreparedLevelUp = { level: number; answers: Record<string, string[]>; hpMode: "average" | "roll"; at: string };
export type FoundryTodo = { level: number; items: { text: string; done: boolean }[] };

/** Personnage du coffre proposé au MJ pour rejoindre une campagne. `state` = copie figée au moment de la proposition. */
export type Proposal = {
  id: string;
  ownerId: string;
  groupId: string;
  draftId: string;
  state: unknown;
  message: string;
  status: "pending" | "refused";
  /** Réponse du MJ en cas de refus. */
  reason?: string;
  createdAt: string;
  updatedAt: string;
};

/** Tombe du cimetière d'une campagne : garde la mémoire d'un personnage mort. */
export type Grave = {
  id: string;
  groupId: string;
  characterId: string;
  ownerId: string;
  name: string;
  /** « Elfe roublard · niv. 3 », figé au moment de la mort. */
  label: string;
  epitaph: string;
  diedAt: string;
};

/** Moment marquant d'une séance (chronique). `characters` : noms figés au moment de l'écriture. */
export type ChronicleMoment = {
  id: string;
  kind: string;
  text: string;
  characters: { id: string; name: string }[];
  /** Événement détecté automatiquement (ex. "levelup:<idFiche>:3", "death:<idFiche>"), pour ne pas le proposer deux fois. */
  source?: string;
};
/** Une séance racontée dans la chronique d'un groupe. */
export type ChronicleSession = {
  id: string;
  groupId: string;
  /** "AAAA-MM-JJ" */
  date: string;
  title: string;
  summary: string;
  moments: ChronicleMoment[];
  /** Brouillon : visible du MJ seulement. */
  draft: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Quête d'un groupe, écrite par le MJ (outil « Quêtes »).
 * Cachée : visible du MJ seulement. Une quête lancée (en cours) apparaît dans la frise, à la séance `startSessionId` ;
 * sa conclusion (accomplie / échouée) à la séance `endSessionId`.
 */
export type Quest = {
  id: string;
  groupId: string;
  title: string;
  description: string;
  /** Qui l'a confiée (PNJ, lieu…). */
  giver: string;
  reward: string;
  visible: boolean;
  status: "todo" | "open" | "done" | "failed";
  startSessionId: string | null;
  endSessionId: string | null;
  /** Personnages concernés (noms figés). */
  characters: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
};

/** Groupe de jeu (une table, une campagne). Les membres sont les joueurs dont `groupIds` contient son id. */
export type Group = { id: string; name: string; createdAt: string };

export type Db = {
  users: User[];
  groups?: Group[];
  homunculi?: StoredHomunculus[];
  diceLog?: DiceLogEntry[];
  polls?: Poll[];
  characters?: StoredCharacter[];
  /** Coffre : les essais de création des joueurs (hors groupe, niveau libre). */
  vault?: StoredCharacter[];
  graves?: Grave[];
  proposals?: Proposal[];
  chronicle?: ChronicleSession[];
  quests?: Quest[];
};

// ---------------------------------------------------------------------------
// Stockage
// - Si une URL Redis est définie (Vercel) : tout le document est stocké sous une seule clé Redis.
// - Sinon (en local, VPS) : fichier data/db.json, comme avant.
// ---------------------------------------------------------------------------

const DB_PATH = path.join(process.cwd(), "data", "db.json");
const REDIS_KEY = "jdr:db";

// KV_REDIS_URL : nom créé par Vercel avec le préfixe « KV ». REDIS_URL : nom par défaut.
const REDIS_URL = process.env.KV_REDIS_URL ?? process.env.REDIS_URL;

type RedisClient = ReturnType<typeof createClient>;

// Une seule connexion, réutilisée entre les requêtes tant que l'instance reste active.
const globalForRedis = globalThis as unknown as { jdrRedis?: Promise<RedisClient> };

function getRedis(): Promise<RedisClient> | null {
  if (!REDIS_URL) return null;
  if (!globalForRedis.jdrRedis) {
    const client = createClient({ url: REDIS_URL });
    client.on("error", (e) => console.error("Redis :", e));
    globalForRedis.jdrRedis = client.connect().catch((e) => {
      globalForRedis.jdrRedis = undefined; // on retentera à la prochaine requête
      throw e;
    }) as Promise<RedisClient>;
  }
  return globalForRedis.jdrRedis;
}

function initialDb(): Db {
  return {
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
}

/** Le document tel qu'il est stocké (JSON brut), pour détecter une modification concurrente. */
type Snapshot = { db: Db; raw: string | null };

async function readSnapshot(): Promise<Snapshot> {
  const pending = getRedis();
  if (pending) {
    const redis = await pending;
    let raw = await redis.get(REDIS_KEY);
    if (raw === null) {
      // Premier lancement : on crée la base avec le compte MJ (NX = seulement si absente).
      await redis.set(REDIS_KEY, JSON.stringify(initialDb(), null, 2), { condition: "NX" });
      raw = await redis.get(REDIS_KEY);
    }
    return { db: JSON.parse(raw as string) as Db, raw };
  }

  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    return { db: JSON.parse(raw) as Db, raw };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    const db = initialDb();
    await writeFile(db);
    return { db, raw: null };
  }
}

async function writeFile(db: Db): Promise<void> {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  const tmp = `${DB_PATH}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_PATH);
}

// Écrit seulement si personne n'a modifié la base depuis la lecture (opération atomique côté Redis).
const COMPARE_AND_SET = `
local current = redis.call("GET", KEYS[1])
if current == ARGV[1] then
  redis.call("SET", KEYS[1], ARGV[2])
  return 1
end
return 0
`;

async function load(): Promise<Db> {
  return (await readSnapshot()).db;
}

// Les écritures sont sérialisées dans ce processus pour éviter que deux requêtes s'écrasent.
let queue: Promise<unknown> = Promise.resolve();

export function updateDb<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const pending = getRedis();
    if (!pending) {
      const { db } = await readSnapshot();
      const result = await fn(db);
      await writeFile(db);
      return result;
    }

    // Sur Vercel, plusieurs instances tournent en parallèle : si la base a changé entre la
    // lecture et l'écriture, on relit et on rejoue la modification.
    const redis = await pending;
    for (let attempt = 0; attempt < 10; attempt++) {
      const { db, raw } = await readSnapshot();
      const result = await fn(db);
      const written = await redis.eval(COMPARE_AND_SET, {
        keys: [REDIS_KEY],
        arguments: [raw as string, JSON.stringify(db, null, 2)],
      });
      if (Number(written) === 1) return result;
    }
    throw new Error("Base de données trop sollicitée, réessaie dans un instant.");
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

export async function getCharacters(): Promise<StoredCharacter[]> {
  return (await load()).characters ?? [];
}

export async function getVault(ownerId: string): Promise<StoredCharacter[]> {
  return ((await load()).vault ?? []).filter((c) => c.ownerId === ownerId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getGraves(): Promise<Grave[]> {
  return ((await load()).graves ?? []).sort((a, b) => b.diedAt.localeCompare(a.diedAt));
}

export async function getGroups(): Promise<Group[]> {
  return ((await load()).groups ?? []).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export async function getProposals(): Promise<Proposal[]> {
  return (await load()).proposals ?? [];
}

export async function getChronicle(): Promise<ChronicleSession[]> {
  return (await load()).chronicle ?? [];
}

export async function getQuests(): Promise<Quest[]> {
  return (await load()).quests ?? [];
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