// Fichier de données : modifiable sans toucher au code. Voir README.md (section « Données »).
import type { ClasseDef } from "../types";

/** Règles 5e de base, niveaux 1 à 4 (Écho 1 à 4). `priorite` : ordre des caractéristiques pour « Répartir selon la classe ». Pas de don : voir README. */
export const CLASSES: ClasseDef[] = [
  {
    "id": "barbare",
    "nom": "Barbare",
    "dv": 12,
    "priorite": [
      "for",
      "con",
      "dex",
      "sag",
      "int",
      "cha"
    ],
    "sauvegardes": "Force, Constitution",
    "armures": "légères, intermédiaires, boucliers",
    "armes": "simples, de guerre",
    "nbCompetences": 2,
    "competences": [
      "athletisme",
      "dressage",
      "intimidation",
      "nature",
      "perception",
      "survie"
    ],
    "traits": [
      {
        "niveau": 1,
        "nom": "Rage",
        "description": "2 fois par repos long (3 à l'Écho 3) : action bonus, 1 minute. Avantage aux jets de Force, +2 aux dégâts de mêlée en Force, résistance aux dégâts contondants, perforants et tranchants. Cesse si tu n'attaques pas et ne subis pas de dégâts."
      },
      {
        "niveau": 1,
        "nom": "Défense sans armure",
        "description": "Sans armure : CA = 10 + mod. de Dextérité + mod. de Constitution (bouclier autorisé)."
      },
      {
        "niveau": 2,
        "nom": "Attaque téméraire",
        "description": "Avantage à tes attaques de Force au corps à corps ce tour, mais les attaques contre toi ont l'avantage jusqu'à ton prochain tour."
      },
      {
        "niveau": 2,
        "nom": "Sens du danger",
        "description": "Avantage aux sauvegardes de Dextérité contre les effets que tu vois (sauf aveuglé, assourdi ou neutralisé)."
      },
      {
        "niveau": 3,
        "nom": "Voie primitive",
        "description": "Choix de ta sous-classe (ci-dessous)."
      }
    ],
    "choix": [
      {
        "id": "voie",
        "niveau": 3,
        "titre": "Voie primitive",
        "nombre": 1,
        "options": [
          {
            "id": "voie-du-berserker",
            "nom": "Voie du Berserker",
            "description": "Frénésie : attaque bonus en rage (un niveau d'épuisement à la fin de la rage)."
          },
          {
            "id": "voie-du-guerrier-totem",
            "nom": "Voie du Guerrier totem",
            "description": "Chercheur d'esprit (Parler avec les animaux et Sens des bêtes en rituel) et Esprit totem : Ours, Aigle ou Loup."
          }
        ]
      }
    ]
  },
  {
    "id": "barde",
    "nom": "Barde",
    "dv": 8,
    "priorite": [
      "cha",
      "dex",
      "con",
      "int",
      "sag",
      "for"
    ],
    "sauvegardes": "Dextérité, Charisme",
    "armures": "légères",
    "armes": "simples, arbalète de poing, épée longue, rapière, épée courte",
    "nbCompetences": 3,
    "competences": "toutes",
    "traits": [
      {
        "niveau": 1,
        "nom": "Incitation bardique",
        "description": "Action bonus : une créature à 18 m qui t'entend gagne un d6 à ajouter à un jet (attaque, test ou sauvegarde) dans les 10 minutes. Mod. de Charisme fois par repos long."
      },
      {
        "niveau": 2,
        "nom": "Touche-à-tout",
        "description": "+½ maîtrise (arrondi inférieur) aux tests sans maîtrise."
      },
      {
        "niveau": 2,
        "nom": "Chant de repos",
        "description": "Pendant un repos court, les alliés qui t'entendent regagnent 1d6 PV de plus."
      },
      {
        "niveau": 3,
        "nom": "Collège de barde",
        "description": "Choix de ta sous-classe (ci-dessous)."
      },
      {
        "niveau": 3,
        "nom": "Expertise",
        "description": "Double la maîtrise de 2 compétences maîtrisées."
      }
    ],
    "choix": [
      {
        "id": "college",
        "niveau": 3,
        "titre": "Collège de barde",
        "nombre": 1,
        "options": [
          {
            "id": "college-du-savoir",
            "nom": "Collège du savoir",
            "description": "3 compétences en plus et Mots cinglants (réduit le jet d'une créature avec ton Incitation)."
          },
          {
            "id": "college-de-la-vaillance",
            "nom": "Collège de la vaillance",
            "description": "Armures intermédiaires, boucliers, armes de guerre, et Incitation au combat (dégâts ou CA)."
          }
        ]
      },
      {
        "id": "exp",
        "niveau": 3,
        "titre": "Expertise",
        "nombre": 2,
        "source": "competences"
      }
    ],
    "magie": [
      "Tours 2 · Sorts connus 4 · 2 emplacements de niv. 1",
      "Tours 2 · Sorts connus 5 · 3 emplacements de niv. 1",
      "Tours 2 · Sorts connus 6 · 4 de niv. 1, 2 de niv. 2",
      "Tours 3 · Sorts connus 7 · 4 de niv. 1, 3 de niv. 2"
    ]
  },
  {
    "id": "clerc",
    "nom": "Clerc",
    "dv": 8,
    "priorite": [
      "sag",
      "con",
      "for",
      "cha",
      "dex",
      "int"
    ],
    "sauvegardes": "Sagesse, Charisme",
    "armures": "légères, intermédiaires, boucliers (+ selon le domaine)",
    "armes": "simples",
    "nbCompetences": 2,
    "competences": [
      "histoire",
      "intuition",
      "medecine",
      "persuasion",
      "religion"
    ],
    "traits": [
      {
        "niveau": 1,
        "nom": "Domaine divin",
        "description": "Choix de ton domaine (ci-dessous) : sorts de domaine toujours préparés et capacités."
      },
      {
        "niveau": 1,
        "nom": "Incantation",
        "description": "Sagesse. Sorts préparés = mod. de Sagesse + niveau."
      },
      {
        "niveau": 2,
        "nom": "Conduit divin",
        "description": "1 fois par repos court : Renvoi des morts-vivants, plus l'effet de ton domaine."
      }
    ],
    "choix": [
      {
        "id": "domaine",
        "niveau": 1,
        "titre": "Domaine divin",
        "nombre": 1,
        "options": [
          {
            "id": "connaissance",
            "nom": "Connaissance",
            "description": "2 langues, 2 compétences (Arcanes, Histoire, Nature, Religion) en expertise. Conduit : Connaissance des âges."
          },
          {
            "id": "duperie",
            "nom": "Duperie",
            "description": "Bénédiction du filou (avantage en Discrétion à une créature touchée). Conduit : Invoquer un double."
          },
          {
            "id": "guerre",
            "nom": "Guerre",
            "description": "Armes de guerre et armures lourdes, Prêtre de guerre (attaque bonus). Conduit : Frappe guidée (+10)."
          },
          {
            "id": "lumiere",
            "nom": "Lumière",
            "description": "Tour de magie Lumière, Éblouissement protecteur (réaction, désavantage). Conduit : Radiance de l'aube."
          },
          {
            "id": "nature",
            "nom": "Nature",
            "description": "Un tour de magie de druide, une compétence, armures lourdes. Conduit : Charmer animaux et végétaux."
          },
          {
            "id": "tempete",
            "nom": "Tempête",
            "description": "Armes de guerre et armures lourdes, Colère de la tempête (réaction, 2d8 foudre ou tonnerre). Conduit : Fureur destructrice."
          },
          {
            "id": "vie",
            "nom": "Vie",
            "description": "Armures lourdes, Disciple de la vie (soins +2 + niveau du sort). Conduit : Préservation de la vie."
          }
        ]
      }
    ],
    "magie": [
      "Tours 3 · 2 emplacements de niv. 1",
      "Tours 3 · 3 emplacements de niv. 1",
      "Tours 3 · 4 de niv. 1, 2 de niv. 2",
      "Tours 4 · 4 de niv. 1, 3 de niv. 2"
    ]
  },
  {
    "id": "druide",
    "nom": "Druide",
    "dv": 8,
    "priorite": [
      "sag",
      "con",
      "dex",
      "int",
      "cha",
      "for"
    ],
    "sauvegardes": "Intelligence, Sagesse",
    "armures": "légères, intermédiaires, boucliers (rien en métal)",
    "armes": "gourdins, dagues, fléchettes, javelots, masses, bâtons, cimeterres, faucilles, frondes, lances",
    "nbCompetences": 2,
    "competences": [
      "arcanes",
      "dressage",
      "intuition",
      "medecine",
      "nature",
      "perception",
      "religion",
      "survie"
    ],
    "traits": [
      {
        "niveau": 1,
        "nom": "Druidique",
        "description": "Langue secrète des druides."
      },
      {
        "niveau": 1,
        "nom": "Incantation",
        "description": "Sagesse. Sorts préparés = mod. de Sagesse + niveau."
      },
      {
        "niveau": 2,
        "nom": "Forme sauvage",
        "description": "2 fois par repos court : prends la forme d'une bête que tu as vue (FP 1/4 max, ni vol ni nage). Dure la moitié de ton niveau en heures."
      },
      {
        "niveau": 2,
        "nom": "Cercle druidique",
        "description": "Choix de ton cercle (ci-dessous)."
      },
      {
        "niveau": 4,
        "nom": "Forme sauvage améliorée",
        "description": "Bêtes jusqu'à FP 1/2, nage autorisée."
      }
    ],
    "choix": [
      {
        "id": "cercle",
        "niveau": 2,
        "titre": "Cercle druidique",
        "nombre": 1,
        "options": [
          {
            "id": "cercle-de-la-terre",
            "nom": "Cercle de la Terre",
            "description": "Un tour de magie de druide en plus, Récupération naturelle (regagne des emplacements au repos court), sorts de terrain."
          },
          {
            "id": "cercle-de-la-lune",
            "nom": "Cercle de la Lune",
            "description": "Forme sauvage de combat (action bonus, FP plus élevé) et Soins de la forme bestiale."
          }
        ]
      }
    ],
    "magie": [
      "Tours 2 · 2 emplacements de niv. 1",
      "Tours 2 · 3 emplacements de niv. 1",
      "Tours 2 · 4 de niv. 1, 2 de niv. 2",
      "Tours 3 · 4 de niv. 1, 3 de niv. 2"
    ]
  },
  {
    "id": "guerrier",
    "nom": "Guerrier",
    "dv": 10,
    "priorite": [
      "for",
      "con",
      "dex",
      "sag",
      "int",
      "cha"
    ],
    "sauvegardes": "Force, Constitution",
    "armures": "toutes, boucliers",
    "armes": "simples, de guerre",
    "nbCompetences": 2,
    "competences": [
      "acrobaties",
      "athletisme",
      "dressage",
      "histoire",
      "intimidation",
      "intuition",
      "perception",
      "survie"
    ],
    "traits": [
      {
        "niveau": 1,
        "nom": "Style de combat",
        "description": "Choix de ton style (ci-dessous)."
      },
      {
        "niveau": 1,
        "nom": "Second souffle",
        "description": "Action bonus, 1 fois par repos court : récupère 1d10 + ton niveau en PV."
      },
      {
        "niveau": 2,
        "nom": "Fougue",
        "description": "1 fois par repos court : une action supplémentaire pendant ton tour."
      },
      {
        "niveau": 3,
        "nom": "Archétype martial",
        "description": "Choix de ta sous-classe (ci-dessous)."
      }
    ],
    "choix": [
      {
        "id": "style",
        "niveau": 1,
        "titre": "Style de combat",
        "nombre": 1,
        "options": [
          {
            "id": "archerie",
            "nom": "Archerie",
            "description": "+2 aux jets d'attaque à distance."
          },
          {
            "id": "defense",
            "nom": "Défense",
            "description": "+1 à la CA en portant une armure."
          },
          {
            "id": "duel",
            "nom": "Duel",
            "description": "+2 aux dégâts avec une arme à une main (sans autre arme)."
          },
          {
            "id": "armes-a-deux-mains",
            "nom": "Armes à deux mains",
            "description": "Relance les 1 et 2 aux dégâts d'une arme à deux mains."
          },
          {
            "id": "protection",
            "nom": "Protection",
            "description": "En réaction avec un bouclier : désavantage à l'attaque contre un allié adjacent."
          },
          {
            "id": "combat-a-deux-armes",
            "nom": "Combat à deux armes",
            "description": "Ajoute ton modificateur aux dégâts de la seconde arme."
          }
        ]
      },
      {
        "id": "arch",
        "niveau": 3,
        "titre": "Archétype martial",
        "nombre": 1,
        "options": [
          {
            "id": "champion",
            "nom": "Champion",
            "description": "Critique sur 19-20."
          },
          {
            "id": "maitre-de-guerre",
            "nom": "Maître de guerre",
            "description": "Supériorité martiale : 4 dés de supériorité (d8) et 3 manœuvres, maîtrise d'un outil d'artisan."
          },
          {
            "id": "chevalier-occultiste",
            "nom": "Chevalier occultiste",
            "description": "Incantation (Intelligence, liste du Magicien) et Lien d'arme."
          }
        ]
      }
    ]
  },
  {
    "id": "moine",
    "nom": "Moine",
    "dv": 8,
    "priorite": [
      "dex",
      "sag",
      "con",
      "for",
      "int",
      "cha"
    ],
    "sauvegardes": "Force, Dextérité",
    "armures": "aucune",
    "armes": "simples, épées courtes",
    "nbCompetences": 2,
    "competences": [
      "acrobaties",
      "athletisme",
      "discretion",
      "histoire",
      "intuition",
      "religion"
    ],
    "traits": [
      {
        "niveau": 1,
        "nom": "Défense sans armure",
        "description": "CA = 10 + mod. de Dextérité + mod. de Sagesse, sans armure ni bouclier."
      },
      {
        "niveau": 1,
        "nom": "Arts martiaux",
        "description": "Mains nues et armes de moine : d4 de dégâts, Dextérité possible, une attaque à mains nues en action bonus."
      },
      {
        "niveau": 2,
        "nom": "Ki",
        "description": "2 points (3 à l'Écho 3, 4 à l'Écho 4), récupérés au repos court : Déluge de coups, Défense patiente, Pas du vent. DD de ki = 8 + maîtrise + mod. de Sagesse."
      },
      {
        "niveau": 2,
        "nom": "Mouvement sans armure",
        "description": "+3 m de vitesse sans armure ni bouclier."
      },
      {
        "niveau": 3,
        "nom": "Tradition monastique",
        "description": "Choix de ta sous-classe (ci-dessous)."
      },
      {
        "niveau": 3,
        "nom": "Parade de projectiles",
        "description": "Réaction : réduit une attaque à distance de 1d10 + mod. de Dextérité + niveau ; à 0, tu peux la renvoyer (1 ki)."
      },
      {
        "niveau": 4,
        "nom": "Chute ralentie",
        "description": "Réaction : réduit les dégâts de chute de 5 × ton niveau."
      }
    ],
    "choix": [
      {
        "id": "trad",
        "niveau": 3,
        "titre": "Tradition monastique",
        "nombre": 1,
        "options": [
          {
            "id": "voie-de-la-main-ouverte",
            "nom": "Voie de la Main ouverte",
            "description": "Technique de la main ouverte : le Déluge de coups peut pousser, faire tomber ou bloquer les réactions."
          },
          {
            "id": "voie-de-l-ombre",
            "nom": "Voie de l'Ombre",
            "description": "Arts de l'ombre : Ténèbres, Passage sans trace, Silence et vision dans le noir avec du ki."
          },
          {
            "id": "voie-des-quatre-elements",
            "nom": "Voie des Quatre éléments",
            "description": "Disciple des éléments : Harmonie élémentaire et une discipline élémentaire."
          }
        ]
      }
    ]
  },
  {
    "id": "paladin",
    "nom": "Paladin",
    "dv": 10,
    "priorite": [
      "for",
      "cha",
      "con",
      "sag",
      "dex",
      "int"
    ],
    "sauvegardes": "Sagesse, Charisme",
    "armures": "toutes, boucliers",
    "armes": "simples, de guerre",
    "nbCompetences": 2,
    "competences": [
      "athletisme",
      "intimidation",
      "intuition",
      "medecine",
      "persuasion",
      "religion"
    ],
    "traits": [
      {
        "niveau": 1,
        "nom": "Sens divin",
        "description": "Détecte célestes, fiélons et morts-vivants à 18 m. 1 + mod. de Charisme fois par repos long."
      },
      {
        "niveau": 1,
        "nom": "Imposition des mains",
        "description": "Réserve de 5 × ton niveau en PV à répartir par contact ; 5 PV pour guérir maladie ou poison."
      },
      {
        "niveau": 2,
        "nom": "Style de combat",
        "description": "Choix de ton style (ci-dessous)."
      },
      {
        "niveau": 2,
        "nom": "Incantation",
        "description": "Charisme. Sorts préparés = mod. de Charisme + ½ niveau."
      },
      {
        "niveau": 2,
        "nom": "Châtiment divin",
        "description": "Sur un coup au but, dépense un emplacement : 2d8 radiants (+1d8 par niveau d'emplacement au-dessus du 1er, +1d8 contre mort-vivant ou fiélon)."
      },
      {
        "niveau": 3,
        "nom": "Santé divine",
        "description": "Immunisé contre les maladies."
      },
      {
        "niveau": 3,
        "nom": "Serment sacré",
        "description": "Choix de ton serment (ci-dessous) et Conduit divin."
      }
    ],
    "choix": [
      {
        "id": "style",
        "niveau": 2,
        "titre": "Style de combat",
        "nombre": 1,
        "options": [
          {
            "id": "defense",
            "nom": "Défense",
            "description": "+1 à la CA en portant une armure."
          },
          {
            "id": "duel",
            "nom": "Duel",
            "description": "+2 aux dégâts avec une arme à une main (sans autre arme)."
          },
          {
            "id": "armes-a-deux-mains",
            "nom": "Armes à deux mains",
            "description": "Relance les 1 et 2 aux dégâts d'une arme à deux mains."
          },
          {
            "id": "protection",
            "nom": "Protection",
            "description": "En réaction avec un bouclier : désavantage à l'attaque contre un allié adjacent."
          }
        ]
      },
      {
        "id": "serment",
        "niveau": 3,
        "titre": "Serment sacré",
        "nombre": 1,
        "options": [
          {
            "id": "serment-de-devotion",
            "nom": "Serment de dévotion",
            "description": "Armes sacrées et Renvoi des impies (Conduit divin)."
          },
          {
            "id": "serment-des-anciens",
            "nom": "Serment des anciens",
            "description": "Courroux de la nature (entrave) et Renvoi des infidèles (fées, fiélons)."
          },
          {
            "id": "serment-de-vengeance",
            "nom": "Serment de vengeance",
            "description": "Vœu d'inimitié (avantage contre une cible) et Abjuration de l'ennemi."
          }
        ]
      }
    ],
    "magie": [
      "Pas encore de sorts",
      "2 emplacements de niv. 1",
      "3 emplacements de niv. 1",
      "3 emplacements de niv. 1"
    ]
  },
  {
    "id": "rodeur",
    "nom": "Rôdeur",
    "dv": 10,
    "priorite": [
      "dex",
      "sag",
      "con",
      "for",
      "int",
      "cha"
    ],
    "sauvegardes": "Force, Dextérité",
    "armures": "légères, intermédiaires, boucliers",
    "armes": "simples, de guerre",
    "nbCompetences": 3,
    "competences": [
      "athletisme",
      "discretion",
      "dressage",
      "intuition",
      "investigation",
      "nature",
      "perception",
      "survie"
    ],
    "traits": [
      {
        "niveau": 1,
        "nom": "Ennemi juré",
        "description": "Avantage aux tests de Survie pour le pister et d'Intelligence pour t'en souvenir, plus une langue en rapport."
      },
      {
        "niveau": 1,
        "nom": "Explorateur-né",
        "description": "Dans ton terrain de prédilection : double maîtrise aux tests d'Intelligence et de Sagesse liés au terrain, jamais ralenti par le terrain difficile, double ration trouvée."
      },
      {
        "niveau": 2,
        "nom": "Style de combat",
        "description": "Choix de ton style (ci-dessous)."
      },
      {
        "niveau": 2,
        "nom": "Incantation",
        "description": "Sagesse. 2 sorts connus (3 à l'Écho 3)."
      },
      {
        "niveau": 3,
        "nom": "Archétype de rôdeur",
        "description": "Choix de ta sous-classe (ci-dessous)."
      },
      {
        "niveau": 3,
        "nom": "Vigilance primitive",
        "description": "Dépense un emplacement pour sentir tes ennemis jurés à 1,5 km."
      }
    ],
    "choix": [
      {
        "id": "ennemi",
        "niveau": 1,
        "titre": "Ennemi juré",
        "nombre": 1,
        "options": [
          {
            "id": "aberrations",
            "nom": "Aberrations"
          },
          {
            "id": "betes",
            "nom": "Bêtes"
          },
          {
            "id": "celestes",
            "nom": "Célestes"
          },
          {
            "id": "constructions",
            "nom": "Constructions"
          },
          {
            "id": "dragons",
            "nom": "Dragons"
          },
          {
            "id": "elementaires",
            "nom": "Élémentaires"
          },
          {
            "id": "fees",
            "nom": "Fées"
          },
          {
            "id": "fielons",
            "nom": "Fiélons"
          },
          {
            "id": "geants",
            "nom": "Géants"
          },
          {
            "id": "monstruosites",
            "nom": "Monstruosités"
          },
          {
            "id": "morts-vivants",
            "nom": "Morts-vivants"
          },
          {
            "id": "plantes",
            "nom": "Plantes"
          },
          {
            "id": "vases",
            "nom": "Vases"
          },
          {
            "id": "deux-races-d-humanoides",
            "nom": "Deux races d'humanoïdes"
          }
        ]
      },
      {
        "id": "terrain",
        "niveau": 1,
        "titre": "Terrain de prédilection",
        "nombre": 1,
        "options": [
          {
            "id": "arctique",
            "nom": "Arctique"
          },
          {
            "id": "cote",
            "nom": "Côte"
          },
          {
            "id": "desert",
            "nom": "Désert"
          },
          {
            "id": "foret",
            "nom": "Forêt"
          },
          {
            "id": "prairie",
            "nom": "Prairie"
          },
          {
            "id": "montagne",
            "nom": "Montagne"
          },
          {
            "id": "marais",
            "nom": "Marais"
          },
          {
            "id": "outre-terre",
            "nom": "Outre-terre"
          }
        ]
      },
      {
        "id": "style",
        "niveau": 2,
        "titre": "Style de combat",
        "nombre": 1,
        "options": [
          {
            "id": "archerie",
            "nom": "Archerie",
            "description": "+2 aux jets d'attaque à distance."
          },
          {
            "id": "defense",
            "nom": "Défense",
            "description": "+1 à la CA en portant une armure."
          },
          {
            "id": "duel",
            "nom": "Duel",
            "description": "+2 aux dégâts avec une arme à une main (sans autre arme)."
          },
          {
            "id": "combat-a-deux-armes",
            "nom": "Combat à deux armes",
            "description": "Ajoute ton modificateur aux dégâts de la seconde arme."
          }
        ]
      },
      {
        "id": "arch",
        "niveau": 3,
        "titre": "Archétype de rôdeur",
        "nombre": 1,
        "options": [
          {
            "id": "chasseur",
            "nom": "Chasseur",
            "description": "Proie du chasseur : Tueur de colosses, Tueur de hordes ou Briseur de défense au choix."
          },
          {
            "id": "maitre-des-betes",
            "nom": "Maître des bêtes",
            "description": "Compagnon animal (bête FP 1/4 max) qui obéit à tes ordres, ta maîtrise s'ajoute à sa CA et ses dégâts."
          }
        ]
      }
    ],
    "magie": [
      "Pas encore de sorts",
      "Sorts connus 2 · 2 emplacements de niv. 1",
      "Sorts connus 3 · 3 emplacements de niv. 1",
      "Sorts connus 3 · 3 emplacements de niv. 1"
    ]
  },
  {
    "id": "roublard",
    "nom": "Roublard",
    "dv": 8,
    "priorite": [
      "dex",
      "con",
      "int",
      "sag",
      "cha",
      "for"
    ],
    "sauvegardes": "Dextérité, Intelligence",
    "armures": "légères",
    "armes": "simples, arbalète de poing, épée longue, rapière, épée courte",
    "nbCompetences": 4,
    "competences": [
      "acrobaties",
      "athletisme",
      "discretion",
      "escamotage",
      "intimidation",
      "intuition",
      "investigation",
      "perception",
      "persuasion",
      "representation",
      "tromperie"
    ],
    "traits": [
      {
        "niveau": 1,
        "nom": "Expertise",
        "description": "Double la maîtrise de 2 compétences."
      },
      {
        "niveau": 1,
        "nom": "Attaque sournoise",
        "description": "1d6 de dégâts en plus, une fois par tour, avec avantage ou un allié adjacent à la cible (arme à finesse ou à distance). 2d6 à l'Écho 3."
      },
      {
        "niveau": 1,
        "nom": "Jargon des voleurs",
        "description": "Langage codé et signes secrets."
      },
      {
        "niveau": 2,
        "nom": "Ruse",
        "description": "Action bonus : Foncer, Se désengager ou Se cacher."
      },
      {
        "niveau": 3,
        "nom": "Archétype roublard",
        "description": "Choix de ta sous-classe (ci-dessous)."
      }
    ],
    "choix": [
      {
        "id": "exp",
        "niveau": 1,
        "titre": "Expertise",
        "nombre": 2,
        "source": "competences"
      },
      {
        "id": "arch",
        "niveau": 3,
        "titre": "Archétype roublard",
        "nombre": 1,
        "options": [
          {
            "id": "voleur",
            "nom": "Voleur",
            "description": "Mains lestes (Escamotage ou objet en action bonus) et Travail en hauteur (escalade rapide)."
          },
          {
            "id": "assassin",
            "nom": "Assassin",
            "description": "Maîtrise du déguisement et des poisons, Assassinat (avantage contre qui n'a pas joué, critique sur les surpris)."
          },
          {
            "id": "escroc-arcanique",
            "nom": "Escroc arcanique",
            "description": "Incantation (Intelligence, liste du Magicien) et Main de mage prestidigitateur."
          }
        ]
      }
    ]
  },
  {
    "id": "ensorceleur",
    "nom": "Ensorceleur",
    "dv": 6,
    "priorite": [
      "cha",
      "con",
      "dex",
      "sag",
      "int",
      "for"
    ],
    "sauvegardes": "Constitution, Charisme",
    "armures": "aucune",
    "armes": "dagues, fléchettes, frondes, bâtons, arbalètes légères",
    "nbCompetences": 2,
    "competences": [
      "arcanes",
      "intimidation",
      "intuition",
      "persuasion",
      "religion",
      "tromperie"
    ],
    "traits": [
      {
        "niveau": 1,
        "nom": "Incantation",
        "description": "Charisme. Sorts connus (voir Magie)."
      },
      {
        "niveau": 1,
        "nom": "Origine magique",
        "description": "Choix de ton origine (ci-dessous)."
      },
      {
        "niveau": 2,
        "nom": "Source de magie",
        "description": "Points de sorcellerie : 2 (3 à l'Écho 3, 4 à l'Écho 4). Convertis des points en emplacements, et inversement."
      },
      {
        "niveau": 3,
        "nom": "Métamagie",
        "description": "2 options au choix (ci-dessous)."
      }
    ],
    "choix": [
      {
        "id": "origine",
        "niveau": 1,
        "titre": "Origine magique",
        "nombre": 1,
        "options": [
          {
            "id": "lignee-draconique",
            "nom": "Lignée draconique",
            "description": "Ancêtre draconique (langue, avantage en Charisme avec les dragons) et Résistance draconique (+1 PV par niveau, CA 13 + Dex sans armure)."
          },
          {
            "id": "magie-sauvage",
            "nom": "Magie sauvage",
            "description": "Vague de magie sauvage (table d20) et Marées du chaos (avantage une fois)."
          }
        ]
      },
      {
        "id": "meta",
        "niveau": 3,
        "titre": "Métamagie",
        "nombre": 2,
        "options": [
          {
            "id": "sort-prudent",
            "nom": "Sort prudent",
            "description": "1 point : des créatures choisies réussissent automatiquement leur sauvegarde."
          },
          {
            "id": "sort-distant",
            "nom": "Sort distant",
            "description": "1 point : portée doublée, ou 9 m pour un sort de toucher."
          },
          {
            "id": "sort-puissant",
            "nom": "Sort puissant",
            "description": "1 point : relance jusqu'à ton mod. de Charisme en dés de dégâts."
          },
          {
            "id": "sort-etendu",
            "nom": "Sort étendu",
            "description": "1 point : durée doublée (24 h max)."
          },
          {
            "id": "sort-intensifie",
            "nom": "Sort intensifié",
            "description": "3 points : désavantage à une sauvegarde de la cible."
          },
          {
            "id": "sort-accelere",
            "nom": "Sort accéléré",
            "description": "2 points : lancé en action bonus."
          },
          {
            "id": "sort-subtil",
            "nom": "Sort subtil",
            "description": "1 point : sans composantes verbales ni gestuelles."
          },
          {
            "id": "sort-jumele",
            "nom": "Sort jumelé",
            "description": "Niveau du sort en points : une seconde cible."
          }
        ]
      }
    ],
    "magie": [
      "Tours 4 · Sorts connus 2 · 2 emplacements de niv. 1",
      "Tours 4 · Sorts connus 3 · 3 de niv. 1 · 2 points",
      "Tours 4 · Sorts connus 4 · 4 de niv. 1, 2 de niv. 2 · 3 points",
      "Tours 5 · Sorts connus 5 · 4 de niv. 1, 3 de niv. 2 · 4 points"
    ]
  },
  {
    "id": "occultiste",
    "nom": "Occultiste",
    "dv": 8,
    "priorite": [
      "cha",
      "con",
      "dex",
      "sag",
      "int",
      "for"
    ],
    "sauvegardes": "Sagesse, Charisme",
    "armures": "légères",
    "armes": "simples",
    "nbCompetences": 2,
    "competences": [
      "arcanes",
      "histoire",
      "intimidation",
      "investigation",
      "nature",
      "religion",
      "tromperie"
    ],
    "traits": [
      {
        "niveau": 1,
        "nom": "Protecteur d'outre-monde",
        "description": "Choix de ton protecteur (ci-dessous)."
      },
      {
        "niveau": 1,
        "nom": "Magie de pacte",
        "description": "Charisme. Emplacements récupérés au repos court, toujours au niveau le plus haut."
      },
      {
        "niveau": 2,
        "nom": "Manifestations occultes",
        "description": "2 manifestations au choix (ci-dessous)."
      },
      {
        "niveau": 3,
        "nom": "Faveur de pacte",
        "description": "Choix de ta faveur (ci-dessous)."
      }
    ],
    "choix": [
      {
        "id": "protecteur",
        "niveau": 1,
        "titre": "Protecteur d'outre-monde",
        "nombre": 1,
        "options": [
          {
            "id": "l-archifee",
            "nom": "L'Archifée",
            "description": "Présence féerique : charme ou effraie les créatures proches (1 fois par repos court)."
          },
          {
            "id": "le-fielon",
            "nom": "Le Fiélon",
            "description": "Bénédiction du ténébreux : PV temporaires (mod. de Charisme + niveau) en réduisant une créature à 0 PV."
          },
          {
            "id": "le-grand-ancien",
            "nom": "Le Grand Ancien",
            "description": "Éveil mental : télépathie avec une créature à 9 m."
          }
        ]
      },
      {
        "id": "manif",
        "niveau": 2,
        "titre": "Manifestations occultes",
        "nombre": 2,
        "options": [
          {
            "id": "armure-d-ombres",
            "nom": "Armure d'ombres",
            "description": "Armure du mage à volonté."
          },
          {
            "id": "langage-des-betes",
            "nom": "Langage des bêtes",
            "description": "Parler aux animaux à volonté."
          },
          {
            "id": "influence-ensorcelante",
            "nom": "Influence ensorcelante",
            "description": "Avantage en Tromperie et Persuasion (maîtrise)."
          },
          {
            "id": "vision-du-diable",
            "nom": "Vision du diable",
            "description": "Voit dans les ténèbres, même magiques, à 36 m."
          },
          {
            "id": "vision-occulte",
            "nom": "Vision occulte",
            "description": "Détection de la magie à volonté."
          },
          {
            "id": "yeux-du-gardien-des-runes",
            "nom": "Yeux du gardien des runes",
            "description": "Lit toutes les écritures."
          },
          {
            "id": "vigueur-fielonne",
            "nom": "Vigueur fiélonne",
            "description": "Fausse vie à volonté."
          },
          {
            "id": "regard-de-deux-esprits",
            "nom": "Regard de deux esprits",
            "description": "Perçoit par les sens d'une créature consentante touchée."
          },
          {
            "id": "masque-aux-mille-visages",
            "nom": "Masque aux mille visages",
            "description": "Déguisement à volonté."
          },
          {
            "id": "visions-brumeuses",
            "nom": "Visions brumeuses",
            "description": "Image silencieuse à volonté."
          },
          {
            "id": "voleur-des-cinq-destins",
            "nom": "Voleur des cinq destins",
            "description": "Fléau une fois par repos long."
          }
        ]
      },
      {
        "id": "faveur",
        "niveau": 3,
        "titre": "Faveur de pacte",
        "nombre": 1,
        "options": [
          {
            "id": "pacte-de-la-chaine",
            "nom": "Pacte de la Chaîne",
            "description": "Invoque un familier amélioré (diablotin, quasit, pseudo-dragon, lutin)."
          },
          {
            "id": "pacte-de-la-lame",
            "nom": "Pacte de la Lame",
            "description": "Invoque une arme de pacte."
          },
          {
            "id": "pacte-du-tome",
            "nom": "Pacte du Tome",
            "description": "Livre des ombres : 3 tours de magie de n'importe quelle classe."
          }
        ]
      }
    ],
    "magie": [
      "Tours 2 · Sorts connus 2 · 1 emplacement de niv. 1",
      "Tours 2 · Sorts connus 3 · 2 emplacements de niv. 1",
      "Tours 2 · Sorts connus 4 · 2 emplacements de niv. 2",
      "Tours 3 · Sorts connus 5 · 2 emplacements de niv. 2"
    ]
  },
  {
    "id": "magicien",
    "nom": "Magicien",
    "dv": 6,
    "priorite": [
      "int",
      "con",
      "dex",
      "sag",
      "cha",
      "for"
    ],
    "sauvegardes": "Intelligence, Sagesse",
    "armures": "aucune",
    "armes": "dagues, fléchettes, frondes, bâtons, arbalètes légères",
    "nbCompetences": 2,
    "competences": [
      "arcanes",
      "histoire",
      "intuition",
      "investigation",
      "medecine",
      "religion"
    ],
    "traits": [
      {
        "niveau": 1,
        "nom": "Incantation",
        "description": "Intelligence. Grimoire de 6 sorts (+2 par niveau), sorts préparés = mod. d'Intelligence + niveau, lancement en rituel."
      },
      {
        "niveau": 1,
        "nom": "Restauration arcanique",
        "description": "1 fois par jour, repos court : récupère des emplacements (niveau cumulé ≤ ½ niveau, aucun de niv. 6 ou plus)."
      },
      {
        "niveau": 2,
        "nom": "Tradition arcanique",
        "description": "Choix de ton école (ci-dessous)."
      }
    ],
    "choix": [
      {
        "id": "ecole",
        "niveau": 2,
        "titre": "Tradition arcanique",
        "nombre": 1,
        "options": [
          {
            "id": "abjuration",
            "nom": "Abjuration",
            "description": "Gardien arcanique : une barrière qui absorbe des dégâts."
          },
          {
            "id": "divination",
            "nom": "Divination",
            "description": "Prodige : deux dés d20 gardés d'avance pour remplacer des jets."
          },
          {
            "id": "enchantement",
            "nom": "Enchantement",
            "description": "Regard hypnotique : charmer et neutraliser une créature."
          },
          {
            "id": "evocation",
            "nom": "Évocation",
            "description": "Sculpter les sorts : tes alliés sont épargnés par tes zones."
          },
          {
            "id": "illusion",
            "nom": "Illusion",
            "description": "Illusion mineure améliorée : en plus d'un autre tour de magie."
          },
          {
            "id": "invocation",
            "nom": "Invocation",
            "description": "Invocation mineure : crée un objet inanimé."
          },
          {
            "id": "necromancie",
            "nom": "Nécromancie",
            "description": "Moissonneur lugubre : regagne des PV en tuant avec un sort."
          },
          {
            "id": "transmutation",
            "nom": "Transmutation",
            "description": "Alchimie mineure : transforme temporairement des matériaux."
          }
        ]
      }
    ],
    "magie": [
      "Tours 3 · 2 emplacements de niv. 1",
      "Tours 3 · 3 emplacements de niv. 1",
      "Tours 3 · 4 de niv. 1, 2 de niv. 2",
      "Tours 4 · 4 de niv. 1, 3 de niv. 2"
    ]
  }
];
