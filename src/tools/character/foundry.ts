// Liste « À reporter dans Foundry » : ce que le joueur doit refaire sur sa fiche Foundry VTT (système dnd5e)
// après une montée de niveau faite ici. Pur, partagé client + serveur.
import { getClass } from "./data/classes";
import { averageHp, derive, fmtMod, type LevelUpResult } from "./rules";
import type { CharacterState } from "./types";

export function foundryChecklist(before: CharacterState, result: LevelUpResult, hp: { die: number; rolled: boolean }): string[] {
  const after = result.state;
  const cls = getClass(after.classId);
  const name = cls?.name ?? "ta classe";
  const d0 = derive(before);
  const d1 = derive(after);
  const items: string[] = [
    `Sur ta fiche Foundry, passe l'objet de classe « ${name} » au niveau ${after.level}.`,
    hp.rolled
      ? `Points de vie : quand Foundry te le demande, saisis ${hp.die} (le dé lancé ici, ne relance pas).`
      : `Points de vie : quand Foundry te le demande, prends la moyenne (${averageHp(cls?.hitDie ?? 8)}).`,
    `Vérifie tes PV max : ${d1.hpMax}.`,
  ];
  for (const line of result.summary) {
    if (line.startsWith("PV max")) continue;
    if (line.startsWith("Nouvelle capacité : ")) {
      items.push(`Vérifie que la capacité « ${line.slice("Nouvelle capacité : ".length)} » est sur ta fiche (sinon, ajoute-la depuis le compendium).`);
    } else if (/^(Emplacements|Sorts préparés|Sorts mineurs|Incantation)/.test(line)) {
      items.push(`Vérifie — ${line}.`);
    } else {
      items.push(`Reporte ton choix — ${line}.`);
    }
  }
  if (d1.prof !== d0.prof) items.push(`Vérifie ton bonus de maîtrise : ${fmtMod(d1.prof)}.`);
  if (d1.spell && d1.spell.prepared > (d0.spell?.prepared ?? 0)) items.push("Prépare tes nouveaux sorts dans Foundry (onglet Sorts).");
  return items;
}
