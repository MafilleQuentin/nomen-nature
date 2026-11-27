# Outils de la carte

Fichiers de carte générés à partir de [Natural Earth](https://www.naturalearthdata.com/) (domaine public), projetés en Equal Earth ([`src/lib/carte/projection.ts`](../../src/lib/carte/projection.ts)). Les fichiers produits sont versionnés ; les données d'entrée, non.

| Outil | Rôle |
|---|---|
| [`fond.ts`](fond.ts) | Fond de la carte de répartition des fiches (lot 4) : terres 1:110 m dans [`src/assets/carte/terres.svg`](../../src/assets/carte/terres.svg) |
| [`pays.ts`](pays.ts) | Carte interactive (lot 6, QUE-29) : terres de chaque continent pour la carte du monde (1:110 m, [`src/data/carte/monde.json`](../../src/data/carte/monde.json)) et pays de chaque continent (1:50 m, `src/data/carte/continents/<code>.json`), simplifiés et découpés au cadre du continent ; depuis le lot 7 (QUE-32), le cadre de chaque pays et de son plus grand morceau (carte de situation des pages pays) et `src/data/carte/pays.json` (continent et position de chaque pays) |
| [`courbes.ts`](courbes.ts) | Courbes de niveau de la carte (lot 6, QUE-31) : richesse du vivant d'après les espèces distinctes par case d'un degré (GBIF), échelle logarithmique, lissage, d3-contour ; lancé par l'import mensuel, résultat dans le paquet de données (`carte/courbes.json`), pas dans le dépôt |
| [`masque.ts`](masque.ts) | Masque des terres à un degré pour les courbes (Natural Earth 1:110 m), versionné dans [`src/data/carte/terres-un-degre.txt`](../../src/data/carte/terres-un-degre.txt) : l'import mensuel n'a pas Natural Earth |
| [`donnees-disque.ts`](donnees-disque.ts) | Cadre des cartes des continents lu sur le disque, pour les outils hors du site |
| [`geometrie.ts`](geometrie.ts) | Simplification (Douglas-Peucker), découpe par un rectangle et chemins SVG compacts |
| [`shapefile.ts`](shapefile.ts) | Lecteur minimal du format shapefile (polygones et attributs), sans dépendance |

## Données d'entrée

- `tools/maquettes/data/ne_110m_admin_0_countries.geojson` et `ne_110m_land.geojson` : téléchargés pour les maquettes (Natural Earth 1:110 m).
- `tools/carte/data/ne_50m/ne_50m_admin_0_countries.zip` : « Admin 0 – Countries » au 1:50 m ([téléchargements 1:50 m](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/)), archive shapefile de naturalearthdata.com (800 Ko, téléchargée le 25.11.2026).

## Utilisation

```
node tools/carte/pays.ts
```

Chaque morceau de terre est rattaché au continent de son pays, sauf s'il est loin de lui (la Guyane va à l'Amérique du Sud, la Réunion à l'Afrique, la Sibérie à l'Asie) : zones et vues des continents dans [`src/lib/carte/continents.ts`](../../src/lib/carte/continents.ts). Poids mesuré le 25.11.2026 : 16 Ko compressés pour le monde, de 3 à 23 Ko par continent.
