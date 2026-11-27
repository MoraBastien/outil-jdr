---
name: Le Navire
description: Les outils de la table entre deux séances, sur un noir neutre où un seul ambre désigne ce qui compte.
colors:
  night: "#0b0d12"
  hull: "#151922"
  hull-raised: "#1a1f2a"
  hull-high: "#1f2430"
  rope-line: "#262c38"
  rope-line-strong: "#3a4252"
  chalk: "#f2f3f5"
  ash: "#a4a9b3"
  far-ash: "#868c99"
  marquee-amber: "#f5b841"
  amber-ink: "#1a1203"
  doubloon: "#f2d28a"
  coral-alarm: "#ef7d7d"
  sea-glass-ok: "#7ee0a1"
  lantern-warn: "#e8c36a"
  season-dim: "#7d8390"
  season-ok: "#6fd39a"
  season-warn: "#f2c14e"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "clamp(1.8rem, 4vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.12rem"
    fontWeight: 600
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "15.5px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 600
    letterSpacing: "0.12em"
  mono:
    fontFamily: "Geist Mono, ui-monospace, SF Mono, Consolas, monospace"
    fontSize: "1rem"
    fontWeight: 400
  season-display:
    fontFamily: "Archivo, Geist, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
  season-headline:
    fontFamily: "Archivo, Geist, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 800
    letterSpacing: "-0.02em"
  season-stat:
    fontFamily: "Archivo, Geist, sans-serif"
    fontSize: "1.45rem"
    fontWeight: 800
    lineHeight: 1.1
  season-body:
    fontFamily: "Archivo, Geist, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  season-badge:
    fontFamily: "Archivo, Geist, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 700
    letterSpacing: "0.04em"
rounded:
  xs: "6px"
  btn-sm: "9px"
  sm: "11px"
  md: "18px"
  pill: "999px"
  season-btn: "10px"
  season-tile: "14px"
  season-panel: "16px"
  season-hero: "20px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "14px"
  card: "22px"
  card-lg: "28px"
  stack-lg: "32px"
  season-gap: "28px"
  season-rail: "14px"
components:
  button-primary:
    backgroundColor: "{colors.marquee-amber}"
    textColor: "{colors.amber-ink}"
    rounded: "{rounded.sm}"
    padding: "10px 18px"
  button-ghost:
    backgroundColor: "{colors.hull-raised}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.sm}"
    padding: "10px 18px"
  button-small:
    rounded: "{rounded.btn-sm}"
    padding: "6px 12px"
  input:
    backgroundColor: "{colors.hull-raised}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.sm}"
    padding: "10px 13px"
  card:
    backgroundColor: "{colors.hull}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.md}"
    padding: "22px"
  season-button-primary:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.night}"
    rounded: "{rounded.season-btn}"
    height: "46px"
    padding: "0 22px"
  season-button-secondary:
    backgroundColor: "{colors.hull-high}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.season-btn}"
    height: "46px"
    padding: "0 20px"
  season-badge:
    backgroundColor: "{colors.marquee-amber}"
    textColor: "{colors.amber-ink}"
    typography: "{typography.season-badge}"
    rounded: "{rounded.xs}"
    padding: "0 10px"
  season-chip:
    backgroundColor: "{colors.hull}"
    textColor: "{colors.ash}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "0 14px"
  season-chip-on:
    backgroundColor: "{colors.marquee-amber}"
    textColor: "{colors.amber-ink}"
  season-tile:
    backgroundColor: "{colors.hull}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.season-tile}"
    width: "204px"
  season-tile-next:
    width: "262px"
  season-panel:
    backgroundColor: "{colors.hull}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.season-panel}"
    padding: "18px 20px"
---

# Design System: Le Navire

## Overview

**Creative North Star: "Le Navire de nuit, la saison à l'affiche"**

Le site entier vit à bord d'un navire, de nuit, et partage une seule palette : la palette « Saison ». Le fond est un noir neutre légèrement bleuté, presque sans teinte, sous un ciel animé devenu discret : une lueur ambre très faible qui respire au bas de la page, des bulles grises qui remontent. Une seule couleur d'interface, un ambre fixe (`var(--accent)`), désigne ce qui se fait : bouton principal, focus, onglet actif, sélection, liens au survol. Les surfaces sont des coques gris anthracite à bord fin ; la barre latérale et les barres mobiles sont en verre flouté sombre, les cartes ne le sont pas.

