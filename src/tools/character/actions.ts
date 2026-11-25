"use server";
// Actions serveur de la fiche de personnage. Une fiche par joueur ET par groupe de jeu.
// Rien n'est cru sur parole : création et montée de niveau sont recalculées par le moteur de règles,
// le dé de vie est lancé ici, et le niveau ne monte que si le MJ l'a accordé.

import { randomInt } from "crypto";
import { requireUser, canUseTool } from "@/lib/auth";
import { getCharacters, getConcepts, getGraves, getGroups, getProposals, getUsers, randomUUID, updateDb, type CharacterConcept, type Db, type Grave, type StoredCharacter, type User } from "@/lib/db";
import { membersOf, userGroupIds, visibleGroups } from "@/lib/groups";
import { logActivity } from "@/lib/activity";
import { getClass } from "./data/classes";
import { getSpecies } from "./data/origins";
import { foundryChecklist } from "./foundry";
import { RuleError, applyLevelUp, averageHp, buildCharacter, sanitizeFree, shortLabel, type CreationInput } from "./rules";
import { entitySheetOf, isEntityPlayer } from "@/tools/homunculus/entity";
import { CHARACTER_TOOL_ID, MAX_LEVEL, type Answers, type CharacterRecord, type CharacterState, type HpMode } from "./types";

type Snapshot = { level: number; at: string; state: CharacterState };
export type Death = { epitaph: string; diedAt: string };
export type AdminEntry = { record: CharacterRecord; snapshots: Snapshot[]; dead?: Death };
/** Joueur : sa proposition (venue du coffre) pour ce groupe. */
export type MyProposal = { name: string; label: string; status: "pending" | "refused"; reason: string };
/** MJ : proposition en attente d'un membre sans personnage. */
export type PendingProposal = { id: string; state: CharacterState; message: string; createdAt: string };
/**
 * MJ : membre dont la fiche n'est pas une fiche D&D (l'entité d'un joueur de l'Atelier). Les textes viennent
 * du serveur pour que le code client, commun à tous les joueurs, ne contienne rien qui la trahisse.
 */
export type OtherSheet = { title: string; sub: string; chip: string };
export type LevelUpOutcome = { hpDie: number; rolled: boolean; summary: string[]; foundry: string[] };
/** Concept de personnage en attente (« J'ai un concept »). */
export type ConceptData = { id: string; speciesId: string | null; classId: string | null; speciesName: string | null; className: string | null; text: string; createdAt: string; updatedAt: string };
/** Jet des caractéristiques : 6 × 4d6 (le plus bas retiré), totaux triés et dés de chaque jet. */
export type AbilityRoll = { ok: true; values: number[]; dice: number[][]; rolls: number } | { ok: false; error: string };

export type CharacterView = {
  isAdmin: boolean;
  meId: string;
  /** Joueur : une entrée par groupe dont il est membre, avec sa fiche (ou null). */
  mine: {
    group: { id: string; name: string };
    record: CharacterRecord | null;
    fallen: { name: string; epitaph: string; diedAt: string }[];
    proposal: MyProposal | null;
    concept: ConceptData | null;
  }[];
  /** MJ : chaque groupe, ses membres et leur fiche dans ce groupe (ou leur proposition en attente). */
  groups: { id: string; name: string; members: { id: string; name: string; entry: AdminEntry | null; proposal: PendingProposal | null; other: OtherSheet | null; concept: ConceptData | null }[] }[];
  /** MJ : fiches hors groupe (groupe supprimé, joueur retiré du groupe, anciennes fiches). */
  archived: (AdminEntry & { groupName: string | null })[];
};

export type ActionResult = { ok: true; view: CharacterView; levelUp?: LevelUpOutcome } | { ok: false; error: string };

async function requireToolUser(): Promise<User> {
  const user = await requireUser();
  if (!canUseTool(user, CHARACTER_TOOL_ID)) throw new Error("Accès refusé à cet outil.");
  return user;
}

