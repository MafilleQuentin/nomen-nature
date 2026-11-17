# Design system

*Étape 3 — créé le 17 novembre 2026, à partir du style retenu (direction E d'origine, « Courbes de niveau »). Fichier : [Figma « Nomen »](https://www.figma.com/design/lbR59tuBWRe62sapV6RSum/Nomen), pages **Fondations** et **Composants**.*

Tout est construit avec des **variables Figma** : changer une couleur ou un espacement à un endroit le met à jour partout. Chaque variable porte déjà le **nom CSS** qu'elle aura dans le code (par exemple `var(--color-bg-page)`).

## Fondations

### Couleurs

Deux niveaux : des **primitives** (les teintes brutes, cachées) et des **rôles** (ce qu'on utilise vraiment), qui pointent vers les primitives.

| Rôle | Valeur | Usage |
|---|---|---|
| `color/bg/page` | `#0F2A21` forêt de nuit | Fond de page |
| `color/bg/sunken` | `#0B2119` | Zones en creux (carte, barre latérale) |
| `color/bg/surface` | `#163A2E` | Cartes, panneaux, champs |
| `color/bg/surface-raised` / `land` | `#1A4434` | Photo absente, terres sur la carte |
| `color/bg/accent` | `#F2B85B` ambre | Bouton principal |
| `color/bg/inverse` | `#F1EBDD` crème | Puce sélectionnée |
| `color/text/primary` | `#F1EBDD` crème | Texte principal |
| `color/text/secondary` | `#B9C7BC` sauge | Texte secondaire, noms latins |
| `color/text/accent` | `#F2B85B` | Liens d'action, mot mis en avant |
| `color/text/highlight` | `#7FC8A0` menthe | Surtitres, coordonnées |
| `color/text/on-accent` | `#0F2A21` | Texte sur ambre |
| `color/border/subtle` / `strong` | `#2F5C4A` / `#4F8A6B` | Séparateurs, contours |
| `color/map/contour` / `contour-index` | `#4F8A6B` / `#7FC8A0` | Courbes de niveau (normales / maîtresses) |
| `color/map/coast` | `#C9DCC9` | Traits de côte |
| `color/status/cr…lc` | couleurs officielles UICN | Badges de statut (+ `on-…` pour le texte) |

Contrastes vérifiés : texte principal 12,9:1, secondaire 8,7:1, texte sur ambre 8,6:1 (niveau WCAG AA largement atteint).

### Typographies

| Style | Police | Usage |
|---|---|---|
| Display/Grand · Display/Compact | Space Grotesk Bold 58 / 34 | Titre principal (ordinateur / téléphone) |
| Titre/Section · Titre/Section compact | Space Grotesk Bold 34 / 22 | Titres de section |
| Titre/Carte | Space Grotesk Bold 18 | Nom d'espèce |
| Logo | Space Grotesk Bold 26 | Mot-symbole (provisoire) |
| Texte/Grand · Normal · Petit | IBM Plex Sans 19 / 16 / 14 | Texte courant |
| Texte/Latin | IBM Plex Sans Italic 14 | Noms scientifiques |
| Libellé/Normal · Petit | IBM Plex Sans SemiBold 16 / 14 | Boutons, puces, onglets |
| Mono/Navigation · Surtitre · Légende · Badge | IBM Plex Mono 15 / 14 / 12 / 12 | Navigation, surtitres, crédits, coordonnées, badges |

### Espacements et rayons

- Espacements : 4, 8, 12, 16, 20, 24, 32, 40, 56, 64, 80 px (`space/1` à `space/20`).
- Rayons : 4, 6, 8, 10, 14 px et « plein » (`radius/sm` à `radius/full`).

## Composants

| Composant | Variantes | Propriétés réglables |
|---|---|---|
| **Icônes** (10) | Recherche, Position, Appareil photo, Feuille, Plus, Moins, Menu, Globe, Flèche droite, Fermer | Couleur via variable |
| **Logo** | — | Provisoire, à remplacer par le vrai logo |
| **Bouton** | Style Principal / Secondaire × Taille Grand / Compact | Libellé, Icône (échangeable), Avec icône |
| **Bouton icône** | — (44 × 44 px, zone tactile minimale) | Icône |
| **Barre de recherche** | Grand (ordinateur) / Compact (téléphone) | Texte indicatif |
| **Badge de statut** | CR, EN, VU, NT, LC | — (code + libellé, jamais la couleur seule) |
| **Puce de groupe** | Défaut / Sélectionné | Libellé |
| **Carte espèce** | — | Nom, Nom latin, Méta ; statut modifiable depuis la carte |
| **En-tête** | Ordinateur / Téléphone | — |
| **Ligne espèce** | — | Nom, Nom latin, Méta, Avec statut ; statut modifiable |
| **Statistique** | — | Valeur, Libellé |

![Page Fondations du design system](../Pieces-jointes/design-system-fondations.png)

## Pas encore fait

- Le **vrai logo** (le logo actuel est provisoire).
- Un composant **Carte du monde** : la carte reste pour l'instant un dessin dans les maquettes.
- Pas de mode clair : le site n'a qu'un thème (nuit).

Voir aussi : [Directions visuelles](Directions%20visuelles.md) · [Parcours utilisateurs](Parcours%20utilisateurs.md)
