// Grimoire : constantes partagées (client + serveur).
import type { SpellClass } from "./data/spells";

export const GRIMOIRE_TOOL_ID = "grimoire";

export const SPELL_CLASS_NAMES: Record<SpellClass, string> = {
  bard: "Barde",
  cleric: "Clerc",
  druid: "Druide",
  paladin: "Paladin",
  ranger: "Rôdeur",
  sorcerer: "Ensorceleur",
  warlock: "Occultiste",
  wizard: "Magicien",
};
export const SPELL_CLASSES = Object.keys(SPELL_CLASS_NAMES) as SpellClass[];

export const levelName = (level: number) => (level === 0 ? "Sort mineur" : `Niveau ${level}`);
