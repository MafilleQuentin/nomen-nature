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
| Anglais | dans l'esprit de Metaphone : kn/wr en début de mot, tch/ch/sh → X, ph → f, th → 0, c/g doux, e final muet ; chaque groupe de voyelles devient « a » | birch, birtch → `barX` ; red fox, red focks → `rad faks` ; oak, oke → `ak` |
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

## Qualité de la recherche (18.11.2026)

**Fonction de recherche** (`recherche.py`), dans l'ordre :

1. **Candidats** : l'index par trigrammes, pour un morceau de nom (200 au plus), et la clé phonétique de chaque langue, par début de clé (100 au plus par langue).
2. **Score de chaque nom** :
   - identique au texte tapé : 100 ; commence par lui : 60 ; un mot commence par lui : 40 ;
   - même son : 70 en français et en latin, 55 en anglais ; début du son : 35 ou 25 ;
   - simple morceau : 15 ;
   - bonus de langue (français 6, latin 4, anglais 3) ; synonyme −10 ; nom plus long que le texte tapé : −0,5 par lettre.
3. **Par taxon**, on garde son meilleur nom, puis on ajoute :
   - la **notoriété** : 2 points par nom courant, 30 au plus. C'est un substitut, en attendant le score « bien documentée » du lot 3 ;
   - le **regroupement** : un genre ou une famille gagne 15 points par membre trouvé, 45 au plus. C'est ce qui fait remonter *Betula* pour « bouleau ».
4. **Repli** : si la phrase entière ne donne rien, on cherche chaque mot d'au moins 4 lettres, avec 60 % des points.

**Jeu de test** (`evaluer.py`) : 40 recherches réelles, chacune avec ses bonnes réponses. Un cas est réussi si une bonne réponse sort dans les 5 premiers résultats.

```bash
python -X utf8 evaluer.py
```

| | Recherche | Ce qu'elle teste | Rang | Premier résultat | Durée |
|---|---|---|---|---|---|
| ✅ | « chêne pédonculé » | fr exact | 1 | Quercus robur | 14 ms |
| ✅ | « chene pedoncule » | fr sans accents | 1 | Quercus robur | 11 ms |
| ✅ | « bouleau » | fr exact (genre) | 1 | Betula | 13 ms |
| ✅ | « boulot » | fr faute de son | 1 | Betula | 7 ms |
| ✅ | « bouleau verruqueux » | fr exact | 1 | Betula pendula | 5 ms |
| ✅ | « bouleau verukeux » | fr faute de son | 1 | Betula pendula | 2 ms |
| ✅ | « renard roux » | fr exact | 1 | Vulpes vulpes | 3 ms |
| ✅ | « renar » | fr faute de son | 1 | Vulpes | 20 ms |
| ✅ | « écureuil roux » | fr exact | 2 | Tamiasciurus hudsonicus | 5 ms |
| ✅ | « ecureuil » | fr sans accents | 1 | Sciuridae | 8 ms |
| ✅ | « mésange charbonnière » | fr exact | 1 | Parus major | 13 ms |
| ✅ | « mezange charboniere » | fr faute de son | 1 | Parus major | 5 ms |
| ✅ | « rouge gorge » | fr sans trait d'union | 2 | Turdus migratorius | 4 ms |
| ✅ | « herisson » | fr sans accents | 1 | Erinaceidae | 13 ms |
| ✅ | « coquelico » | fr faute de son | 1 | Papaver rhoeas | 7 ms |
| ✅ | « muget » | fr faute de son | 4 | Mugilidae | 3 ms |
| ✅ | « pissenlit » | fr exact (genre) | 1 | Taraxacum | 8 ms |
| ✅ | « amanite tue mouche » | fr sans trait d'union | 1 | Amanita muscaria | 5 ms |
| ✅ | « cèpe de bordeaux » | fr exact | 3 | Boletus | 21 ms |
| ✅ | « lynx » | fr exact | 1 | Lynx | 6 ms |
| ✅ | « loup gris » | fr exact | 1 | Canis lupus | 2 ms |
| ✅ | « abeille domestique » | fr exact | 1 | Apis mellifera | 11 ms |
| ✅ | « coccinelle a sept points » | fr sans accents | 1 | Coccinella septempunctata | 7 ms |
| ✅ | « red fox » | en exact | 1 | Vulpes vulpes | 3 ms |
| ✅ | « silver birch » | en exact | 4 | Betula papyrifera | 6 ms |
| ✅ | « birtch » | en faute de son | 1 | Betula | 6 ms |
| ✅ | « pedunculate oak » | en exact | 1 | Quercus robur | 8 ms |
| ✅ | « honey bee » | en exact | 1 | Apis mellifera | 5 ms |
| ✅ | « hedgehog » | en exact | 2 | Diodon hystrix | 9 ms |
| ✅ | « fly agaric » | en exact | 1 | Amanita muscaria | 3 ms |
| ✅ | « Quercus robur » | latin exact | 1 | Quercus robur | 16 ms |
| ✅ | « Querkus robur » | latin faute de son | 1 | Quercus robur | 4 ms |
| ✅ | « Vulpes vulpes » | latin exact | 1 | Vulpes vulpes | 6 ms |
| ✅ | « Quercus pedunculata » | latin synonyme | 1 | Quercus robur | 24 ms |
| ✅ | « Betula pendula » | latin exact | 1 | Betula pendula | 15 ms |
| ✅ | « Quercus rob » | autocomplétion | 1 | Quercus robur | 16 ms |
| ✅ | « mesange ch » | autocomplétion | 1 | Parus major | 5 ms |
| ✅ | « ecureuil r » | autocomplétion | 2 | Tamiasciurus hudsonicus | 3 ms |
| ✅ | « pissen » | autocomplétion | 1 | Taraxacum | 13 ms |
| ✅ | « Vulpes v » | autocomplétion | 1 | Vulpes vulpes | 5 ms |

