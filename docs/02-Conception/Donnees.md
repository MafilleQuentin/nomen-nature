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

## Questions ouvertes (lots suivants)

- **QUE-19** : comment classer « arbres » et « fleurs », qui ne sont pas des groupes scientifiques.
- **QUE-20** : source exacte de la photo et de l'article Wikipédia (Wikidata : propriété « identifiant Catalogue of Life »), et pondération du score.
- **QUE-21** : table pays → continent, et seuil d'observations pour qu'une espèce figure dans la liste d'un pays.

Voir aussi : [Stack technique](Stack%20technique.md) · [Sources de données](../01-Cadrage/Sources%20de%20donnees.md) · [Essai de la recherche](../../tools/essai-recherche/README.md)
