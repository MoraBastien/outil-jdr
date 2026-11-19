// Catalogue des sorts du Grimoire : sorts du System Reference Document 5.2 (Wizards of the Coast, licence CC-BY-4.0),
// niveaux 0 à 2, c'est-à-dire tout ce qu'un personnage de niveau 1 à 4 peut lancer.
// Résumés en français écrits pour le site (pas une traduction officielle), distances en mètres (1,5 m = 5 pieds).
// À relire et compléter par le MJ : chaque sort est une simple ligne `sp(...)`.
//
// Classes : B barde, C clerc, D druide, P paladin, R rôdeur, S ensorceleur, O occultiste, M magicien.
// Drapeaux : C concentration, R rituel.

export type SpellClass = "bard" | "cleric" | "druid" | "paladin" | "ranger" | "sorcerer" | "warlock" | "wizard";

export type Spell = {
  id: string;
  name: string;
  /** 0 = sort mineur (tour de magie). */
  level: number;
  school: string;
  classes: SpellClass[];
  time: string;
  range: string;
  components: string;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  desc: string;
  /** Aux niveaux supérieurs (ou, pour un sort mineur, en progressant). */
  higher?: string;
};

const CODES: Record<string, SpellClass> = { B: "bard", C: "cleric", D: "druid", P: "paladin", R: "ranger", S: "sorcerer", O: "warlock", M: "wizard" };

function sp(id: string, name: string, level: number, school: string, classes: string, time: string, range: string, components: string, duration: string, flags: string, desc: string, higher?: string): Spell {
  return {
    id,
    name,
    level,
    school,
    classes: [...classes].map((c) => CODES[c]).filter(Boolean),
    time,
    range,
    components,
    duration,
    concentration: flags.includes("C"),
    ritual: flags.includes("R"),
    desc,
    higher,
  };
}

const CANTRIP_UP = "Les dégâts augmentent d'un dé aux niveaux 5, 11 et 17.";

