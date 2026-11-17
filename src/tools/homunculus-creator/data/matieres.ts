// Fichier de données : modifiable sans toucher au code. Voir README.md (section « Données »).
import type { Matiere } from "../types";

/** Source de vérité côté Notion : page « Un dieu des étoiles ? » > tableau « Les matières ». Un palier = deux Échos (1-2, 3-4...). */
export const MATIERES: Matiere[] = [
  {
    "id": "etoile-filante",
    "nom": "Étoile filante",
    "palier": "1-2",
    "echoMin": 1,
    "type": "Soutien",
    "capacite": "Vœu d’étoile filante",
    "effet": "3 fois par repos long, quand l’homunculus ou une créature, où qu’elle soit, rate un jet quelconque (sauf jet de sauvegarde contre la mort), le jet devient une réussite. Contrecoup : le MJ inflige une conséquence à une autre créature à 9 m de celle qui a raté (alliés compris), proportionnelle à l’écart d’échec : de peu (1-4) mineure, moyenne (5-9), grave (10 ou plus)",
    "faiblesse": "Inutilisable si aucune autre créature n’est à 9 m de celle qui a raté son jet"
  },
  {
    "id": "roche-de-meteorite",
    "nom": "Roche de météorite",
    "palier": "1-2",
    "echoMin": 1,
    "type": "Défense",
    "capacite": "Endurance de la pierre (trait de Goliath, VGM)",
    "effet": "en réaction, réduit les dégâts subis de 1d12 + mod. de Constitution, PB fois par repos long",
    "faiblesse": "Vitesse −3 m, coule dans l’eau"
  },
  {
    "id": "eclipse",
    "nom": "Éclipse",
    "palier": "1-2",
    "echoMin": 1,
    "type": "RP",
    "capacite": "Double visage",
    "effet": "deux visages définis à la création, qui changent l’apparence (carrure, sexe, taille sous certaine limite), mais le personnage reste le même (mêmes PV, compétences, stats, équipement et mémoire). Changer prend une action, jamais sous le regard de quelqu’un. Un témoin qui n’a vu qu’un visage ne peut pas faire le lien avec l’autre, sauf par la magie. Un crime commis avec un visage ne peut donc pas être reproché à l’autre",
    "faiblesse": "Les blessures, cicatrices et la marque restent visibles sur les deux visages"
  },
  {
    "id": "metal-asteroide",
    "nom": "Métal astéroïde",
    "palier": "1-2",
    "echoMin": 1,
    "type": "Dégâts",
    "capacite": "Magnétisme (Catapulte, XGE)",
    "effet": "une fois par repos court, projette un objet métallique à portée de main (2 kg max) sur une cible à 27 m, sauvegarde de Dextérité, 3d8 de contondants",
    "faiblesse": "Désavantage aux sauvegardes contre la foudre"
  },
  {
    "id": "rayonnement-solaire",
    "nom": "Rayonnement solaire",
    "palier": "3-4",
    "echoMin": 3,
    "type": "Dégâts",
    "capacite": "Engranger",
    "effet": "gagne 1 charge à la fin de chaque tour de combat passé au soleil, près d’une flamme ou après des dégâts de feu (maximum : 2 × PB). Les charges sont perdues à la fin du combat. En action, il libère tout sur une cible à 9 m : sauvegarde de Dextérité, 1d6 de feu par charge, moitié si réussie",
    "faiblesse": "En milieu froid (sous 0 °C, glace ou neige, ou dégâts de froid subis au tour précédent), aucune charge gagnée et vitesse −3 m"
  },
  {
    "id": "geysers-d-encelade",
    "nom": "Geysers d’Encelade",
    "palier": "3-4",
    "echoMin": 3,
    "type": "Utilité",
    "capacite": "Brume de vapeur (Nappe de brouillard)",
    "effet": "une fois par repos court, sphère de brouillard de 6 m de rayon qui obscurcit fortement la zone pendant 1 heure (concentration)",
    "faiblesse": "Désavantage aux sauvegardes contre le froid"
  },
  {
    "id": "matiere-noire",
    "nom": "Matière noire",
    "palier": "3-4",
    "echoMin": 3,
    "type": "RP",
    "capacite": "Absence de lumière (Invisibilité)",
    "effet": "une fois par repos court, une créature touchée devient invisible pendant 1 heure, jusqu’à ce qu’elle attaque ou lance un sort",
    "faiblesse": "Vulnérable aux dégâts radiants"
  },
  {
    "id": "poussiere-cosmique",
    "nom": "Poussière cosmique",
    "palier": "3-4",
    "echoMin": 3,
    "type": "Utilité",
    "capacite": "Intangible",
    "effet": "une fois par repos court, jusqu’à la fin de son prochain tour, il traverse créatures et objets de moins de 30 cm d’épaisseur, mais ne peut ni attaquer ni lancer de sort, et ne peut pas terminer son déplacement à l’intérieur",
    "faiblesse": "Désavantage aux sauvegardes contre les effets de zone"
  }
];
