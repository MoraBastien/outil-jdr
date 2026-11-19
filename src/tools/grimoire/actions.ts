"use server";
// Actions du Grimoire : les personnages lanceurs de sorts du joueur, et le choix de leurs sorts
// (sorts mineurs et sorts préparés), rangés dans leur fiche (`state.grimoire`).
// Tout est vérifié ici : propriétaire, classe, niveau de sort accessible, limites données par le moteur de règles.
import { requireUser } from "@/lib/auth";
import { getCharacters, getGroups, updateDb, type StoredCharacter, type User } from "@/lib/db";
import { userGroupIds } from "@/lib/groups";
import { derive } from "@/tools/character/rules";
import { getClass, getSubclass } from "@/tools/character/data/classes";
import type { CharacterState } from "@/tools/character/types";
import { getSpell, type SpellClass } from "./data/spells";
import { SPELL_CLASS_NAMES } from "./meta";

export type GrimoireCharacter = {
  id: string;
  name: string;
  groupName: string;
  /** Liste de sorts utilisée (classe, ou magicien pour les sous-classes « tiers de lanceur »). */
  listClass: SpellClass;
  label: string;
  /** Niveau de sort le plus élevé que le personnage peut lancer. */
  maxLevel: number;
  cantripsMax: number;
  preparedMax: number;
  chosen: string[];
};
export type GrimoireView = { isAdmin: boolean; characters: GrimoireCharacter[]; nonCasters: string[] };
export type GrimoireResult = { ok: true; view: GrimoireView } | { ok: false; error: string };

class GrimoireError extends Error {}

/** Personnage en jeu du joueur (vivant, dans un de ses groupes). */
const playable = (c: StoredCharacter, user: User) => c.ownerId === user.id && !c.deadAt && !!c.groupId && userGroupIds(user).includes(c.groupId);

/** Magie du personnage, ou null s'il ne lance pas de sorts. */
function casting(s: CharacterState) {
  const d = derive(s);
  if (!d.spell) return null;
  const cls = getClass(s.classId);
  const sub = getSubclass(s.classId, s.subclassId);
  // Chevalier occulte, Escroc arcanique : sorts de magicien.
  const listClass = (cls?.caster ? cls.id : sub?.caster ? "wizard" : cls?.id) as SpellClass;
  if (!SPELL_CLASS_NAMES[listClass]) return null;
  const maxLevel = d.spell.pactLevel ?? d.spell.slots.filter((n) => n > 0).length;
  return { listClass, maxLevel, cantripsMax: d.spell.cantrips, preparedMax: d.spell.prepared };
}

async function buildView(user: User): Promise<GrimoireView> {
  if (user.role === "admin") return { isAdmin: true, characters: [], nonCasters: [] };
  const [chars, groups] = await Promise.all([getCharacters(), getGroups()]);
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  const characters: GrimoireCharacter[] = [];
  const nonCasters: string[] = [];
  for (const c of chars.filter((x) => playable(x, user))) {
    const s = c.state as CharacterState;
    const m = casting(s);
    if (!m) {
      nonCasters.push(s.name);
      continue;
    }
    characters.push({
      id: c.id,
      name: s.name,
      groupName: groupName.get(c.groupId!) ?? "",
      listClass: m.listClass,
      label: `${SPELL_CLASS_NAMES[m.listClass]} niv. ${s.level}`,
      maxLevel: m.maxLevel,
      cantripsMax: m.cantripsMax,
      preparedMax: m.preparedMax,
      chosen: (s.grimoire ?? []).filter((id) => getSpell(id)),
    });
  }
  return { isAdmin: false, characters, nonCasters };
}

export async function getGrimoireViewAction(): Promise<GrimoireView> {
  return buildView(await requireUser());
}

/** Ajoute ou retire un sort des sorts choisis d'un personnage. */
export async function toggleGrimoireSpellAction(characterId: string, spellId: string): Promise<GrimoireResult> {
  const user = await requireUser();
  try {
    await updateDb((db) => {
      const c = (db.characters ?? []).find((x) => x.id === characterId);
      if (!c || !playable(c, user)) throw new GrimoireError("Personnage introuvable.");
      const s = c.state as CharacterState;
      const spell = getSpell(spellId);
      if (!spell) throw new GrimoireError("Sort introuvable.");
      const chosen = (s.grimoire ?? []).filter((id) => getSpell(id));
      if (chosen.includes(spellId)) {
        s.grimoire = chosen.filter((id) => id !== spellId);
      } else {
        const m = casting(s);
        if (!m) throw new GrimoireError(`${s.name} ne lance pas de sorts.`);
        if (!spell.classes.includes(m.listClass)) throw new GrimoireError(`${spell.name} n'est pas un sort de ${SPELL_CLASS_NAMES[m.listClass].toLowerCase()}.`);
        if (spell.level > m.maxLevel) throw new GrimoireError(`${s.name} ne peut pas encore lancer de sorts de niveau ${spell.level}.`);
        const cantrips = chosen.filter((id) => getSpell(id)!.level === 0).length;
        const prepared = chosen.length - cantrips;
        if (spell.level === 0 && cantrips >= m.cantripsMax) throw new GrimoireError(`${s.name} connaît déjà ${m.cantripsMax} sorts mineurs : retires-en un d'abord.`);
        if (spell.level > 0 && prepared >= m.preparedMax) throw new GrimoireError(`${s.name} a déjà ${m.preparedMax} sorts préparés : retires-en un d'abord.`);
        s.grimoire = [...chosen, spellId];
      }
      c.updatedAt = new Date().toISOString();
    });
  } catch (e) {
    if (e instanceof GrimoireError) return { ok: false, error: e.message };
    console.error("Grimoire :", e);
    return { ok: false, error: "L'action a échoué. Réessaie." };
  }
  return { ok: true, view: await buildView(user) };
}
