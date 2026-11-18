// Armures et armes D&D 5.5 (2024) pour le calcul de la CA et des attaques.

export type Armor = {
  id: string;
  name: string;
  type: "none" | "light" | "medium" | "heavy";
  base: number;
  /** Bonus de DEX maximum (null = illimité, 0 = aucun). */
  dexMax: number | null;
  stealthDisadvantage?: boolean;
  /** Force minimale (sinon -3 m de vitesse). */
  str?: number;
};

export const ARMORS: Armor[] = [
  { id: "none", name: "Sans armure", type: "none", base: 10, dexMax: null },
  { id: "padded", name: "Matelassée", type: "light", base: 11, dexMax: null, stealthDisadvantage: true },
  { id: "leather", name: "Cuir", type: "light", base: 11, dexMax: null },
  { id: "studded", name: "Cuir clouté", type: "light", base: 12, dexMax: null },
  { id: "hide", name: "Peaux", type: "medium", base: 12, dexMax: 2 },
  { id: "chain-shirt", name: "Chemise de mailles", type: "medium", base: 13, dexMax: 2 },
  { id: "scale", name: "Écailles", type: "medium", base: 14, dexMax: 2, stealthDisadvantage: true },
  { id: "breastplate", name: "Cuirasse", type: "medium", base: 14, dexMax: 2 },
  { id: "half-plate", name: "Demi-plate", type: "medium", base: 15, dexMax: 2, stealthDisadvantage: true },
  { id: "ring", name: "Broigne", type: "heavy", base: 14, dexMax: 0, stealthDisadvantage: true },
  { id: "chain-mail", name: "Cotte de mailles", type: "heavy", base: 16, dexMax: 0, stealthDisadvantage: true, str: 13 },
  { id: "splint", name: "Clibanion", type: "heavy", base: 17, dexMax: 0, stealthDisadvantage: true, str: 15 },
  { id: "plate", name: "Harnois", type: "heavy", base: 18, dexMax: 0, stealthDisadvantage: true, str: 15 },
];

export const getArmor = (id: string) => ARMORS.find((a) => a.id === id) ?? ARMORS[0];

export type WeaponDef = {
  id: string;
  name: string;
  category: "simple" | "martial";
  ranged: boolean;
  damage: string;
  type: string;
  /** finesse : FOR ou DEX au choix (on prend la meilleure). */
  finesse?: boolean;
  props: string;
  mastery: string;
};