const toRecord = (c: StoredCharacter, users: User[]): CharacterRecord => {
  const state = c.state as CharacterState;
  return {
    id: c.id,
    ownerId: c.ownerId,
    groupId: c.groupId ?? null,
    ownerName: users.find((u) => u.id === c.ownerId)?.name ?? "?",
    state,
    grantedLevel: c.grantedLevel,
    // Des choix préparés pour un autre niveau ne servent plus à rien.
    prepared: c.prepared && c.prepared.level === state.level + 1 ? c.prepared : null,
    foundryTodo: c.foundryTodo ?? null,
    updatedAt: c.updatedAt,
  };
};
const toEntry = (c: StoredCharacter, users: User[], graves: Grave[]): AdminEntry => {
  const grave = graves.find((g) => g.characterId === c.id);
  return {
    record: toRecord(c, users),
    snapshots: (c.snapshots ?? []).map((s) => ({ ...s, state: s.state as CharacterState })),
    dead: c.deadAt ? { epitaph: grave?.epitaph ?? "", diedAt: c.deadAt } : undefined,
  };
};

const toConcept = (c: CharacterConcept | undefined): ConceptData | null =>
  c
    ? {
        id: c.id,
        speciesId: c.speciesId,
        classId: c.classId,
        speciesName: c.speciesId ? getSpecies(c.speciesId)?.name ?? null : null,
        className: c.classId ? getClass(c.classId)?.name ?? null : null,
        text: c.text,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }
    : null;

/** Début de la fenêtre des jets de caractéristiques : la dernière fiche créée pour ce joueur (les jets d'avant ne comptent plus). */
const rollWindow = (db: Pick<Db, "characters">, ownerId: string) =>
  (db.characters ?? []).filter((c) => c.ownerId === ownerId).reduce((max, c) => (c.createdAt > max ? c.createdAt : max), "");

async function view(user: User): Promise<CharacterView> {
  const [chars, users, allGroups, graves, proposals, concepts] = await Promise.all([getCharacters(), getUsers(), getGroups(), getGraves(), getProposals(), getConcepts()]);
  const conceptOf = (ownerId: string, groupId: string) => toConcept(concepts.find((x) => x.ownerId === ownerId && x.groupId === groupId && x.status === "pending"));
  const isAdmin = user.role === "admin";
  const groups = visibleGroups(user, allGroups);
  // La fiche « en jeu » d'un joueur dans un groupe : la seule qui n'est pas morte.
  const find = (ownerId: string, groupId: string) => chars.find((c) => c.ownerId === ownerId && c.groupId === groupId && !c.deadAt);

  if (!isAdmin) {
    return {
      isAdmin,
      meId: user.id,
      mine: groups.map((g) => {
        const c = find(user.id, g.id);
        const fallen = graves
          .filter((gr) => gr.groupId === g.id && gr.ownerId === user.id)
          .map((gr) => ({ name: gr.name, epitaph: gr.epitaph, diedAt: gr.diedAt }));
        const p = c ? undefined : proposals.find((x) => x.ownerId === user.id && x.groupId === g.id);
        const proposal: MyProposal | null = p
          ? { name: (p.state as CharacterState).name, label: shortLabel(p.state as CharacterState), status: p.status, reason: p.reason ?? "" }
          : null;
        return { group: { id: g.id, name: g.name }, record: c ? toRecord(c, users) : null, fallen, proposal, concept: c ? null : conceptOf(user.id, g.id) };
      }),
      groups: [],
      archived: [],
    };
  }

  const placed = new Set<string>();
  const adminGroups = groups.map((g) => ({
    id: g.id,
    name: g.name,
    members: membersOf(users, g.id).map((m) => {
      // Joueur de l'Atelier : sa fiche est celle de son entité ; une ancienne fiche D&D passe dans les archives.
      const entity = entitySheetOf(m);
      // Joueur de l'Atelier : son personnage dans le groupe est son homunculus actif (fiche avec `extra`).
      const c = entity
        ? chars.find((x) => x.ownerId === m.id && x.groupId === g.id && !x.deadAt && (x.state as CharacterState).extra)
        : find(m.id, g.id);
      if (c) placed.add(c.id);
      const p = c ? undefined : proposals.find((x) => x.ownerId === m.id && x.groupId === g.id && x.status === "pending");
      const proposal: PendingProposal | null = p ? { id: p.id, state: p.state as CharacterState, message: p.message, createdAt: p.createdAt } : null;
      const other: OtherSheet | null = entity
        ? {
            title: entity.name || m.name,
            sub: `${entity.name ? `${m.name} · entité` : "Entité pas encore nommée"} · aucun homunculus actif`,
            chip: `✨ ${entity.name || "Entité"} · Écho ${entity.echo}`,
          }
        : null;
      return { id: m.id, name: m.name, entry: c ? toEntry(c, users, graves) : null, proposal, other, concept: c || other ? null : conceptOf(m.id, g.id) };
    }),
  }));
  const groupName = new Map(allGroups.map((g) => [g.id, g.name]));
  return {
    isAdmin,
    meId: user.id,
    mine: [],
    groups: adminGroups,
    archived: chars.filter((c) => !placed.has(c.id)).map((c) => ({ ...toEntry(c, users, graves), groupName: c.groupId ? groupName.get(c.groupId) ?? null : null })),
  };
}

