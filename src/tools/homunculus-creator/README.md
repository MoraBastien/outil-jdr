# homunculus-creator — « Atelier de Rigel » (BETA 0.2.0-beta)

> **À l'attention de Claude Code.** Ce document décrit un outil autonome destiné à être branché dans un site plus grand, développé en Next.js. Lis-le en entier avant de toucher au code : il explique à quoi sert l'outil, comment il fonctionne, ce qu'il attend du site hôte et vers quoi il doit évoluer. Le propriétaire du projet (Tiank) parle français : l'interface, les données et les messages sont en français ; le code et les identifiants techniques sont en anglais/français mixte, comme dans les fichiers existants.

**Statut : bêta.** Version `0.2.0-beta`, « la Forge stellaire » (voir `meta.ts` et `CHANGELOG.md`). L'API publique, les types et certains ids de données peuvent encore changer. Un badge « Bêta » s'affiche dans l'en-tête de l'outil (désactivable avec `showBeta={false}`).

---

## 1. À quoi sert l'outil

Tiank est MJ de D&D 5e et écrit des **one-shots** (parties uniques) qui se déroulent dans un même univers : un personnage, **Rigel Sterne, l'Astronome**, « Maître » des homunculus, envoie à chaque chapitre un **homunculus jetable** chercher des **fragments d'étoile**. Les joueurs incarnent ces homunculus.

L'outil permet à un joueur (ou au MJ) de **créer son homunculus tout seul**, comme un personnage D&D :

| Étape | Équivalent D&D | Rôle |
|---|---|---|
| 1. **Écho** | niveau du personnage | Niveau de l'homunculus. Fixé par le MJ pour le one-shot, il monte de 1 à chaque one-shot (les joueurs commencent à l'Écho 1). Il ne change jamais en cours de mission. |
| 2. **Matière** | race | Une capacité + une faiblesse. Débloquée par palier d'Écho (1-2, 3-4...). |
| 3. **Classe** | classe | Classe D&D 5e officielle, au niveau de l'Écho, avec ses compétences, traits et choix. |
| 4. **Caractéristiques** | jets de dés | 4d5 en retirant le plus bas, six fois, répartis librement. |
| 5. **Anomalie** | background | Un passif fixe + 2 compétences au choix. |
| 6. **Fêlure** | trait de personnalité | Un détail amusant tiré au d20. |
| 7. **Identité** | — | Nom, marque, mission du chapitre. |

Principe de design important : **la puissance vient de l'Écho et de la classe, pas de la matière.** La matière reste un outil de « theorycraft » : elle ne doit pas rendre un personnage nettement meilleur qu'un autre. Les caractéristiques ont été volontairement baissées (d5 au lieu de d6) pour cette raison.

---

## 2. Intégration dans le site hôte

### Prérequis

