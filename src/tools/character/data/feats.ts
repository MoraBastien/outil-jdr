// Dons D&D 5.5 (2024) : dons d'origine (niveau 1) et une sélection de dons généraux (niveau 4).
import type { Ability } from "../types";

export type Feat = {
  id: string;
  name: string;
  kind: "origin" | "general";
  desc: string;
  /** Don qui augmente une caractéristique de 1, au choix parmi celles-ci. */
  abilities?: Ability[];
  /** Don qui demande de choisir 3 compétences (Doué). */
  skills?: number;
};

export const FEATS: Feat[] = [
  // Dons d'origine
  { id: "alert", name: "Vigilant", kind: "origin", desc: "Ajoute ton bonus de maîtrise à l'initiative, et tu peux échanger ton initiative avec un allié." },
  { id: "crafter", name: "Artisan", kind: "origin", desc: "Maîtrise de 3 outils d'artisan, 20 % de réduction en achetant, fabrication rapide." },
  { id: "healer", name: "Guérisseur", kind: "origin", desc: "Avec une trousse de soins, soigne une créature en action (relance les 1 sur les dés de soin)." },
  { id: "lucky", name: "Chanceux", kind: "origin", desc: "Points de chance (= bonus de maîtrise) : avantage sur un de tes jets, ou désavantage à une attaque contre toi." },
  { id: "magic-initiate-cleric", name: "Initié à la magie (clerc)", kind: "origin", desc: "2 sorts mineurs et 1 sort de niveau 1 de clerc (lancé gratuitement une fois par repos long). Sagesse." },
  { id: "magic-initiate-druid", name: "Initié à la magie (druide)", kind: "origin", desc: "2 sorts mineurs et 1 sort de niveau 1 de druide (lancé gratuitement une fois par repos long). Sagesse." },
  { id: "magic-initiate-wizard", name: "Initié à la magie (magicien)", kind: "origin", desc: "2 sorts mineurs et 1 sort de niveau 1 de magicien (lancé gratuitement une fois par repos long). Intelligence." },
  { id: "musician", name: "Musicien", kind: "origin", desc: "Maîtrise de 3 instruments ; après un repos, donne l'Inspiration héroïque à des alliés." },
  { id: "savage-attacker", name: "Attaquant sauvage", kind: "origin", desc: "Une fois par tour, lance deux fois les dégâts d'une arme et garde le meilleur." },
  { id: "skilled", name: "Doué", kind: "origin", desc: "Maîtrise de 3 compétences (ou outils) au choix.", skills: 3 },
  { id: "tavern-brawler", name: "Bagarreur de taverne", kind: "origin", desc: "Frappes à mains nues à 1d4 + FOR, relance les 1, et tu peux repousser la cible." },
  { id: "tough", name: "Robuste", kind: "origin", desc: "+2 PV max par niveau (déjà compté)." },

  // Dons généraux (niveau 4 et plus)
  { id: "actor", name: "Acteur", kind: "general", desc: "Avantage pour te faire passer pour quelqu'un, imitation de voix.", abilities: ["cha"] },
  { id: "athlete", name: "Athlète", kind: "general", desc: "Vitesse d'escalade, te relever ne coûte que 1,5 m, sauts améliorés.", abilities: ["str", "dex"] },
  { id: "charger", name: "Chargeur", kind: "general", desc: "Après avoir foncé, +1d8 dégâts ou repousse la cible.", abilities: ["str", "dex"] },
  { id: "crossbow-expert", name: "Expert en arbalète", kind: "general", desc: "Pas de désavantage au contact, recharge ignorée, dégâts en plus avec l'arme légère.", abilities: ["dex"] },
  { id: "defensive-duelist", name: "Duelliste défensif", kind: "general", desc: "Réaction : ajoute ton bonus de maîtrise à ta CA avec une arme finesse.", abilities: ["dex"] },
  { id: "dual-wielder", name: "Combattant à deux armes", kind: "general", desc: "Attaque supplémentaire avec des armes non légères, dégainer deux armes.", abilities: ["str", "dex"] },
  { id: "durable", name: "Endurant", kind: "general", desc: "Avantage aux jets contre la mort, dé de vie en action bonus.", abilities: ["con"] },
  { id: "fey-touched", name: "Touché par les fées", kind: "general", desc: "Foulée brumeuse et un sort de divination ou d'enchantement de niveau 1.", abilities: ["int", "wis", "cha"] },
  { id: "great-weapon-master", name: "Maître d'armes lourdes", kind: "general", desc: "Ajoute ton bonus de maîtrise aux dégâts des armes lourdes ; attaque bonus après un critique ou un ennemi abattu.", abilities: ["str"] },
  { id: "heavily-armored", name: "Armure lourde", kind: "general", desc: "Maîtrise des armures lourdes.", abilities: ["str", "con"] },
  { id: "inspiring-leader", name: "Meneur inspirant", kind: "general", desc: "Après un repos, des PV temporaires pour tes alliés (niveau + modificateur).", abilities: ["wis", "cha"] },
  { id: "keen-mind", name: "Esprit vif", kind: "general", desc: "Une compétence de savoir (expertise si déjà maîtrisée), Étudier en action bonus.", abilities: ["int"] },
  { id: "mage-slayer", name: "Tueur de mages", kind: "general", desc: "Les lanceurs de sorts que tu frappes ont un désavantage en concentration.", abilities: ["str", "dex"] },
  { id: "moderately-armored", name: "Armure intermédiaire", kind: "general", desc: "Maîtrise des armures intermédiaires et des boucliers.", abilities: ["str", "dex"] },
  { id: "observant", name: "Observateur", kind: "general", desc: "Une compétence (Intuition, Investigation ou Perception), Fouiller en action bonus.", abilities: ["int", "wis"] },
  { id: "polearm-master", name: "Maître d'armes d'hast", kind: "general", desc: "Attaque bonus avec le manche, attaque d'opportunité quand on entre dans ton allonge.", abilities: ["str", "dex"] },
  { id: "resilient", name: "Résilient", kind: "general", desc: "Maîtrise des sauvegardes de la caractéristique choisie.", abilities: ["str", "dex", "con", "int", "wis", "cha"] },
  { id: "ritual-caster", name: "Ritualiste", kind: "general", desc: "Des sorts rituels de niveau 1, lancés sans les préparer.", abilities: ["int", "wis", "cha"] },
  { id: "sentinel", name: "Sentinelle", kind: "general", desc: "Tes attaques d'opportunité arrêtent les ennemis ; réagis quand un allié est attaqué.", abilities: ["str", "dex"] },
  { id: "shadow-touched", name: "Touché par l'ombre", kind: "general", desc: "Invisibilité et un sort d'illusion ou de nécromancie de niveau 1.", abilities: ["int", "wis", "cha"] },
  { id: "sharpshooter", name: "Tireur d'élite", kind: "general", desc: "Ignore les abris partiels, pas de désavantage à longue portée ni au contact.", abilities: ["dex"] },
  { id: "shield-master", name: "Maître du bouclier", kind: "general", desc: "Frappe au bouclier pour repousser, ajoute le bouclier à tes sauvegardes de DEX.", abilities: ["str"] },
  { id: "skill-expert", name: "Expert", kind: "general", desc: "Une compétence de plus et une expertise.", abilities: ["str", "dex", "con", "int", "wis", "cha"] },
  { id: "speedy", name: "Rapide", kind: "general", desc: "+3 m de vitesse, Foncer ignore le terrain difficile.", abilities: ["dex", "con"] },
  { id: "spell-sniper", name: "Tireur de sorts", kind: "general", desc: "Portée des sorts d'attaque augmentée, ignore les abris partiels.", abilities: ["int", "wis", "cha"] },
  { id: "telekinetic", name: "Télékinésiste", kind: "general", desc: "Main de mage invisible ; pousse une créature en action bonus.", abilities: ["int", "wis", "cha"] },
  { id: "telepathic", name: "Télépathe", kind: "general", desc: "Télépathie à 18 m et Détection des pensées une fois par jour.", abilities: ["int", "wis", "cha"] },
  { id: "war-caster", name: "Mage de guerre", kind: "general", desc: "Avantage en concentration, sort en attaque d'opportunité.", abilities: ["int", "wis", "cha"] },
  { id: "weapon-master", name: "Maître d'armes", kind: "general", desc: "Une botte d'arme de plus.", abilities: ["str", "dex"] },
];

export const getFeat = (id: string) => FEATS.find((f) => f.id === id);
export const ORIGIN_FEATS = FEATS.filter((f) => f.kind === "origin");
/** Au niveau 4, on peut prendre un don d'origine ou un don général. */
export const LEVEL4_FEATS = FEATS;