export const WEAPONS: WeaponDef[] = [
  { id: "club", name: "Gourdin", category: "simple", ranged: false, damage: "1d4", type: "contondant", props: "Légère", mastery: "Ralentissement" },
  { id: "dagger", name: "Dague", category: "simple", ranged: false, damage: "1d4", type: "perforant", finesse: true, props: "Finesse, légère, lancer (6/18 m)", mastery: "Coup double" },
  { id: "greatclub", name: "Massue", category: "simple", ranged: false, damage: "1d8", type: "contondant", props: "Deux mains", mastery: "Poussée" },
  { id: "handaxe", name: "Hachette", category: "simple", ranged: false, damage: "1d6", type: "tranchant", props: "Légère, lancer (6/18 m)", mastery: "Vexation" },
  { id: "javelin", name: "Javeline", category: "simple", ranged: false, damage: "1d6", type: "perforant", props: "Lancer (9/36 m)", mastery: "Ralentissement" },
  { id: "light-hammer", name: "Marteau léger", category: "simple", ranged: false, damage: "1d4", type: "contondant", props: "Légère, lancer (6/18 m)", mastery: "Coup double" },
  { id: "mace", name: "Masse d'armes", category: "simple", ranged: false, damage: "1d6", type: "contondant", props: "—", mastery: "Sape" },
  { id: "quarterstaff", name: "Bâton", category: "simple", ranged: false, damage: "1d6", type: "contondant", props: "Polyvalente (1d8)", mastery: "Renversement" },
  { id: "sickle", name: "Faucille", category: "simple", ranged: false, damage: "1d4", type: "tranchant", props: "Légère", mastery: "Coup double" },
  { id: "spear", name: "Lance", category: "simple", ranged: false, damage: "1d6", type: "perforant", props: "Lancer (6/18 m), polyvalente (1d8)", mastery: "Sape" },
  { id: "light-crossbow", name: "Arbalète légère", category: "simple", ranged: true, damage: "1d8", type: "perforant", props: "Munitions (24/96 m), chargement, deux mains", mastery: "Ralentissement" },
  { id: "shortbow", name: "Arc court", category: "simple", ranged: true, damage: "1d6", type: "perforant", props: "Munitions (24/96 m), deux mains", mastery: "Vexation" },
  { id: "sling", name: "Fronde", category: "simple", ranged: true, damage: "1d4", type: "contondant", props: "Munitions (9/36 m)", mastery: "Ralentissement" },
  { id: "battleaxe", name: "Hache d'armes", category: "martial", ranged: false, damage: "1d8", type: "tranchant", props: "Polyvalente (1d10)", mastery: "Renversement" },
  { id: "flail", name: "Fléau d'armes", category: "martial", ranged: false, damage: "1d8", type: "contondant", props: "—", mastery: "Sape" },
  { id: "glaive", name: "Coutille", category: "martial", ranged: false, damage: "1d10", type: "tranchant", props: "Lourde, allonge, deux mains", mastery: "Écorchure" },
  { id: "greataxe", name: "Hache à deux mains", category: "martial", ranged: false, damage: "1d12", type: "tranchant", props: "Lourde, deux mains", mastery: "Coup circulaire" },
  { id: "greatsword", name: "Épée à deux mains", category: "martial", ranged: false, damage: "2d6", type: "tranchant", props: "Lourde, deux mains", mastery: "Écorchure" },
  { id: "halberd", name: "Hallebarde", category: "martial", ranged: false, damage: "1d10", type: "tranchant", props: "Lourde, allonge, deux mains", mastery: "Coup circulaire" },
  { id: "longsword", name: "Épée longue", category: "martial", ranged: false, damage: "1d8", type: "tranchant", props: "Polyvalente (1d10)", mastery: "Sape" },
  { id: "maul", name: "Maillet d'armes", category: "martial", ranged: false, damage: "2d6", type: "contondant", props: "Lourde, deux mains", mastery: "Renversement" },
  { id: "morningstar", name: "Morgenstern", category: "martial", ranged: false, damage: "1d8", type: "perforant", props: "—", mastery: "Sape" },
  { id: "rapier", name: "Rapière", category: "martial", ranged: false, damage: "1d8", type: "perforant", finesse: true, props: "Finesse", mastery: "Vexation" },
  { id: "scimitar", name: "Cimeterre", category: "martial", ranged: false, damage: "1d6", type: "tranchant", finesse: true, props: "Finesse, légère", mastery: "Coup double" },
  { id: "shortsword", name: "Épée courte", category: "martial", ranged: false, damage: "1d6", type: "perforant", finesse: true, props: "Finesse, légère", mastery: "Vexation" },
  { id: "warhammer", name: "Marteau de guerre", category: "martial", ranged: false, damage: "1d8", type: "contondant", props: "Polyvalente (1d10)", mastery: "Poussée" },
  { id: "whip", name: "Fouet", category: "martial", ranged: false, damage: "1d4", type: "tranchant", finesse: true, props: "Finesse, allonge", mastery: "Ralentissement" },
  { id: "hand-crossbow", name: "Arbalète de poing", category: "martial", ranged: true, damage: "1d6", type: "perforant", props: "Munitions (9/36 m), légère, chargement", mastery: "Vexation" },
  { id: "heavy-crossbow", name: "Arbalète lourde", category: "martial", ranged: true, damage: "1d10", type: "perforant", props: "Munitions (30/120 m), lourde, chargement, deux mains", mastery: "Poussée" },
  { id: "longbow", name: "Arc long", category: "martial", ranged: true, damage: "1d8", type: "perforant", props: "Munitions (45/180 m), lourde, deux mains", mastery: "Ralentissement" },
];

export const MASTERY_HELP: Record<string, string> = {
  "Coup circulaire": "Si tu touches, inflige ton modificateur en dégâts à une autre créature à portée.",
  "Coup double": "Avec l'arme légère, l'attaque supplémentaire ne coûte pas d'action bonus.",
  "Écorchure": "Si tu rates, la cible subit quand même ton modificateur en dégâts.",
  "Ouverture": "Si tu touches, la prochaine attaque contre la cible a l'avantage.",
  "Poussée": "Si tu touches, repousse la cible de 3 m.",
  "Ralentissement": "Si tu touches, la cible perd 3 m de vitesse.",
  "Renversement": "Si tu touches, la cible fait une sauvegarde de CON ou tombe à terre.",
  "Sape": "Si tu touches, la cible a un désavantage à sa prochaine sauvegarde.",
  "Vexation": "Si tu touches, tu as l'avantage à ta prochaine attaque contre elle.",
};
