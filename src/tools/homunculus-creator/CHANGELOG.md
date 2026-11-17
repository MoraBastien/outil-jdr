# Changelog — homunculus-creator

Format : [SemVer](https://semver.org/lang/fr/). Tant que la version porte `-beta`, l'API (props, types, ids de données) peut changer.

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
