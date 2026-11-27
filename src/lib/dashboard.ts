// Données du tableau de bord d'un joueur (côté serveur uniquement) : l'histoire, son personnage, l'escale.
// Un joueur dans plusieurs groupes voit le groupe choisi (le premier par défaut).
// Rester neutre sur l'Atelier de Rigel : une fiche d'homunculus est un personnage ordinaire, rien de plus.
import {
  getActivity,
  getCharacters,
  getChronicle,
  getGroups,
  getIslands,
  getPolls,
  getPurchases,
  getQuests,
  getShops,
  getUsers,
  type Activity,
  type User,
} from "./db";
import { membersOf, visibleGroups } from "./groups";
import { canUseTool } from "./auth";
import { derive, shortLabel } from "@/tools/character/rules";
import type { CharacterState } from "@/tools/character/types";
import { getSpell } from "@/tools/grimoire/data/spells";
import { getClass } from "@/tools/character/data/classes";
import { routeOf } from "@/tools/carte/route";
import { SEA_COLOR } from "@/tools/carte/meta";
import { toCp } from "@/tools/marche/meta";
import { slotKey, slotEnd } from "@/tools/planning/types";
import { tableToday } from "@/tools/planning/summary";

export type Isle = { id: string; name: string; color: string };
export type DashSession = {
  pollId: string;
  title: string;
  date: string;
  start: string;
  /** Séance fixée (créneau confirmé) ou sondage encore ouvert (meilleur créneau). */
  confirmed: boolean;
  /** Réponse du joueur au créneau retenu. */
  mine: "yes" | "maybe" | "no" | null;
  aboard: number;
  crew: number;
  /** Sondage ouvert : le joueur a-t-il répondu à tous les créneaux ? */
  answered: "todo" | "partial" | "done";
};
export type ChecklistItem = { id: string; label: string; hint: string; href: string; done: boolean };
export type CrewLine = { name: string; label: string; player: string; level: number | null; hpMax: number | null; presence: "yes" | "maybe" | "no" | null; me: boolean };
export type ActivityLine = Pick<Activity, "id" | "kind" | "text" | "href" | "at"> & { initial: string };

/** Titre d'un sondage affiché comme une séance (« Session 3 » → « Séance 3 »). */
const asSeance = (title: string) => title.replace(/^\s*sessions?\b/i, "Séance");

/** Jours entre aujourd'hui (heure de la table) et une date « AAAA-MM-JJ ». */
const daysFrom = (today: string, date: string) => Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
const closesLabel = (days: number) => (days <= 0 ? "ferme ce soir" : days === 1 ? "ferme demain" : `ferme dans ${days} jours`);

export type PlayerDashboard = {
  /** Le port ferme au départ du Navire (prochaine séance) : « ferme ce soir », « ferme dans 3 jours »… */
  portCloses: string | null;
  /** Membres de l'équipage qui n'ont pas répondu pour la prochaine séance fixée (initiale + nom). */
  missing: { initial: string; name: string }[];
  groups: { id: string; name: string }[];
  group: { id: string; name: string } | null;
  harbor: Isle | null;
  nextIsland: Isle | null;
  route: (Isle & { here: boolean })[];
  story: { number: number; title: string; date: string; summary: string; island: Isle | null } | null;
  /** Les séances publiées, de la plus ancienne à la plus récente (les 8 dernières) : les épisodes de la saison. */
  episodes: { number: number; title: string; date: string; summary: string; island: Isle | null }[];
  quests: { id: string; title: string; giver: string }[];
  sessions: DashSession[];
  character: {
    name: string;
    label: string;
    level: number;
    levelUp: number | null;
    hpMax: number;
    ac: number;
    initiative: number;
    spellDc: number | null;
    slots: number[];
    purseCp: number;
    /** Équipement, objet par objet : les achats du marché d'abord, puis le reste ; 6 au plus. */
    bag: string[];
    /** Nombre d'autres lignes d'équipement non affichées. */
    bagMore: number;
  } | null;
  shops: { name: string; kind: string; featured: { name: string; priceCp: number } | null }[];
  crew: CrewLine[];
  activity: ActivityLine[];
  checklist: ChecklistItem[];
  tools: { map: boolean; market: boolean; chronicle: boolean; quests: boolean; planning: boolean };
};

const isle = (i: { id: string; name: string; color: string }): Isle => ({ id: i.id, name: i.name, color: i.color });

/** « Séance 2 », « seance 2 », « Séance n°2 » : un titre qui ne dit que le numéro n'est pas répété. */
const sameAsNumber = (title: string, n: number) =>
  title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") === `seance${n}` || title.trim() === String(n);

