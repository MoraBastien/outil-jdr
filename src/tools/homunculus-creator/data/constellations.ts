// Fichier de données : modifiable sans toucher au code. Voir README.md (section « Données »).
import type { ConstellationDef } from "../types";

/** Une étoile par étape de création (6). `stars` : coordonnées dans un viewBox 200×250, dans l'ordre des étapes. */
export const CONSTELLATIONS: ConstellationDef[] = [
  {
    "id": "orion",
    "nom": "Orion",
    "alpha": "Rigel",
    "alphaIndex": 5,
    "stars": [
      [
        58,
        34
      ],
      [
        142,
        44
      ],
      [
        84,
        112
      ],
      [
        122,
        104
      ],
      [
        64,
        184
      ],
      [
        146,
        176
      ]
    ],
    "lines": [
      [
        0,
        1
      ],
      [
        0,
        2
      ],
      [
        1,
        3
      ],
      [
        2,
        3
      ],
      [
        2,
        4
      ],
      [
        3,
        5
      ]
    ]
  },
  {
    "id": "grande-ourse",
    "nom": "Grande Ourse",
    "alpha": "Dubhe",
    "alphaIndex": 3,
    "stars": [
      [
        20,
        70
      ],
      [
        62,
        88
      ],
      [
        104,
        100
      ],
      [
        150,
        66
      ],
      [
        166,
        118
      ],
      [
        112,
        140
      ]
    ],
    "lines": [
      [
        0,
        1
      ],
      [
        1,
        2
      ],
      [
        2,
        3
      ],
      [
        3,
        4
      ],
      [
        4,
        5
      ],
      [
        5,
        2
      ]
    ]
  },
  {
    "id": "lyre",
    "nom": "Lyre",
    "alpha": "Véga",
    "alphaIndex": 0,
    "stars": [
      [
        70,
        30
      ],
      [
        60,
        74
      ],
      [
        96,
        80
      ],
      [
        140,
        110
      ],
      [
        152,
        172
      ],
      [
        104,
        150
      ]
    ],
    "lines": [
      [
        0,
        1
      ],
      [
        0,
        2
      ],
      [
        1,
        2
      ],
      [
        2,
        3
      ],
      [
        3,
        4
      ],
      [
        4,
        5
      ],
      [
        5,
        2
      ]
    ]
  },
  {
    "id": "cygne",
    "nom": "Cygne",
    "alpha": "Deneb",
    "alphaIndex": 0,
    "stars": [
      [
        100,
        22
      ],
      [
        100,
        98
      ],
      [
        100,
        148
      ],
      [
        100,
        188
      ],
      [
        40,
        112
      ],
      [
        160,
        72
      ]
    ],
    "lines": [
      [
        0,
        1
      ],
      [
        1,
        2
      ],
      [
        2,
        3
      ],
      [
        1,
        4
      ],
      [
        1,
        5
      ]
    ]
  },
  {
    "id": "scorpion",
    "nom": "Scorpion",
    "alpha": "Antarès",
    "alphaIndex": 2,
    "stars": [
      [
        52,
        26
      ],
      [
        74,
        62
      ],
      [
        86,
        108
      ],
      [
        96,
        150
      ],
      [
        136,
        184
      ],
      [
        168,
        152
      ]
    ],
    "lines": [
      [
        0,
        1
      ],
      [
        1,
        2
      ],
      [
        2,
        3
      ],
      [
        3,
        4
      ],
      [
        4,
        5
      ]
    ]
  },
  {
    "id": "couronne-boreale",
    "nom": "Couronne boréale",
    "alpha": "Gemma",
    "alphaIndex": 3,
    "stars": [
      [
        26,
        150
      ],
      [
        36,
        108
      ],
      [
        62,
        72
      ],
      [
        100,
        54
      ],
      [
        138,
        64
      ],
      [
        166,
        96
      ]
    ],
    "lines": [
      [
        0,
        1
      ],
      [
        1,
        2
      ],
      [
        2,
        3
      ],
      [
        3,
        4
      ],
      [
        4,
        5
      ]
    ]
  }
];