export const SPELLS: Spell[] = [
  // ---------- Sorts mineurs ----------
  sp("aspersion-acide", "Aspersion d'acide", 0, "Évocation", "SM", "1 action", "18 m", "V, S", "Instantanée", "", "Une bulle d'acide éclate dans une sphère de 1,5 m de rayon. Chaque créature dedans réussit une sauvegarde de Dextérité ou subit 1d6 dégâts d'acide.", CANTRIP_UP),
  sp("contact-glacial", "Contact glacial", 0, "Nécromancie", "SOM", "1 action", "Contact", "V, S", "Instantanée", "", "Attaque de sort au corps à corps : 1d10 dégâts nécrotiques, et la cible ne peut pas récupérer de points de vie jusqu'à la fin de ton prochain tour.", CANTRIP_UP),
  sp("lumieres-dansantes", "Lumières dansantes", 0, "Illusion", "BSM", "1 action", "36 m", "V, S, M", "Concentration, 1 minute", "C", "Jusqu'à quatre lumières flottantes (comme des torches) ou une forme humanoïde lumineuse. Tu les déplaces de 18 m en action bonus."),
  sp("druidisme", "Druidisme", 0, "Transmutation", "D", "1 action", "9 m", "V, S", "Instantanée", "", "Petits prodiges de la nature : prédire le temps des prochaines 24 heures, faire éclore une fleur, créer un effet sensoriel inoffensif, allumer ou éteindre une petite flamme."),
  sp("decharge-occulte", "Décharge occulte", 0, "Évocation", "O", "1 action", "36 m", "V, S", "Instantanée", "", "Un rayon crépitant : attaque de sort à distance, 1d10 dégâts de force.", "Deux rayons au niveau 5, trois au niveau 11, quatre au niveau 17, sur une ou plusieurs cibles."),
  sp("trait-de-feu", "Trait de feu", 0, "Évocation", "SM", "1 action", "36 m", "V, S", "Instantanée", "", "Attaque de sort à distance : 1d10 dégâts de feu. Un objet inflammable que personne ne porte prend feu.", CANTRIP_UP),
  sp("assistance", "Assistance", 0, "Divination", "CD", "1 action", "Contact", "V, S", "Concentration, 1 minute", "C", "Une créature consentante choisit une compétence : elle ajoute 1d4 à ses tests de caractéristique qui l'utilisent, jusqu'à la fin du sort."),
  sp("lumiere", "Lumière", 0, "Évocation", "BCSM", "1 action", "Contact", "V, M", "1 heure", "", "Un objet de 3 m maximum émet une lumière vive sur 6 m et faible sur 6 m de plus, de la couleur de ton choix."),
  sp("main-de-mage", "Main de mage", 0, "Invocation", "BSOM", "1 action", "9 m", "V, S", "1 minute", "", "Une main spectrale manipule un objet, ouvre une porte ou un contenant non verrouillé, range ou sort un objet. Elle ne peut pas attaquer ni porter plus de 5 kg."),
  sp("reparation", "Réparation", 0, "Transmutation", "BCDSM", "1 minute", "Contact", "V, S, M", "Instantanée", "", "Répare une cassure ou une déchirure d'au plus 30 cm sur un objet : maillon de chaîne, clé, accroc dans une cape."),
  sp("message", "Message", 0, "Transmutation", "BDSM", "1 action", "36 m", "S, M", "1 round", "", "Tu chuchotes un message à une créature à portée, qu'elle seule entend, et elle peut te répondre en chuchotant."),
  sp("illusion-mineure", "Illusion mineure", 0, "Illusion", "BSOM", "1 action", "9 m", "S, M", "1 minute", "", "Un son ou une image immobile (dans un cube de 1,5 m). Un test d'Intelligence (Investigation) contre ton DD révèle l'illusion."),
  sp("bouffee-de-poison", "Bouffée de poison", 0, "Nécromancie", "DSOM", "1 action", "9 m", "V, S", "Instantanée", "", "Attaque de sort à distance : 1d12 dégâts de poison.", CANTRIP_UP),
  sp("prestidigitation", "Prestidigitation", 0, "Transmutation", "BSOM", "1 action", "3 m", "V, S", "Jusqu'à 1 heure", "", "Petits tours de magie : étincelles, nettoyer ou salir un objet, réchauffer ou parfumer un plat, faire apparaître une marque ou un bibelot illusoire."),
  sp("production-de-flamme", "Production de flamme", 0, "Invocation", "D", "1 action bonus", "Personnelle", "V, S", "10 minutes", "", "Une flamme danse dans ta main et éclaire sur 6 m. Par une action Magie, tu la lances : attaque de sort à distance à 18 m, 1d8 dégâts de feu.", CANTRIP_UP),
  sp("rayon-de-givre", "Rayon de givre", 0, "Évocation", "SM", "1 action", "18 m", "V, S", "Instantanée", "", "Attaque de sort à distance : 1d8 dégâts de froid, et la vitesse de la cible baisse de 3 m jusqu'au début de ton prochain tour.", CANTRIP_UP),
  sp("resistance", "Résistance", 0, "Abjuration", "CD", "1 action", "Contact", "V, S", "Concentration, 1 minute", "C", "Choisis un type de dégâts : une fois par tour, quand la créature touchée en subit, elle réduit ces dégâts de 1d4."),
  sp("flamme-sacree", "Flamme sacrée", 0, "Évocation", "C", "1 action", "18 m", "V, S", "Instantanée", "", "Une créature que tu vois réussit une sauvegarde de Dextérité ou subit 1d8 dégâts radiants. Être à couvert ne l'aide pas.", CANTRIP_UP),
  sp("gourdin-magique", "Gourdin magique", 0, "Transmutation", "D", "1 action bonus", "Personnelle", "V, S, M", "1 minute", "", "Ton bâton ou ton gourdin utilise ta caractéristique d'incantation pour l'attaque et les dégâts, et son dé de dégâts devient 1d8. Les dégâts peuvent être de force.", "Le dé de dégâts passe à 1d10 au niveau 5, 1d12 au niveau 11, 2d6 au niveau 17."),
  sp("poigne-electrique", "Poigne électrique", 0, "Évocation", "SM", "1 action", "Contact", "V, S", "Instantanée", "", "Attaque de sort au corps à corps : 1d8 dégâts de foudre, et la cible ne peut pas faire d'attaque d'opportunité jusqu'au début de son prochain tour.", CANTRIP_UP),
  sp("epargner-les-mourants", "Épargner les mourants", 0, "Nécromancie", "CD", "1 action", "4,5 m", "V, S", "Instantanée", "", "Une créature à 0 point de vie devient stable.", "La portée double aux niveaux 5, 11 et 17."),
  sp("thaumaturgie", "Thaumaturgie", 0, "Transmutation", "C", "1 action", "9 m", "V", "Jusqu'à 1 minute", "", "Un signe de puissance divine : voix trois fois plus forte, flammes qui vacillent, tremblements légers, porte qui claque, yeux qui changent."),
  sp("coup-au-but", "Coup au but", 0, "Divination", "BSOM", "1 action", "Personnelle", "S, M (une arme)", "Instantanée", "", "Tu attaques avec l'arme utilisée pour le sort, en te servant de ta caractéristique d'incantation. Les dégâts peuvent être radiants.", "+1d6 dégâts radiants au niveau 5, 2d6 au niveau 11, 3d6 au niveau 17."),
  sp("moquerie-cruelle", "Moquerie cruelle", 0, "Enchantement", "B", "1 action", "18 m", "V", "Instantanée", "", "Une volée d'insultes magiques : la cible réussit une sauvegarde de Sagesse ou subit 1d6 dégâts psychiques et a le désavantage à son prochain jet d'attaque.", CANTRIP_UP),

  // ---------- Niveau 1 ----------
  sp("alarme", "Alarme", 1, "Abjuration", "RM", "1 minute", "9 m", "V, S, M", "8 heures", "R", "Une zone (cube de 6 m maximum) déclenche une alerte mentale ou un tintement quand une créature y entre sans le mot de passe."),
  sp("amitie-animaux", "Amitié avec les animaux", 1, "Enchantement", "BDR", "1 action", "9 m", "V, S, M", "24 heures", "", "Une bête réussit une sauvegarde de Sagesse ou est charmée par toi.", "Une bête de plus par niveau d'emplacement au-dessus du 1er."),
  sp("fleau", "Fléau", 1, "Enchantement", "BC", "1 action", "9 m", "V, S, M", "Concentration, 1 minute", "C", "Jusqu'à trois créatures réussissent une sauvegarde de Charisme ou retirent 1d4 à leurs jets d'attaque et de sauvegarde.", "Une cible de plus par niveau d'emplacement au-dessus du 1er."),
  sp("benediction", "Bénédiction", 1, "Enchantement", "CP", "1 action", "9 m", "V, S, M (de l'eau bénite)", "Concentration, 1 minute", "C", "Jusqu'à trois créatures ajoutent 1d4 à leurs jets d'attaque et de sauvegarde.", "Une cible de plus par niveau d'emplacement au-dessus du 1er."),
  sp("mains-brulantes", "Mains brûlantes", 1, "Évocation", "SM", "1 action", "Personnelle (cône de 4,5 m)", "V, S", "Instantanée", "", "Un éventail de flammes : sauvegarde de Dextérité, 3d6 dégâts de feu en cas d'échec, la moitié en cas de réussite.", "+1d6 par niveau d'emplacement au-dessus du 1er."),
  sp("charme-personne", "Charme-personne", 1, "Enchantement", "BDSOM", "1 action", "9 m", "V, S", "1 heure", "", "Un humanoïde réussit une sauvegarde de Sagesse (avec avantage si tu le combats) ou est charmé. Il sait ensuite qu'il a été charmé.", "Une cible de plus par niveau d'emplacement au-dessus du 1er."),
  sp("couleurs-dansantes", "Couleurs dansantes", 1, "Illusion", "BSM", "1 action", "Personnelle (cône de 4,5 m)", "V, S, M", "Instantanée", "", "Des couleurs éblouissantes : chaque créature dans le cône réussit une sauvegarde de Constitution ou est aveuglée jusqu'à la fin de ton prochain tour."),
  sp("injonction", "Injonction", 1, "Enchantement", "BCP", "1 action", "18 m", "V", "Instantanée", "", "Un ordre d'un mot (Approche, Lâche, Fuis, Rampe, Halte) : la cible réussit une sauvegarde de Sagesse ou obéit à son prochain tour.", "Une cible de plus par niveau d'emplacement au-dessus du 1er."),
  sp("comprehension-langues", "Compréhension des langues", 1, "Divination", "BSOM", "1 action", "Personnelle", "V, S, M", "1 heure", "R", "Tu comprends le sens littéral de toute langue parlée ou écrite que tu entends ou touches."),
  sp("creation-destruction-eau", "Création ou destruction d'eau", 1, "Transmutation", "CD", "1 action", "9 m", "V, S, M", "Instantanée", "", "Crée ou détruit jusqu'à 40 litres d'eau, ou du brouillard dans un cube de 9 m.", "40 litres de plus et 1,5 m de plus par niveau d'emplacement au-dessus du 1er."),
  sp("soins", "Soins", 1, "Abjuration", "BCDPR", "1 action", "Contact", "V, S", "Instantanée", "", "Une créature que tu touches récupère 2d8 points de vie + ton modificateur de caractéristique d'incantation.", "+2d8 par niveau d'emplacement au-dessus du 1er."),
  sp("detection-mal-bien", "Détection du mal et du bien", 1, "Divination", "CP", "1 action", "Personnelle", "V, S", "Concentration, 10 minutes", "C", "Tu sens à 9 m les aberrations, célestes, élémentaires, fées, fiélons et morts-vivants, et les lieux consacrés ou profanés."),
  sp("detection-magie", "Détection de la magie", 1, "Divination", "BCDPRSOM", "1 action", "Personnelle", "V, S", "Concentration, 10 minutes", "CR", "Tu sens la magie à 9 m. En te concentrant, tu vois l'aura des créatures et objets magiques visibles et tu apprends leur école de magie."),
  sp("detection-poison", "Détection du poison et des maladies", 1, "Divination", "CDPR", "1 action", "Personnelle", "V, S, M", "Concentration, 10 minutes", "CR", "Tu sens à 9 m la présence et l'emplacement des poisons, des créatures venimeuses et des maladies."),
  sp("deguisement", "Déguisement", 1, "Illusion", "BSM", "1 action", "Personnelle", "V, S", "1 heure", "", "Tu changes d'apparence (corps, vêtements, équipement), sans changer ta silhouette de plus de 30 cm. Un test d'Investigation peut percer l'illusion."),
  sp("faveur-divine", "Faveur divine", 1, "Transmutation", "P", "1 action bonus", "Personnelle", "V, S", "1 minute", "", "Tes attaques avec une arme infligent 1d4 dégâts radiants supplémentaires."),
  sp("enchevetrement", "Enchevêtrement", 1, "Invocation", "DR", "1 action", "27 m", "V, S", "Concentration, 1 minute", "C", "Des plantes envahissent un carré de 6 m (terrain difficile). Chaque créature dedans réussit une sauvegarde de Force ou est entravée."),
  sp("repli-expeditif", "Repli expéditif", 1, "Transmutation", "SOM", "1 action bonus", "Personnelle", "V, S", "Concentration, 10 minutes", "C", "Tu peux Foncer en action bonus, dès maintenant et à chacun de tes tours."),
  sp("lueurs-feeriques", "Lueurs féeriques", 1, "Évocation", "BD", "1 action", "18 m", "V", "Concentration, 1 minute", "C", "Chaque créature dans un cube de 6 m réussit une sauvegarde de Dextérité ou brille : les attaques contre elle ont l'avantage et elle ne peut pas être invisible."),
  sp("simulacre-de-vie", "Simulacre de vie", 1, "Nécromancie", "SM", "1 action", "Personnelle", "V, S, M", "Instantanée", "", "Tu gagnes 2d4 + 4 points de vie temporaires.", "+5 points de vie temporaires par niveau d'emplacement au-dessus du 1er."),
  sp("feuille-morte", "Feuille morte", 1, "Transmutation", "BSM", "1 réaction, quand une créature tombe", "18 m", "V, M", "1 minute", "", "Jusqu'à cinq créatures qui tombent descendent doucement et ne subissent aucun dégât de chute."),
  sp("appel-de-familier", "Appel de familier", 1, "Invocation", "M", "1 heure", "3 m", "V, S, M (10 po d'encens)", "Instantanée", "R", "Un esprit prend la forme d'une petite bête et te sert de familier : il voit pour toi, transmet tes sorts de contact, t'aide au combat."),
  sp("disque-flottant", "Disque flottant", 1, "Invocation", "M", "1 action", "9 m", "V, S, M", "1 heure", "R", "Un disque de force horizontal porte jusqu'à 250 kg et te suit à 6 m."),
  sp("nappe-de-brouillard", "Nappe de brouillard", 1, "Invocation", "DRSM", "1 action", "36 m", "V, S", "Concentration, 1 heure", "C", "Une sphère de brouillard de 6 m de rayon : la zone est fortement obscurcie.", "Le rayon augmente de 6 m par niveau d'emplacement au-dessus du 1er."),
  sp("baies-nourricieres", "Baies nourricières", 1, "Invocation", "DR", "1 action", "Contact", "V, S, M", "24 heures", "", "Dix baies : en manger une rend 1 point de vie et nourrit une créature pour la journée."),
  sp("graisse", "Graisse", 1, "Invocation", "SM", "1 action", "18 m", "V, S, M", "1 minute", "", "Un carré de 3 m de graisse (terrain difficile) : chaque créature qui y est ou y entre réussit une sauvegarde de Dextérité ou tombe à terre."),
  sp("eclair-tracant", "Éclair traçant", 1, "Évocation", "C", "1 action", "36 m", "V, S", "1 round", "", "Attaque de sort à distance : 4d6 dégâts radiants, et la prochaine attaque contre la cible avant la fin de ton prochain tour a l'avantage.", "+1d6 par niveau d'emplacement au-dessus du 1er."),
  sp("mot-de-guerison", "Mot de guérison", 1, "Abjuration", "BCD", "1 action bonus", "18 m", "V", "Instantanée", "", "Une créature que tu vois récupère 2d4 points de vie + ton modificateur de caractéristique d'incantation. Parfait pour relever un allié à 0 PV.", "+2d4 par niveau d'emplacement au-dessus du 1er."),
  sp("represailles-infernales", "Représailles infernales", 1, "Évocation", "O", "1 réaction, quand une créature te blesse", "18 m", "V, S", "Instantanée", "", "La créature réussit une sauvegarde de Dextérité ou subit 2d10 dégâts de feu (la moitié en cas de réussite).", "+1d10 par niveau d'emplacement au-dessus du 1er."),
  sp("heroisme", "Héroïsme", 1, "Enchantement", "BP", "1 action", "Contact", "V, S", "Concentration, 1 minute", "C", "La créature est immunisée contre l'état effrayé et gagne, au début de chacun de ses tours, des PV temporaires égaux à ton modificateur d'incantation.", "Une cible de plus par niveau d'emplacement au-dessus du 1er."),
  sp("fou-rire", "Fou rire", 1, "Enchantement", "BOM", "1 action", "9 m", "V, S, M", "Concentration, 1 minute", "C", "La cible réussit une sauvegarde de Sagesse ou tombe à terre, prise d'un fou rire : elle est neutralisée. Elle refait la sauvegarde à la fin de ses tours et quand elle subit des dégâts.", "Une cible de plus par niveau d'emplacement au-dessus du 1er."),
  sp("marque-du-chasseur", "Marque du chasseur", 1, "Divination", "R", "1 action bonus", "27 m", "V", "Concentration, 1 heure", "C", "Tu marques une créature : tes attaques qui la touchent infligent 1d6 dégâts de force de plus, et tu as l'avantage pour la pister. Si elle meurt, tu peux marquer une autre cible."),
  sp("identification", "Identification", 1, "Divination", "BM", "1 minute", "Contact", "V, S, M (une perle de 100 po)", "Instantanée", "R", "Tu apprends les propriétés d'un objet magique, comment l'utiliser, et les sorts qui affectent un objet ou une créature."),
  sp("ecriture-illusoire", "Écriture illusoire", 1, "Illusion", "BOM", "1 minute", "Contact", "S, M", "10 jours", "R", "Un message que seuls les lecteurs de ton choix comprennent ; les autres voient un texte inintelligible ou un faux message."),
  sp("blessure", "Blessure", 1, "Nécromancie", "C", "1 action", "Contact", "V, S", "Instantanée", "", "La créature touchée réussit une sauvegarde de Constitution ou subit 2d10 dégâts nécrotiques (la moitié en cas de réussite).", "+1d10 par niveau d'emplacement au-dessus du 1er."),
  sp("saut", "Saut", 1, "Transmutation", "DRSM", "1 action bonus", "Contact", "V, S, M", "1 minute", "", "Une fois par tour, la créature peut sauter jusqu'à 9 m en ne dépensant que 3 m de déplacement.", "Une cible de plus par niveau d'emplacement au-dessus du 1er."),
  sp("grande-foulee", "Grande foulée", 1, "Transmutation", "BDRM", "1 action", "Contact", "V, S, M", "1 heure", "", "La vitesse de la créature augmente de 3 m.", "Une cible de plus par niveau d'emplacement au-dessus du 1er."),
  sp("armure-de-mage", "Armure du mage", 1, "Abjuration", "SM", "1 action", "Contact", "V, S, M", "8 heures", "", "Une créature consentante sans armure a une CA de 13 + son modificateur de Dextérité."),
  sp("projectile-magique", "Projectile magique", 1, "Évocation", "SM", "1 action", "36 m", "V, S", "Instantanée", "", "Trois fléchettes de force touchent automatiquement et infligent 1d4 + 1 dégâts de force chacune, sur une ou plusieurs cibles.", "Une fléchette de plus par niveau d'emplacement au-dessus du 1er."),
  sp("protection-mal-bien", "Protection contre le mal et le bien", 1, "Abjuration", "CPOM", "1 action", "Contact", "V, S, M", "Concentration, 10 minutes", "C", "Contre les aberrations, célestes, élémentaires, fées, fiélons et morts-vivants : leurs attaques contre la cible ont le désavantage, et ils ne peuvent ni la charmer, ni l'effrayer, ni la posséder."),
  sp("purification", "Purification de nourriture et d'eau", 1, "Transmutation", "CDP", "1 action", "3 m", "V, S", "Instantanée", "R", "Purifie la nourriture et la boisson dans une sphère de 1,5 m de rayon : plus de poison ni de maladie."),
  sp("sanctuaire", "Sanctuaire", 1, "Abjuration", "C", "1 action bonus", "9 m", "V, S, M", "1 minute", "", "Qui veut attaquer la créature protégée ou la viser avec un sort nuisible doit réussir une sauvegarde de Sagesse, sinon il change de cible. Le sort cesse si elle attaque ou nuit."),
  sp("bouclier", "Bouclier", 1, "Abjuration", "SM", "1 réaction, quand une attaque te touche ou que Projectile magique te vise", "Personnelle", "V, S", "1 round", "", "+5 à la CA jusqu'au début de ton prochain tour, y compris contre l'attaque qui a déclenché le sort. Projectile magique ne te fait rien."),
  sp("bouclier-de-la-foi", "Bouclier de la foi", 1, "Abjuration", "CP", "1 action bonus", "18 m", "V, S, M", "Concentration, 10 minutes", "C", "Un champ scintillant donne +2 à la CA de la créature."),
  sp("image-silencieuse", "Image silencieuse", 1, "Illusion", "BSM", "1 action", "18 m", "V, S, M", "Concentration, 10 minutes", "C", "L'image d'un objet, d'une créature ou d'un phénomène (dans un cube de 4,5 m), sans son. Tu peux la déplacer. Un test d'Investigation révèle l'illusion."),
  sp("sommeil", "Sommeil", 1, "Enchantement", "BSM", "1 action", "18 m", "V, S, M", "Concentration, 1 minute", "C", "Les créatures de ton choix dans une sphère de 1,5 m de rayon réussissent une sauvegarde de Sagesse ou sont neutralisées jusqu'à la fin de leur prochain tour ; un second échec les rend inconscientes jusqu'à la fin du sort. Les créatures qui ne dorment pas ne sont pas affectées."),
  sp("communication-animaux", "Communication avec les animaux", 1, "Divination", "BDR", "1 action", "Personnelle", "V, S", "10 minutes", "R", "Tu comprends les bêtes et peux leur parler. Leur savoir reste celui d'un animal."),
  sp("vague-tonnante", "Vague tonnante", 1, "Évocation", "BDSM", "1 action", "Personnelle (cube de 4,5 m)", "V, S", "Instantanée", "", "Chaque créature dans le cube réussit une sauvegarde de Constitution ou subit 2d8 dégâts de tonnerre et est repoussée de 3 m ; la moitié des dégâts en cas de réussite. Le bruit s'entend à 90 m.", "+1d8 par niveau d'emplacement au-dessus du 1er."),
  sp("serviteur-invisible", "Serviteur invisible", 1, "Invocation", "BOM", "1 action", "18 m", "V, S, M", "1 heure", "R", "Une force invisible et sans esprit fait des tâches simples à ta demande : porter, nettoyer, ouvrir, servir."),

  // ---------- Niveau 2 ----------
  sp("fleche-acide", "Flèche acide", 2, "Évocation", "M", "1 action", "27 m", "V, S, M", "Instantanée", "", "Attaque de sort à distance : 4d4 dégâts d'acide, puis 2d4 à la fin de son prochain tour. En cas d'échec, la moitié des dégâts initiaux seulement.", "+1d4 aux deux dégâts par niveau d'emplacement au-dessus du 2e."),
  sp("aide", "Aide", 2, "Abjuration", "BCDPR", "1 action", "9 m", "V, S, M", "8 heures", "", "Jusqu'à trois créatures gagnent 5 points de vie maximum et actuels.", "+5 points de vie par niveau d'emplacement au-dessus du 2e."),
  sp("modification-apparence", "Modification d'apparence", 2, "Transmutation", "SM", "1 action", "Personnelle", "V, S", "Concentration, 1 heure", "C", "Tu transformes ton corps : adaptation aquatique (respirer et nager sous l'eau), changement d'apparence, ou armes naturelles (1d6, magiques)."),
  sp("messager-animal", "Messager animal", 2, "Enchantement", "BDR", "1 action", "9 m", "V, S, M", "24 heures", "R", "Une Très Petite bête porte un message de 25 mots à un lieu et un destinataire que tu décris."),
  sp("verrou-magique", "Verrou magique", 2, "Abjuration", "M", "1 action", "Contact", "V, S, M (25 po de poudre de rubis)", "Jusqu'à dissipation", "", "Une porte, une fenêtre ou un coffre est verrouillé par magie ; toi et ceux que tu désignes l'ouvrez normalement."),
  sp("aura-magique", "Aura magique de l'arcaniste", 2, "Illusion", "M", "1 action", "Contact", "V, S, M", "24 heures", "", "Tu masques ou falsifies l'aura magique d'un objet ou d'une créature face aux sorts de détection."),
  sp("augure", "Augure", 2, "Divination", "C", "1 minute", "Personnelle", "V, S, M (25 po)", "Instantanée", "R", "Tu demandes un présage sur une action prévue dans les 30 prochaines minutes : bonheur, malheur, les deux, ou rien."),
  sp("peau-d-ecorce", "Peau d'écorce", 2, "Transmutation", "DR", "1 action bonus", "Contact", "V, S, M", "1 heure", "", "La peau de la créature devient dure comme l'écorce : sa CA ne peut pas être inférieure à 17."),
  sp("cecite-surdite", "Cécité/Surdité", 2, "Transmutation", "BCSM", "1 action", "36 m", "V", "1 minute", "", "La cible réussit une sauvegarde de Constitution ou est aveuglée ou assourdie (au choix). Elle refait la sauvegarde à la fin de chacun de ses tours.", "Une cible de plus par niveau d'emplacement au-dessus du 2e."),
  sp("flou", "Flou", 2, "Illusion", "SM", "1 action", "Personnelle", "V", "Concentration, 1 minute", "C", "Ton corps devient flou : les attaques contre toi ont le désavantage (sauf si l'attaquant voit malgré l'illusion)."),
  sp("apaisement-emotions", "Apaisement des émotions", 2, "Enchantement", "BC", "1 action", "18 m", "V, S", "Concentration, 1 minute", "C", "Les humanoïdes dans une sphère de 6 m réussissent une sauvegarde de Charisme ou deviennent indifférents envers leurs ennemis, ou sont libérés d'un état charmé ou effrayé."),
  sp("flamme-eternelle", "Flamme éternelle", 2, "Évocation", "CM", "1 action", "Contact", "V, S, M (50 po de poudre de rubis)", "Jusqu'à dissipation", "", "Une flamme sans chaleur, aussi brillante qu'une torche, brûle sur un objet sans jamais s'éteindre."),
  sp("tenebres", "Ténèbres", 2, "Évocation", "SOM", "1 action", "18 m", "V, M", "Concentration, 10 minutes", "C", "Des ténèbres magiques remplissent une sphère de 4,5 m : la vision dans le noir ne les perce pas et la lumière non magique ne les éclaire pas."),
  sp("vision-dans-le-noir", "Vision dans le noir", 2, "Transmutation", "DRSM", "1 action", "Contact", "V, S, M", "8 heures", "", "La créature voit dans le noir sur 45 m."),
  sp("detection-des-pensees", "Détection des pensées", 2, "Divination", "BSOM", "1 action", "Personnelle", "V, S, M", "Concentration, 1 minute", "C", "Tu sens les créatures pensantes à 9 m et lis leurs pensées de surface ; tu peux sonder plus profond si la cible rate une sauvegarde de Sagesse."),
  sp("amelioration-caracteristique", "Amélioration de caractéristique", 2, "Transmutation", "BCDS", "1 action", "Contact", "V, S, M", "Concentration, 1 heure", "C", "Choisis une caractéristique : la créature a l'avantage à ses tests de cette caractéristique.", "Une cible de plus par niveau d'emplacement au-dessus du 2e."),
  sp("agrandissement-rapetissement", "Agrandissement/Rapetissement", 2, "Transmutation", "SM", "1 action", "9 m", "V, S, M", "Concentration, 1 minute", "C", "Une créature ou un objet double ou réduit de moitié : agrandi, avantage aux tests de Force et +1d4 dégâts avec ses armes ; rapetissé, désavantage et −1d4. Une créature non consentante a droit à une sauvegarde de Constitution."),
  sp("envoutement", "Envoûtement", 2, "Enchantement", "BO", "1 action", "18 m", "V, S", "1 minute", "", "Tes paroles captivent : les créatures de ton choix qui t'entendent réussissent une sauvegarde de Sagesse ou ont le désavantage pour percevoir autre chose que toi."),
  sp("appel-de-destrier", "Appel de destrier", 2, "Invocation", "P", "1 action", "9 m", "V, S", "Instantanée", "", "Un esprit loyal et intelligent apparaît sous la forme d'une monture (cheval, poney, chameau, élan…) qui combat à tes côtés."),
  sp("detection-des-pieges", "Détection des pièges", 2, "Divination", "CDR", "1 action", "36 m", "V, S", "Instantanée", "", "Tu sens la présence de pièges à portée et dans ta ligne de vue, sans savoir exactement où ils sont."),
  sp("lame-de-feu", "Lame de feu", 2, "Évocation", "D", "1 action bonus", "Personnelle", "V, S, M", "Concentration, 10 minutes", "C", "Une lame de feu dans ta main : attaque de sort au corps à corps, 3d6 dégâts de feu. Elle éclaire sur 3 m.", "+1d6 tous les deux niveaux d'emplacement au-dessus du 2e."),
  sp("sphere-de-feu", "Sphère de feu", 2, "Invocation", "DM", "1 action", "18 m", "V, S, M", "Concentration, 1 minute", "C", "Une sphère de feu de 1,5 m : les créatures qui finissent leur tour à côté réussissent une sauvegarde de Dextérité ou subissent 2d6 dégâts de feu. Tu la déplaces de 9 m en action bonus.", "+1d6 par niveau d'emplacement au-dessus du 2e."),
  sp("doux-repos", "Doux repos", 2, "Nécromancie", "CM", "1 action", "Contact", "V, S, M", "10 jours", "R", "Un cadavre ne se décompose pas et ne peut pas devenir mort-vivant ; le délai pour le ramener à la vie ne court plus."),
  sp("bourrasque", "Bourrasque", 2, "Évocation", "DSM", "1 action", "Personnelle (ligne de 18 m)", "V, S, M", "Concentration, 1 minute", "C", "Un vent violent sur une ligne de 18 m sur 3 m : chaque créature dedans réussit une sauvegarde de Force ou est repoussée de 4,5 m. Il disperse les gaz et éteint les flammes."),
  sp("chauffer-le-metal", "Chauffer le métal", 2, "Transmutation", "BD", "1 action", "18 m", "V, S, M", "Concentration, 1 minute", "C", "Un objet métallique devient brûlant : qui le touche subit 2d8 dégâts de feu, et doit réussir une sauvegarde de Constitution ou le lâcher (sinon désavantage). Tu recommences en action bonus.", "+1d8 par niveau d'emplacement au-dessus du 2e."),
  sp("immobilisation-de-personne", "Immobilisation de personne", 2, "Enchantement", "BCDSOM", "1 action", "18 m", "V, S, M", "Concentration, 1 minute", "C", "Un humanoïde réussit une sauvegarde de Sagesse ou est paralysé. Il refait la sauvegarde à la fin de chacun de ses tours.", "Une cible de plus par niveau d'emplacement au-dessus du 2e."),
  sp("invisibilite", "Invisibilité", 2, "Illusion", "BSOM", "1 action", "Contact", "V, S, M", "Concentration, 1 heure", "C", "La créature devient invisible, jusqu'à ce qu'elle attaque, inflige des dégâts ou lance un sort.", "Une cible de plus par niveau d'emplacement au-dessus du 2e."),
  sp("deblocage", "Déblocage", 2, "Transmutation", "BSM", "1 action", "18 m", "V", "Instantanée", "", "Ouvre une serrure, un verrou ou une chaîne (et suspend un Verrou magique). Un grand bruit s'entend à 90 m."),
  sp("restauration-partielle", "Restauration partielle", 2, "Abjuration", "BCDPR", "1 action bonus", "Contact", "V, S", "Instantanée", "", "Met fin à un état parmi : aveuglé, assourdi, paralysé, empoisonné."),
  sp("levitation", "Lévitation", 2, "Transmutation", "SM", "1 action", "18 m", "V, S, M", "Concentration, 10 minutes", "C", "Une créature ou un objet (jusqu'à 250 kg) s'élève jusqu'à 6 m ; tu le fais monter ou descendre de 6 m par tour. Sauvegarde de Constitution pour une cible non consentante."),
  sp("localisation-animaux-plantes", "Localisation d'animaux ou de plantes", 2, "Divination", "BDR", "1 action", "Personnelle", "V, S, M", "Instantanée", "R", "Tu apprends la direction et la distance de la bête ou de la plante que tu nommes, à 8 km maximum."),
  sp("localisation-objet", "Localisation d'objet", 2, "Divination", "BCDPRM", "1 action", "Personnelle", "V, S, M", "Concentration, 10 minutes", "C", "Tu sens la direction d'un objet que tu connais ou d'un type d'objet, à 300 m maximum. Le plomb bloque le sort."),
  sp("bouche-magique", "Bouche magique", 2, "Illusion", "BM", "1 minute", "9 m", "V, S, M (10 po de jade)", "Jusqu'à dissipation", "R", "Un objet délivre un message (25 mots) quand une condition que tu fixes se produit."),
  sp("arme-magique", "Arme magique", 2, "Transmutation", "PRSM", "1 action bonus", "Contact", "V, S", "1 heure", "", "Une arme non magique devient magique et donne +1 aux jets d'attaque et de dégâts.", "+2 avec un emplacement de niveau 3 ou plus."),
  sp("image-miroir", "Image miroir", 2, "Illusion", "BSOM", "1 action", "Personnelle", "V, S", "1 minute", "", "Trois doubles illusoires te protègent : quand on t'attaque, un d6 décide si l'attaque vise un double, qui disparaît s'il est touché."),
  sp("foulee-brumeuse", "Foulée brumeuse", 2, "Invocation", "SOM", "1 action bonus", "Personnelle", "V", "Instantanée", "", "Entouré d'une brume argentée, tu te téléportes jusqu'à 9 m vers un espace inoccupé que tu vois."),
  sp("rayon-de-lune", "Rayon de lune", 2, "Évocation", "D", "1 action", "36 m", "V, S, M", "Concentration, 1 minute", "C", "Un cylindre de lumière (1,5 m de rayon) : qui y entre ou y commence son tour réussit une sauvegarde de Constitution ou subit 2d10 dégâts radiants (la moitié sinon). Les métamorphes ont le désavantage. Tu le déplaces de 18 m.", "+1d10 par niveau d'emplacement au-dessus du 2e."),
  sp("passage-sans-trace", "Passage sans trace", 2, "Abjuration", "DR", "1 action", "Personnelle", "V, S, M", "Concentration, 1 heure", "C", "Toi et les créatures de ton choix à 9 m gagnez +10 aux tests de Discrétion et ne laissez pas de traces."),
  sp("priere-de-guerison", "Prière de guérison", 2, "Abjuration", "CP", "10 minutes", "9 m", "V", "Instantanée", "", "Jusqu'à cinq créatures récupèrent 2d8 points de vie + ton modificateur de caractéristique d'incantation.", "+1d8 par niveau d'emplacement au-dessus du 2e."),
  sp("protection-poison", "Protection contre le poison", 2, "Abjuration", "CDPR", "1 action", "Contact", "V, S", "1 heure", "", "Met fin à l'état empoisonné ; pendant la durée, avantage aux sauvegardes contre le poison et résistance aux dégâts de poison."),
  sp("rayon-affaiblissant", "Rayon affaiblissant", 2, "Nécromancie", "OM", "1 action", "18 m", "V, S", "Concentration, 1 minute", "C", "La cible réussit une sauvegarde de Constitution ou a le désavantage aux tests et sauvegardes de Force, et ses attaques avec une arme infligent 1d8 dégâts de moins."),
  sp("corde-enchantee", "Corde enchantée", 2, "Transmutation", "M", "1 action", "Contact", "V, S, M", "1 heure", "", "Une corde mène à un espace extradimensionnel invisible où huit créatures peuvent s'abriter."),
  sp("rayon-ardent", "Rayon ardent", 2, "Évocation", "SM", "1 action", "36 m", "V, S", "Instantanée", "", "Trois rayons de feu : une attaque de sort à distance chacun, 2d6 dégâts de feu par rayon, sur une ou plusieurs cibles.", "Un rayon de plus par niveau d'emplacement au-dessus du 2e."),
  sp("voir-l-invisible", "Voir l'invisible", 2, "Divination", "BSM", "1 action", "Personnelle", "V, S, M", "1 heure", "", "Tu vois les créatures et objets invisibles, ainsi que dans le plan éthéré."),
  sp("fracassement", "Fracassement", 2, "Évocation", "BSOM", "1 action", "18 m", "V, S, M", "Instantanée", "", "Un bruit assourdissant dans une sphère de 3 m : sauvegarde de Constitution, 3d8 dégâts de tonnerre (la moitié en cas de réussite). Les objets non portés sont touchés aussi.", "+1d8 par niveau d'emplacement au-dessus du 2e."),
  sp("silence", "Silence", 2, "Illusion", "BCR", "1 action", "36 m", "V, S", "Concentration, 10 minutes", "CR", "Aucun son dans une sphère de 6 m : les créatures dedans sont assourdies et ne peuvent pas lancer de sort à composante verbale."),
  sp("pattes-d-araignee", "Pattes d'araignée", 2, "Transmutation", "SOM", "1 action", "Contact", "V, S, M", "Concentration, 1 heure", "C", "La créature grimpe sur les murs et au plafond, les mains libres, à sa vitesse de marche."),
  sp("croissance-d-epines", "Croissance d'épines", 2, "Transmutation", "DR", "1 action", "45 m", "V, S, M", "Concentration, 10 minutes", "C", "Le sol se hérisse d'épines sur 6 m de rayon : terrain difficile, et 2d4 dégâts perforants par 1,5 m parcouru. La zone est difficile à repérer."),
  sp("arme-spirituelle", "Arme spirituelle", 2, "Évocation", "C", "1 action bonus", "18 m", "V, S", "Concentration, 1 minute", "C", "Une arme spectrale apparaît : attaque de sort au corps à corps, 1d8 + ton modificateur de dégâts de force. En action bonus, tu la déplaces de 6 m et attaques à nouveau.", "+1d8 par niveau d'emplacement au-dessus du 2e."),
  sp("suggestion", "Suggestion", 2, "Enchantement", "BSOM", "1 action", "9 m", "V, M", "Concentration, 8 heures", "C", "Tu suggères une ligne de conduite raisonnable (25 mots) : la cible réussit une sauvegarde de Sagesse ou la suit de son mieux."),
  sp("lien-de-protection", "Lien de protection", 2, "Abjuration", "CP", "1 action", "Contact", "V, S, M (deux anneaux de 50 po)", "1 heure", "", "La créature gagne +1 à la CA et aux sauvegardes, et la résistance à tous les dégâts ; chaque fois qu'elle subit des dégâts, tu subis les mêmes."),
  sp("toile-d-araignee", "Toile d'araignée", 2, "Invocation", "SM", "1 action", "18 m", "V, S, M", "Concentration, 1 heure", "C", "Des toiles remplissent un cube de 6 m (terrain difficile, légèrement obscurci) : qui y entre réussit une sauvegarde de Dextérité ou est entravé. Elles brûlent."),
  sp("zone-de-verite", "Zone de vérité", 2, "Enchantement", "BCP", "1 action", "18 m", "V, S", "10 minutes", "", "Les créatures dans une sphère de 4,5 m réussissent une sauvegarde de Charisme ou ne peuvent pas mentir délibérément. Tu sais qui a réussi."),
];

export const SPELLS_BY_ID = new Map(SPELLS.map((s) => [s.id, s]));
export const getSpell = (id: string) => SPELLS_BY_ID.get(id);