La couleur des îles ne teinte plus l'interface. Chaque île garde sa teinte (`--isle-c`, posée localement), mais seulement là où l'on parle d'une île : son nom, les régions et îles de la carte, la route du tableau de bord, les illustrations. Le tableau de bord du MJ (`nv-`), la chronique, la carte et tous les outils reposent sur ce même socle neutre et ambre.

Une surface garde sa grammaire propre : le tableau de bord des joueurs (`/accueil`, joueurs hors Entité), « Saison en cours ». La campagne s'y regarde comme une série en streaming : l'épisode suivant en grand bandeau illustré, les séances vécues en vignettes 16:9 dessinées de leur île. Il partage désormais le fond, les neutres et l'ambre du reste du site, et s'en distingue par sa forme : aplats opaques sans verre, titres Archivo 800 serrés, l'illustration des îles comme seule couleur en dehors de l'ambre. Cette grammaire est délimitée par la portée `.sv`.

Il existe aussi une variante de thème, « Astre déchu » (`html[data-astral]`), réservée à un type de joueur particulier ; elle remplace polices et ciel et garde ses propres couleurs. Elle n'est pas décrite ici et ne doit jamais apparaître ni se deviner pour les autres joueurs.

**Key Characteristics:**
- Un seul socle pour tout le site : noir neutre, coques anthracite, un ambre fixe comme unique accent d'interface.
- La teinte d'une île n'apparaît que là où l'on parle de cette île : nom, carte, route, illustration.
- Ciel animé neutre et discret derrière tout : lueur ambre à 9 %, bulles grises à 0.45.
- Base : coques à bord fin, rayon doux (18px), ombre basse diffuse ; chrome de navigation en verre flouté.
- Base : Geist partout, titres 600 serrés, Geist Mono pour les codes.
- « Saison en cours » : aplats sans verre ni halo, titres Archivo 800 à -0.03em, ambre réservé à l'épisode suivant, à l'action à faire et au focus.
- Le mouvement est doux (`cubic-bezier(0.2, 0.7, 0.2, 1)`) et entièrement coupé si l'utilisateur demande moins d'animations.

## Colors

Une seule palette sombre pour tout le site : noir et anthracite neutres, un ambre unique pour l'action, la couleur des îles gardée pour les îles.

### Primary
- **Ambre de marquee** (`{colors.marquee-amber}`, `--accent` ; `--sv-amber` dans « Saison en cours ») : le seul accent d'interface, fixe. Base : fond du bouton principal (dégradé vertical depuis sa version éclaircie, `color-mix` 70 % avec du blanc), contour de focus, icône et pastille de l'onglet actif, sélection de texte, liens au survol (version éclaircie), bordure de champ au focus. Sa version douce (14 % sur transparent) colore les états actifs. « Saison en cours » : badge « Épisode suivant », cadre 2px de la vignette suivante, compte à rebours, puce « À faire », chip de groupe actif, focus. Le texte posé sur l'ambre plein est toujours l'encre ambre (`{colors.amber-ink}`).

### Secondary
- **Doublon** (`{colors.doubloon}`) : l'or. Bourse, achats, notes du MJ. Partagé par tout le site (`.sv-gold` lit `--gold`).

### Tertiary
- **Teinte d'île locale** (`--isle-c`) : chaque île porte sa propre couleur, posée localement sur l'élément. Elle marque le nom de l'île, les régions et îles de la carte, les escales de la route du tableau de bord du MJ, le bloc « port », les illustrations. Dans « Saison en cours » elle est éclaircie (`color-mix` 70 à 80 % avec du blanc) pour rester lisible sur le noir.

### Neutral
- **Nuit** (`{colors.night}`) : fond de page de tout le site, `theme-color` et couleurs du manifeste.
- **Coque / coque relevée / coque haute** (`{colors.hull}`, `{colors.hull-raised}`, `{colors.hull-high}`) : trois paliers de surface. Cartes, widgets, panneaux et vignettes ; champs et boutons secondaires ; survol, focus de champ, boutons secondaires de « Saison en cours ».
- **Filin / filin fort** (`{colors.rope-line}`, `{colors.rope-line-strong}`) : bordures et filets 1px, séparateurs, bordures de survol.
- **Craie / cendre / cendre lointaine** (`{colors.chalk}`, `{colors.ash}`, `{colors.far-ash}`) : texte, texte secondaire, texte tertiaire, placeholders et titres de groupe.
- **Gris éteint de saison** (`{colors.season-dim}`) : horodatages et vignettes vides de « Saison en cours ».

