# Directions visuelles

*Étape 3 — en attente de choix. Maquettes : [Figma « Nomen », page « Directions visuelles »](https://www.figma.com/design/lbR59tuBWRe62sapV6RSum/Nomen).*

Trois directions sont proposées. Chacune comprend une **planche de style** (couleurs, polices, badges, boutons) et la **page d'accueil** sur téléphone (390 px) et sur ordinateur (1440 px), avec le même contenu pour pouvoir comparer.

Elles ont été construites à partir des recherches du skill UI UX Pro Max (styles « Organic Biophilic » et « Nature Distilled », palettes nature, associations de polices), puis ajustées à la main. Les premiers résultats bruts étaient trop génériques (bleu « SaaS », police Comic Neue).

## A — Forêt vivante

Chaleureuse et vivante : formes douces et arrondies, verts de forêt, touche de soleil. Accueillante pour les enfants sans être enfantine.

| Rôle | Couleur |
|---|---|
| Fond | `#F4F7F0` |
| Texte | `#1B2B1E` |
| Principale (vert forêt) | `#1F6F3F` |
| Accent (soleil) | `#F2A541` |

- Polices : **Nunito** (titres) et **Nunito Sans** (texte).
- Coins très arrondis (20 px), boutons en pilule, ombres douces, une forme organique en fond.

## B — Carnet de naturaliste

Le charme d'un carnet de terrain : papier crème, encre, olive et terracotta.

| Rôle | Couleur |
|---|---|
| Fond (papier) | `#F6F1E6` |
| Texte (encre) | `#2A2620` |
| Principale (olive) | `#4F5E2A` |
| Accent (terracotta) | `#A8462D` |

- Polices : **Newsreader** (titres à empattements, italiques) et **Source Sans 3** (texte).
- Coins discrets (6 px), traits fins, continents cernés à l'encre comme sur une gravure.

## C — Atlas lumineux

Moderne et énergique : la carte est la star, avec des continents aux couleurs franches sur fond blanc.

| Rôle | Couleur |
|---|---|
| Fond | `#FFFFFF` |
| Texte | `#0F1B2D` |
| Principale (bleu-vert océan) | `#0B6E80` |
| Accent (vert tilleul) | `#B7E34B` |

- Polices : **Outfit** (titres) et **Work Sans** (texte).
- Coins moyens (12 px), interface nette, continents très colorés (proche de l'exemple de carte fourni).

## Commun aux trois directions

- **Contrastes vérifiés** : texte, couleur principale et boutons atteignent tous au moins 4,5:1 (niveau WCAG AA).
- **Badges de menace** aux couleurs officielles de l'UICN, toujours accompagnés du texte (« EN · En danger ») pour ne pas reposer sur la couleur seule.
- Icônes au trait (style Lucide), jamais d'émojis.
- Même structure de page d'accueil, conforme aux [parcours validés](Parcours%20utilisateurs.md).

## Limites des maquettes

- La **carte du monde** est un dessin simplifié fait à la main : la vraie carte utilisera les frontières de Natural Earth.
- Les **photos** sont des emplacements vides : les vraies viendront de Wikimedia Commons et iNaturalist.
- Les espèces et statuts affichés sont des **exemples** (statuts mondiaux de l'UICN).
- Le **logo** est provisoire (une feuille et le mot « Nomen ») : il sera créé une fois la direction choisie.

## Suite

1. Choisir une direction, ou un mélange (par exemple les couleurs de A avec les polices de B).
2. Construire le design system dans Figma : couleurs, typographies, espacements, composants.
3. Dessiner les écrans clés : carte (continent, pays), fiche espèce, recherche, identification, Autour de moi.

Voir aussi : [Brief](../01-Cadrage/Brief.md) · [Parcours utilisateurs](Parcours%20utilisateurs.md)
