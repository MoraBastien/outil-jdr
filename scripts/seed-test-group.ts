// Crée un groupe de test avec 3 joueurs (codes TEST1, TEST2, TEST3), chacun avec un personnage de niveau 1.
//
// Lancement (depuis la racine du projet) :
//   npx tsx scripts/seed-test-group.ts
// LOCAL UNIQUEMENT : écrit dans data/db.json. Le script refuse de tourner si une base Redis (Vercel) est
// configurée, pour que ces comptes de test n'arrivent jamais en production.
//
// Sans risque en cas de relance : rien n'est créé en double (joueurs retrouvés par code, groupe par nom,
// personnage par joueur et groupe). Rien n'est supprimé ni écrasé.

import { randomUUID, updateDb, normalizeCode, type User } from "../src/lib/db";
import { addMember } from "../src/lib/groups";
import { buildCharacter, type CreationInput } from "../src/tools/character/rules";

const GROUP_NAME = "Groupe test";

const PLAYERS: { code: string; name: string; character: CreationInput }[] = [
  {
    code: "test1",
    name: "Testeur 1",
    character: {
      name: "Brunhilde Forgefer",
      classId: "fighter",
      speciesId: "dwarf",
      backgroundId: "soldier",
      speciesOptions: {},
      scoreMethod: "standard",
      baseScores: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
      backgroundBonus: { str: 2, con: 1 },
      answers: { "class-skills": ["perception", "survival"], "fighting-style": ["defense"] },
      identity: { alignment: "Loyal bon", personality: "Bourrue, mais ne laisse jamais un allié derrière elle." },
    },
  },
  {
    code: "test2",
    name: "Testeur 2",
    character: {
      name: "Lyra Ventvif",
      classId: "rogue",
      speciesId: "elf",
      backgroundId: "criminal",
      speciesOptions: { lineage: "wood" },
      scoreMethod: "standard",
      baseScores: { str: 8, dex: 15, con: 14, int: 12, wis: 13, cha: 10 },
      backgroundBonus: { dex: 2, con: 1 },
      answers: {
        "class-skills": ["acrobatics", "perception", "investigation", "deception"],
        "rogue-expertise": ["stealth", "perception"],
        "species-skill": ["insight"],
      },
      identity: { alignment: "Chaotique bon", personality: "Vole les riches, rarement pour donner aux pauvres." },
    },
  },
  {
    code: "test3",
    name: "Testeur 3",
    character: {
      name: "Pipolin Rouage",
      classId: "wizard",
      speciesId: "gnome",
      backgroundId: "sage",
      speciesOptions: { lineage: "rock" },
      scoreMethod: "standard",
      baseScores: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 },
      backgroundBonus: { int: 2, con: 1 },
      answers: { "class-skills": ["investigation", "medicine"] },
      identity: { alignment: "Neutre", personality: "Curieux de tout, surtout de ce qui risque d'exploser." },
    },
  },
];

async function main() {
  // Garde-fou : jamais sur la base de production (Redis sur Vercel).
  if (process.env.KV_REDIS_URL || process.env.REDIS_URL || process.env.VERCEL) {
    throw new Error("Une base Redis (production) est configurée : ce script est réservé à la base locale data/db.json.");
  }

  // Valider les personnages avant toute écriture : en cas d'erreur de règle, rien n'est modifié.
  const states = PLAYERS.map((p) => buildCharacter(p.character));

  const report = await updateDb((db) => {
    const lines: string[] = [];
    const now = new Date().toISOString();

    let group = (db.groups ?? []).find((g) => g.name === GROUP_NAME);
    if (!group) {
      group = { id: randomUUID(), name: GROUP_NAME, createdAt: now };
      (db.groups ??= []).push(group);
      lines.push(`Groupe « ${GROUP_NAME} » créé.`);
    } else lines.push(`Groupe « ${GROUP_NAME} » déjà présent.`);

    PLAYERS.forEach((p, i) => {
      const code = normalizeCode(p.code);
      let user = db.users.find((u) => normalizeCode(u.code) === code);
      if (user && user.role !== "player") throw new Error(`Le code ${code} appartient déjà à un compte MJ : abandon.`);
      if (!user) {
        user = { id: randomUUID(), name: p.name, code, role: "player", tools: ["des"], groupIds: [], profile: { fields: [], notes: "" } } satisfies User;
        db.users.push(user);
        lines.push(`Joueur ${p.name} créé (code ${code}).`);
      } else lines.push(`Joueur ${user.name} (code ${code}) déjà présent.`);

      addMember(db, user, group!.id);

      const list = (db.characters ??= []);
      if (list.some((c) => c.ownerId === user!.id && c.groupId === group!.id && !c.deadAt)) {
        lines.push(`  ${user.name} a déjà un personnage dans ce groupe.`);
      } else {
        const state = states[i];
        list.push({ id: randomUUID(), ownerId: user.id, groupId: group!.id, state, grantedLevel: 1, snapshots: [{ level: 1, at: now, state }], createdAt: now, updatedAt: now });
        lines.push(`  Personnage ${state.name} créé pour ${user.name}.`);
      }
    });
    return lines;
  });

  console.log(report.join("\n"));
  process.exit(0); // ferme la connexion Redis éventuelle
}

main().catch((e) => {
  console.error("Échec :", e instanceof Error ? e.message : e);
  process.exit(1);
});