### Statuts
- Base : **corail** (`{colors.coral-alarm}`) danger et « Absent », **verre de mer** (`{colors.sea-glass-ok}`) succès, **lanterne** (`{colors.lantern-warn}`) « Peut-être ». Toujours en texte sur un fond du même ton à 10 à 18 %.
- « Saison en cours » : `{colors.season-ok}`, `{colors.season-warn}` et le même corail, même recette (texte plein sur 14 % du même ton).
- Les catégories de la chronique gardent leurs propres teintes ; ce sont des marqueurs de catégorie, pas des accents.

### Named Rules
**The One Accent Rule.** L'accent d'interface est un ambre fixe, lu dans `var(--accent)` (ou `var(--sv-amber)` sous `.sv`). Aucune autre couleur ne fait office de bouton, de focus ou d'état actif.

**The Island-Mark Rule.** La couleur d'une île (`--isle-c`) désigne cette île et rien d'autre : nom, carte, route, illustration. Elle ne teinte jamais un bouton, un focus, un onglet ou le fond.

**The One Amber Rule.** Dans « Saison en cours », l'ambre ne marque que trois choses : l'épisode suivant, ce que le joueur doit faire, et le focus. Toute autre couleur vient des illustrations d'îles ou des statuts de présence.

## Typography

**Display Font:** Geist (repli system-ui) pour tout le site ; Archivo (repli Geist) dans « Saison en cours ».
**Body Font:** Geist (base) ; Archivo 400 à 700 (« Saison en cours »).
**Label/Mono Font:** Geist Mono pour les codes et les saisies techniques ; les chiffres courants passent en chiffres tabulaires (`.num`).

**Character:** Geist donne au Navire une voix d'outil précise et calme, titres en 600 resserrés. Archivo 800 donne à « Saison en cours » l'aplomb d'une affiche de série : gros, serré, sans ornement.

### Hierarchy
- **Display** (Geist 600, `clamp(1.8rem, 4vw, 2.5rem)`, 1.1, -0.025em) : titre de page.
- **Title** (Geist 600, 1.12 à 1.3rem) : titres de widget et sous-titres.
- **Body** (Geist 400, 15.5px, 1.55) : texte courant ; les rappels de séance tiennent dans 58ch.
- **Label** (Geist 600, 0.72rem, 0.12em, majuscules) : titres de groupe de la navigation et des listes de commandes seulement.
- **Season Display** (Archivo 800, 3.75rem, 1, -0.03em ; 3rem sous 1080px, 2.4rem sous 560px) : « Séance N » et le nom de l'île dans le bandeau, sur deux lignes, l'île dans sa teinte éclaircie.
- **Season Headline** (Archivo 800, 1.35rem, -0.02em ; 1.05rem en petit) : titres de rangée et de panneau.
- **Season Stat** (Archivo 800, 1.45rem, 1.1) : PV max, CA, initiative.
- **Season Badge** (Archivo 700, 0.78rem, 0.04em, majuscules) : le badge « Épisode suivant », seul texte en capitales de « Saison en cours ».

### Named Rules
**The Poster Weight Rule.** Dans « Saison en cours », un titre est en 800 serré ou n'est pas un titre ; le corps ne monte jamais au-dessus de 700.

## Layout

Base : contenu centré, `max-width` 1000px (1260px en large, 1280px pour le tableau de bord du MJ), marges latérales 16px. Rythme d'empilement de 12px (`.stack`) et 32px entre blocs (`.stack-lg`), grilles à 14 à 16px de gouttière. Au-dessus de 1024px, barre latérale fixe de 260px ; en dessous, barre du haut de 56px, barre d'onglets en bas de 64px (plus la zone sûre) et tiroir « Menu ». Les cibles tactiles font au moins 44px.

« Saison en cours » : la page s'élargit à 1320px, gouttière de 28px partout. Le bandeau de l'épisode suivant occupe toute la largeur (environ 420px de haut), texte à gauche sur l'aplat, illustration à droite fondue par un masque. Dessous, un « pont » à deux colonnes : rangées principales (épisodes, équipage) et colonne de 360px (personnage, quêtes, port, activité), 300px sous 1080px, une seule colonne sous 900px où l'illustration passe au-dessus du texte (ratio 16:8, fondue vers le bas). La rangée d'épisodes défile horizontalement avec accroche (`scroll-snap`), vignettes de 204px, la suivante à 262px ; au chargement elle se cale sur l'épisode suivant. Sous 560px, les vignettes prennent 72 % (80 % pour la suivante) et les boutons de présence forment une grille de trois.