/**
 * Fiche sur laquelle l'utilisateur peut agir (dans une transaction) :
 * le MJ, toutes ; un joueur, la sienne dans un groupe dont il fait partie.
 */
function editable(db: Db, user: User, characterId: string): StoredCharacter {
  const c = (db.characters ?? []).find((x) => x.id === characterId);
  if (!c) throw new RuleError("Fiche introuvable.");
  if (c.deadAt) throw new RuleError("Ce personnage est mort : sa fiche ne peut plus être modifiée.");
  if (user.role === "admin") return c;
  if (c.ownerId !== user.id || !c.groupId || !userGroupIds(user).includes(c.groupId)) throw new RuleError("Tu ne peux modifier que tes propres fiches.");
  return c;
}

async function guard(user: User, fn: () => Promise<ActionResult | void>): Promise<ActionResult> {
  try {
    const r = await fn();
    return r ?? { ok: true, view: await view(user) };
  } catch (e) {
    if (e instanceof RuleError) return { ok: false, error: e.message };
    console.error("Fiche de personnage :", e);
    return { ok: false, error: "L'action a échoué. Réessaie." };
  }
}

export async function getCharacterViewAction(): Promise<CharacterView> {
  return view(await requireToolUser());
}

/** Crée la fiche d'un joueur pour un groupe (le joueur pour lui-même, le MJ pour n'importe quel membre). */
export async function createCharacterAction(input: CreationInput, groupId: string, ownerId?: string | null): Promise<ActionResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    const owner = ownerId && user.role === "admin" ? ownerId : user.id;
    // Fiche de campagne : caractéristiques tirées aux dés (4d6), par le serveur.
    if (input?.scoreMethod !== "roll") throw new RuleError("Lance les dés pour tes caractéristiques.");
    const state = buildCharacter(input);
    await updateDb((db) => {
      // Les valeurs doivent venir d'un jet noté au journal, fait par celui qui crée la fiche, depuis la dernière fiche du joueur.
      const since = rollWindow(db, owner);
      const rolls = (db.diceLog ?? []).filter((d) => d.userId === user.id && d.tool === CHARACTER_TOOL_ID && d.kind === "abilities" && d.createdAt > since);
      const key = [...Object.values(state.baseScores)].sort((a, b) => b - a).join(",");
      if (!rolls.some((d) => d.values.join(",") === key)) throw new RuleError("Ces caractéristiques ne correspondent à aucun jet enregistré. Relance les dés.");
      state.scoreRolls = rolls.length;
      if (!(db.groups ?? []).some((g) => g.id === groupId)) throw new RuleError("Groupe introuvable.");
      const target = db.users.find((u) => u.id === owner && u.role === "player");
      if (target && isEntityPlayer(target)) throw new RuleError("Ce joueur incarne une entité : sa fiche n'est pas une fiche D&D.");
      if (!target || !userGroupIds(target).includes(groupId)) throw new RuleError("Ce joueur ne fait pas partie de ce groupe.");
      const list = (db.characters ??= []);
      if (list.some((c) => c.ownerId === owner && c.groupId === groupId && !c.deadAt)) throw new RuleError("Ce joueur a déjà une fiche dans ce groupe.");
      const now = new Date().toISOString();
      const id = randomUUID();
      list.push({ id, ownerId: owner, groupId, state, grantedLevel: 1, snapshots: [{ level: 1, at: now, state }], createdAt: now, updatedAt: now });
      logActivity(db, { groupId, actorId: owner, kind: "character", text: `${state.name} rejoint l'équipage (${shortLabel(state)}).`, href: "/outils/personnage", key: `character:${id}` });
      // Une proposition venue du coffre pour ce groupe n'a plus lieu d'être, et le concept est traité.
      db.proposals = (db.proposals ?? []).filter((p) => !(p.ownerId === owner && p.groupId === groupId));
      closeConcept(db, owner, groupId, now);
    });
  });
}

