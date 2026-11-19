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

## Navigation (`src/components/Header.tsx`, `AppNav.tsx`)

- Ordinateur : barre latérale, outils rangés par rubrique (Campagne, Création, Outils, Maître du jeu).
- Téléphone : barre d'onglets en bas (accueil + 3 outils principaux) et bouton « Menu » qui ouvre un tiroir avec tout.
- Partout : recherche rapide `Ctrl + K` / `⌘K` (bibliothèque `cmdk`) ; le MJ y retrouve aussi chaque joueur.
- Chaque outil du registre indique sa rubrique (`section`) et un libellé court (`short`) pour la barre mobile. L'ordre
  est fixé par `PRIORITY` dans `Header.tsx`.

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
- **Sauvegarder · envoyer au coffre** : le bouton sous la cuve (ou collé en bas de l'écran sur téléphone) enregistre
  l'homunculus et, s'il est **terminé**, l'envoie dans le **coffre** du joueur sous forme de fiche de personnage
  classique (`sendToVault` dans `homunculus/actions.ts`, conversion par `transfer.ts`). Les sauvegardes suivantes
  mettent à jour la même fiche du coffre : niveau, caractéristiques et capacités viennent de l'Atelier, l'équipement,
  les PV, les notes et les textes déjà écrits par le joueur sont gardés. Dans le coffre, cette fiche n'a ni montée ni
  retour de niveau (son niveau suit l'Écho). Un homunculus pas encore terminé est seulement enregistré dans l'Atelier.

### Joueurs de type « Entité »

L'Atelier n'est pas une case à cocher mais un **type de joueur** : « Joueur » ou « ✨ Entité », choisi par le MJ à la
création du joueur ou sur sa page (`kind` dans db.json, règle `isEntityPlayer` dans `entity.ts`). Les anciens comptes
sans `kind` qui avaient la case « Atelier de Rigel » sont traités comme des Entités, jusqu'au prochain enregistrement
de leur page par le MJ.

Une Entité n'incarne pas un héros mais une **entité** qui crée des homunculus pour rejoindre le groupe. Elle a donc :

- ses **fiches d'homunculus**, dans l'Atelier ;
- la **fiche de son entité**, qui remplace sa fiche D&D dans « Fiche de personnage » (dans tous ses groupes, et même
  sans groupe). Pour l'instant : le **nom** (choisi par le joueur, `entitySheet` dans db.json) et le **niveau d'Écho**
  (fixé par le MJ, champ `echo`). **TODO(entité)** : fiche complète quand les règles seront finies.

Fichiers : `entity.ts` (règle `isAtelierPlayer`, côté serveur seulement), `entityActions.ts`, `EntitySheet.tsx`,
et `src/tools/character/CharacterHost.tsx`, qui choisit entre les deux fiches. Côté MJ, l'entité apparaît dans la
liste de chaque groupe (fiche et tableau de bord), sans bouton de niveau ni de création ; une ancienne fiche D&D du
joueur passe dans les archives. Ce joueur ne peut ni créer de fiche D&D ni en proposer une depuis le coffre.

**Les autres joueurs n'en ont pas connaissance.** Pour ça :

- l'Écho et la fiche de l'entité ne sont envoyés au navigateur que pour les joueurs concernés ;
- l'Atelier (`HomunculusEntry.tsx`) et la fiche de l'entité sont **chargés à la demande**, dans des fichiers à part.
  Sinon leur code, avec leurs textes, finirait dans le JavaScript commun téléchargé par tout le monde ;
- un composant client ne doit jamais importer `entity.ts` ni `homunculus-creator/meta.ts`. Les textes de la liste du
  MJ viennent du serveur (`OtherSheet`), et les classes CSS globales ont des noms neutres (`hc-host`, `chip-violet`).

Le **nom de l'entité** se modifie par le joueur (« Mon entité ») ou par le MJ (page du joueur, encadré « Entité et
niveau d'Écho »). Le **coffre** reste ouvert à ces joueurs pour essayer des personnages D&D, mais sans « Proposer au MJ ».

### L'homunculus actif (`src/tools/homunculus/transfer.ts`, `entityActions.ts`)

Dans « Mon entité », le joueur choisit pour chaque groupe un **homunculus actif** parmi ses fiches **terminées** de
l'Atelier. Il est **transféré dans une fiche de personnage classique** (la même que les autres joueurs) :

- classe de l'Atelier → classe de la fiche (`CLASS_MAP`), niveau = Écho, caractéristiques finales, compétences
  (`SKILL_MAP`) et expertises, PV calculés comme dans l'Atelier ; pas d'espèce ni d'historique ;
- tous les passifs (Matière et sa Faiblesse, Anomalie, Fêlure, choix de classe, magie, maîtrises) sont listés dans
  l'onglet **Capacités**, section « Capacités d'homunculus » (`state.extra`, textes écrits par le serveur) ;
- son niveau **suit l'Écho** : pas de montée de niveau ni de « niveau pour tout le groupe ». Après une montée d'Écho,
  le joueur met l'homunculus à jour dans l'Atelier puis clique « Mettre à jour depuis l'Atelier » (PV, équipement,
  notes et nom sont gardés) ;
- « Changer d'homunculus » remplace l'actif du groupe ; un même homunculus ne peut être actif que dans un groupe.

Côté MJ, l'homunculus actif apparaît dans la liste du groupe comme un personnage, avec la pastille de l'entité, et
**se déclare mort** comme les autres (cimetière, chronique). Un homunculus mort ne peut plus être réactivé : le joueur
en choisit un autre. Pour les autres joueurs, c'est un personnage comme un autre (« Roublard · niv. 2 »), sans mention
de l'Atelier.

### Thème « Astre déchu » (`src/tools/homunculus/astral/`)

Les joueurs de l'Atelier voient tout le site sous un thème à part : l'entité est un presque-dieu qui a perdu ses
pouvoirs, et le site devient sa carte du ciel. **Chaque niveau d'Écho rallume une partie du ciel** : Écho 1 « cendre »
(or terni, une étoile), 2 « lueur », 3 « éveil », 4 « ascension » (tout le ciel, étoiles filantes).

- `theme.ts` : la feuille de style (`astralCss(echo)`), les glyphes de navigation (☉ ♄ ☽ ♃ ♀ ♇ ♁ ✶ ☿), les libellés
  (« Observatoire », « Mon entité ») et le salut de l'accueil (« Ciel du 19 novembre · lune croissante »).
- `src/app/s/perso.css/route.ts` : sert cette feuille **seulement** aux joueurs de l'Atelier (session vérifiée ; les
  autres reçoivent une feuille vide). `Header.tsx` l'ajoute avec `<link precedence>` et `?e=<Écho>`.