## Elevation & Depth

La base est en couches : un ciel animé fixe au fond, des surfaces légèrement translucides par-dessus, une ombre basse et diffuse qui détache sans soulever. Le chrome de navigation est du verre sombre flouté (`blur(14px)`) ; les cartes sont un voile sans flou, avec un léger reflet en haut (dégradé blanc 2.5 à 3 % sur 40 %). Le tableau de bord du MJ pose des panneaux de verre (surface à 70 %) avec un halo ambre doux dans un coin. « Saison en cours » est plat : aplats opaques, un filet intérieur 1px pour délimiter, une seule ombre portée sous le bandeau et sous la vignette survolée ; il repose sur le même ciel que le reste du site.

### Shadow Vocabulary
- **Coque** (`0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 40px -24px rgba(0,0,0,0.7)`) : cartes et widgets.
- **Coque haute** (`0 24px 60px -24px rgba(0,0,0,0.8)`) : palette de commandes, message flottant, carte de connexion.
- **Lueur ambre** (`0 6px 18px -8px` accent à 70 % ; `0 10px 24px -8px` à 80 % au survol) : sous le bouton principal.
- **Bandeau de saison** (`0 30px 60px -32px rgba(0,0,0,0.9)`) : sous l'épisode suivant.
- **Vignette levée** (`0 22px 36px -22px rgba(0,0,0,0.95)`) : vignette d'épisode survolée ou focalisée.

### Named Rules
**The Living Sea Rule.** Le fond respire derrière tout le site (lueur ambre à 9 % qui respire en 7s, bulles grises à 0.45 qui montent), neutre et discret : il ne prend jamais la couleur d'une île. Tout s'arrête si l'utilisateur demande moins d'animations.

**The Flat Season Rule.** Dans « Saison en cours », pas de verre, pas de flou, pas de lueur colorée sur les composants : la profondeur vient du contraste des aplats et des illustrations. Seul le ciel du site, commun à toutes les pages, passe derrière.

## Shapes

Coins doux partout, jamais vifs. Base : 18px pour les cartes et widgets, 11px pour champs et boutons, 9px pour les petits boutons et boutons-icônes, pilule pour les réponses de présence et les filtres, cercle pour les avatars. « Saison en cours » : 20px pour le bandeau (16px sur téléphone), 16px pour les panneaux, 14px pour les vignettes et cartes d'équipage, 12px pour la puce « À faire » et les avatars carrés, 10px pour les boutons, 6px pour badges et numéros d'épisode. Les vignettes sont au format 16:9. Les illustrations d'îles sont des scènes vectorielles en aplats, déterministes (la même île donne toujours la même scène), avec un seul motif fort lu dans le nom de l'île (phare, port, pic, forêt) et la couleur de l'île dans le ciel et la mer.

## Components

### Buttons
- **Shape:** coins doux (11px ; 9px en petit).
- **Primary (base):** dégradé vertical de l'ambre éclairci vers l'ambre, encre `{colors.amber-ink}`, 600, `10px 18px`, liseré clair chaud et lueur ambre. Survol : `brightness(1.07)`, monte de 1px, reflet qui traverse ; appui : descend de 1px.
- **Ghost (base):** coque relevée, bordure filin ; au survol la bordure passe à l'ambre, le texte à l'ambre éclairci, le fond à la coque haute.
- **Danger:** fond corail, texte blanc.
- **Primary (« Saison en cours »):** blanc plein sur texte noir, 700, 46px de haut, 10px de rayon ; survol blanc pur et 1px plus haut. C'est « À bord ».
- **Secondary (« Saison en cours »):** gris relevé ou blanc à 12 %, texte blanc ; « Peut-être », « Absent ». La réponse choisie porte un anneau intérieur ambre de 2px.

### Chips
- **Base:** réponses de présence en pilule (40px) : ambre plein pour « À bord », ton de statut sur 18 % pour les autres ; la réponse courante porte un anneau intérieur ambre de 2px.
- **Saison:** chips de groupe en pilule de 36px, cendre sur coque ; l'actif passe en ambre plein. Statuts d'équipage en petites étiquettes de 6px, ton plein sur 14 %, « Sans réponse » en filet.

