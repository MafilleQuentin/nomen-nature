# Essai de la recherche (lot 1)

Outils jetables du **lot 1** : vérifier qu'une recherche tolérante aux fautes, en français, en anglais et en latin, tient dans Cloudflare D1 gratuit. Le verdict sera consigné dans [Stack technique](../../docs/02-Conception/Stack%20technique.md).

Les données téléchargées et générées vont dans `data/`, **ignoré par git**.

## Étapes

| Ticket | Script | Ce qu'il fait |
|---|---|---|
| QUE-5 | `telecharger.py` | Télécharge le Catalogue of Life XR : l'export à plat (137 Mo) et, depuis l'archive mensuelle de 1,4 Go, **seulement** la table des noms courants (35 Mo, grâce aux requêtes HTTP partielles). |
| QUE-5 | `extraire_noms.py` | Garde les animaux, plantes et champignons, et écrit `data/taxa.tsv` (taxons) et `data/noms.tsv` (noms cherchables). |

| QUE-7 | `phonetique.py`, `test_phonetique.py` | Normalise les noms et calcule une **clé phonétique** par langue (français, anglais, latin), stockée dans la colonne `nom.cle`. |
| QUE-6 | `schema.sql`, `charger.py` | Charge les taxons et les noms dans une base SQLite (`sqlite`, pour comparer des variantes) ou dans la base **D1 locale** de Wrangler (`d1`), avec un index par trigrammes qui ignore majuscules et accents. |

```bash
python telecharger.py
```

```bash
python -X utf8 extraire_noms.py
```

```bash
python -X utf8 -m unittest -v test_phonetique
```

```bash
npm install
```

```bash
python -X utf8 charger.py d1
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

## Chargement dans D1 (18.11.2026)

**Schéma** (`schema.sql`) : une table `taxon`, une table `nom` (un nom par ligne) et un index plein texte `nom_fts`. L'index découpe les noms en **trigrammes** (groupes de 3 lettres), sans tenir compte des majuscules ni des accents : « chene pedoncule » trouve « chêne pédonculé », et « Quercus rob » trouve *Quercus robur*. Il pointe vers la table `nom` au lieu de recopier les noms (« contenu externe »).

| Variante | Noms | Taille | Chargement |
|---|---|---|---|
| SQLite, avec synonymes | 5 133 164 | 975 Mo | 45 s |
| SQLite, sans synonymes | 3 118 063 | 709 Mo | 28 s |
| **D1 local (Wrangler 4.157), avec synonymes** | 5 133 164 | **993 Mo** | 4 min (41 fichiers SQL) + 23 s pour l'index |

**Verdict de QUE-6** : la base complète tient largement dans les 5 Go gratuits de D1, soit environ un cinquième. D1 accepte l'index par trigrammes avec `remove_diacritics`, et une recherche répond en quelques millisecondes en local.

Premières recherches à la main, avant la clé phonétique (QUE-7) :
- « boulot » ne trouve pas le bouleau : c'est le rôle de la clé phonétique.
- Le tri est à travailler (QUE-8) : « bouleau » est posé sur deux espèces avant le genre *Betula*, et « chêne » fait remonter des noms latins comme *Cheneya*.
- **D1 local ne donne pas les lignes lues**, ce qui sera un problème pour QUE-9 : `meta` ne contient que la durée, et `sqlite_version()` est refusé. Pour QUE-9, il faudra une base D1 en ligne (compte Cloudflare) ou une estimation par `EXPLAIN QUERY PLAN`.

## Clé phonétique (18.11.2026)

**Normalisation** (`normaliser`) : minuscules, accents et ligatures retirés (œ → oe), ponctuation, apostrophes et traits d'union remplacés par des espaces. « Rouge-gorge » et « rouge gorge » deviennent identiques.

**Une clé par langue**, calculée mot par mot. Les majuscules dans une clé représentent des sons, pas des lettres : A = an/en, O = on, I = in/un, U = ou, E = eu, X = ch, N = gn.

| Langue | Principales règles | Exemple |
|---|---|---|
| Français | eau/au → o ; lettres finales muettes (e, s, t, d, x, z, p) ; nasales ; ch, qu, ph, c/g doux ; s entre voyelles → z ; h muet ; lettres doublées | bouleau, boulot → `bUlo` ; mésange charbonnière, mezange charbonière → `mezAj Xarbonier` |
| Anglais | dans l'esprit de Metaphone : kn/wr en début de mot, tch/ch/sh → X, ph → f, th → 0, c/g doux ; on garde la première lettre puis on retire les voyelles | birch, birtch → `brX` ; red fox, red focks → `rd fks` |
| Latin | ae/oe → e, y → i, ph → f, th → t, ch/c/q → k, lettres doublées | Quercus, Querkus → `kuerkus` ; Philadelphus, Filadelfus → `filadelfus` |

**Tests** (`test_phonetique.py`) : 36 paires qui doivent donner la même clé (fautes d'accent, de son, de lettres doublées…), et 8 paires qui doivent rester différentes (bouleau ≠ boule, chêne ≠ chien, oak ≠ ash…). Tous passent.

**Recherche** : la clé est stockée dans `nom.cle`, avec un index `(langue, cle)`. On cherche par **début de clé**, dans chaque langue, avec la clé calculée pour le texte tapé :

```sql
SELECT … FROM nom WHERE langue = 'fr' AND cle >= 'bUlo' AND cle < 'bUlo' || '~'
```

`EXPLAIN QUERY PLAN` confirme que D1 utilise l'index (`SEARCH n USING COVERING INDEX nom_cle`).

| | Avant la clé | Avec la clé |
|---|---|---|
| Taille SQLite | 975 Mo | 1 230 Mo |
| **Taille D1 locale** | 993 Mo | **1 272 Mo** (environ un quart des 5 Go gratuits) |
| « boulot » | rien d'utile | *Betula* (bouleaux), en 1 à 4 ms |

Premiers résultats, à mesurer pour de bon dans QUE-8 :
- Trouvés grâce à la clé : « boulot » → bouleau, « ecureuil » → écureuil, « mezange charbonière » → *Parus major*, « renar » → renard, « birtch » → *Betula*, « red focks » → *Vulpes vulpes*.
- Ce que la clé ne rattrape pas : une lettre ou une syllabe manquante (« verruquex »). Il faudra le combiner avec les trigrammes.
- Le tri reste à faire : « Querkus robur » remonte aussi « Caracas Robber Frog » par la clé anglaise.
- 74 noms en écriture chinoise, cyrillique ou grecque sont étiquetés « anglais » dans le Catalogue : leur clé est vide. À nettoyer au lot 3.
- La clé devra être **réécrite en TypeScript** pour le Worker, avec les mêmes tests, afin de donner exactement le même résultat à l'import et à la recherche.