function closeConcept(db: Db, ownerId: string, groupId: string, now: string) {
  for (const c of db.concepts ?? []) if (c.ownerId === ownerId && c.groupId === groupId && c.status === "pending") Object.assign(c, { status: "done", updatedAt: now });
}

/* ---------- Caractéristiques : jets de dés ---------- */

/** 6 × 4d6, le plus bas retiré, lancés ici et notés au journal (relances comptées, visibles par le MJ). */
export async function rollAbilityScoresAction(): Promise<AbilityRoll> {
  const user = await requireToolUser();
  const dice = Array.from({ length: 6 }, () => Array.from({ length: 4 }, () => randomInt(1, 7)).sort((a, b) => b - a));
  const totals = dice.map((d) => d[0] + d[1] + d[2]);
  const order = totals.map((t, i) => [t, i] as const).sort((a, b) => b[0] - a[0]);
  const values = order.map(([t]) => t);
  let rolls = 0;
  await updateDb((db) => {
    const now = new Date().toISOString();
    (db.diceLog ??= []).push({ userId: user.id, tool: CHARACTER_TOOL_ID, kind: "abilities", values, createdAt: now });
    const since = rollWindow(db, user.id);
    rolls = db.diceLog.filter((d) => d.userId === user.id && d.tool === CHARACTER_TOOL_ID && d.kind === "abilities" && d.createdAt > since).length;
  });
  return { ok: true, values, dice: order.map(([, i]) => dice[i]), rolls };
}

/* ---------- « J'ai un concept » ---------- */

export type ConceptInput = { speciesId: string | null; classId: string | null; text: string };

/** Le joueur envoie (ou modifie) le concept de son personnage pour un groupe. */
export async function saveConceptAction(groupId: string, input: ConceptInput): Promise<ActionResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    if (user.role !== "player") throw new RuleError("Réservé aux joueurs.");
    const text = String(input?.text ?? "").trim().slice(0, 3000);
    if (text.length < 10) throw new RuleError("Décris ton concept en quelques phrases.");
    const speciesId = input?.speciesId && getSpecies(input.speciesId) ? input.speciesId : null;
    const classId = input?.classId && getClass(input.classId) ? input.classId : null;
    await updateDb((db) => {
      const me = db.users.find((u) => u.id === user.id);
      if (!me || !userGroupIds(me).includes(groupId)) throw new RuleError("Tu ne fais pas partie de ce groupe.");
      if ((db.characters ?? []).some((c) => c.ownerId === user.id && c.groupId === groupId && !c.deadAt)) throw new RuleError("Tu as déjà un personnage dans ce groupe.");
      const now = new Date().toISOString();
      const list = (db.concepts ??= []);
      const existing = list.find((c) => c.ownerId === user.id && c.groupId === groupId && c.status === "pending");
      if (existing) Object.assign(existing, { speciesId, classId, text, updatedAt: now });
      else list.push({ id: randomUUID(), ownerId: user.id, groupId, speciesId, classId, text, status: "pending", createdAt: now, updatedAt: now });
    });
  });
}

