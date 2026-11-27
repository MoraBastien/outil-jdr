// Données du tableau de bord du MJ (côté serveur uniquement) : la passerelle d'un groupe vue du poste de commandement.
// Ce qui attend le MJ entre deux séances, la table, l'histoire (quêtes cachées comprises), le port et l'activité.
import {
  getActivity,
  getCharacters,
  getChronicle,
  getConcepts,
  getGraves,
  getGroups,
  getIslands,
  getPolls,
  getProposals,
  getPurchases,
  getQuests,
  getShops,
  getUsers,
  type Activity,
} from "./db";
import { membersOf } from "./groups";
import { derive, shortLabel } from "@/tools/character/rules";
import type { CharacterState } from "@/tools/character/types";
import { detectedEvents } from "@/tools/chronicle/events";
import { routeOf } from "@/tools/carte/route";
import { slotEnd, slotKey } from "@/tools/planning/types";
import { tableToday } from "@/tools/planning/summary";
import type { Isle } from "./dashboard";

type Answer = "yes" | "maybe" | "no" | null;

export type AdminTodo = {
  id: string;
  label: string;
  /** Précision sous le libellé (qui, combien…). */
  detail: string;
  href: string;
  /** « now » : bloque la prochaine séance ; « soon » : à faire avant ; « note » : pour mémoire. */
  weight: "now" | "soon" | "note";
};

export type AdminSeat = {
  player: string;
  /** Personnage vivant du joueur dans ce groupe (absent : pas encore de fiche). */
  character: { name: string; label: string; level: number; hpMax: number; ac: number; levelReady: number | null; levelGranted: boolean } | null;
  /** En attente du MJ : une fiche proposée ou un concept. */
  waiting: "proposal" | "concept" | null;
  presence: Answer;
};

export type AdminDashboard = {
  groups: { id: string; name: string; todo: number }[];
  group: { id: string; name: string } | null;
  harbor: Isle | null;
  nextIsland: Isle | null;
  route: (Isle & { here: boolean })[];
  next: { pollId: string; title: string; date: string; start: string; confirmed: boolean; aboard: number; answered: number; crew: number; missing: string[] } | null;
  later: { title: string; date: string; start: string; confirmed: boolean }[];
  todos: AdminTodo[];
  seats: AdminSeat[];
  story: { number: number; title: string; date: string; summary: string; island: Isle | null } | null;
  drafts: number;
  quests: { id: string; title: string; giver: string; hidden: boolean }[];
  questsReady: number;
  port: { shops: number; purchases: { who: string; what: string; totalCp: number; at: string }[]; spentCp: number } | null;
  graves: { name: string; label: string; diedAt: string }[];
  activity: (Pick<Activity, "id" | "kind" | "text" | "href" | "at"> & { initial: string })[];
};

const asSeance = (title: string) => title.replace(/^\s*sessions?\b/i, "Séance");
const isle = (i: { id: string; name: string; color: string }): Isle => ({ id: i.id, name: i.name, color: i.color });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

