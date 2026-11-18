# Outils JDR

Site Next.js pour donner des outils de jeu de rôle aux joueurs.

- `/` : connexion avec un simple code
- `/accueil` : profil du joueur + ses outils (le MJ voit tous les outils)
- `/outils/<id>` : un outil (accès vérifié côté serveur)
- `/admin` : le MJ crée les joueurs, leur code, leur fiche, et coche leurs outils

## Installation

1. Installer [Node.js LTS](https://nodejs.org) (version 20.9 ou plus).
2. Copier `.env.example` en `.env.local` et remplir `SESSION_SECRET` et `ADMIN_CODE`.
3. Dans ce dossier :

   ```
   npm install
   npm run dev
   ```

4. Ouvrir http://localhost:3000 et se connecter avec `ADMIN_CODE`.

Au premier lancement, `data/db.json` est créé avec le compte MJ. Le code admin se change ensuite
directement dans ce fichier. **Sauvegarde ce fichier** : il contient tous les joueurs (il est exclu de git).

## Ajouter un outil

1. Créer le composant dans `src/tools/<id>/MonOutil.tsx` (avec `"use client"` s'il est interactif).
   Il reçoit `player` (nom + fiche du joueur connecté).
2. L'ajouter dans `TOOLS` dans `src/tools/registry.ts`.

Il apparaît automatiquement dans l'admin pour être attribué.

### Widget sur le tableau de bord

La page d'accueil (`/accueil`) est un tableau de bord : chaque outil peut y afficher un panneau. Il suffit
d'ajouter `widget` à son entrée dans `TOOLS` :

```ts
widget: { component: MonWidget, title: "Titre du panneau", wide: false, order: 50 }
```

- `component` : composant **serveur** (il peut être `async` et lire la base) qui reçoit `{ user }`. Il ne s'affiche
  que si l'utilisateur a accès à l'outil. Le cadre (titre, icône, lien « Ouvrir → »), le chargement et les erreurs
  sont gérés par `src/components/Widget.tsx` : un widget qui plante n'empêche pas les autres de s'afficher.
- `user` contient le **code d'accès** : ne jamais le passer tel quel à un composant client. Pour une partie
  interactive, le widget serveur rend un composant client en lui passant seulement ce dont il a besoin
  (voir `src/tools/dice/DiceWidget.tsx` → `QuickRoll.tsx`).
- `wide` : le panneau prend toute la largeur. `order` : position (plus petit = plus haut, 100 par défaut).

Widgets existants : Planning (`order` 10, prochaine session + sondages), Atelier de Rigel (20, fiches),
Lanceur de dés (30, jet rapide).

Pour un outil existant en HTML/JS autonome : le mettre dans `public/outils-statiques/<id>/` et créer un composant
qui l'affiche dans une `<iframe src="/outils-statiques/<id>/index.html">`. Attention : les fichiers de `public/` sont accessibles sans
connexion. Si l'outil doit rester privé, mieux vaut le porter en composant React.

Option `wide: true` dans le registre : page pleine largeur, sans carte ni titre (pour un outil qui a son propre en-tête).

## Atelier de Rigel (création d'homunculus)

- `src/tools/homunculus-creator/` : l'outil, copié tel quel (voir son `README.md`). Éviter de le modifier, pour pouvoir le remplacer par une nouvelle version.
- `src/tools/homunculus/` : le branchement sur le site.
  - `actions.ts` : actions serveur. Les dés sont lancés **par le serveur** et notés dans `diceLog` (db.json) ; à
    l'enregistrement, la fiche est re-validée (`normalize`) et refusée si ses caractéristiques ou sa Fêlure ne viennent
    pas d'un jet du journal. Les fiches sont stockées dans `homunculi` (db.json), une liste par joueur.
  - `HomunculusTool.tsx` : le composant affiché dans `/outils/homunculus-creator`.
  - `echo.ts` : bornes de l'Écho.
- **Écho** : le MJ le fixe sur la page du joueur (`/admin/joueurs/<id>`, champ `echo` dans db.json, 1 par défaut).
  Le joueur ne peut pas le changer (vérifié aussi côté serveur). Le MJ, lui, choisit librement.
- **Revue MJ** : la page du joueur liste ses fiches (étapes, relances) ; « Voir » les affiche en lecture seule.

## Groupes de jeu

- Un groupe = une table / une campagne (`groups` dans db.json). Un joueur peut être dans plusieurs groupes
  (`groupIds` sur le joueur).
- Le MJ crée, renomme et supprime les groupes, et ajoute ou retire des joueurs, sur `/admin` (ou en cochant les groupes
  sur la page du joueur).
- **Planning** et **fiche de personnage** sont accordés automatiquement à tout joueur membre d'au moins un groupe ; un
  joueur sans groupe n'y a pas accès (`src/lib/groups.ts`, `canUseTool`). Les autres outils se cochent par joueur.
- Supprimer un groupe supprime ses sondages ; les fiches de personnage sont conservées (« Fiches archivées » côté MJ).
  Une fiche créée avant les groupes est rattachée au premier groupe que le joueur rejoint.

## Planning des sessions (`src/tools/planning/`)

- Les sondages sont **par groupe** : seuls les membres du groupe les voient et y répondent. Les anciens sondages sans
  groupe ne sont visibles que du MJ, qui peut les rattacher à un groupe.
- Le MJ crée un sondage (titre, note, créneaux date + heure de début + heure de fin facultative), puis retient
  un créneau, en ajoute ou en retire, archive ou supprime.
- Les joueurs ayant l'outil répondent Oui / Peut-être / Non par créneau et voient les réponses des autres.
  Une session retenue s'ajoute à l'agenda (fichier .ics).
- Données : `polls` dans db.json. Les heures sont stockées telles quelles (heure locale de la table).

## Fiche de personnage D&D 5.5 (`src/tools/character/`)

- **Une fiche par joueur et par groupe** : un joueur dans deux groupes a deux personnages, chacun avec son niveau.
- **Joueur** : crée son personnage avec un assistant (classe, espèce, historique, caractéristiques, compétences,
  identité), puis utilise sa fiche : PV, dés de vie, jets contre la mort, emplacements de sorts, armes, équipement,
  notes. Chaque notion a une bulle d'aide « ? ».
- **Montée de niveau** : le MJ clique « Accorder le niveau N » dans l'outil. Le bouton « Monter de niveau » s'allume
  sur le tableau de bord du joueur et ouvre un assistant (nouvelles capacités, PV moyens ou dé lancé par le serveur,
  choix, récapitulatif). Niveau maximum : 4 (`MAX_LEVEL` dans `types.ts`).
- **Copie du MJ** : la fiche est stockée dans `characters` (db.json / Redis), avec une copie à chaque niveau
  (`snapshots`), consultable et téléchargeable (JSON) dans l'outil.
- **Règles** : `rules.ts` calcule la fiche (modificateurs, CA, PV, sorts…) et valide la création et les montées de
  niveau ; le serveur refait tous les calculs. Le joueur ne modifie librement que les champs de `FREE_FIELDS`.
- **Données à relire** (résumés en français, sans garantie) : `data/classes.ts` (12 classes, niveaux 1 à 4, sous-classes,
  choix), `data/origins.ts` (espèces, historiques), `data/feats.ts`, `data/equipment.ts`. Pour ajouter un choix à une
  capacité, renseigner `choice` (`options`, `skills`, `expertise`, `subclass` ou `asi`) : création, montée de niveau et
  validation le prennent en compte automatiquement.

## Coffre (`src/tools/vault/`)

- Ouvert à tous les joueurs (pas de case à cocher). Chacun y garde jusqu'à 30 essais de personnages (`vault` dans
  db.json), indépendants des groupes.
- Même assistant de création, en plus libre : méthode « Valeurs libres » (3 à 18) et plus de champs de texte
  (apparence, idéaux, liens, défauts, histoire, notes). Les valeurs libres sont refusées par le serveur hors du coffre.
- Le joueur choisit son niveau : il monte sans accord du MJ, et peut revenir à un niveau précédent (on restaure la
  copie de ce niveau en gardant ses textes et son équipement). Il peut aussi dupliquer ou supprimer un essai.

## Cimetière (`src/tools/cemetery/`)

- Un cimetière par groupe, visible de ses membres (outil de groupe, comme le planning).
- Le MJ déclare un personnage mort depuis la fiche (bouton « Déclarer mort », épitaphe facultative). La fiche devient
  inutilisable (lecture seule, rangée dans les fiches archivées du MJ) et le joueur peut créer un nouveau personnage
  dans ce groupe.
- Chaque tombe (`graves` dans db.json) garde nom, espèce/classe/niveau, date et épitaphe. Le MJ modifie l'épitaphe en
  cliquant dessus, ou ramène le personnage à la vie (si le joueur n'a pas déjà un autre personnage dans ce groupe).

## Administration

- `/admin` : résumé, création de joueur, liste des joueurs (recherche dès 5 joueurs, clic sur le code pour le copier).
- `/admin/joueurs/<id>` : identité et code (bouton « Générer »), outils, Écho, fiche (lignes libellé / valeur),
  notes, fiches d'homunculus, suppression.

## Hébergement

Le stockage en fichier JSON fonctionne en local ou sur un serveur / VPS (`npm run build` puis `npm start`).
Il ne fonctionne **pas** sur Vercel ou Netlify, où le disque n'est pas persistant. Dans ce cas, remplacer
`src/lib/db.ts` par une vraie base (Postgres, SQLite hébergé…) en gardant les mêmes fonctions.