export async function withdrawConceptAction(groupId: string): Promise<ActionResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    await updateDb((db) => {
      db.concepts = (db.concepts ?? []).filter((c) => !(c.ownerId === user.id && c.groupId === groupId && c.status === "pending"));
    });
  });
}

/** MJ : le concept est traité (la discussion a eu lieu, ou la fiche sera faite autrement). */
export async function resolveConceptAction(conceptId: string): Promise<ActionResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    if (user.role !== "admin") throw new RuleError("Réservé au MJ.");
    await updateDb((db) => {
      const c = (db.concepts ?? []).find((x) => x.id === conceptId);
      if (!c) throw new RuleError("Concept introuvable.");
      Object.assign(c, { status: "done", updatedAt: new Date().toISOString() });
    });
  });
}

export async function saveCharacterAction(characterId: string, patch: Partial<CharacterState>): Promise<ActionResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    await updateDb((db) => {
      const c = editable(db, user, characterId);
      c.state = sanitizeFree(c.state as CharacterState, patch ?? {});
      c.updatedAt = new Date().toISOString();
    });
  });
}

export async function levelUpAction(characterId: string, answers: Answers, hpMode: HpMode): Promise<ActionResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    let result: LevelUpOutcome | undefined;
    await updateDb((db) => {
      const c = editable(db, user, characterId);
      const state = c.state as CharacterState;
      if (state.extra) throw new RuleError("Le niveau de ce personnage suit l'Écho de son joueur.");
      if (c.grantedLevel <= state.level) throw new RuleError("Ton MJ ne t'a pas encore accordé de niveau.");
      const hitDie = getClass(state.classId)?.hitDie ?? 8;
      const rolled = hpMode === "roll";
      const hpDie = rolled ? randomInt(1, hitDie + 1) : averageHp(hitDie);
      const r = applyLevelUp(state, cleanAnswers(answers), hpDie);
      const now = new Date().toISOString();
      const foundry = foundryChecklist(state, r, { die: hpDie, rolled });
      c.state = r.state;
      c.snapshots = [...(c.snapshots ?? []), { level: r.state.level, at: now, state: r.state }];
      c.prepared = undefined;
      c.foundryTodo = { level: r.state.level, items: foundry.map((text) => ({ text, done: false })) };
      c.updatedAt = now;
      if (c.groupId) logActivity(db, { groupId: c.groupId, actorId: c.ownerId, kind: "levelup", text: `${r.state.name} passe au niveau ${r.state.level} !`, href: "/outils/personnage", key: `levelup:${c.id}:${r.state.level}` });
      result = { hpDie, rolled, summary: r.summary, foundry };
    });
    return { ok: true, view: await view(user), levelUp: result };
  });
}

/** MJ : autorise une fiche à monter jusqu'à `level` (ou retire une autorisation non utilisée). */
export async function grantLevelAction(characterId: string, level: number): Promise<ActionResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    if (user.role !== "admin") throw new RuleError("Réservé au MJ.");
    await updateDb((db) => {
      const c = editable(db, user, characterId);
      if ((c.state as CharacterState).extra) throw new RuleError("Le niveau de ce personnage suit l'Écho de son joueur.");
      const current = (c.state as CharacterState).level;
      c.grantedLevel = Math.min(MAX_LEVEL, Math.max(current, Math.round(level)));
      c.updatedAt = new Date().toISOString();
    });
  });
}