/**
 * Le sac : une liste d'objets. Les achats du marché (lignes « • ») d'abord, puis le reste.
 * Les lignes d'équipement de départ (« Barbare : Hache à deux mains, 4 hachettes, 15 po (ou 75 po) ») sont
 * découpées en objets ; les pièces et les choix « (ou … po) » en sont retirés (la bourse les compte déjà).
 */
function bagOf(equipment: string): { bag: string[]; bagMore: number } {
  const lines = equipment
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const bought = lines.filter((l) => l.startsWith("•")).reverse();
  const rest = lines.filter((l) => !l.startsWith("•"));
  const items = [...bought, ...rest].flatMap((line) => {
    let l = line.replace(/^[•·\-*]\s*/, "").replace(/\s+/g, " ");
    // « Barbare : … » : le nom de la source n'est pas un objet.
    const colon = l.indexOf(" : ");
    if (colon > 0 && colon <= 30) l = l.slice(colon + 3);
    l = l.replace(/\s*\(ou [^)]*\)/gi, "");
    // Couper aux virgules hors parenthèses.
    const parts: string[] = [];
    let depth = 0, cur = "";
    for (const ch of l) {
      if (ch === "(") depth++;
      if (ch === ")") depth = Math.max(0, depth - 1);
      if (ch === "," && depth === 0) (parts.push(cur), (cur = ""));
      else cur += ch;
    }
    parts.push(cur);
    return parts
      .map((x) => x.trim().replace(/\.$/, ""))
      .filter((x) => x && !/^\d+\s*(po|pa|pc|pe|pp)$/i.test(x))
      .map((x) => x.charAt(0).toUpperCase() + x.slice(1));
  });
  const unique = items.filter((x, i) => items.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i);
  return { bag: unique.slice(0, 6), bagMore: Math.max(0, unique.length - 6) };
}