- **Toutes ses règles dépendent de l'attribut `html[data-astral]`**, posé pour une Entité seulement : par un petit
  script en ligne de `Header.tsx` au premier chargement (pas de clignotement), puis par `SkyEntry.tsx`, qui le retire
  quand il disparaît. React garde une feuille `<link precedence>` chargée d'une page à l'autre, même après un
  changement de compte sans rechargement : sans l'attribut, elle reste inerte. (Un `html:has(#marqueur)` faisait
  recalculer les styles de toute la page à chaque changement du DOM.)
- **Pas de flou d'arrière-plan** (`backdrop-filter`) sur ce qui passe au-dessus du ciel ou de la cuve : ils sont animés,
  le flou serait recalculé à chaque image (page figée sur les appareils modestes).
- `AstralSky.tsx` : ciel animé en canvas. Il tourne lentement autour d'une étoile polaire (un tour en 12 min), avec trois
  profondeurs d'étoiles qui scintillent, une nébuleuse qui respire et des étoiles filantes (en moyenne toutes les 20 s à
  l'Écho 1, toutes les 4 s à l'Écho 4). ~30 images/s, en pause onglet caché, image fixe si « moins d'animations » ;
  chargé à la demande par `SkyEntry.tsx`. `EntityConstellation.tsx` : la constellation de l'entité et son halo fendu
  qui se referme à chaque Écho (accueil et « Mon entité »).
- Le MJ garde le thème habituel.

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
- **Disponibilités habituelles** : chaque joueur indique, par jour de la semaine, Oui / Peut-être / Non
  (`users[].weekly`, index 0 = dimanche). Ses réponses aux sondages ouverts sont pré-remplies pour ces jours-là, à la
  création d'un sondage, à l'ajout d'un créneau et quand il change ses habitudes. Une réponse donnée à la main n'est
  jamais écrasée ; les réponses pré-remplies sont repérées dans `polls[].autoFilled` et marquées « d'après tes habitudes ».

## Installation sur téléphone

Le site peut être ajouté à l'écran d'accueil comme une application (`src/app/manifest.ts`, icônes dans `public/icons/`).

## Fiche de personnage D&D 5.5 (`src/tools/character/`)

