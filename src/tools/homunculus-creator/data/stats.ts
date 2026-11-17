// Fichier de données : modifiable sans toucher au code. Voir README.md (section « Données »).
import type { StatDef } from "../types";

export const STATS: StatDef[] = [
  {
    "id": "for",
    "abbr": "FOR",
    "nom": "Force"
  },
  {
    "id": "dex",
    "abbr": "DEX",
    "nom": "Dextérité"
  },
  {
    "id": "con",
    "abbr": "CON",
    "nom": "Constitution"
  },
  {
    "id": "int",
    "abbr": "INT",
    "nom": "Intelligence"
  },
  {
    "id": "sag",
    "abbr": "SAG",
    "nom": "Sagesse"
  },
  {
    "id": "cha",
    "abbr": "CHA",
    "nom": "Charisme"
  }
];

/** Plafond d'une caractéristique (après augmentations). */
export const STAT_MAX = 17;
