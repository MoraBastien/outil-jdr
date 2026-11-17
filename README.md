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

## Planning des sessions (`src/tools/planning/`)

- Le MJ crée un sondage (titre, note, créneaux date + heure de début + heure de fin facultative), puis retient
  un créneau, en ajoute ou en retire, archive ou supprime.
- Les joueurs ayant l'outil répondent Oui / Peut-être / Non par créneau et voient les réponses des autres.
  Une session retenue s'ajoute à l'agenda (fichier .ics).
- Données : `polls` dans db.json. Les heures sont stockées telles quelles (heure locale de la table).

## Administration

- `/admin` : résumé, création de joueur, liste des joueurs (recherche dès 5 joueurs, clic sur le code pour le copier).
- `/admin/joueurs/<id>` : identité et code (bouton « Générer »), outils, Écho, fiche (lignes libellé / valeur),
  notes, fiches d'homunculus, suppression.

## Hébergement

Le stockage en fichier JSON fonctionne en local ou sur un serveur / VPS (`npm run build` puis `npm start`).
Il ne fonctionne **pas** sur Vercel ou Netlify, où le disque n'est pas persistant. Dans ce cas, remplacer
`src/lib/db.ts` par une vraie base (Postgres, SQLite hébergé…) en gardant les mêmes fonctions.
