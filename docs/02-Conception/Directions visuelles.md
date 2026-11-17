# Directions visuelles

*Étape 3 — direction E retenue comme base, choix de la variation en attente. Maquettes : [Figma « Nomen », page « Directions visuelles »](https://www.figma.com/design/lbR59tuBWRe62sapV6RSum/Nomen).*

## Variations de E (E1, E2, E3) — direction préférée

L'utilisateur a choisi **E — Courbes de niveau** comme base (les autres directions sont conservées dans Figma). Trois variations qui changent la structure, pas seulement les couleurs ou les polices. Elles sont dans le même fichier Figma, sous la deuxième série.

Dans les trois, les courbes prennent un **sens** : elles représentent la richesse du vivant. Plus elles sont serrées, plus la vie est dense.

| Variation | Idée | Ce qui change vraiment |
|---|---|---|
| **E1 — Atlas plein écran** | La carte est la page, comme une application de cartographie | Pas de défilement ; panneau latéral du continent choisi (statistiques, onglets Toutes / Menacées / Par groupe, liste d'espèces) ; panneau qui monte du bas sur téléphone ; légende « Lire la carte », échelle, zoom, sélecteur de continents |
| **E2 — Carte d'état-major** | Version claire, façon carte topographique imprimée | Fond papier ; continents en teintes d'altitude (vert → brun) avec quadrillage des latitudes ; sections numérotées 01–04 ; cartouche et colophon ; fiches d'espèces façon étiquettes de muséum (numéro, lieu, coordonnées, tampon) ; groupes en index avec nombre d'espèces |
| **E3 — Strates** | Le relief devient une maquette en carton découpé | Navigation latérale fixe (ordinateur) et barre d'onglets en bas (téléphone) ; grand relief en couches avec ombres ; carte du monde en strates ; cartes et tuiles de groupes en relief |

Générateur : `tools/maquettes/directions_e.py` (courbes calculées sur une « richesse » fictive : distance à la côte modulée par un bruit). Les chiffres affichés (18 240 espèces, 1 126 menacées, nombres par groupe) sont des **exemples**.

## Deuxième série (D, E, F) — à la demande de l'utilisateur

Retour sur la première série : **trop générique**. L'utilisateur a demandé trois styles précis : Halftone, Contour lines et Liquid glass. Ils sont dans le même fichier Figma, sous les directions A, B et C.

| Direction | Ambiance | Couleurs clés | Polices |
|---|---|---|---|
| **D — Halftone** | Affiche imprimée en risographie : trames de points, encre noire, ombres dures, titres en capitales | Papier `#F1ECE1`, encre `#141414`, vert `#12A35E`, orange fluo `#FF5B2E` | Archivo (Black), DM Mono |
| **E — Courbes de niveau** | Carte topographique de nuit : courbes de niveau partout, coordonnées en police technique | Forêt de nuit `#0F2A21`, crème `#F1EBDD`, ambre `#F2B85B`, menthe `#7FC8A0` | Space Grotesk, IBM Plex Sans, IBM Plex Mono |
| **F — Liquid glass** | Panneaux de verre sur une nature lumineuse et floue | Forêt `#0E3B2E`, mousse `#3FA36F`, lagon `#2C8C99`, soleil `#F5D76E`, encre `#0B1F17` | Plus Jakarta Sans, Instrument Serif (italique) |

Comment c'est fait :
- **Halftone** : la carte et les « photos » sont des trames de points **vectorielles** (taille des points modulée), donc légères et nettes sur le web. L'effet Halftone officiel de Figma n'est pas accessible par l'API ; on pourra l'appliquer à la main sur de vraies photos.
- **Courbes de niveau** : vraies isolignes calculées (algorithme « marching squares ») à l'intérieur de chaque continent, et en fond de page.
- **Liquid glass** : effet **Glass natif de Figma** (réfraction, reflets, dispersion) appliqué aux 42 panneaux (navigation, recherche, boutons, carte, cartes d'espèces).
- Contrastes vérifiés : tous les textes atteignent au moins 5,6:1 (niveau AA).
- Le générateur est versionné dans `tools/maquettes/directions_def.py` : ses algorithmes (trame, courbes) resserviront pour le site.

## Première série (A, B, C)

Trois directions ont d'abord été proposées. Chacune comprend une **planche de style** (couleurs, polices, badges, boutons) et la **page d'accueil** sur téléphone (390 px) et sur ordinateur (1440 px), avec le même contenu pour pouvoir comparer.

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

1. Choisir une direction parmi les six, ou un mélange (par exemple les courbes de niveau de E avec le verre de F).
2. Construire le design system dans Figma : couleurs, typographies, espacements, composants.
3. Dessiner les écrans clés : carte (continent, pays), fiche espèce, recherche, identification, Autour de moi.

Voir aussi : [Brief](../01-Cadrage/Brief.md) · [Parcours utilisateurs](Parcours%20utilisateurs.md)