- Next.js 14+ avec **App Router**, React 18+ (testé : Next 15.1, React 19, TypeScript 5.7 strict avec `noUnusedLocals`). React 18 n'a pas été testé mais n'utilise aucune API de React 19.
- TypeScript. Aucune dépendance npm supplémentaire.
- Un import CSS global depuis un composant (autorisé par l'App Router). Le fichier `styles.css` est importé par le composant lui-même.

### Installation

1. Copier le dossier dans le projet : `src/tools/homunculus-creator/`.
2. (Facultatif) alias `@/*` → `src/*` dans `tsconfig.json`, utilisé dans les exemples.
3. Importer :

```tsx
// src/app/outils/homunculus/page.tsx  (composant serveur)
import { HomunculusCreator } from "@/tools/homunculus-creator";

export default function Page() {
  return <HomunculusCreator ambient />;
}
```

### Deux entrées de module

- `@/tools/homunculus-creator` : le composant React (client), les types, les données, la logique pure.
- `@/tools/homunculus-creator/server` : **données et logique pures uniquement**, sans React ni CSS. À utiliser dans les route handlers, server actions et scripts (jets de dés, validation, calcul des PV).

### Piège de l'App Router : les fonctions ne passent pas du serveur au client

`dice`, `storage`, `onChange` et `onSubmit` sont des fonctions. Un composant **serveur** ne peut pas les passer à un composant **client**. Il faut les définir dans un petit composant client du site hôte :

```tsx
// HostClient.tsx
"use client";
import { HomunculusCreator, type DiceProvider } from "@/tools/homunculus-creator";

const serverDice: DiceProvider = {
  async rollStats() {
    const r = await fetch("/api/dice", { method: "POST", body: JSON.stringify({ kind: "stats" }) });
    return (await r.json()).pool as number[];
  },
  async rollFelure(sides) {
    const r = await fetch("/api/dice", { method: "POST", body: JSON.stringify({ kind: "felure", sides }) });
    return (await r.json()).value as number;
  },
};

export default function HostClient({ echo }: { echo: number }) {
  return (
    <HomunculusCreator
      echo={echo}               // Écho imposé par le one-shot (le joueur ne peut pas le changer)
      dice={serverDice}         // jets côté serveur
      storage={null}            // pas de registre navigateur : on enregistre via onSubmit
      onSubmit={async (state) => { await fetch("/api/homunculus", { method: "POST", body: JSON.stringify(state) }); }}
    />
  );
}
```

Côté serveur (exemple vérifié, route handler `app/api/dice/route.ts`) :

```ts
import { NextResponse } from "next/server";
import { roll4d5, randomInt } from "@/tools/homunculus-creator/server";

export async function POST(req: Request) {
  const { kind, sides } = (await req.json()) as { kind: "stats" | "felure"; sides?: number };
  if (kind === "stats") return NextResponse.json({ pool: Array.from({ length: 6 }, roll4d5).sort((a, b) => b - a) });
  return NextResponse.json({ value: randomInt(sides ?? 20) + 1 });
}
```

Et la **re-validation de la fiche reçue** (ne jamais faire confiance au client) :

```ts
import { derive, normalize, type HomunculusState } from "@/tools/homunculus-creator/server";

export async function POST(req: Request) {
  const state = normalize((await req.json()) as HomunculusState); // nettoie ids inconnus, choix verrouillés, excès
  const d = derive(state);                                         // PV, DD, étapes terminées...
  return Response.json({ ok: d.complete, pv: d.pv, dd: d.dd });
}
```

### Props du composant `HomunculusCreator`

| Prop | Type | Défaut | Rôle |
|---|---|---|---|
| `initialState` | `Partial<HomunculusState>` | — | Reprendre une fiche existante. |
| `echo` | `number` | — | Écho imposé (le MJ le fixe pour le one-shot). Verrouille aussi les boutons d'Écho. |
| `echoLocked` | `boolean` | `false` | Verrouille l'Écho sans le fixer. |
| `maxEcho` | `number` | `4` | Écho maximum proposé. Les données couvrent 1 à 4. |
| `dice` | `DiceProvider` | `clientDice` | Fournisseur de dés. **Remplacer par un appel serveur en production.** |
| `storage` | `HomunculusStorage \| null` | `localStorage` | Registre des fiches. `null` le désactive (masque aussi « Enregistrer » et le registre). |
| `onChange` | `(state, derived) => void` | — | Appelé à chaque modification (après le montage). |
| `onSubmit` | `(state, derived) => void \| Promise<void>` | — | Affiche un bouton d'envoi, actif quand les 6 étapes sont terminées. |
| `submitLabel` | `string` | « Envoyer la fiche » | Libellé du bouton d'envoi. |
| `readOnly` | `boolean` | `false` | Affichage seul (fiche d'un autre joueur, vue MJ). |
| `theme` | `"auto" \| "dark" \| "light"` | `"auto"` | `auto` suit `prefers-color-scheme`. |
| `ambient` | `boolean` | `false` | Nébuleuses floues derrière les panneaux (utile si le fond du site est uni). |
| `showBeta` | `boolean` | `true` | Badge « Bêta ». |
| `className` | `string` | — | Classe ajoutée sur la racine. |

### Habillage (thème)

Tout le CSS est dans `styles.css`, **préfixé `hc-` et limité à `.hc-root`** : aucun style global, rien ne fuit vers le site. Les couleurs et polices sont des variables CSS surchargeables :

```css
.hc-root {
  --hc-accent: #f2c66d;                      /* or de Rigel */
  --hc-font-display: var(--font-cormorant), Georgia, serif;  /* ex. next/font */
  --hc-font-body: var(--font-inter), system-ui, sans-serif;
  --hc-sticky-top: 72px;                     /* décalage si le site a une barre de navigation fixe */
}
```

Polices d'origine : Cormorant Garamond (titres), Inter (texte), IBM Plex Mono (étiquettes). Le module ne charge **aucune** police : c'est au site hôte de les fournir (`next/font`), sinon les replis (Georgia, système) s'appliquent.

Le style est celui de la **Forge stellaire** : panneaux sombres, fil de lumière entre les étapes et, à droite,
la cuve (`components/Forge.tsx`, canvas) où l'être prend **forme humaine, en constellation** : chaque choix
(matière, classe, caractéristiques, Écho, Anomalie, Fêlure, nom) change son aspect, jusqu'à l'éveil. L'accent de tout l'Atelier suit la matière choisie : le
composant pose `--hc-accent-1`, `--hc-accent-2`, `--hc-forge-glow` et `--hc-veil` sur `.hc-root` depuis
`data/forge.ts` (les surcharger côté site écrase donc ce comportement). Repli en fond opaque si `backdrop-filter`
n'est pas supporté ; animations coupées si « moins d'animations ». Sur grand écran (≥ 961 px) la constellation et la fiche de cuve restent collées en haut pendant le défilement (`position: sticky` : aucun ancêtre ne doit avoir `overflow: hidden/auto`).

---

## 3. Architecture

```
homunculus-creator/
├─ index.ts                 entrée publique (composant, types, données, logique)
├─ server.ts                entrée serveur (données + logique, sans React/CSS)
├─ meta.ts                  TOOL_META : id, nom, version, statut, schemaVersion
├─ types.ts                 tous les types (HomunculusState, DiceProvider, HomunculusStorage, props...)
├─ HomunculusCreator.tsx    composant racine ("use client") : état, dés, stockage, mise en page
├─ styles.css               styles scopés .hc-root / .hc-*
├─ data/                    DONNÉES DÉCLARATIVES (à modifier sans toucher au code)
│  ├─ matieres.ts  classes.ts  anomalies.ts  felures.ts
│  ├─ competences.ts  stats.ts  constellations.ts
├─ lib/                     logique pure (testable, utilisable côté serveur)
│  ├─ rules.ts              maîtrise, PV, DD, augmentations, `derive()`
│  ├─ state.ts              reducer, `createInitialState()`, `normalize()`
│  ├─ dice.ts               4d5, `clientDice`
│  ├─ storage.ts            adaptateur localStorage
│  └─ sheet.ts              texte brut de la fiche
└─ components/              Steps.tsx (7 étapes), Sheet.tsx, Registry.tsx, Constellation.tsx
```

### Flux de données

`HomunculusState` (sérialisable, c'est ce qu'on stocke) → `reducer` (toutes les règles de cohérence : verrous d'Écho, quotas de compétences, purge des choix) → `derive(state)` calcule `DerivedSheet` (PV, DD, modificateurs, étapes terminées) → composants.

`HomunculusState` contient : `schemaVersion`, `id`, `echo`, `matiereId`, `classeId`, `pool` (6 résultats de 4d5), `assign` (index du dé pour chaque caractéristique), `bonus` (points d'augmentation), `competencesAnomalie`, `competencesClasse`, `choix` (choix de classe), `anomalieId`, `felureId`, `jets`, `felJets` (compteurs de tirages, donc de relances), `nom`, `marque`, `mission`, `constellationId`.

### Règles d'architecture à respecter

- **Ids stables.** Tout est référencé par id (`"etoile-filante"`, `"roublard"`, `"tic-stellaire"`). Ne jamais renommer un id sans migration : les fiches stockées en base pointent dessus. `normalize()` remet une fiche ancienne dans un état cohérent (id inconnu → champ vidé) mais ne remplace pas une vraie migration. En cas de changement de forme de l'état, incrémenter `schemaVersion` et écrire la migration.
- **Hydratation.** `createInitialState()` est volontairement **déterministe** (pas d'aléa, pas d'id) pour que le rendu serveur et le premier rendu client soient identiques. L'id de fiche et la constellation aléatoire sont posés après le montage (action `hydrate`). Ne pas appeler `Math.random()` ou `crypto` pendant le rendu.
- **Données déclaratives.** Les règles de contenu vivent dans `data/`, pas dans les composants.
- **CSS.** Toute nouvelle règle commence par `.hc-root` et utilise des classes `hc-*` ; pas de sélecteur d'élément nu.
- **Pas de dépendance** supplémentaire sans raison forte.

---

## 4. Règles du système (à ne pas casser)

- **Écho** : 1 à 4 pour l'instant. Palier = deux Échos. Bonus de maîtrise (BM) : +2 (Écho 1-4), +3 (5-8), +4 (9-10). Le niveau de classe = l'Écho. Pas de don : à l'Écho 4 la classe donne **+2 points de caractéristique à répartir**, et +2 de plus à l'Écho 8.
- **Caractéristiques** : 6 jets de **4d5** (le plus bas retiré), moyenne ≈ 10,4, maximum 15, plafond **17** après augmentations. Un d5 s'obtient avec un d10 divisé par 2 (arrondi au supérieur). Les jets sont triés par ordre décroissant ; « Répartir selon la classe » suit `priorite` de la classe.
- **PV** : dé de vie au niveau 1, puis (dé/2 + 1) par niveau suivant, plus mod. de Constitution par niveau, minimum 1 par niveau (`hitPoints`).
- **DD** des capacités de matière : 8 + BM + mod. de Constitution (`saveDC`).
- **Matière** : une capacité et une faiblesse. Déblocage par palier d'Écho (`echoMin`). Pas de puissance cachée : les capacités imitent des sorts ou traits 5e officiels (niveau de sort ≈ ⌈Écho / 2⌉). Fréquences : sorts de niveau 1-2 une fois par repos court, niveau 3+ une fois par repos long, tours de magie BM fois par repos long.
  - Matières actuelles : **palier 1-2** : Étoile filante (soutien), Roche de météorite (défense), Éclipse (RP), Métal astéroïde (dégâts). **Palier 3-4** : Rayonnement solaire (dégâts), Geysers d'Encelade (utilité), Matière noire (RP), Poussière cosmique (utilité).
  - Remarque : toutes les matières d'un palier sont disponibles dès son premier Écho (Éclipse et Métal astéroïde ont été pensées pour l'Écho 2). Voir « Points ouverts ».
- **Classe** : 12 classes de base, niveaux 1 à 4 (traits, choix, magie, compétences). Choix interactifs : sous-classes, styles de combat, expertise, ennemi juré, terrain, métamagie, manifestations occultes, faveur de pacte. Un choix n'existe qu'à partir de son niveau (sinon « verrouillé »). L'étape « classe » n'est terminée que lorsque toutes les compétences **et** tous les choix actifs sont faits.
- **Compétences** : l'Anomalie en donne 2 (au choix parmi les 18), la classe en donne N parmi sa liste. **Une compétence cochée dans la classe est aussi cochée dans l'Anomalie, et inversement** (bord pointillé), et se décoche depuis l'un ou l'autre. Elle ne compte qu'une fois, dans la section où elle a été cochée en premier. Les choix d'expertise ne proposent que des compétences maîtrisées.
- **Anomalie** : « background » de l'homunculus. **Uniquement un passif** (pas d'actif, pas de statistiques) : le choix de design est qu'une Anomalie casse une règle ou ouvre une porte narrative, sans avantage conditionnel. Trois familles : Combat, Exploration, Social. Chaque Anomalie a un clin d'œil « cuve » (ce que la cuve a laissé de travers).
- **Fêlure** : trait amusant tiré au d20 (index + 1 = résultat), « pour le plaisir de jouer, pas pour punir ». Relances comptées sur la fiche.
- **Progression** : la constellation (6 étoiles) s'allume, une étoile par étape terminée dans cet ordre : matière, classe complète, caractéristiques toutes affectées, Anomalie + 2 compétences, Fêlure, nom. Aux 6/6 elle devient dorée et affiche son étoile principale. 6 formes simplifiées (Orion, Grande Ourse, Lyre, Cygne, Scorpion, Couronne boréale), tirée au hasard à chaque nouvelle fiche.
- **Relances** : les relances de caractéristiques et de Fêlure sont autorisées mais **comptées et visibles sur la fiche** (`jets - 1`, `felJets - 1`) : le MJ voit si un joueur a relancé.

---

## 5. Données : où modifier quoi

| Fichier | Contenu | Source de vérité |
|---|---|---|
| `data/matieres.ts` | 8 matières | Notion : page « Un dieu des étoiles ? », tableau « Les matières » |
| `data/classes.ts` | 12 classes, niveaux 1-4 | Règles 5e de base (noms français approchants : à comparer avec le livre) |
| `data/anomalies.ts` | 12 Anomalies | À valider par Tiank (voir ci-dessous) |
| `data/felures.ts` | 20 Fêlures | **Provisoires** : Tiank a ses propres idées |
| `data/competences.ts`, `stats.ts` | 18 compétences, 6 caractéristiques, plafond 17 | — |
| `data/constellations.ts` | 6 constellations de 6 étoiles | — |
| `data/forge.ts` | Apparence de la cuve : couleurs et particules par matière, sceau par classe, effet par famille d'Anomalie | — |

Un drapeau `provisoire: true` marque les entrées en attente de validation ; l'interface l'affiche sur les Anomalies. Ne le retirer que sur demande de Tiank.

---

## 6. Anti-triche

Contexte : le MJ veut éviter que les joueurs trichent (par exemple en « suicidant » un homunculus pour monter en puissance, ou en truquant leurs jets). Principes retenus :

1. **L'Écho ne monte que quand l'objectif du chapitre est réussi**, décidé par le MJ — jamais par le joueur. L'Écho doit donc être fixé côté serveur et passé via la prop `echo`.
2. **Les dés se lancent côté serveur** : implémenter `DiceProvider` avec un appel API, et **stocker le résultat côté serveur** (journal des jets). Le `clientDice` par défaut est falsifiable (outils de développement, requêtes forgées) ; il ne sert qu'au développement.
3. **Le serveur re-valide toute fiche** reçue (`normalize` + `derive`) et vérifie qu'elle correspond au `pool` qu'il a lui-même tiré.
4. **Le MJ valide la fiche** avant la partie (voir feuille de route).
5. Les relances restent comptées et visibles.

---

## 7. Feuille de route (évolutions visées)

Ordre indicatif, du plus proche au plus lointain. Les points marqués ★ dépendent du site hôte.

1. ★ **Comptes et rôles** : MJ / joueur (voir « Besoins du site hôte »).
2. ★ **Persistance en base** : un `HomunculusStorage` branché sur une API (remplace `localStorage`), fiches liées au joueur et au one-shot.
3. ★ **Dés serveur et anti-triche** : `DiceProvider` serveur, journal des jets, vérification que la fiche soumise correspond aux jets enregistrés.
4. ★ **Validation par le MJ** : statuts `brouillon → soumis → validé / refusé`, commentaires du MJ, verrouillage de la fiche une fois validée, vue MJ en lecture seule (`readOnly`).
5. **Gestion de l'Écho par one-shot** : le MJ crée un one-shot avec son Écho ; l'Écho monte d'un cran entre deux one-shots pour les personnages survivants/rejoués ; historique par homunculus.
6. **Contenu** : Échos 5 à 10 (paliers 5-6, 7-8, 9-10 ; bonus de maîtrise +3 puis +4 ; classes au-delà du niveau 4) ; listes de sorts à choisir (tours de magie, sorts connus/préparés, grimoire) ; sous-classes supplémentaires.
7. **Édition des données sans code** : interface MJ pour gérer matières, Anomalies et Fêlures (ou synchronisation avec la page Notion), au lieu de modifier `data/*.ts`.
8. **Fiche imprimable / export PDF**, partage d'une fiche en lecture seule.
9. **Qualité** : tests unitaires de `lib/` (règles, reducer, `normalize`), audit d'accessibilité (navigation clavier, contrastes en clair/sombre), tests de bout en bout.
10. **Intégration visuelle** : reprendre le design system du site hôte (variables `--hc-*`), éventuellement un fond étoilé partagé.
11. Plus tard : suite d'outils autour de l'univers (la bêta est le premier outil ; garder `TOOL_META` pour qu'un registre d'outils puisse les lister).

---

## 8. Besoins de l'outil vis-à-vis du site hôte

- **Authentification** : identité de l'utilisateur et **rôle** (MJ ou joueur). L'outil ne gère aucun compte lui-même. Recommandation évoquée : Auth.js ou Clerk. Les données ne sont pas sensibles (aucune donnée personnelle hors identifiant).
- **Base de données** (Postgres ou SQLite) — table suggérée `homunculus` : `id`, `owner_id`, `oneshot_id`, `state` (JSON = `HomunculusState`), `status` (brouillon/soumis/validé/refusé), `echo`, `created_at`, `updated_at`, `schema_version`. Table `dice_log` : `homunculus_id`, `kind`, `value(s)`, `created_at`. Table `oneshot` : `id`, `titre`, `echo`, `mj_id`.
- **API** : un endpoint de dés, un endpoint de soumission/validation (utilisant `@/tools/homunculus-creator/server`), un endpoint de lecture des fiches (liste du joueur, liste du MJ).
- **Pages** : une page par one-shot où le MJ fixe l'Écho ; une page de création pour le joueur ; une page de revue pour le MJ.
- **Fournir les polices** (`next/font`) et, idéalement, un fond sombre (sinon activer `ambient`).
- **Hébergement** : Vercel est la piste recommandée ; l'outil ne demande rien de spécial (rendu statique + appels API).

---

## 9. Points ouverts (à clarifier avec Tiank avant de les « corriger »)

1. **Trois Anomalies provisoires** : Tiank a rejeté la première rédaction et attend de choisir. Valeurs actuellement en place (recommandations de Claude, pas encore validées) : *Lame vive* B, *Traqueur* A, *Funambule* A. Alternatives proposées :
   - *Lame vive* : A « traverse l'espace de toute créature sans terrain difficile » · B « se libère automatiquement d'une prise, agrippe ou liens non magiques » · C « saute à une distance égale à sa vitesse, sans élan ».
   - *Traqueur* : A « suit à la trace toute créature ou objet touché ou vu depuis moins de 24 h, sans test » · B « repère les résistances, immunités et vulnérabilités d'une créature qu'il voit » · C « flaire à 9 m les créatures cachées, poisons et morts-vivants ».
   - *Funambule* : A « aucun dégât de chute sous 18 m, retombe sur ses pieds » · B « ne tombe jamais d'une surface étroite ou instable, ignore les surfaces glissantes » · C « marche sur murs et plafonds à vitesse normale » (risque : peut casser des donjons).
2. **Fêlures** : liste provisoire. Tiank fournira les siennes ; il faudra les mettre sur 20 entrées (d20) et supprimer `provisoire`.
3. **Éclipse** : la limite de taille entre les deux visages (« taille sous certaine limite ») n'est pas définie.
4. **Matière de soutien** : Tiank souhaite proposer 2 matières RP/hors combat, 1 dégâts et 1 soutien ; l'Étoile filante est le premier soutien, d'autres sont à venir.
5. **Verrouillage par Écho dans un palier** : Éclipse et Métal astéroïde étaient pensées pour l'Écho 2, mais sont aujourd'hui disponibles dès l'Écho 1. Plafonner par Écho (champ `echoMin` déjà présent et distinct de `palier`) est possible.
6. **Puissance de l'Étoile filante** : 3 utilisations par repos long, sur n'importe quel jet raté (sauf sauvegarde contre la mort), sans limite de portée ; la conséquence (au choix du MJ) est proportionnelle à l'écart d'échec. À surveiller en jeu.
7. **Noms français des règles de classe** (manifestations occultes, archétypes...) : traduits de mémoire, à comparer avec le livre de règles de Tiank.

---

## 10. Consignes pour Claude Code

- **Ne casse pas les ids** ni la forme de `HomunculusState` sans migration (`schemaVersion`).
- **Garde l'interface en français** (accents, apostrophes droites ou typographiques déjà utilisées dans les données).
- **Ne fais jamais confiance au client** pour les dés, l'Écho et la validité d'une fiche : passe par `server.ts`.
- **Ne mets pas de données de jeu dans les composants** : tout passe par `data/`.
- **Avant de livrer** : `tsc --noEmit` (mode strict), `next build`, et un parcours complet de création (matière → classe avec choix → dés → Anomalie → Fêlure → nom : 6/6 étapes).
- **Pas d'aléa pendant le rendu** (hydratation), pas de `window`/`localStorage` en dehors d'un effet ou d'un gestionnaire.
- **Accessibilité** : les boutons de choix utilisent `aria-pressed` ; garde-le, ainsi que les libellés des champs.
- **Demande avant d'inventer** du contenu de jeu (matières, Anomalies, Fêlures, règles) : Tiank valide ces choix lui-même.

---

## 11. Historique de la vérification (version 0.1.0-beta)

Vérifié dans une application Next.js 15.1.6 / React 19 de test : `tsc --noEmit` en mode strict sans erreur, `next build` réussi (page prérendue statiquement, aucune erreur d'hydratation), parcours complet jusqu'à 6/6 étapes, enregistrement puis rechargement de la fiche, dés via route handler serveur, Écho imposé, bouton d'envoi avec re-validation serveur, pas de défilement horizontal à 390 px. Non testé : React 18, autres navigateurs que Chromium, lecteurs d'écran.
