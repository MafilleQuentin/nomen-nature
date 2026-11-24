# Données

*Note de conception du lot 3, écrite le 23.11.2026 après une mesure sur les vraies données. **Validée par l'utilisateur le 23.11.2026.***

Le lot 3 prépare toutes les données dont les lots suivants ont besoin : l'index de la recherche, les espèces et leur classification, les groupes courants, le statut UICN, le score « bien documentée » et les listes par pays et par continent. Cette note dit d'où viennent ces données, combien elles pèsent, et où les ranger.

## Ce qu'on a mesuré

Deux téléchargements SQL de GBIF ([outil](../../tools/donnees/gbif-sql.ts), [requêtes](../../tools/donnees/requetes/)), le 23.11.2026, sur les animaux, plantes et champignons, sans fossiles ni spécimens de zoos ou de jardins botaniques. Chaque téléchargement a un DOI, qui permet de citer toutes les sources.

| Mesure | Résultat |
|---|---|
| Espèces observées | **1 648 413** (animaux 1 135 690, plantes 375 050, champignons 137 673) |
| Observations | 3,45 milliards |
| Espèces avec au moins 10 / 100 / 1 000 observations | 794 122 / 299 254 / 73 750 |
| Statut UICN connu | 111 847 espèces, dont **34 953 menacées** (CR 7 719, EN 14 768, VU 12 466) ; 1 536 566 non évaluées (NE) |
| Lien avec le Catalogue of Life XR | **100 %** des espèces, directement par l'identifiant |
| Couples espèce × pays | **5 986 994** (252 pays) ; médiane 11 648 espèces par pays, maximum 282 368 (États-Unis) |
| Taille des couples dans D1 | ~300 Mo (limite gratuite : 500 Mo) et **60 jours d'écritures** pour tout recharger (limite : 100 000 lignes par jour) |
| Taille des couples en fichiers compressés | ~72 Mo |

Détail : [script de mesure](../../tools/donnees/mesurer.ts).

## Ce qu'on a appris