- **Une fiche par joueur et par groupe** : un joueur dans deux groupes a deux personnages, chacun avec son niveau.
- **Joueur** : crée son personnage avec un assistant (classe, espèce, historique, caractéristiques, compétences,
  identité), puis utilise sa fiche : PV, dés de vie, jets contre la mort, emplacements de sorts, armes, équipement,
  notes. Chaque notion a une bulle d'aide « ? ».
- **Montée de niveau** : le MJ clique « Accorder le niveau N » dans l'outil. Le bouton « Monter de niveau » s'allume
  sur le tableau de bord du joueur et ouvre un assistant (nouvelles capacités, PV moyens ou dé lancé par le serveur,
  choix, récapitulatif). Niveau maximum : 4 (`MAX_LEVEL` dans `types.ts`).
- **Un niveau pour tout le groupe** : bouton du MJ en tête de chaque groupe, qui accorde le niveau suivant à tous les
  personnages vivants (sauf ceux qui ont déjà une montée en attente ou sont au niveau maximum).
- **Préparer à l'avance** : avant que le niveau soit accordé, le joueur peut faire ses choix (carte « Prochain niveau »).
  Ils sont vérifiés par le serveur et gardés dans `characters[].prepared` ; le jour venu, l'assistant s'ouvre
  directement sur le récapitulatif. Le MJ voit « Choix du niv. N prêts » dans sa liste.
- **À reporter dans Foundry** : après chaque montée de niveau, une liste à cocher (`foundry.ts`, stockée dans
  `characters[].foundryTodo`) rappelle ce qu'il faut refaire sur la fiche Foundry VTT : niveau de classe, PV (moyenne ou
  dé lancé ici), choix, sorts. Le tableau de bord rappelle ce qu'il reste à faire.
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
- **Proposer au MJ** : un essai peut être proposé pour un groupe où le joueur n'a pas de personnage vivant (après une
  mort, ou en arrivant). Règles de campagne (`character/proposal.ts`) : pas de valeurs libres, et les PV des niveaux
  au-delà du 1er sont recalculés à la moyenne (le coffre permet de relancer). La proposition (`proposals` dans db.json)
  est une copie figée : le MJ l'examine dans l'outil Fiche, l'accepte (elle devient la fiche du joueur, au niveau
  proposé) ou la refuse avec un mot d'explication.

## Chronique (`src/tools/chronicle/`)

- Outil de groupe (comme le planning) : une frise des séances par groupe, la plus récente en haut, numérotées dans
  l'ordre chronologique. Les joueurs lisent, le MJ écrit.
- Chaque séance : date (proposée d'après la dernière session confirmée du planning), titre, résumé et moments
  marquants (combat de boss, objet rare, montée de niveau, mort, exploit, quête, rencontre, lieu, rebondissement,
  réplique culte… liste dans `meta.ts`), chacun relié aux personnages concernés.
- Les montées de niveau et les morts du groupe sont repérées automatiquement (`events.ts`) tant qu'elles ne sont
  racontées dans aucune séance : le MJ les ajoute d'un clic. Une séance peut rester en brouillon (invisible des joueurs).
- Les quêtes lancées ou terminées à une séance (outil « Quêtes ») apparaissent dans sa carte de la frise.
- Tableau de bord : « Dernière séance » (et, pour le MJ, le nombre d'événements à raconter).

## Quêtes (`src/tools/quests/`)

- Outil de groupe : le MJ écrit ses quêtes (titre, commanditaire, récompense, description, personnages concernés) et
  choisit pour chacune « cachée » (lui seul la voit) ou « visible ». Données : `quests` dans db.json.
- Statuts : à venir → en cours → accomplie / échouée (on peut rouvrir ou remettre à venir). Lancer une quête demande la
  séance où elle commence et la rend visible : elle apparaît alors dans la frise de la chronique (« Nouvelle quête »).
  Sa conclusion apparaît à la séance choisie. Une quête recachée disparaît de ce que voient les joueurs.
- Joueurs : leur journal (en cours, « rumeurs et pistes » visibles, terminées). Tableau de bord : « Quêtes en cours ».
- Résumé rapide (`QuestSummary.tsx`) : un clic sur une quête de la frise, sur le titre d'une carte du journal ou sur une
  quête du tableau de bord ouvre sur place une fenêtre avec statut, commanditaire, récompense, description, personnages
  et séances de début et de fin. Le lien `/outils/quetes?quete=<id>` ouvre aussi le journal sur ce résumé.
- Un outil peut proposer plusieurs panneaux sur le tableau de bord grâce à `extraWidgets` dans le registre.
  Données : `chronicle` dans db.json.

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
