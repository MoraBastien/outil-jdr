# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Joueurs** d'une table de jeu de rôle (D&D 5e, SRD 5.2) entre amis. Ils ouvrent le site surtout sur ordinateur, entre deux séances : préparer la prochaine séance (date, présence, montée de niveau, sorts) et revivre l'histoire (chronique, quêtes, carte).
- **Le MJ** (rôle admin) : gère groupes, joueurs, personnages, quêtes, planning, chronique.
- **Joueurs « Entité »** (Atelier de Rigel) : un type de joueur spécial qui crée des homunculus ; les autres joueurs ne doivent jamais en avoir connaissance.

## Product Purpose

Plateforme entre les séances de jeu de rôle : savoir où on en est dans l'histoire, tenir sa fiche de personnage, et profiter de l'escale (l'île où mouille le Navire) pour acheter de l'équipement. Outils actuels : fiches, planning, chronique, quêtes, coffre, grimoire, aide-mémoire, dés. Le marché des escales est à construire (règles de validation des achats non décidées). Succès : les joueurs arrivent prêts à la séance et gardent le fil de l'histoire.

## Positioning

La campagne se joue en one-shots reliés : le groupe voyage en navire d'île en île dans un archipel de centaines d'îles. Chaque île peut avoir un thème très différent ; l'archipel donne la cohérence.

## Operating Context

- Séances régulières planifiées sur le site ; entre deux, consultation sur ordinateur (téléphone secondaire mais doit fonctionner).
- Groupe test local uniquement, jamais sur Vercel.

## Capabilities and Constraints

- Next.js 16 (App Router, server actions), React 19, TypeScript ; base JSON unique (`data/db.json` en local, Redis sur Vercel).
- Tableau de bord = widgets fournis par les outils du registre (`src/tools/registry.ts`), filtrés par droits.
- Le thème « Astre déchu » ne s'applique qu'aux joueurs Entité ; rien de l'Atelier ne doit fuiter (HTML, CSS, JS) vers les autres joueurs.
- XP, succès, monnaie, biomes d'îles : n'existent pas (non décidés).
- Le nom du site est un nom de travail (« Le Navire ») ; identité à décider plus tard.

## Brand Commitments

- Univers de l'archipel (navire, escales, carte, prochaine traversée) à garder dans le tableau de bord.
- Le MJ aime le glass design et les fonds animés.
- Style demandé pour la refonte du tableau de bord : Spatial UI (visionOS).

## Evidence on Hand

Contenu réel dans la base locale (personnages, séances, quêtes). Les noms d'îles et escales des maquettes sont fictifs.

## Product Principles

1. Préparer la séance en un coup d'œil : date, présence, ce que mon personnage doit faire.
2. L'histoire est un voyage : chaque séance est une escale de l'archipel.
3. Ce qui est secret reste secret (Entité, homunculus).
4. Tout en français, vocabulaire du jeu, sans jargon technique.