export async function getAdminDashboard(wantedGroupId?: string): Promise<AdminDashboard> {
  const [groups, islands, sessions, quests, polls, chars, users, shops, purchases, proposals, concepts, graves] = await Promise.all([
    getGroups(),
    getIslands(),
    getChronicle(),
    getQuests(),
    getPolls(),
    getCharacters(),
    getUsers(),
    getShops(),
    getPurchases(),
    getProposals(),
    getConcepts(),
    getGraves(),
  ]);
  const day = tableToday();

  const build = async (gid: string) => {
    const g = groups.find((x) => x.id === gid)!;
    const members = membersOf(users, g.id);
    const groupIslands = islands.filter((i) => i.groupId === g.id);
    const byId = new Map(groupIslands.map((i) => [i.id, i]));
    const harborIsl = g.harborIslandId ? byId.get(g.harborIslandId) : undefined;
    const nextIsl = g.nextIslandId ? byId.get(g.nextIslandId) : undefined;

    // --- Les séances : la prochaine fixée, sinon le sondage ouvert ; puis les suivantes.
    const groupPolls = polls.filter((p) => p.groupId === g.id);
    const answerOf = (p: (typeof polls)[number], slotId: string, uid: string): Answer => p.responses[uid]?.[slotId] ?? null;
    const fixed = groupPolls
      .filter((p) => p.status === "confirmed")
      .flatMap((p) => {
        const slot = p.slots.find((s) => s.id === p.confirmedSlotId);
        return slot && slotEnd(slot).date >= day ? [{ p, slot }] : [];
      })
      .sort((a, b) => slotKey(a.slot).localeCompare(slotKey(b.slot)));
    const open = groupPolls
      .filter((p) => p.status === "open")
      .flatMap((p) => {
        const slots = p.slots.filter((s) => s.date >= day).sort((a, b) => slotKey(a).localeCompare(slotKey(b)));
        if (!slots.length) return [];
        const score = (sid: string) => members.reduce((n, m) => n + ({ yes: 2, maybe: 1, no: 0 }[answerOf(p, sid, m.id) ?? "no"] ?? 0), 0);
        const best = slots.reduce((b, s) => (score(s.id) > score(b.id) ? s : b), slots[0]);
        const answered = members.filter((m) => slots.some((s) => answerOf(p, s.id, m.id))).length;
        return [{ p, slot: best, answered }];
      });
    const f0 = fixed[0];
    const o0 = open[0];
    const next: AdminDashboard["next"] = f0
      ? {
          pollId: f0.p.id,
          title: asSeance(f0.p.title),
          date: f0.slot.date,
          start: f0.slot.start,
          confirmed: true,
          aboard: members.filter((m) => answerOf(f0.p, f0.slot.id, m.id) === "yes").length,
          answered: members.filter((m) => answerOf(f0.p, f0.slot.id, m.id)).length,
          crew: members.length,
          missing: members.filter((m) => !answerOf(f0.p, f0.slot.id, m.id)).map((m) => m.name),
        }
      : o0
        ? {
            pollId: o0.p.id,
            title: asSeance(o0.p.title),
            date: o0.slot.date,
            start: o0.slot.start,
            confirmed: false,
            aboard: members.filter((m) => answerOf(o0.p, o0.slot.id, m.id) === "yes").length,
            answered: o0.answered,
            crew: members.length,
            missing: members.filter((m) => !o0.p.slots.some((s) => answerOf(o0.p, s.id, m.id))).map((m) => m.name),
          }
        : null;
    const later = [...fixed.slice(f0 ? 1 : 0).map((x) => ({ title: asSeance(x.p.title), date: x.slot.date, start: x.slot.start, confirmed: true })), ...open.slice(f0 ? 0 : 1).map((x) => ({ title: asSeance(x.p.title), date: x.slot.date, start: x.slot.start, confirmed: false }))].slice(0, 3);

    // --- La table
    const seats: AdminSeat[] = members
      .map((m) => {
        const c = chars.find((x) => x.ownerId === m.id && x.groupId === g.id && !x.deadAt);
        const s = c?.state as CharacterState | undefined;
        const d = s ? derive(s) : null;
        const waiting = c
          ? null
          : proposals.some((x) => x.ownerId === m.id && x.groupId === g.id && x.status === "pending")
            ? ("proposal" as const)
            : concepts.some((x) => x.ownerId === m.id && x.groupId === g.id && x.status === "pending")
              ? ("concept" as const)
              : null;
        return {
          player: m.name,
          character:
            c && s && d
              ? {
                  name: s.name,
                  label: shortLabel(s),
                  level: s.level,
                  hpMax: d.hpMax,
                  ac: d.ac.value,
                  levelReady: c.prepared && c.prepared.level > c.grantedLevel ? c.prepared.level : null,
                  levelGranted: !s.extra && c.grantedLevel > s.level,
                }
              : null,
          waiting,
          presence: f0 ? answerOf(f0.p, f0.slot.id, m.id) : null,
        };
      })
      .sort((a, b) => Number(!a.character) - Number(!b.character) || (a.character?.name ?? a.player).localeCompare(b.character?.name ?? b.player, "fr"));

    // --- L'histoire
    const groupSessions = sessions.filter((s) => s.groupId === g.id);
    const published = groupSessions.filter((s) => !s.draft).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
    const drafts = groupSessions.filter((s) => s.draft);
    const last = published.at(-1);
    const lastIsl = last?.islandId ? byId.get(last.islandId) : undefined;
    const story = last ? { number: published.length, title: /^s[ée]ance\s*\d+$/i.test(last.title.trim()) ? "" : last.title, date: last.date, summary: last.summary, island: lastIsl ? isle(lastIsl) : null } : null;
    const groupQuests = quests.filter((q) => q.groupId === g.id);
    const openQuests = groupQuests.filter((q) => q.status === "open").map((q) => ({ id: q.id, title: q.title, giver: q.giver, hidden: !q.visible }));
    const questsReady = groupQuests.filter((q) => q.status === "todo").length;
    const events = detectedEvents(g.id, chars, graves, sessions);

    // --- Le port : les achats depuis que le Navire a jeté l'ancre.
    const harborShops = harborIsl ? shops.filter((s) => s.islandId === harborIsl.id) : [];
    const activityAll = await getActivity(g.id, 200);
    const harborAt = activityAll.find((a) => a.key === "harbor")?.at ?? "";
    const nameOfUser = (uid: string) => {
      const c = chars.find((x) => x.ownerId === uid && x.groupId === g.id && !x.deadAt)?.state as CharacterState | undefined;
      return c?.name || users.find((u) => u.id === uid)?.name || "?";
    };
    const bought = harborIsl ? purchases.filter((p) => p.groupId === g.id && !p.cancelledAt && p.islandId === harborIsl.id && p.createdAt >= harborAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
    const port = harborIsl
      ? {
          shops: harborShops.length,
          spentCp: bought.reduce((n, p) => n + p.totalCp, 0),
          purchases: bought.slice(0, 4).map((p) => ({ who: nameOfUser(p.userId), what: p.lines.map((l) => (l.qty > 1 ? `${l.qty} × ${l.name}` : l.name)).join(", "), totalCp: p.totalCp, at: p.createdAt })),
        }
      : null;

    // --- Ce qui attend le MJ, le plus pressant d'abord.
    const todos: AdminTodo[] = [];
    if (!next) todos.push({ id: "dates", label: "Proposer des dates", detail: "Aucune séance prévue ni sondage ouvert", href: "/outils/planning", weight: "now" });
    else if (!next.confirmed)
      todos.push({ id: "fixer", label: `Fixer la date de la ${next.title}`, detail: `${next.answered} sur ${next.crew} ont répondu au sondage`, href: "/outils/planning", weight: next.answered >= next.crew ? "now" : "soon" });
    else if (next.missing.length) todos.push({ id: "relance", label: "Relancer les retardataires", detail: `Sans réponse pour la ${next.title} : ${next.missing.join(", ")}`, href: "/outils/planning", weight: "soon" });
    for (const s of seats) {
      if (s.waiting === "proposal") todos.push({ id: `prop-${s.player}`, label: `Examiner la fiche proposée par ${s.player}`, detail: "Elle attend ta validation", href: "/outils/personnage", weight: "now" });
      else if (s.waiting === "concept") todos.push({ id: `concept-${s.player}`, label: `Répondre au concept de ${s.player}`, detail: "Une idée de personnage à discuter", href: "/outils/personnage", weight: "soon" });
      else if (!s.character) todos.push({ id: `sans-${s.player}`, label: `${s.player} n'a pas de personnage`, detail: "Ni fiche ni concept dans ce groupe", href: "/outils/personnage", weight: "note" });
      else if (s.character.levelReady) todos.push({ id: `niv-${s.player}`, label: `Accorder le niveau ${s.character.levelReady} à ${s.character.name}`, detail: `${s.player} a préparé sa montée de niveau`, href: "/outils/personnage", weight: "soon" });
    }
    for (const d of drafts) todos.push({ id: `draft-${d.id}`, label: `Publier le journal « ${d.title} »`, detail: "Brouillon : les joueurs ne le voient pas encore", href: "/outils/chronique", weight: "soon" });
    if (events.length) todos.push({ id: "events", label: `Raconter ${plural(events.length, "événement")} dans la chronique`, detail: events.slice(0, 2).map((e) => e.text.replace(/\s*\(.*\)\.?$/, "").replace(/\.$/, "")).join(" · "), href: "/outils/chronique", weight: "note" });
    if (harborIsl && !nextIsl) todos.push({ id: "escale", label: "Annoncer la prochaine escale", detail: `Le Navire mouille à ${harborIsl.name}`, href: "/outils/carte", weight: "note" });
    if (harborIsl && harborShops.length === 0) todos.push({ id: "echoppes", label: `Ouvrir des échoppes à ${harborIsl.name}`, detail: "Le port est vide : rien à acheter avant la traversée", href: "/outils/marche", weight: "note" });
    const order = { now: 0, soon: 1, note: 2 };
    todos.sort((a, b) => order[a.weight] - order[b.weight]);

    // --- Route
    const routeIds = routeOf(g.id, sessions, true, (id) => byId.has(id));
    if (harborIsl && routeIds.at(-1) !== harborIsl.id) routeIds.push(harborIsl.id);
    const route = routeIds.map((id) => ({ ...isle(byId.get(id)!), here: id === harborIsl?.id }));

    const nameOf = new Map(members.map((m) => [m.id, nameOfUser(m.id)] as const));
    const activity = activityAll.slice(0, 8).map((a) => ({ id: a.id, kind: a.kind, text: a.text, href: a.href, at: a.at, initial: a.actorId ? (nameOf.get(a.actorId) ?? "?").charAt(0).toUpperCase() : "⚓" }));

    return {
      group: { id: g.id, name: g.name },
      harbor: harborIsl ? isle(harborIsl) : null,
      nextIsland: nextIsl ? isle(nextIsl) : null,
      route,
      next,
      later,
      todos,
      seats,
      story,
      drafts: drafts.length,
      quests: openQuests,
      questsReady,
      port,
      graves: graves.filter((x) => x.groupId === g.id).sort((a, b) => b.diedAt.localeCompare(a.diedAt)).slice(0, 3).map((x) => ({ name: x.name, label: x.label, diedAt: x.diedAt })),
      activity,
    };
  };

  const empty: AdminDashboard = { groups: [], group: null, harbor: null, nextIsland: null, route: [], next: null, later: [], todos: [], seats: [], story: null, drafts: 0, quests: [], questsReady: 0, port: null, graves: [], activity: [] };
  if (!groups.length) return empty;
  const g = groups.find((x) => x.id === wantedGroupId) ?? groups[0];
  const built = await build(g.id);
  // Le nombre de choses à faire de chaque groupe, pour les onglets.
  const counts = groups.length > 1 ? await Promise.all(groups.map(async (x) => (x.id === g.id ? built.todos : (await build(x.id)).todos).filter((t) => t.weight !== "note").length)) : [built.todos.filter((t) => t.weight !== "note").length];
  return { ...built, groups: groups.map((x, i) => ({ id: x.id, name: x.name, todo: counts[i] })) };
}
