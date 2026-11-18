# Essai de la recherche (lot 1)

Outils jetables du **lot 1** : vérifier qu'une recherche tolérante aux fautes, en français, en anglais et en latin, tient dans Cloudflare D1 gratuit. Le verdict sera consigné dans [Stack technique](../../docs/02-Conception/Stack%20technique.md).

Les données téléchargées et générées vont dans `data/`, **ignoré par git**.

## Étapes

| Ticket | Script | Ce qu'il fait |
|---|---|---|
| QUE-5 | `telecharger.py` | Télécharge le Catalogue of Life XR : l'export à plat (137 Mo) et, depuis l'archive mensuelle de 1,4 Go, **seulement** la table des noms courants (35 Mo, grâce aux requêtes HTTP partielles). |
| QUE-5 | `extraire_noms.py` | Garde les animaux, plantes et champignons, et écrit `data/taxa.tsv` (taxons) et `data/noms.tsv` (noms cherchables). |

```bash
python telecharger.py
```

```bash
python -X utf8 extraire_noms.py
```

## Source

**Catalogue of Life, version COL26.10 XR** (16.10.2026), clé ChecklistBank 316691, DOI [10.48580/dgzlf](https://doi.org/10.48580/dgzlf), licence CC BY 4.0. Depuis 2026, c'est le référentiel de noms de GBIF : il remplace l'ancienne « GBIF Backbone », qui n'est plus mise à jour. Les identifiants sont des codes courts en lettres et chiffres (ex. `4R5YN` pour le chêne pédonculé), les mêmes que ceux de l'API GBIF avec `checklistKey=7ddf754f-d193-4cc9-b351-99906754a03b`.

## Ce qui est extrait

- **Taxons cherchables** : espèces acceptées (et acceptées provisoirement), plus les **genres et familles** acceptés. Les noms courants désignent souvent un genre : « bouleau » et « birch » sont posés sur *Betula*, « Chêne » sur *Quercus*.
- **Noms** : le nom latin accepté ; les synonymes latins d'espèces, renvoyés vers l'espèce acceptée (*Quercus pedunculata* → *Quercus robur*) ; les noms courants français et anglais, nettoyés (espaces, guillemets, remarque finale entre parenthèses) et dédoublonnés sans tenir compte des majuscules.
- **Non retenus** : les autres règnes (bactéries, virus, chromistes…), les rangs sous l'espèce, les synonymes ambigus ou mal appliqués.

## Résultat de l'extraction (18.11.2026)

| | Nombre |
|---|---|
| Espèces | 2 382 960 |
| Genres | 278 301 |
| Familles | 18 517 |
| Noms latins acceptés | 2 679 778 |
| Synonymes latins | 2 015 101 |
| Noms courants français | 84 456 (52 748 espèces en ont au moins un) |
| Noms courants anglais | 353 829 (174 321 espèces en ont au moins un) |
| **Total des noms** | **5 133 164** |
| `noms.tsv` | 195 Mo |
| `taxa.tsv` | 251 Mo |

C'est volontairement le **cas le plus lourd** : toutes les espèces du Catalogue, pas seulement les ~1,5 million qui ont des observations GBIF (ce filtre viendra au lot 3).

À retenir pour la suite :
- Un même nom courant peut désigner plusieurs taxons (« Silver Birch » : 4). Les résultats devront être triés, par exemple les espèces bien documentées d'abord.
- Seules 2 % des espèces ont un nom français. Wikidata pourra en ajouter au lot 3 si besoin.
- Les synonymes latins doublent presque le nombre de noms : on mesurera la recherche avec et sans eux.