/**
 * MJ : accorde le niveau suivant à tous les personnages vivants d'un groupe.
 * Ceux qui ont déjà une montée en attente ou qui sont au niveau maximum ne changent pas.
 */
export async function grantGroupLevelAction(groupId: string): Promise<ActionResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    if (user.role !== "admin") throw new RuleError("Réservé au MJ.");
    await updateDb((db) => {
      if (!(db.groups ?? []).some((g) => g.id === groupId)) throw new RuleError("Groupe introuvable.");
      const members = new Set(membersOf(db.users, groupId).filter((u) => !isEntityPlayer(u)).map((u) => u.id));
      const now = new Date().toISOString();
      let n = 0;
      for (const c of db.characters ?? []) {
        const level = (c.state as CharacterState).level;
        if (c.groupId !== groupId || c.deadAt || !members.has(c.ownerId) || level >= MAX_LEVEL || c.grantedLevel > level) continue;
        c.grantedLevel = level + 1;
        c.updatedAt = now;
        n++;
      }
      if (n === 0) throw new RuleError("Aucun personnage de ce groupe ne peut recevoir de niveau (déjà accordé ou niveau maximum).");
    });
  });
}

/* ---------- Préparer sa montée de niveau à l'avance ---------- */

/** Nettoie des réponses envoyées par le navigateur (le moteur de règles vérifie ensuite leur validité). */
function cleanAnswers(answers: unknown): Answers {
  const out: Answers = {};
  if (!answers || typeof answers !== "object") return out;
  for (const [k, v] of Object.entries(answers as Record<string, unknown>).slice(0, 20)) {
    if (Array.isArray(v)) out[String(k).slice(0, 60)] = v.slice(0, 10).map((x) => String(x).slice(0, 60));
  }
  return out;
}

/** Le joueur enregistre ses choix du niveau suivant, avant que le MJ ne l'accorde. Ils sont vérifiés tout de suite. */
export async function prepareLevelUpAction(characterId: string, answers: Answers, hpMode: HpMode): Promise<ActionResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    await updateDb((db) => {
      const c = editable(db, user, characterId);
      const state = c.state as CharacterState;
      if (state.extra) throw new RuleError("Le niveau de ce personnage suit l'Écho de son joueur.");
      if (state.level >= MAX_LEVEL) throw new RuleError(`Le niveau maximum est ${MAX_LEVEL}.`);
      const clean = cleanAnswers(answers);
      // Vérification avec la moyenne : lève une RuleError si un choix manque ou est invalide.
      applyLevelUp(state, clean, averageHp(getClass(state.classId)?.hitDie ?? 8));
      const now = new Date().toISOString();
      c.prepared = { level: state.level + 1, answers: clean, hpMode: hpMode === "roll" ? "roll" : "average", at: now };
      c.updatedAt = now;
    });
  });
}

export async function clearPreparedAction(characterId: string): Promise<ActionResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    await updateDb((db) => {
      const c = editable(db, user, characterId);
      c.prepared = undefined;
    });
  });
}

/** Coche / décoche les étapes « À reporter dans Foundry ». `null` : la liste est terminée, on la retire. */
export async function foundryTodoAction(characterId: string, done: boolean[] | null): Promise<ActionResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    await updateDb((db) => {
      const c = editable(db, user, characterId);
      if (!c.foundryTodo) return;
      if (done === null) c.foundryTodo = undefined;
      else c.foundryTodo.items = c.foundryTodo.items.map((it, i) => ({ ...it, done: Boolean(done[i]) }));
    });
  });
}

/* ---------- Propositions venues du coffre ---------- */