- **GBIF utilise déjà le Catalogue of Life XR dans ses téléchargements** : identifiants d'espèce (`4CLT2`) et de règne (`N` animaux, `P` plantes, `F` champignons) du COL XR. Aucune table de correspondance n'est nécessaire. La liste officielle des colonnes n'est pas à jour sur ce point.
- Une observation « présente » s'écrit désormais `DETECTED` (et non plus `PRESENT`). Une requête de diagnostic ([diagnostic-colonnes.sql](../../tools/donnees/requetes/diagnostic-colonnes.sql)) permet de revoir les vraies valeurs des colonnes en quelques minutes si GBIF les change encore.
- Le statut UICN est donné par observation et varie parfois pour une même espèce (85 362 espèces, souvent « LC » et « NE »). **Règle : un statut évalué l'emporte toujours sur « NE ».**
- Le code pays `ZZ` (pays inconnu, souvent en haute mer) regroupe 165 469 espèces : il n'aura pas de liste (les océans sont hors de la V1).
- Un téléchargement prend 15 à 20 minutes chez GBIF.
- **Licence des téléchargements GBIF : CC BY-NC 4.0** (certaines sources interdisent l'usage commercial). Compatible avec Nomen, non commercial pour toujours ; à indiquer dans les crédits avec le DOI de chaque téléchargement.

## Proposition

### 1. Les listes par pays vont dans des fichiers, pas dans D1

D1 gratuit pourrait contenir les 6 millions de couples, mais il faudrait **60 jours** pour les recharger chaque mois. Les fichiers statiques n'ont pas cette limite et pèsent ~72 Mo compressés.

### 2. Les listes montrent les espèces les mieux documentées, pas toutes

Le brief demande que la navigation mette **d'abord en avant les espèces bien documentées**, et que toutes soient trouvables par la recherche. Une liste complète des États-Unis (282 368 espèces) pèserait plusieurs mégaoctets : inutilisable sur un téléphone.

→ Pour chaque pays et chaque groupe courant (13 groupes), **un fichier avec les 500 premières espèces** classées par score, avec le nombre total d'espèces. Toutes les autres restent trouvables par la recherche. Les continents sont calculés à partir des pays, de la même façon.

Ordre de grandeur : 252 pays × 13 groupes + 7 continents × 13 groupes ≈ **3 400 fichiers**.

### 3. L'index de la recherche ne garde que les espèces observées

1,65 million d'espèces au lieu de 2,38 millions dans le Catalogue of Life XR (le brief : « toutes les espèces avec des observations »). L'index de l'essai du lot 1 avait 10 868 fichiers ; il en aura moins. Fichiers en `.txt`, compressés par Cloudflare.

**Budget** : ~3 400 fichiers de listes + < 10 900 fichiers d'index ≈ 14 300 fichiers, sous la limite de **20 000 fichiers** par version du site sur Cloudflare.

### 4. Un import mensuel en TypeScript, dans GitHub Actions

Chaque mois :

1. Télécharger l'archive du **Catalogue of Life XR** du mois (espèces, classification, noms courants en français et en anglais).
2. Lancer les **deux téléchargements SQL GBIF** (identifiants GBIF dans les secrets GitHub), attendre ~20 minutes, les récupérer.
3. Ajouter les informations du **score** (photo, article Wikipédia) depuis Wikidata : à détailler dans QUE-20.
4. Calculer les groupes courants (QUE-19), le statut UICN, le score (QUE-20), puis **construire l'index de recherche et les listes** (QUE-21).
5. Publier le résultat comme **fichier joint à une release GitHub** (`donnees-AAAA-MM`), puis déployer le site avec ces données.

Pourquoi une release GitHub : chaque déploiement de Cloudflare doit envoyer tous les fichiers du site. Le paquet de données du mois doit donc rester disponible pour les déploiements de code entre deux imports. Une release GitHub le garde gratuitement et sans limite de durée (jusqu'à 2 Go par fichier). Les données viennent de sources ouvertes, citées avec leurs DOI.

La clé phonétique et le tri de la recherche sont réécrits en TypeScript, avec les tests du lot 1, et **partagés** entre l'import et le navigateur (lot 5).

### Écarté

- **D1 pour les listes** : 60 jours d'écritures par mois.
- **Listes complètes** : trop lourdes sur téléphone, contraire au brief.
- **Cloudflare R2 pour le paquet de données** : possible (10 Go gratuits), mais un service de plus ; la release GitHub suffit.
- **Données dans le dépôt git** : plusieurs centaines de mégaoctets chaque mois.

## Groupes courants (QUE-19, validé le 23.11.2026)

Chaque espèce observée entre dans un seul des 13 groupes du brief, d'après sa classification dans le Catalogue of Life, et pour « arbres » d'après sa **forme de vie** dans la [World Checklist of Vascular Plants](https://doi.org/10.34885/egs6-cp24) (WCVP, Kew, licence **CC BY 3.0**, à créditer). Code : [`groupes.ts`](../../tools/donnees/groupes.ts).

| Groupe | Règle | Espèces observées |
|---|---|---|
| Mammifères | classe Mammalia | 7 980 |
| Oiseaux | classe Aves | 11 596 |
| Reptiles | classe Reptilia | 12 845 |
| Amphibiens | classe Amphibia | 8 723 |
| Poissons | classes Teleostei, Elasmobranchii, Holocephali, Chondrostei, Holostei, Cladistii, Myxini, Petromyzonti, Cephalaspidomorphi ; ordres des cœlacanthes et dipneustes | 37 517 |
| Insectes | classe Insecta | 693 358 |
| Araignées | ordre Araneae (pas les acariens ni les scorpions) | 37 091 |
| Mollusques | embranchement Mollusca | 107 847 |
| Champignons | règne Fungi, lichens compris | 137 673 |
| Arbres | plante vasculaire dont la forme de vie WCVP contient « tree » (« tree », « shrub or tree »…) | 55 709 |
| Fleurs | autres plantes à fleurs (Magnoliopsida, Liliopsida), herbes comprises | 279 678 |
| Fougères | Polypodiopsida et Lycopodiopsida | 13 557 |
| Mousses | Bryophyta, Marchantiophyta, Anthocerotophyta | 18 180 |
| *Aucun* | crustacés, vers, coraux, méduses, échinodermes, éponges, algues… : trouvables par la recherche, sans liste | 226 659 |

**96 %** des plantes vasculaires observées sont reliées à WCVP par leur nom (synonymes de WCVP compris). Une espèce n'est que dans un groupe : un arbre en fleurs est un arbre.

## Statut UICN et score « bien documentée » (QUE-20, validé le 23.11.2026)

- **Statut UICN** : celui des observations GBIF ; un statut évalué l'emporte sur « NE ». 34 953 espèces observées sont menacées (CR, EN, VU).
- **Score sur 10** : photo 3, nom français 3, article Wikipédia 2 (français) ou 1 (anglais seulement), observations dans le monde 1 (≥ 1 000) ou 2 (≥ 100 000). Les listes trient par score, puis par observations dans le pays.
- **« Bien documentée »** : photo + nom français + article Wikipédia → **30 224 espèces**, qui auront la fiche complète (lot 4) ; les autres, la fiche simple.
- **Source** : Wikidata (CC0), propriété P10585 « identifiant Catalogue of Life », interrogé par [QLever](https://qlever.dev) : les 2,3 millions d'espèces en 7 secondes (le service officiel de Wikidata dépasse sa limite de 60 secondes). Code : [`score.ts`](../../tools/donnees/score.ts).

| Sur 1 648 413 espèces observées | Espèces |
|---|---|
| Dans Wikidata | 1 012 593 (61 %) |
| Photo | 168 813 (10 %) |
| Article Wikipédia anglais / français | 228 910 (14 %) / 76 111 (4,6 %) |
| Nom français (Catalogue of Life) | 52 603 (3,2 %) |
| Score 0 / 10 sur 10 | 1 302 675 / 2 704 |

La table de l'import, `data/especes.tsv`, garde pour chaque espèce son groupe, son statut UICN, ses observations, son score, son nom français, son identifiant Wikidata, sa photo Commons et ses articles : elle servira aux listes (QUE-21) et aux fiches (lot 4).

## Listes par pays et par continent (QUE-21, 23.11.2026)

Code : [`listes.ts`](../../tools/donnees/listes.ts). Décisions de l'utilisateur : **5 observations au moins** dans la région, et **continents d'après GBIF** (continent de chaque observation, 3e téléchargement SQL mensuel) plutôt que déduits des pays.

- Un fichier par région et par groupe (`listes/pays/ch/oiseaux.json`, `listes/continents/europe/mammiferes.json`) : les **500 espèces les mieux classées** (score, puis observations dans la région), **plus toutes les espèces menacées** (CR, EN, VU) de la région, pour que le filtre « menacées » n'en oublie aucune. Chaque ligne : identifiant, nom latin, nom français, nom anglais, statut UICN, score, observations dans la région, photo Commons.
- Un résumé par région (`resume.json` : espèces et menacées par groupe) et `listes/regions.json`.
- Pas de liste pour le pays inconnu `ZZ`.
- **Résultat** : 251 pays, 7 continents, **3 498 fichiers** (88 Mo bruts ; le plus lourd, les fleurs d'Afrique, 85 Ko en brotli). Paquet complet : **11 464 fichiers**, sous la limite de 20 000. Exemple, Suisse : 28 195 espèces, dont 247 menacées ; oiseaux en tête : pinson des arbres, fauvette à tête noire, merle noir, mésange charbonnière.
- **Nom français principal** : le Catalogue of Life ne marque aucun nom « préféré » ; on prend celui qui correspond au titre de l'article Wikipédia français, sinon le premier (1 885 noms améliorés : « fayard » → « hêtre commun », « Casseron » → « Seiche commune »). Les majuscules sont inégales d'une source à l'autre : à uniformiser à l'affichage (lot 7).

## Fiches espèces (lot 4, QUE-22, 23.11.2026)

Décisions de l'utilisateur ([journal des décisions](../Decisions.md)) : données de base en **fichiers regroupés par genre**, contenus tiers (photos, tuiles) **servis par notre serveur**, encadré **« Sais-tu ? » d'après Wikidata**, adresse **`/fr/espece/quercus-robur`**. Code : [`fiches.ts`](../../tools/donnees/fiches.ts) (import), [`src/lib/especes/`](../../src/lib/especes/) (adresse, format, lecture par le serveur, mise en forme).

- **3 000 fichiers** `fiches/<n>.json` ; le numéro vient du premier mot de l'adresse (le genre), donc un genre entier est dans un seul fichier. 148 Ko en médiane, 1 Mo au plus (*Hieracium*, 3 599 espèces), lu en 3 ms par le serveur ; 502 Mo en tout (moins de 100 Mo une fois compressés). Paquet : **14 464 fichiers**, sous la limite de 20 000.
- Par espèce : noms (latin, auteur, français, anglais : celui du titre de l'article Wikipédia anglais s'il correspond), statut UICN, groupe, classification, observations, **nombre de pays** et **continent principal** (GBIF), Wikidata, photo Commons, articles Wikipédia, faits et **4 espèces proches** (les mieux classées du même genre, puis de la même famille), avec de quoi afficher leur carte.
- **Homonymes** : 381 espèces partagent leur nom latin avec une autre (autre règne) ; la plus observée garde l'adresse simple, les autres ont leur identifiant à la fin (`morus-alba-…`).
- **« Sais-tu ? »** : Wikidata a peu de ces faits pour les espèces reliées au Catalogue of Life : **5 897 espèces** (masses et envergures d'oiseaux surtout, longévité de quelques arbres et animaux : 929 ans pour le chêne pédonculé). L'encadré n'apparaît que pour elles.
- **Résumé** : introduction de l'article Wikipédia (français, sinon anglais avec la mention de la langue), appelée par notre serveur, coupée à la fin d'une phrase vers 450 caractères ; la fiche s'affiche sans résumé si Wikipédia ne répond pas en 2,5 s.
- **Fiche courte** (QUE-23) : quand il manque le **nom courant** dans la langue de la page, un **article Wikipédia** (dans l'une ou l'autre langue) ou une **photo**. En français, c'est exactement la règle « bien documentée » du score : 30 224 espèces ont la fiche complète, toutes les autres la fiche courte. La décision se prend sur nos données, pas sur la réponse de Wikipédia, pour qu'une lenteur ne change pas la page. L'année de la dernière observation (API des cartes de GBIF) et la page de l'espèce sur gbif.org (recherche du nom exact, sinon page de recherche) sont demandées par notre serveur, en même temps que Wikipédia.
- **Photos** (QUE-24, décisions du 24.11.2026) : la photo Commons de Wikidata (168 813 espèces observées en ont une), sinon la photo par défaut du taxon sur **iNaturalist** si sa licence est libre (CC0, BY, BY-SA, BY-NC, BY-NC-SA ; ni « tous droits réservés » ni « ND », la fiche recadrant la photo). Auteur et licence : API de Commons (un seul appel pour la fiche et ses 4 espèces proches) et API d'iNaturalist, réponses gardées 30 jours dans le cache de Cloudflare (iNaturalist demande 60 requêtes par minute au plus). Images relayées par notre serveur et gardées un an : Commons en **WebP** (330, 500, 960 px), iNaturalist en JPEG (500 px, 1024 px sur ordinateur seulement). Mesures Lighthouse (téléphone) : chêne 191 Ko, pinson 291 Ko, *Agrilus obscuricollis* (photo iNaturalist) 227 Ko, vitesse 0,97 à 0,99.
- **Carte de répartition** (QUE-25, décision du 24.11.2026) : les deux tuiles vectorielles de GBIF qui couvrent le monde (EPSG:4326, niveau 0, ouest et est), en **hexagones** (64 par tuile, environ 2,8°) avec notre identifiant du Catalogue of Life : ~15 Ko par espèce (contre ~170 Ko en points bruts), gardés un jour dans le cache de Cloudflare. Chaque hexagone devient un point ambre en Equal Earth, plus gros là où l'espèce est le plus observée (échelle logarithmique). Les hexagones que GBIF ajoute en marge d'une tuile sont écartés (ils sont dans la tuile voisine). Fond : terres Natural Earth 1:110 m (domaine public), 128 contours, 15 Ko compressé, chargé quand la carte apparaît à l'écran. Le chêne pédonculé : 428 points (Europe, et là où il a été introduit : Amérique du Nord, Nouvelle-Zélande…).
- **Cache et référencement** (QUE-26, décisions du 24.11.2026) : la page charge tout avant le rendu ([`contenu.ts`](../../src/lib/especes/contenu.ts)) et sait si la fiche est **complète** (résumé, photos et carte bien arrivés) : seule une fiche complète est gardée **un jour** dans le cache de Cloudflare, avec une clé qui change à chaque déploiement ([`cache.ts`](../../src/lib/cache.ts), [`middleware.ts`](../../src/middleware.ts)). Réponses des API : Wikipédia 7 jours, carte et dernière observation GBIF 1 jour, page GBIF, Commons et iNaturalist 30 jours. Mesure en local : une fiche déjà vue répond en ~10 ms au lieu de ~400. Seules les fiches complètes sont indexées ; image d'aperçu des partages = photo de l'espèce (JPEG).
- La famille et le genre restent en latin dans le fil d'Ariane (« Fagaceae › Quercus ») : leurs noms français (« Fagacées », « Chênes ») ne sont dans aucune de nos sources.

## Questions ouvertes (lots suivants)

- **Noms français** : seulement 3,2 % des espèces observées en ont un dans le Catalogue of Life, et Wikidata n'en ajoute que 249. Le titre de l'article Wikipédia français est souvent le nom français (« Chêne pédonculé ») : à étudier pour la recherche et les fiches (76 111 espèces ont un article).


Voir aussi : [Stack technique](Stack%20technique.md) · [Sources de données](../01-Cadrage/Sources%20de%20donnees.md) · [Essai de la recherche](../../tools/essai-recherche/README.md)
