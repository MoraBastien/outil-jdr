// Classes D&D 5.5 (Manuel des joueurs 2024), niveaux 1 à 4.
// Résumés en français, à vérifier / compléter par le MJ : chaque capacité est une simple entrée de tableau.
import type { Ability, Feature, Option, SkillId } from "../types";

export type Caster = {
  ability: Ability;
  /** full = lanceur complet, half = demi-lanceur, pact = magie de pacte (occultiste), third = tiers de lanceur (sous-classe). */
  kind: "full" | "half" | "pact" | "third";
  /** Sorts mineurs connus par niveau (index 0 = niveau 1). */
  cantrips: number[];
  /** Sorts préparés par niveau. */
  prepared: number[];
};

export type Resource = { name: string; values: (number | string)[]; help: string };

export type Subclass = { id: string; name: string; desc: string; features: Feature[]; caster?: Caster };

export type ClassDef = {
  id: string;
  name: string;
  /** Une phrase pour se faire une idée. */
  pitch: string;
  hitDie: number;
  primary: Ability[];
  saves: Ability[];
  skillCount: number;
  skillList: SkillId[] | "any";
  armor: ("light" | "medium" | "heavy" | "shield")[];
  weapons: string;
  tools?: string;
  unarmored?: "barbarian" | "monk";
  equipment: string;
  caster?: Caster;
  resources: Resource[];
  levels: Record<1 | 2 | 3 | 4, Feature[]>;
  subclasses: Subclass[];
};

export const FIGHTING_STYLES: Option[] = [
  { id: "archery", name: "Archerie", desc: "+2 aux jets d'attaque avec les armes à distance." },
  { id: "defense", name: "Défense", desc: "+1 à la CA quand tu portes une armure légère, intermédiaire ou lourde." },
  { id: "dueling", name: "Duel", desc: "+2 aux dégâts quand tu manies une arme de corps à corps à une main et aucune autre arme." },
  { id: "gwf", name: "Armes à deux mains", desc: "Avec une arme à deux mains ou polyvalente, les 1 et 2 des dés de dégâts comptent comme des 3." },
  { id: "twf", name: "Combat à deux armes", desc: "Tu ajoutes ton modificateur aux dégâts de l'attaque supplémentaire de l'arme légère." },
  { id: "protection", name: "Protection", desc: "Avec un bouclier, ta réaction impose un désavantage à une attaque contre un allié proche." },
  { id: "interception", name: "Interception", desc: "Ta réaction réduit de 1d10 + bonus de maîtrise les dégâts subis par un allié proche." },
  { id: "blind", name: "Combat en aveugle", desc: "Vision aveugle sur 3 m." },
  { id: "thrown", name: "Armes de lancer", desc: "+2 aux dégâts avec une arme de lancer, et tu la dégaines en lançant." },
  { id: "unarmed", name: "Combat à mains nues", desc: "Tes frappes à mains nues infligent 1d6 (1d8 à mains vides) + FOR." },
];

const asi: Feature = {
  name: "Amélioration de caractéristiques",
  desc: "Augmente une caractéristique de 2, ou deux caractéristiques de 1 (maximum 20). Tu peux aussi choisir un don à la place.",
  tip: "Augmenter ta caractéristique principale jusqu'à un nombre pair améliore ton modificateur : c'est souvent le meilleur choix.",
  choice: { kind: "asi", key: "asi", label: "Amélioration ou don" },
};
const subclass = (label: string, desc: string): Feature => ({
  name: label,
  desc,
  tip: "Ta sous-classe définit ton style pour le reste de la campagne : lis les descriptions, demande à ton MJ si tu hésites.",
  choice: { kind: "subclass", key: "subclass", label },
});
const mastery = (n: number): Feature => ({
  name: "Maîtrise des armes",
  desc: `Tu peux utiliser la propriété de maîtrise de ${n} types d'armes (Coup de bouclier, Ouverture, Ralentissement…). Tu peux en changer après un repos long.`,
  tip: "Note tes armes maîtrisées dans l'onglet Équipement. La propriété de maîtrise est indiquée dans la liste des armes.",
});