/** MJ : accepte la proposition d'un joueur. L'essai devient sa fiche dans le groupe, au niveau proposé. */
export async function acceptProposalAction(proposalId: string): Promise<ActionResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    if (user.role !== "admin") throw new RuleError("Réservé au MJ.");
    await updateDb((db) => {
      const p = (db.proposals ?? []).find((x) => x.id === proposalId && x.status === "pending");
      if (!p) throw new RuleError("Proposition introuvable.");
      const owner = db.users.find((u) => u.id === p.ownerId && u.role === "player");
      if (owner && isEntityPlayer(owner)) throw new RuleError("Ce joueur incarne une entité : sa fiche n'est pas une fiche D&D.");
      if (!owner || !userGroupIds(owner).includes(p.groupId)) throw new RuleError("Ce joueur ne fait plus partie de ce groupe.");
      const list = (db.characters ??= []);
      if (list.some((c) => c.ownerId === p.ownerId && c.groupId === p.groupId && !c.deadAt)) throw new RuleError("Ce joueur a déjà une fiche dans ce groupe.");
      const state = p.state as CharacterState;
      const now = new Date().toISOString();
      const c: StoredCharacter = {
        id: randomUUID(),
        ownerId: p.ownerId,
        groupId: p.groupId,
        state,
        grantedLevel: state.level,
        snapshots: [{ level: state.level, at: now, state }],
        createdAt: now,
        updatedAt: now,
      };
      list.push(c);
      logActivity(db, { groupId: p.groupId, actorId: p.ownerId, kind: "character", text: `${state.name} rejoint l'équipage (${shortLabel(state)}).`, href: "/outils/personnage", key: `character:${c.id}` });
      db.proposals = (db.proposals ?? []).filter((x) => x.id !== p.id);
      closeConcept(db, p.ownerId, p.groupId, new Date().toISOString());
    });
  });
}

/** MJ : refuse une proposition, avec un mot d'explication pour le joueur. */
export async function refuseProposalAction(proposalId: string, reason: string): Promise<ActionResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    if (user.role !== "admin") throw new RuleError("Réservé au MJ.");
    await updateDb((db) => {
      const p = (db.proposals ?? []).find((x) => x.id === proposalId && x.status === "pending");
      if (!p) throw new RuleError("Proposition introuvable.");
      p.status = "refused";
      p.reason = String(reason ?? "").trim().slice(0, 500);
      p.updatedAt = new Date().toISOString();
    });
  });
}

export async function deleteCharacterAction(characterId: string): Promise<ActionResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    if (user.role !== "admin") throw new RuleError("Réservé au MJ.");
    await updateDb((db) => {
      db.characters = (db.characters ?? []).filter((c) => c.id !== characterId);
    });
  });
}

/** MJ : déclare un personnage mort. Il rejoint le cimetière de son groupe et devient inutilisable. */
export async function declareDeathAction(characterId: string, epitaph: string): Promise<ActionResult> {
  const user = await requireToolUser();
  return guard(user, async () => {
    if (user.role !== "admin") throw new RuleError("Réservé au MJ.");
    await updateDb((db) => {
      const c = editable(db, user, characterId);
      if (!c.groupId) throw new RuleError("Seul un personnage de campagne peut rejoindre un cimetière.");
      const state = c.state as CharacterState;
      const now = new Date().toISOString();
      c.deadAt = now;
      c.updatedAt = now;
      (db.graves ??= []).push({
        id: randomUUID(),
        groupId: c.groupId,
        characterId: c.id,
        ownerId: c.ownerId,
        name: state.name,
        label: shortLabel(state),
        epitaph: String(epitaph ?? "").trim().slice(0, 300),
        diedAt: now,
      });
      logActivity(db, { groupId: c.groupId, kind: "death", text: `${state.name} est tombé. Son nom rejoint le cimetière marin.`, href: "/outils/cimetiere", key: `death:${c.id}` });
    });
  });
}