export async function getPlayerDashboard(user: User, wantedGroupId?: string): Promise<PlayerDashboard> {
  const [allGroups, islands, sessions, quests, polls, chars, users, shops, purchases] = await Promise.all([
    getGroups(),
    getIslands(),
    getChronicle(),
    getQuests(),
    getPolls(),
    getCharacters(),
    getUsers(),
    getShops(),
    getPurchases(),
  ]);
  const groups = visibleGroups(user, allGroups);
  const g = groups.find((x) => x.id === wantedGroupId) ?? groups[0];
  const tools = {
    map: canUseTool(user, "carte"),
    market: canUseTool(user, "marche"),
    chronicle: canUseTool(user, "chronique"),
    quests: canUseTool(user, "quetes"),
    planning: canUseTool(user, "planning"),
  };
  const empty: PlayerDashboard = { portCloses: null, missing: [], groups: [], group: null, harbor: null, nextIsland: null, route: [], story: null, episodes: [], quests: [], sessions: [], character: null, shops: [], crew: [], activity: [], checklist: [], tools };
  if (!g) return empty;

  // --- L'archipel
  const groupIslands = islands.filter((i) => i.groupId === g.id && i.status !== "hidden");
  const byId = new Map(groupIslands.map((i) => [i.id, i]));
  const harborIsl = g.harborIslandId ? byId.get(g.harborIslandId) : undefined;
  const nextIsl = g.nextIslandId ? byId.get(g.nextIslandId) : undefined;
  const routeIds = routeOf(g.id, sessions, false, (id) => byId.has(id));
  if (harborIsl && routeIds.at(-1) !== harborIsl.id) routeIds.push(harborIsl.id);
  const route = routeIds.map((id) => ({ ...isle(byId.get(id)!), here: id === harborIsl?.id }));

  // --- L'histoire
  const published = sessions
    .filter((s) => s.groupId === g.id && !s.draft)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const last = published.at(-1);
  const lastIsland = last?.islandId ? byId.get(last.islandId) : undefined;
  const story = last ? { number: published.length, title: sameAsNumber(last.title, published.length) ? "" : last.title, date: last.date, summary: last.summary, island: lastIsland ? isle(lastIsland) : null } : null;
  const episodes = published.slice(-8).map((s) => {
    const n = published.indexOf(s) + 1;
    const isl = s.islandId ? byId.get(s.islandId) : undefined;
    return { number: n, title: sameAsNumber(s.title, n) ? "" : s.title, date: s.date, summary: s.summary, island: isl ? isle(isl) : null };
  });
  const openQuests = quests.filter((q) => q.groupId === g.id && q.visible && q.status === "open").map((q) => ({ id: q.id, title: q.title, giver: q.giver }));

  // --- Les séances : fixées à venir, puis sondages ouverts
  const day = tableToday();
  const members = membersOf(users, g.id);
  const answerOf = (p: (typeof polls)[number], slotId: string, uid: string) => p.responses[uid]?.[slotId] ?? null;
  const groupPolls = polls.filter((p) => p.groupId === g.id);
  const fixed: DashSession[] = groupPolls
    .filter((p) => p.status === "confirmed")
    .flatMap((p) => {
      const slot = p.slots.find((s) => s.id === p.confirmedSlotId);
      if (!slot || slotEnd(slot).date < day) return [];
      return [
        {
          pollId: p.id,
          title: asSeance(p.title),
          date: slot.date,
          start: slot.start,
          confirmed: true,
          mine: answerOf(p, slot.id, user.id),
          aboard: members.filter((m) => answerOf(p, slot.id, m.id) === "yes").length,
          crew: members.length,
          answered: "done" as const,
          key: slotKey(slot),
        },
      ];
    })
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(({ key: _key, ...s }) => s);
  const open: DashSession[] = groupPolls
    .filter((p) => p.status === "open")
    .flatMap((p) => {
      const slots = p.slots.filter((s) => s.date >= day).sort((a, b) => slotKey(a).localeCompare(slotKey(b)));
      if (slots.length === 0) return [];
      const score = (sid: string) => members.reduce((n, m) => n + ({ yes: 2, maybe: 1, no: 0 }[answerOf(p, sid, m.id) ?? "no"] ?? 0), 0);
      const best = slots.reduce((b, s) => (score(s.id) > score(b.id) ? s : b), slots[0]);
      const answeredCount = slots.filter((s) => answerOf(p, s.id, user.id)).length;
      return [
        {
          pollId: p.id,
          title: asSeance(p.title),
          date: best.date,
          start: best.start,
          confirmed: false,
          mine: answerOf(p, best.id, user.id),
          aboard: members.filter((m) => answerOf(p, best.id, m.id) === "yes").length,
          crew: members.length,
          answered: answeredCount === 0 ? ("todo" as const) : answeredCount < slots.length ? ("partial" as const) : ("done" as const),
        },
      ];
    });
  const sessionsList = [...fixed, ...open].slice(0, 3);

  // --- Mon personnage
  const mine = chars.find((c) => c.groupId === g.id && c.ownerId === user.id && !c.deadAt);
  const state = mine?.state as CharacterState | undefined;
  let character: PlayerDashboard["character"] = null;
  let spellsTodo: ChecklistItem | null = null;
  if (mine && state) {
    const d = derive(state);
    character = {
      name: state.name,
      label: shortLabel(state),
      level: state.level,
      levelUp: !state.extra && mine.grantedLevel > state.level ? mine.grantedLevel : null,
      hpMax: d.hpMax,
      ac: d.ac.value,
      initiative: d.initiative,
      spellDc: d.spell?.dc ?? null,
      slots: d.spell?.slots ?? [],
      purseCp: toCp(state.coins),
      ...bagOf(state.equipment),
    };
    if (d.spell && d.spell.prepared > 0) {
      const prepared = (state.grimoire ?? []).filter((id) => (getSpell(id)?.level ?? 0) > 0).length;
      spellsTodo = {
        id: "sorts",
        label: prepared >= d.spell.prepared ? "Sorts préparés" : "Préparer mes sorts",
        hint: `Grimoire (${Math.min(prepared, d.spell.prepared)}/${d.spell.prepared})`,
        href: "/outils/grimoire",
        done: prepared >= d.spell.prepared,
      };
    }
  }

  // --- L'escale
  const harborShops = harborIsl ? shops.filter((s) => s.islandId === harborIsl.id) : [];
  const shopLines = harborShops.map((s) => {
    const featured = [...s.items].filter((i) => i.stock !== 0).sort((a, b) => b.priceCp - a.priceCp)[0];
    return { name: s.name, kind: s.kind, featured: featured ? { name: featured.name, priceCp: featured.priceCp } : null };
  });

  // --- L'équipage
  const confirmedNext = fixed[0];
  const crew: CrewLine[] = members
    .map((m) => {
      const c = chars.find((x) => x.ownerId === m.id && x.groupId === g.id && !x.deadAt);
      const s = c?.state as CharacterState | undefined;
      const slotId = confirmedNext ? groupPolls.find((p) => p.id === confirmedNext.pollId)?.confirmedSlotId : null;
      const poll = confirmedNext ? groupPolls.find((p) => p.id === confirmedNext.pollId) : undefined;
      return {
        name: s?.name ?? m.name,
        label: s ? `${getClass(s.classId)?.name ?? "Aventurier"} · niv. ${s.level}` : "Pas encore de personnage",
        player: m.name,
        level: s?.level ?? null,
        hpMax: s ? derive(s).hpMax : null,
        presence: poll && slotId ? answerOf(poll, slotId, m.id) : null,
        me: m.id === user.id,
      };
    })
    .sort((a, b) => Number(b.me) - Number(a.me) || Number(b.level !== null) - Number(a.level !== null) || a.name.localeCompare(b.name, "fr"));

  // --- Activité à bord
  const nameOf = new Map(
    members.map((m) => {
      const s = chars.find((x) => x.ownerId === m.id && x.groupId === g.id && !x.deadAt)?.state as CharacterState | undefined;
      return [m.id, s?.name || m.name] as const;
    }),
  );
  // Ma propre présence est déjà dans le bandeau : on ne la répète pas dans l'activité.
  const activity = (await getActivity(g.id, 10))
    .filter((a) => !(a.kind === "presence" && a.actorId === user.id))
    .slice(0, 8)
    .map((a) => ({
    id: a.id,
    kind: a.kind,
    text: a.text,
    href: a.href,
    at: a.at,
    initial: a.actorId ? (nameOf.get(a.actorId) ?? "?").charAt(0).toUpperCase() : "⚓",
  }));

  // --- Avant de lever l'ancre
  const checklist: ChecklistItem[] = [];
  if (character) {
    checklist.push(
      character.levelUp
        ? { id: "niveau", label: `Monter au niveau ${character.levelUp}`, hint: "Ma fiche", href: "/outils/personnage", done: false }
        : { id: "niveau", label: `Fiche à jour (niveau ${character.level})`, hint: "Ma fiche", href: "/outils/personnage", done: true },
    );
  }
  if (spellsTodo) checklist.push(spellsTodo);
  if (tools.market && harborIsl && harborShops.length > 0) {
    const harborAt = (await getActivity(g.id, 200)).find((a) => a.key === "harbor")?.at ?? "";
    const bought = purchases.some((p) => p.groupId === g.id && p.userId === user.id && !p.cancelledAt && p.islandId === harborIsl.id && p.createdAt >= harborAt);
    const closes = sessionsList[0] ? ` (${closesLabel(daysFrom(day, sessionsList[0].date))})` : "";
    checklist.push({ id: "achats", label: `Achats au port${bought ? "" : closes}`, hint: "Aller au marché", href: "/outils/marche", done: bought });
  }
  // La présence n'est dans la liste que tant qu'elle n'est pas donnée (sinon le bandeau du haut l'affiche).
  const nextSession = sessionsList[0];
  const presenceDone = nextSession ? (nextSession.confirmed ? nextSession.mine !== null : nextSession.answered === "done") : true;
  if (nextSession && !presenceDone)
    checklist.push(
      nextSession.confirmed
        ? { id: "presence", label: nextSession.mine === "no" ? "Absence signalée" : "Confirmer ma présence", hint: "Répondre", href: "#db-today", done: nextSession.mine !== null }
        : { id: "presence", label: "Donner mes disponibilités", hint: "Répondre", href: "/outils/planning", done: nextSession.answered === "done" },
    );

  const portCloses = harborIsl && sessionsList[0] ? closesLabel(daysFrom(day, sessionsList[0].date)) : null;
  const missing = confirmedNext ? crew.filter((c) => !c.me && c.presence === null).map((c) => ({ initial: c.name.charAt(0).toUpperCase(), name: c.name })) : [];

  return {
    portCloses,
    missing,
    groups: groups.map((x) => ({ id: x.id, name: x.name })),
    group: { id: g.id, name: g.name },
    harbor: harborIsl ? isle(harborIsl) : null,
    nextIsland: nextIsl ? isle(nextIsl) : null,
    route,
    story,
    episodes,
    quests: openQuests,
    sessions: sessionsList,
    character,
    shops: shopLines,
    crew,
    activity,
    checklist,
    tools,
  };
}

/**
 * Couleur du site pour un utilisateur : celle de l'île où mouille le Navire de son (premier) groupe.
 * Le MJ et les joueurs sans escale gardent le bleu mer.
 */
export async function islandColorFor(user: User): Promise<string> {
  if (user.role === "admin") return SEA_COLOR;
  const [allGroups, islands] = await Promise.all([getGroups(), getIslands()]);
  for (const g of visibleGroups(user, allGroups)) {
    const i = islands.find((x) => x.id === g.harborIslandId && x.groupId === g.id);
    if (i) return i.color;
  }
  return SEA_COLOR;
}