### Cards / Containers
- **Corner Style:** 18px (base), 16px panneau / 14px vignette (saison).
- **Background:** coque avec reflet haut, à 86 % d'opacité (base) ; coque opaque (saison).
- **Shadow Strategy:** ombre « Coque » (base) ; aucune au repos en saison, filet intérieur 1px `{colors.rope-line}`.
- **Border:** 1px filin (base) ; filet intérieur (saison).
- **Internal Padding:** 22px, 28px en grand, 18px sur téléphone (base) ; 18px 20px (panneau de saison).

### Inputs / Fields
- **Style:** coque relevée, bordure filin 1px, 11px, `10px 13px`, placeholder en cendre lointaine.
- **Focus:** bordure ambre, anneau de 3px à 18 % de l'ambre, fond coque haute.
- **Variants:** code (Geist Mono, capitales, 0.14em), recherche (loupe à gauche).

### Navigation
Barre latérale de verre sombre flouté au-dessus de 1024px : liens 0.95rem en cendre, survol sur coque relevée, actif en ambre éclairci sur ambre doux avec icône au trait en ambre ; groupes titrés en label capitales. En dessous : barre du haut et barre d'onglets en bas, pastille d'onglet actif en ambre doux qui glisse d'un onglet à l'autre (transition de vue). Recherche rapide (⌘K) en palette centrée.

### Épisode suivant (signature, « Saison en cours »)
Le bandeau pleine largeur : « Séance N » et l'île en Season Display, ligne méta (badge ambre « Épisode suivant », date, heure, compte à rebours en ambre), boutons de présence, compteur « N sur M à bord », puis la puce « À faire » (fond ambre à 14 %, filet ambre, icône et bouton ambre pleins). Illustration de l'île de destination à droite, fondue à gauche par un masque.

### Vignette d'épisode (signature, « Saison en cours »)
Illustration 16:9 de l'île, numéro de séance en pastille sombre en bas à gauche, puis titre, date et deux lignes de résumé. Survol ou focus : la vignette grandit (`scale(1.035)`, 0.22s), se lève, son filet s'éclaircit et le résumé complet apparaît en voile sur l'image. L'épisode suivant est plus large, cerclé d'ambre 2px, numéro et titre en ambre ; les épisodes à venir sont estompés à 60 %.

## Do's and Don'ts

### Do:
- **Do** lire l'accent dans `var(--accent)` (ou `var(--sv-amber)` sous `.sv`), jamais un hex en dur.
- **Do** réserver la teinte d'une île (`--isle-c`) au nom de l'île, à la carte, à la route et aux illustrations.
- **Do** poser toute nouvelle page ou tout nouvel outil sur le socle neutre : fond `{colors.night}`, trois paliers de coque, bordure filin 1px, 18px de rayon.
- **Do** convertir en gris neutre de même luminance toute couleur en dur bleu-vert hors carte, statuts et catégories.
- **Do** limiter la grammaire de « Saison en cours » (Archivo, aplats, vignettes) à la portée `.sv` et à ses variables `--sv-*`.
- **Do** réserver l'ambre de « Saison en cours » à l'épisode suivant, à l'action à faire et au focus, avec l'encre `{colors.amber-ink}` dessus.
- **Do** illustrer une île avec sa scène vectorielle déterministe en aplats, teintée par sa couleur.
- **Do** couper transitions et animations sous `prefers-reduced-motion`, comme le font le fond, les vignettes et les liens.
- **Do** garder des cibles tactiles d'au moins 44px sur téléphone.

### Don't:
- **Don't** teinter un bouton, un focus, un onglet actif ou le fond avec la couleur d'une île.
- **Don't** réintroduire un fond « mer de nuit » bleu-vert ou un neutre teinté de bleu-vert dans l'interface.
- **Don't** introduire une seconde couleur d'accent : la couleur vient de l'ambre, des îles, des statuts et des catégories.
- **Don't** mettre de verre, de flou ou de lueur colorée sur les composants de « Saison en cours ».
- **Don't** laisser apparaître ou se deviner la variante « Astre déchu » ou ce qui s'y rattache pour un joueur ordinaire, y compris dans les noms de classes.
- **Don't** étendre la grammaire de « Saison en cours » (Archivo 800, vignettes, aplats sans verre) à d'autres pages sans décision explicite ; seule sa palette est partagée.
