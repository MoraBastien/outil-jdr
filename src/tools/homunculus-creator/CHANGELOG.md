# Changelog — homunculus-creator

Format : [SemVer](https://semver.org/lang/fr/). Tant que la version porte `-beta`, l'API (props, types, ids de données) peut changer.

## 0.2.0-beta — 2026-11-19 : la Forge stellaire

Refonte graphique : l'Atelier raconte la création d'un être venu des étoiles.

- **La cuve** (`components/Forge.tsx`, canvas) remplace la constellation : l'être s'y forme choix après choix.
  Écho = anneaux en orbite ; matière = couleur du cœur et particules (étincelles, braises, couronne d'éclipse, éclats
  de métal, rayons, geysers de givre, spirale de matière noire, poussière) ; classe = sceau gravé qui tourne ;
  caractéristiques = six faisceaux ; Anomalie = pulsation (Combat), dérive (Exploration) ou ondes (Social) ;
  Fêlure = coque fendue. Six étoiles autour de la cuve suivent les étapes ; à 6/6 l'hexagramme se trace.
- **L'éveil** : quand la fiche devient complète, onde de choc dans la cuve et éclat sur tout l'Atelier (pas au
  chargement d'une fiche déjà finie). Chaque choix injecte une gerbe de particules dans la cuve.
- **Le thème suit la matière** : l'accent de tout l'Atelier (boutons, fil, sélection, halos) prend la couleur du corps.
- **Le rituel** : les étapes sont reliées par un fil de lumière qui se remplit ; étape terminée « forgée », étape en
  cours qui respire. Orbe de couleur sur chaque matière, sceau sur chaque classe, dés en gemmes qui roulent, Fêlure
  qui se fend à l'apparition, lettres du nom qui s'allument sous la cuve.
- Nouveau fichier de données `data/forge.ts` (apparence des matières, sceaux des classes, effets des familles).
- CSS réécrit et aligné sur les classes réellement utilisées (`hc-on`, `hc-ghost`… n'étaient plus stylées).
- Téléphone : la cuve d'abord, puis les étapes, puis la fiche. Tout est figé si « moins d'animations ».
- `components/Constellation.tsx` n'est plus utilisé (gardé pour compatibilité).
- **L'être prend forme humaine, en constellation** (remplace la planète) : articulations en étoiles reliées par des
  traits, voile ténu pour le volume, cuve en format portrait. La matière allume les étoiles des pieds à la tête ;
  sceau de classe sur la poitrine autour d'un cœur-étoile ; caractéristiques par partie du corps (FOR bras, DEX jambes,
  CON torse, INT tête, SAG cœur, CHA aura) ; anneaux de l'Écho autour du corps ; battement (Combat), dérive
  (Exploration) ou ondes depuis la tête (Social) ; Fêlure de l'épaule à la hanche ; l'être ouvre les yeux à l'éveil.
- **La fiche de cuve est retirée** : la cuve montre l'être. Ses actions passent sous la cuve (« Nouveau », « Copier la
  fiche », bouton d'envoi si `onSubmit`) ; le bouton de sauvegarde y est aussi, collé en bas de l'écran sur téléphone
  (prop `saveLabel`). `components/Sheet.tsx` n'est plus affiché (gardé pour compatibilité).

## 0.1.0-beta — 2026-11-17

Première version importable, portée depuis la maquette HTML autonome « Atelier de Rigel » (artifact, version 9).

- Composant `HomunculusCreator` (Next.js App Router / React, TypeScript strict), sans dépendance autre que `react`.
- 7 étapes : Écho, matière, classe (compétences, choix, traits, magie), caractéristiques (4d5), Anomalie, Fêlure, identité.
- Fiche de cuve collante + constellation qui s'allume (une étoile par étape, 6 formes tirées au hasard).
- Interfaces d'intégration : `DiceProvider` (dés côté serveur), `HomunculusStorage` (stockage), `onChange`, `onSubmit`, Écho imposé.
- Entrée `server.ts` (données + logique pures, sans React) pour les route handlers et la validation côté serveur.
- Données déclaratives avec ids stables : 8 matières (Échos 1-4), 12 classes (niveaux 1-4), 12 Anomalies, 20 Fêlures.
- Données encore provisoires : 3 Anomalies (Lame vive, Traqueur, Funambule) et les 20 Fêlures (voir README, « Points ouverts »).
- Pas encore : comptes, base de données, validation par le MJ, listes de sorts, Échos au-delà de 4.