**Score : 40/40** (100 %) dans les 5 premiers résultats.
Durée (SQLite local) : médiane 7 ms, max 24 ms.

Par catégorie :
- autocomplétion : 5/5
- en exact : 6/6
- en faute de son : 1/1
- fr exact : 11/11
- fr faute de son : 6/6
- fr sans accents : 4/4
- fr sans trait d'union : 2/2
- latin exact : 3/3
- latin faute de son : 1/1
- latin synonyme : 1/1

**Verdict de QUE-8** : **40/40 dans les 5 premiers résultats, 33/40 en première position**, en 7 ms (médiane) sur SQLite local.

Ce qui a été corrigé en cours de route, en regardant les résultats :
- La clé anglaise retirait toutes les voyelles, comme Metaphone, si bien que « boulot » ressemblait à « Bluet » et « Belut ». Chaque groupe de voyelles devient maintenant « a » : `balat` contre `blat`.
- « bouleau » renvoyait deux espèces avant le genre *Betula* : d'où le regroupement.
- « cèpe de bordeaux » ne renvoyait rien, parce que les données ne connaissent que « Cèpe » : d'où le repli mot par mot.

Limites, à garder en tête :
- **Les 7 cas réussis mais pas en premier** (écureuil roux, rouge-gorge, muget, cèpe de bordeaux, silver birch, hedgehog, ecureuil r) viennent surtout de noms partagés par plusieurs espèces (« écureuil roux » désigne aussi l'écureuil d'Amérique, « hedgehog » un poisson-porc-épic) ou de sons proches (« muget » fait d'abord remonter *Mugilidae*, les mulets). Un vrai score de notoriété (nombre d'observations GBIF, photo, article Wikipédia) devrait les régler au lot 3.
- **Le jeu de test a été écrit et le tri réglé par la même personne** (Claude) : il y a un risque de réglage « sur mesure ». Il faudra ajouter des recherches imprévues, par exemple tapées par l'utilisateur ou par des enfants, avant de figer le tri.
- Les durées sont celles de SQLite sur un ordinateur. La consommation réelle de D1 (lignes lues) est l'objet de QUE-9.

## ⚠️ Alerte : limites de D1 gratuit (18.11.2026)

Vérifié sur les pages [Limits](https://developers.cloudflare.com/d1/platform/limits/) et [Pricing](https://developers.cloudflare.com/d1/platform/pricing/) de Cloudflare (mises à jour le 30.10.2026) :

| Limite | Gratuit | Payant (5 $/mois) | Notre essai |
|---|---|---|---|
| Taille d'**une** base | **500 Mo** | 10 Go | **1 272 Mo** |
| Stockage par compte | 5 Go | 1 To | — |
| Lignes écrites | **100 000 / jour** | 50 millions / mois inclus | 5,1 M noms + 2,7 M taxons, et chaque index ajoute une écriture par ligne |
| Lignes lues | 5 millions / jour | 25 milliards / mois inclus | QUE-9 |

Conséquences :
- **La base complète ne tient pas dans une base D1 gratuite**, et la limite de 500 Mo n'est pas répartissable : le « 5 Go » est un total par compte.
- **Le chargement serait impossible en gratuit** : au moins 8 millions de lignes écrites, soit plus de 80 jours de quota, et autant à chaque mise à jour mensuelle. Les écritures faites avec Wrangler comptent comme les autres.
- Le stockage seul (environ 1,3 Go) et les lectures ne posent pas de problème.

C'est le genre de chose que l'essai devait révéler : à trancher avec l'utilisateur avant QUE-9 et le verdict (QUE-10).