export const CLASSES: ClassDef[] = [
  {
    id: "barbarian",
    name: "Barbare",
    pitch: "Un guerrier sauvage qui puise sa force dans la rage. Très résistant, simple à jouer.",
    hitDie: 12,
    primary: ["str"],
    saves: ["str", "con"],
    skillCount: 2,
    skillList: ["animal", "athletics", "intimidation", "nature", "perception", "survival"],
    armor: ["light", "medium", "shield"],
    weapons: "Armes courantes et de guerre",
    unarmored: "barbarian",
    equipment: "Hache à deux mains, 4 hachettes, sac d'explorateur, 15 po (ou 75 po).",
    resources: [
      { name: "Rages", values: [2, 2, 3, 3], help: "Nombre de rages par repos long (tu en récupères une après un repos court)." },
      { name: "Dégâts de rage", values: ["+2", "+2", "+2", "+2"], help: "Bonus aux dégâts des attaques de Force pendant la rage." },
    ],
    levels: {
      1: [
        {
          name: "Rage",
          desc: "Action bonus : pendant 10 minutes, résistance aux dégâts contondants, perforants et tranchants, bonus aux dégâts de Force et avantage aux tests et sauvegardes de Force. Pas de sorts.",
          tip: "Entre en rage dès le premier tour d'un combat difficile : elle se prolonge si tu attaques ou forces quelqu'un à faire une sauvegarde.",
        },
        { name: "Défense sans armure", desc: "Sans armure, ta CA est égale à 10 + DEX + CON. Tu peux tenir un bouclier." },
        mastery(2),
      ],
      2: [
        { name: "Sens du danger", desc: "Avantage aux sauvegardes de Dextérité (tant que tu n'es pas neutralisé)." },
        { name: "Attaque téméraire", desc: "Avantage à tes attaques de Force ce tour-ci, mais les attaques contre toi ont l'avantage jusqu'à ton prochain tour." },
      ],
      3: [
        subclass("Voie primitive", "Choisis la voie qui guide ta rage."),
        {
          name: "Savoir primitif",
          desc: "Une compétence de plus parmi celles du barbare. En rage, tu peux utiliser la Force pour certains tests (Acrobaties, Discrétion, Intimidation, Perception, Survie).",
          choice: { kind: "skills", key: "primal-knowledge", label: "Compétence de barbare", count: 1, from: ["animal", "athletics", "intimidation", "nature", "perception", "survival"] },
        },
      ],
      4: [asi, { name: "Maîtrise des armes (3)", desc: "Tu maîtrises désormais 3 types d'armes." }],
    },
    subclasses: [
      { id: "berserker", name: "Voie du berserker", desc: "La fureur à l'état pur.", features: [{ name: "Frénésie", desc: "En rage, avec une attaque téméraire, la première cible touchée subit des dégâts en plus (d6 × dégâts de rage)." }] },
      { id: "wild-heart", name: "Voie du cœur sauvage", desc: "Lié aux esprits animaux.", features: [{ name: "Parler aux animaux", desc: "Tu lances Communication avec les animaux et Sens animal en rituel." }, { name: "Rage sauvage", desc: "En rage, choisis un aspect : Ours (résistances), Aigle (Foncer en action bonus), Loup (alliés avantagés)." }] },
      { id: "world-tree", name: "Voie de l'arbre-monde", desc: "Puise dans les racines du monde.", features: [{ name: "Vitalité de l'arbre", desc: "En entrant en rage, tu gagnes des PV temporaires ; chaque tour, tu peux en donner à un allié proche." }] },
      { id: "zealot", name: "Voie du zélateur", desc: "Une rage nourrie par la foi.", features: [{ name: "Fureur divine", desc: "En rage, ta première attaque réussie du tour inflige 1d6 + moitié de ton niveau en dégâts nécrotiques ou radiants." }, { name: "Guerrier des dieux", desc: "Une réserve de d12 à dépenser en action bonus pour te soigner." }] },
    ],
  },
  {
    id: "bard",
    name: "Barde",
    pitch: "Un artiste dont la musique est magique : soutien, charme et polyvalence.",
    hitDie: 8,
    primary: ["cha"],
    saves: ["dex", "cha"],
    skillCount: 3,
    skillList: "any",
    armor: ["light"],
    weapons: "Armes courantes",
    tools: "3 instruments de musique",
    equipment: "Armure de cuir, 2 dagues, instrument de musique, sac d'artiste, 19 po (ou 90 po).",
    caster: { ability: "cha", kind: "full", cantrips: [2, 2, 2, 3], prepared: [4, 5, 6, 7] },
    resources: [
      { name: "Inspiration bardique", values: ["d6", "d6", "d6", "d6"], help: "Utilisations = ton modificateur de Charisme (minimum 1), récupérées après un repos long." },
    ],
    levels: {
      1: [
        {
          name: "Inspiration bardique",
          desc: "Action bonus : un allié à 18 m reçoit un dé d'inspiration (d6) qu'il peut ajouter à un jet raté dans l'heure.",
          tip: "Donne-la avant un moment clé (combat, négociation) : l'allié l'ajoute après avoir vu son jet, donc elle est rarement gaspillée.",
        },
        { name: "Incantation", desc: "Tu lances des sorts de barde avec le Charisme. Tu changes un sort préparé à chaque niveau gagné." },
      ],
      2: [
        {
          name: "Expertise",
          desc: "Double ton bonus de maîtrise pour deux compétences que tu maîtrises.",
          choice: { kind: "expertise", key: "bard-expertise", label: "2 compétences d'expertise", count: 2 },
        },
        { name: "Touche-à-tout", desc: "Ajoute la moitié de ton bonus de maîtrise aux tests de compétence que tu ne maîtrises pas." },
      ],
      3: [subclass("Collège de barde", "Choisis ton collège.")],
      4: [asi],
    },
    subclasses: [
      { id: "dance", name: "Collège de la danse", desc: "Agile et gracieux au combat.", features: [{ name: "Jeu de jambes éblouissant", desc: "Sans armure ni bouclier : CA = 10 + DEX + CHA, et tes frappes à mains nues utilisent ton dé d'inspiration." }] },
      { id: "glamour", name: "Collège du charme", desc: "Une magie féerique qui captive.", features: [{ name: "Manteau d'inspiration", desc: "Dépense une inspiration : des alliés gagnent des PV temporaires et peuvent se déplacer." }, { name: "Magie enchanteresse", desc: "Charme-personne et Image miroir toujours préparés." }] },
      { id: "lore", name: "Collège du savoir", desc: "Le savant curieux de tout.", features: [{ name: "Compétences en bonus", desc: "Trois compétences de plus." }, { name: "Mots cinglants", desc: "Réaction : soustrais ton dé d'inspiration au jet d'un ennemi." }] },
      { id: "valor", name: "Collège de la vaillance", desc: "Le barde guerrier.", features: [{ name: "Inspiration martiale", desc: "Ton inspiration peut aussi augmenter des dégâts ou la CA d'un allié." }, { name: "Entraînement martial", desc: "Armes de guerre, armures intermédiaires et boucliers." }] },
    ],
  },
  {
    id: "cleric",
    name: "Clerc",
    pitch: "Le serviteur d'une divinité : soins, protection et magie sacrée.",
    hitDie: 8,
    primary: ["wis"],
    saves: ["wis", "cha"],
    skillCount: 2,
    skillList: ["history", "insight", "medicine", "persuasion", "religion"],
    armor: ["light", "medium", "shield"],
    weapons: "Armes courantes",
    equipment: "Chemise de mailles, bouclier, masse d'armes, symbole sacré, sac d'ecclésiastique, 7 po (ou 110 po).",
    caster: { ability: "wis", kind: "full", cantrips: [3, 3, 3, 4], prepared: [4, 5, 6, 7] },
    resources: [{ name: "Conduit divin", values: ["—", 2, 2, 2], help: "Utilisations par repos long (une récupérée après un repos court)." }],
    levels: {
      1: [
        { name: "Incantation", desc: "Tu lances des sorts de clerc avec la Sagesse. Tu peux changer tes sorts préparés après chaque repos long." },
        {
          name: "Ordre divin",
          desc: "Choisis ton rôle sacré.",
          choice: {
            kind: "options",
            key: "divine-order",
            label: "Ordre divin",
            count: 1,
            options: [
              { id: "protector", name: "Protecteur", desc: "Armes de guerre et armures lourdes." },
              { id: "thaumaturge", name: "Thaumaturge", desc: "Un sort mineur de plus, et ton modificateur de Sagesse s'ajoute aux tests d'Arcanes et de Religion." },
            ],
          },
        },
      ],
      2: [{ name: "Conduit divin", desc: "Étincelle divine (soigne ou blesse 1d8 + SAG) ou Renvoi des morts-vivants (ils fuient). 2 utilisations." }],
      3: [subclass("Domaine divin", "Choisis le domaine de ta divinité.")],
      4: [asi],
    },
    subclasses: [
      { id: "life", name: "Domaine de la vie", desc: "Le soigneur par excellence.", features: [{ name: "Disciple de la vie", desc: "Tes sorts de soin rendent 2 + niveau du sort PV de plus." }, { name: "Préserver la vie", desc: "Conduit divin : répartis 5 × ton niveau de PV entre des alliés blessés." }] },
      { id: "light", name: "Domaine de la lumière", desc: "Feu et lumière contre les ténèbres.", features: [{ name: "Flamboiement protecteur", desc: "Réaction : impose un désavantage à un attaquant qui te voit." }, { name: "Radiance de l'aube", desc: "Conduit divin : dissipe les ténèbres et inflige des dégâts radiants autour de toi." }] },
      { id: "trickery", name: "Domaine de la ruse", desc: "Illusions et malice divines.", features: [{ name: "Bénédiction de l'escroc", desc: "Donne l'avantage en Discrétion à un allié." }, { name: "Invoquer un double", desc: "Conduit divin : crée une illusion de toi d'où tu peux lancer tes sorts." }] },
      { id: "war", name: "Domaine de la guerre", desc: "Le prêtre combattant.", features: [{ name: "Prêtre de guerre", desc: "Attaque supplémentaire en action bonus, quelques fois par repos." }, { name: "Frappe guidée", desc: "Conduit divin : +10 à un jet d'attaque." }] },
    ],
  },
  {
    id: "druid",
    name: "Druide",
    pitch: "Le gardien de la nature, qui prend la forme d'animaux.",
    hitDie: 8,
    primary: ["wis"],
    saves: ["int", "wis"],
    skillCount: 2,
    skillList: ["arcana", "animal", "insight", "medicine", "nature", "perception", "religion", "survival"],
    armor: ["light", "shield"],
    weapons: "Armes courantes",
    tools: "Matériel d'herboriste",
    equipment: "Armure de cuir, bouclier, faucille, focaliseur druidique, sac d'explorateur, matériel d'herboriste, 9 po (ou 50 po).",
    caster: { ability: "wis", kind: "full", cantrips: [2, 2, 2, 3], prepared: [4, 5, 6, 7] },
    resources: [{ name: "Forme sauvage", values: ["—", 2, 2, 2], help: "Utilisations par repos long (une récupérée après un repos court)." }],
    levels: {
      1: [
        { name: "Incantation", desc: "Tu lances des sorts de druide avec la Sagesse." },
        { name: "Druidique", desc: "Tu connais la langue secrète des druides. Communication avec les animaux est toujours préparé." },
        {
          name: "Ordre primitif",
          desc: "Choisis ton rôle.",
          choice: {
            kind: "options",
            key: "primal-order",
            label: "Ordre primitif",
            count: 1,
            options: [
              { id: "magician", name: "Magicien", desc: "Un sort mineur de plus, et ton modificateur de Sagesse s'ajoute aux tests d'Arcanes et de Nature." },
              { id: "warden", name: "Gardien", desc: "Armes de guerre et armures intermédiaires." },
            ],
          },
        },
      ],
      2: [
        { name: "Forme sauvage", desc: "Action bonus : prends la forme d'une bête connue (FP 1/4, pas de vol) pour quelques heures. Tu gagnes des PV temporaires égaux à ton niveau." },
        { name: "Compagnon sauvage", desc: "Dépense une forme sauvage (ou un emplacement) pour lancer Appel de familier sans composantes." },
      ],
      3: [subclass("Cercle druidique", "Choisis ton cercle.")],
      4: [asi, { name: "Forme sauvage améliorée", desc: "Tu connais plus de formes (FP 1/2, nage possible)." }],
    },
    subclasses: [
      { id: "land", name: "Cercle de la terre", desc: "Magie liée à un territoire.", features: [{ name: "Sorts du cercle", desc: "Des sorts toujours préparés selon ton terrain (aride, polaire, tempéré, tropical)." }, { name: "Récupération naturelle", desc: "Récupère des emplacements de sort pendant un repos court." }] },
      { id: "moon", name: "Cercle de la lune", desc: "Le maître des formes animales.", features: [{ name: "Formes du cercle", desc: "Formes de FP plus élevé, et ta CA en forme sauvage vaut au moins 13 + SAG." }] },
      { id: "sea", name: "Cercle de la mer", desc: "La fureur des tempêtes et des marées.", features: [{ name: "Colère de la mer", desc: "Dépense une forme sauvage : une aura d'embruns qui inflige du froid et repousse." }] },
      { id: "stars", name: "Cercle des étoiles", desc: "Lire le ciel et les constellations.", features: [{ name: "Carte stellaire", desc: "Guidance et Rayon traçant toujours préparés." }, { name: "Forme étoilée", desc: "Dépense une forme sauvage : prends une forme lumineuse (Archer, Calice ou Dragon)." }] },
    ],
  },
  {
    id: "fighter",
    name: "Guerrier",
    pitch: "Le spécialiste du combat sous toutes ses formes. Solide et polyvalent.",
    hitDie: 10,
    primary: ["str", "dex"],
    saves: ["str", "con"],
    skillCount: 2,
    skillList: ["acrobatics", "animal", "athletics", "history", "insight", "intimidation", "persuasion", "perception", "survival"],
    armor: ["light", "medium", "heavy", "shield"],
    weapons: "Armes courantes et de guerre",
    equipment: "Cotte de mailles, épée à deux mains, fléau d'armes, 8 javelines, sac d'exploration souterraine, 4 po (ou 155 po).",
    resources: [
      { name: "Second souffle", values: [2, 2, 2, 3], help: "Utilisations par repos long (une récupérée après un repos court)." },
      { name: "Fougue", values: ["—", 1, 1, 1], help: "Une action supplémentaire, une fois par repos." },
    ],
    levels: {
      1: [
        {
          name: "Style de combat",
          desc: "Une spécialité de combat (c'est un don).",
          choice: { kind: "options", key: "fighting-style", label: "Style de combat", count: 1, options: FIGHTING_STYLES },
        },
        { name: "Second souffle", desc: "Action bonus : récupère 1d10 + ton niveau de guerrier en PV.", tip: "Garde-le pour quand tu passes sous la moitié de tes PV." },
        mastery(3),
      ],
      2: [
        { name: "Fougue", desc: "Une fois par repos : une action de plus pendant ton tour.", tip: "Idéal au premier tour d'un combat important pour frapper deux fois plus." },
        { name: "Esprit tactique", desc: "Après un test raté, dépense un second souffle pour ajouter 1d10 au résultat." },
      ],
      3: [subclass("Archétype martial", "Choisis ton archétype.")],
      4: [asi, { name: "Maîtrise des armes (4)", desc: "Tu maîtrises désormais 4 types d'armes." }],
    },
    subclasses: [
      { id: "battle-master", name: "Maître de guerre", desc: "Le tacticien aux manœuvres.", features: [{ name: "Supériorité au combat", desc: "4 dés de supériorité (d8) et 3 manœuvres (Désarmer, Feinte, Riposte…)." }, { name: "Élève de la guerre", desc: "Un outil d'artisan et une compétence de guerrier en plus." }] },
      { id: "champion", name: "Champion", desc: "La perfection physique, simple et efficace.", features: [{ name: "Critique amélioré", desc: "Tes attaques font un critique sur 19 ou 20." }, { name: "Athlète remarquable", desc: "Avantage à l'initiative et aux tests d'Athlétisme." }] },
      { id: "eldritch-knight", name: "Chevalier occulte", desc: "Le guerrier magicien.", caster: { ability: "int", kind: "third", cantrips: [0, 0, 2, 2], prepared: [0, 0, 3, 4] }, features: [{ name: "Incantation", desc: "Sorts de magicien avec l'Intelligence (2 sorts mineurs, 3 sorts de niveau 1)." }, { name: "Arme liée", desc: "Lie une arme : tu ne peux pas être désarmé et tu la rappelles en action bonus." }] },
      { id: "psi-warrior", name: "Guerrier psi", desc: "Le combattant télékinésiste.", features: [{ name: "Pouvoir psionique", desc: "Des dés d'énergie psionique (d6) : coup psionique, champ protecteur, mouvement télékinétique." }] },
    ],
  },
  {
    id: "monk",
    name: "Moine",
    pitch: "Un artiste martial rapide qui frappe à mains nues et canalise son énergie.",
    hitDie: 8,
    primary: ["dex", "wis"],
    saves: ["str", "dex"],
    skillCount: 2,
    skillList: ["acrobatics", "athletics", "history", "insight", "religion", "stealth"],
    armor: [],
    weapons: "Armes courantes et armes de guerre légères",
    tools: "Un outil d'artisan ou un instrument",
    unarmored: "monk",
    equipment: "Lance, 5 dagues, outil ou instrument, sac d'exploration souterraine, 11 po (ou 50 po).",
    resources: [
      { name: "Arts martiaux", values: ["d6", "d6", "d6", "d6"], help: "Dé de dégâts de tes frappes à mains nues et armes de moine." },
      { name: "Points de focalisation", values: ["—", 2, 3, 4], help: "Récupérés après un repos court ou long." },
      { name: "Déplacement sans armure", values: ["—", "+3 m", "+3 m", "+3 m"], help: "Bonus de vitesse sans armure ni bouclier." },
    ],
    levels: {
      1: [
        { name: "Arts martiaux", desc: "Frappes à mains nues et armes de moine avec la DEX, dégâts d6, et une frappe à mains nues en action bonus.", tip: "Attaque avec ton action, puis frappe à mains nues en action bonus chaque tour." },
        { name: "Défense sans armure", desc: "Sans armure ni bouclier, ta CA est égale à 10 + DEX + SAG." },
      ],
      2: [
        { name: "Focalisation du moine", desc: "Points de focalisation : Déluge de coups (2 frappes en action bonus), Défense patiente (Esquiver), Pas du vent (Foncer/Se désengager, saut doublé)." },
        { name: "Déplacement sans armure", desc: "+3 m de vitesse sans armure ni bouclier." },
        { name: "Métabolisme étrange", desc: "À l'initiative, une fois par repos long : récupère tes points de focalisation et des PV." },
      ],
      3: [
        subclass("Tradition monastique", "Choisis ta tradition."),
        { name: "Parade d'attaques", desc: "Réaction : réduis les dégâts d'une attaque de 1d10 + DEX + niveau ; à 0, tu peux renvoyer le coup avec 1 point." },
      ],
      4: [asi, { name: "Chute ralentie", desc: "Réaction : réduis les dégâts de chute de 5 × ton niveau." }],
    },
    subclasses: [
      { id: "mercy", name: "Guerrier de la miséricorde", desc: "Soigner et blesser d'un même geste.", features: [{ name: "Main de guérison / de malheur", desc: "Dépense un point : soigne un allié ou ajoute des dégâts nécrotiques." }] },
      { id: "shadow", name: "Guerrier de l'ombre", desc: "Ninja des ténèbres.", features: [{ name: "Arts de l'ombre", desc: "Dépense un point pour lancer Ténèbres et voir au travers." }] },
      { id: "elements", name: "Guerrier des éléments", desc: "Maîtrise des éléments.", features: [{ name: "Harmonisation élémentaire", desc: "Dépense un point : allonge ton allonge et inflige des dégâts élémentaires." }] },
      { id: "open-hand", name: "Guerrier de la paume", desc: "Maître du combat à mains nues.", features: [{ name: "Technique de la paume", desc: "Ton Déluge de coups peut renverser, repousser ou priver de réaction." }] },
    ],
  },
  {
    id: "paladin",
    name: "Paladin",
    pitch: "Un chevalier sacré lié par un serment : combat, soins et châtiments.",
    hitDie: 10,
    primary: ["str", "cha"],
    saves: ["wis", "cha"],
    skillCount: 2,
    skillList: ["athletics", "insight", "intimidation", "medicine", "persuasion", "religion"],
    armor: ["light", "medium", "heavy", "shield"],
    weapons: "Armes courantes et de guerre",
    equipment: "Cotte de mailles, bouclier, épée longue, 6 javelines, symbole sacré, sac d'ecclésiastique, 9 po (ou 150 po).",
    caster: { ability: "cha", kind: "half", cantrips: [0, 0, 0, 0], prepared: [2, 3, 4, 5] },
    resources: [
      { name: "Imposition des mains", values: [5, 10, 15, 20], help: "Réserve de PV de soin, rechargée après un repos long." },
      { name: "Conduit divin", values: ["—", "—", 2, 2], help: "Utilisations par repos long (une récupérée après un repos court)." },
    ],
    levels: {
      1: [
        { name: "Imposition des mains", desc: "Action bonus : touche une créature et rends-lui des PV puisés dans ta réserve (5 × niveau), ou guéris-la d'un poison pour 5 points." },
        { name: "Incantation", desc: "Tu lances des sorts de paladin avec le Charisme." },
        mastery(2),
      ],
      2: [
        {
          name: "Style de combat",
          desc: "Une spécialité de combat (c'est un don).",
          choice: { kind: "options", key: "fighting-style", label: "Style de combat", count: 1, options: FIGHTING_STYLES },
        },
        { name: "Châtiment du paladin", desc: "Châtiment divin est toujours préparé : une fois par repos long, sans emplacement.", tip: "Garde tes châtiments pour les coups critiques : les dés de dégâts du sort sont doublés aussi." },
      ],
      3: [
        { name: "Conduit divin", desc: "Sens divin : détecte célestes, fiélons et morts-vivants à 18 m. 2 utilisations." },
        subclass("Serment sacré", "Choisis ton serment."),
      ],
      4: [asi],
    },
    subclasses: [
      { id: "devotion", name: "Serment de dévotion", desc: "Le chevalier idéal.", features: [{ name: "Arme sacrée", desc: "Conduit divin : ton arme ajoute ton CHA aux attaques et éclaire." }] },
      { id: "glory", name: "Serment de gloire", desc: "Le héros des légendes.", features: [{ name: "Athlète hors pair", desc: "Conduit divin : avantage en Athlétisme et Acrobaties, sauts plus longs." }, { name: "Châtiment inspirant", desc: "Après un châtiment, répartis des PV temporaires." }] },
      { id: "ancients", name: "Serment des anciens", desc: "Protéger la lumière et la vie.", features: [{ name: "Courroux de la nature", desc: "Conduit divin : des lianes entravent les ennemis proches." }] },
      { id: "vengeance", name: "Serment de vengeance", desc: "Punir les grands malfaisants.", features: [{ name: "Vœu d'hostilité", desc: "Conduit divin : avantage contre une créature pendant 1 minute." }] },
    ],
  },
  {
    id: "ranger",
    name: "Rôdeur",
    pitch: "Un chasseur des terres sauvages, mêlant armes et magie de la nature.",
    hitDie: 10,
    primary: ["dex", "wis"],
    saves: ["str", "dex"],
    skillCount: 3,
    skillList: ["animal", "athletics", "insight", "investigation", "nature", "perception", "stealth", "survival"],
    armor: ["light", "medium", "shield"],
    weapons: "Armes courantes et de guerre",
    equipment: "Armure de cuir clouté, cimeterre, épée courte, arc long et 20 flèches, focaliseur druidique, sac d'explorateur, 7 po (ou 150 po).",
    caster: { ability: "wis", kind: "half", cantrips: [0, 0, 0, 0], prepared: [2, 3, 4, 5] },
    resources: [{ name: "Ennemi juré", values: [2, 2, 2, 2], help: "Marque du chasseur sans emplacement, par repos long." }],
    levels: {
      1: [
        { name: "Incantation", desc: "Tu lances des sorts de rôdeur avec la Sagesse." },
        { name: "Ennemi juré", desc: "Marque du chasseur est toujours préparé ; tu le lances 2 fois sans emplacement par repos long.", tip: "Lance Marque du chasseur au début du combat : +1d6 dégâts à chaque attaque contre la cible." },
        mastery(2),
      ],
      2: [
        {
          name: "Explorateur habile",
          desc: "Expertise dans une compétence que tu maîtrises, et deux langues de plus.",
          choice: { kind: "expertise", key: "ranger-expertise", label: "1 compétence d'expertise", count: 1 },
        },
        {
          name: "Style de combat",
          desc: "Une spécialité de combat (c'est un don).",
          choice: { kind: "options", key: "fighting-style", label: "Style de combat", count: 1, options: FIGHTING_STYLES },
        },
      ],
      3: [subclass("Archétype de rôdeur", "Choisis ton archétype.")],
      4: [asi],
    },
    subclasses: [
      { id: "beast-master", name: "Maître des bêtes", desc: "Accompagné d'une bête primitive.", features: [{ name: "Compagnon primitif", desc: "Une bête (terre, mer ou ciel) qui agit à ton commandement." }] },
      { id: "fey-wanderer", name: "Vagabond féerique", desc: "Touché par la magie des fées.", features: [{ name: "Frappes terribles", desc: "+1d4 dégâts psychiques une fois par tour." }, { name: "Charme d'outre-monde", desc: "Ajoute ta SAG aux tests de Charisme." }] },
      { id: "gloom-stalker", name: "Traqueur des ténèbres", desc: "Chasseur des ombres.", features: [{ name: "Embuscade terrifiante", desc: "+SAG à l'initiative, et une attaque surprise en plus au premier tour." }, { name: "Vue obscure", desc: "Vision dans le noir 18 m, invisible pour ceux qui voient dans le noir." }] },
      { id: "hunter", name: "Chasseur", desc: "Le spécialiste des proies dangereuses.", features: [{ name: "Proie du chasseur", desc: "Tueur de colosses (+1d8 sur un blessé) ou Briseur de hordes (attaque une deuxième cible)." }] },
    ],
  },
  {
    id: "rogue",
    name: "Roublard",
    pitch: "Discret et habile, il frappe là où ça fait mal et excelle en compétences.",
    hitDie: 8,
    primary: ["dex"],
    saves: ["dex", "int"],
    skillCount: 4,
    skillList: ["acrobatics", "athletics", "deception", "insight", "intimidation", "investigation", "perception", "persuasion", "sleight", "stealth"],
    armor: ["light"],
    weapons: "Armes courantes et armes de guerre finesse ou légères",
    tools: "Outils de voleur",
    equipment: "Armure de cuir, 2 dagues, épée courte, arc court et 20 flèches, outils de voleur, sac de cambrioleur, 8 po (ou 100 po).",
    resources: [{ name: "Attaque sournoise", values: ["1d6", "1d6", "2d6", "2d6"], help: "Dégâts en plus, une fois par tour, avec avantage ou un allié au contact de la cible." }],
    levels: {
      1: [
        {
          name: "Expertise",
          desc: "Double ton bonus de maîtrise pour deux compétences que tu maîtrises.",
          choice: { kind: "expertise", key: "rogue-expertise", label: "2 compétences d'expertise", count: 2 },
        },
        { name: "Attaque sournoise", desc: "Une fois par tour, +1d6 dégâts avec une arme finesse ou à distance si tu as l'avantage ou si un allié est au contact de la cible.", tip: "Reste près d'un allié qui combat au corps à corps : tu auras presque toujours ton attaque sournoise." },
        { name: "Jargon des voleurs", desc: "Le langage secret des voleurs, et une langue de plus." },
        mastery(2),
      ],
      2: [{ name: "Ruse", desc: "Action bonus : Foncer, Se désengager ou Se cacher.", tip: "Attaque, puis désengage-toi pour ne pas rester exposé." }],
      3: [
        subclass("Archétype de roublard", "Choisis ton archétype."),
        { name: "Visée stable", desc: "Action bonus, si tu ne t'es pas déplacé : avantage à ta prochaine attaque (ta vitesse tombe à 0)." },
      ],
      4: [asi],
    },
    subclasses: [
      { id: "arcane-trickster", name: "Escroc arcanique", desc: "Magie d'illusion et d'enchantement.", caster: { ability: "int", kind: "third", cantrips: [0, 0, 3, 3], prepared: [0, 0, 3, 4] }, features: [{ name: "Incantation", desc: "Sorts de magicien avec l'Intelligence, dont Main de mage." }, { name: "Main de mage spectrale", desc: "Ta main de mage est invisible et peut voler ou crocheter." }] },
      { id: "assassin", name: "Assassin", desc: "Le tueur silencieux.", features: [{ name: "Assassinat", desc: "Avantage à l'initiative et contre ceux qui n'ont pas encore agi ; dégâts en plus au premier tour." }, { name: "Outils d'assassin", desc: "Kit de déguisement et matériel d'empoisonneur." }] },
      { id: "soulknife", name: "Lame de l'âme", desc: "Lames psychiques.", features: [{ name: "Lames psychiques", desc: "Fais apparaître des lames d'énergie (1d6, puis 1d4 en action bonus)." }, { name: "Pouvoir psionique", desc: "Des dés psioniques pour réussir tes tests et communiquer par télépathie." }] },
      { id: "thief", name: "Voleur", desc: "Le monte-en-l'air agile.", features: [{ name: "Mains rapides", desc: "Ta Ruse permet aussi d'utiliser un objet, d'escamoter ou de crocheter." }, { name: "Monte-en-l'air", desc: "L'escalade ne te coûte pas de déplacement en plus." }] },
    ],
  },
  {
    id: "sorcerer",
    name: "Ensorceleur",
    pitch: "La magie coule dans ses veines : peu de sorts, mais qu'il peut tordre à volonté.",
    hitDie: 6,
    primary: ["cha"],
    saves: ["con", "cha"],
    skillCount: 2,
    skillList: ["arcana", "deception", "insight", "intimidation", "persuasion", "religion"],
    armor: [],
    weapons: "Armes courantes",
    equipment: "Lance, 2 dagues, focaliseur arcanique, sac d'exploration souterraine, 28 po (ou 50 po).",
    caster: { ability: "cha", kind: "full", cantrips: [4, 4, 4, 5], prepared: [2, 4, 6, 7] },
    resources: [{ name: "Points de sorcellerie", values: ["—", 2, 3, 4], help: "Récupérés après un repos long. Convertibles en emplacements de sort et inversement." }],
    levels: {
      1: [
        { name: "Incantation", desc: "Tu lances des sorts d'ensorceleur avec le Charisme." },
        { name: "Sorcellerie innée", desc: "Action bonus, 2 fois par repos long : pendant 1 minute, +1 au DD de tes sorts et avantage à tes attaques de sort." },
      ],
      2: [
        { name: "Source de magie", desc: "Points de sorcellerie : convertis-les en emplacements de sort, ou l'inverse." },
        {
          name: "Métamagie",
          desc: "Deux façons de modifier tes sorts en dépensant des points de sorcellerie.",
          choice: {
            kind: "options",
            key: "metamagic",
            label: "2 options de métamagie",
            count: 2,
            options: [
              { id: "careful", name: "Sort prudent", desc: "Des alliés réussissent automatiquement leur sauvegarde contre ton sort." },
              { id: "distant", name: "Sort distant", desc: "Double la portée du sort (ou 9 m pour un sort au toucher)." },
              { id: "empowered", name: "Sort renforcé", desc: "Relance des dés de dégâts." },
              { id: "extended", name: "Sort prolongé", desc: "Double la durée, avantage aux jets de concentration." },
              { id: "heightened", name: "Sort intensifié", desc: "Une cible a un désavantage à sa sauvegarde." },
              { id: "quickened", name: "Sort accéléré", desc: "Lance un sort d'une action en action bonus." },
              { id: "seeking", name: "Sort guidé", desc: "Relance une attaque de sort ratée." },
              { id: "subtle", name: "Sort discret", desc: "Sans composantes verbales ni somatiques." },
              { id: "transmuted", name: "Sort transmuté", desc: "Change le type de dégâts (acide, froid, feu…)." },
              { id: "twinned", name: "Sort jumeau", desc: "Ajoute une cible à un sort à cible unique." },
            ],
          },
        },
      ],
      3: [subclass("Origine magique", "D'où vient ta magie ?")],
      4: [asi],
    },
    subclasses: [
      { id: "aberrant", name: "Sorcellerie aberrante", desc: "Une magie venue d'au-delà des étoiles.", features: [{ name: "Télépathie", desc: "Parle par la pensée à une créature proche." }, { name: "Sorts psioniques", desc: "Des sorts toujours préparés (Bras d'Hadar, Murmures dissonants…)." }] },
      { id: "clockwork", name: "Sorcellerie mécanique", desc: "L'ordre absolu du cosmos.", features: [{ name: "Rétablir l'équilibre", desc: "Réaction : annule l'avantage ou le désavantage d'un jet." }] },
      { id: "draconic", name: "Sorcellerie draconique", desc: "Du sang de dragon.", features: [{ name: "Résistance draconique", desc: "+3 PV max, et sans armure ta CA vaut 10 + DEX + CHA." }, { name: "Sorts draconiques", desc: "Des sorts toujours préparés (Alter self, Peur…)." }] },
      { id: "wild-magic", name: "Magie sauvage", desc: "Une magie chaotique et imprévisible.", features: [{ name: "Montée de magie sauvage", desc: "Tes sorts peuvent déclencher des effets aléatoires." }, { name: "Marées du chaos", desc: "Avantage à un jet, puis une montée de magie possible." }] },
    ],
  },
  {
    id: "warlock",
    name: "Occultiste",
    pitch: "Un pacte avec une entité puissante : peu d'emplacements, mais des pouvoirs uniques.",
    hitDie: 8,
    primary: ["cha"],
    saves: ["wis", "cha"],
    skillCount: 2,
    skillList: ["arcana", "deception", "history", "intimidation", "investigation", "nature", "religion"],
    armor: ["light"],
    weapons: "Armes courantes",
    equipment: "Armure de cuir, faucille, 2 dagues, focaliseur arcanique, livre (savoir occulte), sac d'érudit, 15 po (ou 100 po).",
    caster: { ability: "cha", kind: "pact", cantrips: [2, 2, 2, 3], prepared: [2, 3, 4, 5] },
    resources: [{ name: "Manifestations occultes", values: [1, 3, 3, 3], help: "Nombre de manifestations connues." }],
    levels: {
      1: [
        {
          name: "Manifestations occultes",
          desc: "Des dons de ton patron. Tu en connais 1 au niveau 1, 3 au niveau 2.",
          choice: {
            kind: "options",
            key: "invocations-1",
            label: "1 manifestation",
            count: 1,
            options: [
              { id: "pact-blade", name: "Pacte de la lame", desc: "Fais apparaître une arme de pacte ; tu attaques avec le Charisme." },
              { id: "pact-chain", name: "Pacte de la chaîne", desc: "Un familier spécial (diablotin, pseudodragon, quasit, sprite…)." },
              { id: "pact-tome", name: "Pacte du tome", desc: "Un livre des ombres : 3 sorts mineurs et 2 rituels de plus." },
              { id: "armor-shadows", name: "Armure d'ombres", desc: "Armure du mage à volonté sur toi." },
              { id: "devils-sight", name: "Vue du diable", desc: "Vision dans le noir magique sur 36 m." },
              { id: "eldritch-mind", name: "Esprit occulte", desc: "Avantage aux jets de concentration." },
            ],
          },
        },
        { name: "Magie de pacte", desc: "Tu lances des sorts d'occultiste avec le Charisme. Tes emplacements reviennent après un repos COURT.", tip: "Repose-toi souvent : tes emplacements reviennent après chaque repos court." },
      ],
      2: [
        { name: "Ruse magique", desc: "Une fois par repos long, en 1 minute : récupère la moitié de tes emplacements de pacte." },
        {
          name: "Manifestations (2 de plus)",
          desc: "Tu connais maintenant 3 manifestations.",
          choice: {
            kind: "options",
            key: "invocations-2",
            label: "2 manifestations",
            count: 2,
            options: [
              { id: "agonizing-blast", name: "Explosion agonisante", desc: "Ajoute ton CHA aux dégâts d'un sort mineur (souvent Décharge occulte)." },
              { id: "repelling-blast", name: "Explosion repoussante", desc: "Ton sort mineur repousse la cible de 3 m." },
              { id: "armor-shadows", name: "Armure d'ombres", desc: "Armure du mage à volonté sur toi." },
              { id: "devils-sight", name: "Vue du diable", desc: "Vision dans le noir magique sur 36 m." },
              { id: "eldritch-mind", name: "Esprit occulte", desc: "Avantage aux jets de concentration." },
              { id: "fiendish-vigor", name: "Vigueur fiélone", desc: "Simulacre de vie à volonté (PV temporaires)." },
              { id: "mask-faces", name: "Masque aux mille visages", desc: "Déguisement à volonté." },
              { id: "misty-visions", name: "Visions brumeuses", desc: "Image silencieuse à volonté." },
              { id: "eldritch-spear", name: "Lance occulte", desc: "Portée de ton sort mineur à 90 m." },
            ],
          },
        },
      ],
      3: [subclass("Patron d'outre-monde", "Avec qui as-tu passé ton pacte ?")],
      4: [asi],
    },
    subclasses: [
      { id: "archfey", name: "Patron archifée", desc: "Un seigneur féerique.", features: [{ name: "Pas féeriques", desc: "Foulée brumeuse sans emplacement, avec un effet en plus (rafraîchir, provoquer…)." }] },
      { id: "celestial", name: "Patron céleste", desc: "Un être des plans supérieurs.", features: [{ name: "Lumière guérisseuse", desc: "Une réserve de d6 pour soigner en action bonus." }] },
      { id: "fiend", name: "Patron fiélon", desc: "Un démon ou un diable.", features: [{ name: "Bénédiction du ténébreux", desc: "Quand un ennemi tombe à 0 PV, tu gagnes des PV temporaires." }] },
      { id: "great-old-one", name: "Patron Grand Ancien", desc: "Une entité indicible.", features: [{ name: "Esprit éveillé", desc: "Télépathie avec une créature proche." }, { name: "Sorts psychiques", desc: "Change les dégâts de tes sorts d'occultiste en psychiques." }] },
    ],
  },
  {
    id: "wizard",
    name: "Magicien",
    pitch: "L'érudit de la magie : le plus grand choix de sorts, mais fragile.",
    hitDie: 6,
    primary: ["int"],
    saves: ["int", "wis"],
    skillCount: 2,
    skillList: ["arcana", "history", "insight", "investigation", "medicine", "nature", "religion"],
    armor: [],
    weapons: "Armes courantes",
    equipment: "2 dagues, focaliseur arcanique, robe, grimoire, sac d'érudit, 5 po (ou 55 po).",
    caster: { ability: "int", kind: "full", cantrips: [3, 3, 3, 4], prepared: [4, 5, 6, 7] },
    resources: [{ name: "Restauration arcanique", values: [1, 1, 2, 2], help: "Niveaux d'emplacements récupérés après un repos court, une fois par jour." }],
    levels: {
      1: [
        { name: "Incantation", desc: "Tu lances des sorts de magicien avec l'Intelligence. Ton grimoire contient 6 sorts de niveau 1 ; tu en ajoutes 2 à chaque niveau.", tip: "Prends des sorts variés : un de protection (Bouclier), un de dégâts, un utilitaire." },
        { name: "Adepte rituel", desc: "Tu lances les sorts rituels de ton grimoire sans les préparer." },
        { name: "Restauration arcanique", desc: "Une fois par jour, après un repos court, récupère des emplacements (niveaux totaux ≤ moitié de ton niveau, arrondi au supérieur)." },
      ],
      2: [
        {
          name: "Érudit",
          desc: "Expertise dans une compétence de savoir que tu maîtrises.",
          choice: { kind: "expertise", key: "wizard-scholar", label: "Expertise de savoir", count: 1, from: ["arcana", "history", "investigation", "medicine", "nature", "religion"] },
        },
      ],
      3: [subclass("Tradition arcanique", "Choisis ton école.")],
      4: [asi],
    },
    subclasses: [
      { id: "abjurer", name: "Abjurateur", desc: "Protections et contresorts.", features: [{ name: "Égide arcanique", desc: "Tes sorts d'abjuration créent un bouclier magique qui absorbe les dégâts." }] },
      { id: "diviner", name: "Devin", desc: "Voir l'avenir.", features: [{ name: "Présage", desc: "Lance 2d20 après un repos long : tu peux remplacer n'importe quel jet par l'un d'eux." }] },
      { id: "evoker", name: "Évocateur", desc: "Destruction élémentaire.", features: [{ name: "Façonner les sorts", desc: "Tes alliés peuvent réussir automatiquement leur sauvegarde contre tes évocations." }, { name: "Sort mineur puissant", desc: "Tes sorts mineurs infligent la moitié des dégâts même en cas d'échec." }] },
      { id: "illusionist", name: "Illusionniste", desc: "Tromper les sens.", features: [{ name: "Illusions améliorées", desc: "Tes illusions sont plus rapides et plus longues à portée, et tu connais Illusion mineure." }] },
    ],
  },
];

export const getClass = (id: string) => CLASSES.find((c) => c.id === id);
export const getSubclass = (classId: string, id: string | null) => (id ? getClass(classId)?.subclasses.find((s) => s.id === id) : undefined);
