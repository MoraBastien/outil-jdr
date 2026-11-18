// Passage d'un essai du coffre à une campagne : on vérifie qu'il respecte les règles de campagne
// et on remet à zéro ce que le coffre permet de « tricher ». Pur, partagé client + serveur.
import { getClass } from "./data/classes";
import { RuleError, averageHp, derive, validateScores } from "./rules";
import type { CharacterState } from "./types";

/** Raison pour laquelle cet essai ne peut pas être proposé (null : il peut l'être). */
export function proposalBlocker(s: CharacterState): string | null {
  if (s.scoreMethod === "free") return "Cet essai utilise des valeurs de caractéristiques libres, interdites en campagne. Recrée-le avec le tableau standard ou l'achat de points.";
  return validateScores(s.scoreMethod, s.baseScores);
}

/**
 * Fiche de campagne tirée d'un essai. Dans le coffre, on peut revenir en arrière et relancer ses dés de vie :
 * les PV des niveaux suivants sont donc recalculés avec la moyenne. L'état en jeu repart à neuf.
 */
export function toCampaignState(draft: CharacterState): CharacterState {
  const blocker = proposalBlocker(draft);
  if (blocker) throw new RuleError(blocker);
  const s: CharacterState = structuredClone(draft);
  const hitDie = getClass(s.classId)?.hitDie ?? 8;
  s.hpRolls = s.hpRolls.map(() => averageHp(hitDie));
  const d = derive(s);
  s.play = { hp: d.hpMax, tempHp: 0, hitDiceSpent: 0, deathSuccess: 0, deathFail: 0, slotsUsed: d.spell ? d.spell.slots.map(() => 0) : [], inspiration: false };
  s.history = [
    ...s.history,
    { level: s.level, at: new Date().toISOString(), summary: [`Proposé depuis le coffre (niveau ${s.level}, PV à la moyenne)`], hpGain: 0 },
  ];
  return s;
}
