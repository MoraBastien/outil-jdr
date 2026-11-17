// Fichier de données : modifiable sans toucher au code. Voir README.md (section « Données »).
import type { Anomalie } from "../types";

/** `provisoire: true` = proposition en attente de validation par le MJ. Les trois « provisoires » sont des options recommandées, pas encore tranchées. */
export const ANOMALIES: Anomalie[] = [
  {
    "id": "brute",
    "famille": "Combat",
    "nom": "Brute",
    "passif": "Compte comme une taille au-dessus pour porter, pousser, traîner et agripper.",
    "cuve": "Trop de matière dans le moule."
  },
  {
    "id": "colosse",
    "famille": "Combat",
    "nom": "Colosse",
    "passif": "Ne peut être ni déplacé de force ni jeté à terre contre son gré, sauf par une créature de deux tailles au-dessus.",
    "cuve": "Un socle plutôt qu'un corps."
  },
  {
    "id": "rempart",
    "famille": "Combat",
    "nom": "Rempart",
    "passif": "Quand il touche avec une attaque d'opportunité, la cible voit sa vitesse tomber à 0 jusqu'à la fin de son tour.",
    "cuve": "Fait pour garder une porte."
  },
  {
    "id": "lame-vive",
    "famille": "Combat",
    "nom": "Lame vive",
    "passif": "Se libère automatiquement d'une prise, d'une agrippe ou de liens non magiques.",
    "cuve": "Le moule était trop étroit pour le ralentir.",
    "provisoire": true
  },
  {
    "id": "traqueur",
    "famille": "Combat",
    "nom": "Traqueur",
    "passif": "Suit à la trace toute créature ou objet qu'il a touché ou vu depuis moins de 24 h, sans test, même sur la pierre ou dans l'eau.",
    "cuve": "Rien ne lui échappe longtemps.",
    "provisoire": true
  },
  {
    "id": "funambule",
    "famille": "Exploration",
    "nom": "Funambule",
    "passif": "Ne subit aucun dégât de chute sur moins de 18 m et retombe toujours sur ses pieds.",
    "cuve": "Un équilibre qu'aucun corps ne devrait avoir.",
    "provisoire": true
  },
  {
    "id": "sentinelle",
    "famille": "Exploration",
    "nom": "Sentinelle",
    "passif": "Ne peut pas être surpris et voit les créatures invisibles à 9 m.",
    "cuve": "Ses yeux ne se ferment jamais tout à fait."
  },
  {
    "id": "increvable",
    "famille": "Exploration",
    "nom": "Increvable",
    "passif": "Immunisé au poison et à la maladie, n'a besoin ni de manger, ni de boire, ni de respirer.",
    "cuve": "On ne lui a jamais appris à s'éteindre."
  },
  {
    "id": "augure",
    "famille": "Exploration",
    "nom": "Augure",
    "passif": "Sent la magie et les fragments d'étoile à 9 m, et détecte les mensonges.",
    "cuve": "Trempé trop près d'un fragment."
  },
  {
    "id": "erudit",
    "famille": "Social",
    "nom": "Érudit",
    "passif": "Comprend toute langue parlée ou écrite.",
    "cuve": "Un livre est tombé dans la cuve."
  },
  {
    "id": "voix-du-maitre",
    "famille": "Social",
    "nom": "Voix du Maître",
    "passif": "Communique par télépathie, en mots, avec une créature qu'il voit. Elle peut lui répondre.",
    "cuve": "Un fil le relie encore à la tour."
  },
  {
    "id": "echo-vocal",
    "famille": "Social",
    "nom": "Écho vocal",
    "passif": "Imite à la perfection toute voix ou tout son qu'il a déjà entendu.",
    "cuve": "Il garde tout ce qu'il entend."
  }
];
