# Stack technique

*Étape 4. Validée le 18 novembre 2026, ajustée le même jour après l'essai de la recherche (lot 1). Les limites des offres gratuites ont été vérifiées le même jour ; elles changent, il faudra les revérifier avant la mise en ligne.*

## En bref

Un site **Astro** hébergé gratuitement chez **Cloudflare**, qui gère déjà le domaine. Les pages arrivent en HTML presque sans JavaScript. Seuls les morceaux interactifs (carte, recherche, photo) en chargent. Notre propre petite base sert à la recherche et aux listes ; le reste du contenu vient des bases ouvertes, appelé à la demande et gardé en cache.

## Ce que la stack devait permettre

| Contrainte | D'où elle vient |
|---|---|
| 0 CHF au départ | [Brief](../01-Cadrage/Brief.md) |
| 1,5 million de fiches : impossible de les construire toutes à l'avance | [Brief](../01-Cadrage/Brief.md), catalogue |
| Titre, description et image d'aperçu propres à chaque page | [Checklist qualité](../Checklist%20qualite.md) |
| Recherche en français, anglais et latin, tolérante aux fautes (« boulot » → bouleau) | [Brief](../01-Cadrage/Brief.md), recherche |
| Clé Pl@ntNet jamais dans le navigateur, limite par visiteur | [Checklist qualité](../Checklist%20qualite.md) |
| Rapide en 4G | Critère de réussite n° 5 |
| Carte en projection Equal Earth | [Décisions](../Decisions.md) du 17.11.2026 |
| Aucun cookie non essentiel, statistiques sans cookies | [Brief](../01-Cadrage/Brief.md) |

## Les briques

| Brique | Choix | Pourquoi |
|---|---|---|
| Site | **Astro 7** + **TypeScript** *(Astro 6 au moment du choix, remplacé par la version 7 au démarrage du lot 2)* | Fait pour les sites de contenu. Pages générées à la demande puis mises en cache, bilingue `/fr` et `/en` *(adresses traduites, voir le journal des décisions du 18.11.2026)*, plan du site. |
| Parties interactives | **Svelte** (îlots Astro) | Très peu de code envoyé au navigateur, code lisible. |
| Hébergement | **Cloudflare Workers**, offre gratuite | Même compte que le domaine, HTTPS automatique, cache dans le monde entier, pris en charge nativement par Astro. |
| Recherche | **Index en fichiers statiques** *(modifié le 18.11.2026, voir plus bas)* | Noms FR/EN/latin et leur clé phonétique, découpés en petits fichiers publiés avec le site ; le navigateur charge seulement ceux qui correspondent au début du texte tapé, puis trie. |
| Base de données | **Cloudflare D1** (SQLite) — *à réévaluer au lot 3* | Listes par pays et par continent triées par « bien documentées », statuts UICN. En gratuit, une base est limitée à 500 Mo et à 100 000 écritures par jour : le volume des listes est à vérifier. |
| Remplissage de la base | Script d'import mensuel (GitHub Actions) | Depuis GBIF, Catalogue of Life et Wikidata. |
| Contenus des fiches | API **GBIF, Wikipédia, Commons, iNaturalist**, appelées à la demande et gardées en cache | On ne recopie pas l'encyclopédie, on la met en cache. |
| Carte | **d3-geo + d3-zoom**, en SVG | Equal Earth et Natural Earth, comme le générateur des maquettes. Les bibliothèques de cartes classiques (MapLibre, Leaflet) ne gèrent pas cette projection. |
| Répartition d'une espèce | Tuiles GBIF en EPSG:4326, redessinées dans notre projection | Pas de calcul lourd de notre côté. |
| Identification | Point d'accès sur notre Worker, qui appelle Pl@ntNet | Clé en secret Cloudflare, limite par visiteur, message « reviens demain » à l'approche du quota. Photo réduite dans le téléphone avant l'envoi. |
| Style | **CSS simple avec variables** | Les variables Figma portent déjà leur nom CSS (`--color-bg-page`…). |
| Polices | Space Grotesk et IBM Plex, **hébergées chez nous** | Licence libre (OFL) ; aucun appel à Google Fonts, donc rien n'est transmis à un tiers. |
| Statistiques | **Cloudflare Web Analytics** | Sans cookies, gratuit : pas de bannière. |
| Suivi des erreurs | **Sentry**, offre gratuite | Voir les plantages en ligne. À mentionner dans la politique de confidentialité. |
| Tests et qualité | **Vitest**, **Playwright** + **axe**, **Lighthouse CI**, **lychee**, dans **GitHub Actions** | Couvre automatiquement la checklist : tests, accessibilité, vitesse, liens cassés. |

## Le chemin d'une page

1. Le visiteur ouvre la fiche du chêne pédonculé.
2. Si Cloudflare a déjà la page en cache, il la renvoie aussitôt.
3. Sinon, le Worker lit nos données (noms, statut, groupe : D1 ou fichiers, à fixer au lot 3), appelle GBIF et Wikipédia, construit la page HTML et la met en cache.
4. Le navigateur affiche la page ; seule la carte de répartition charge du JavaScript.

## Alternatives écartées

| Alternative | Pourquoi écartée |
|---|---|
| Next.js + Vercel | Plus lourd côté navigateur ; hébergeur séparé du domaine. |
| SvelteKit | Très bon aussi, mais Astro convient mieux à un site surtout fait de contenu. |
| Supabase (Postgres) pour la base | Recherche approximative excellente, mais 500 Mo en gratuit (trop petit pour l'index de recherche) et projet mis en pause après une semaine sans activité. |
| D1 pour la recherche | Écarté le 18.11.2026 après l'essai : l'index fait 1,3 Go, au-delà des 500 Mo par base du gratuit, et son chargement demande plus de 8 millions d'écritures (100 000 par jour en gratuit). |
| D1 payant (5 $/mois) | Aurait gardé l'index dans D1, mais c'est une dépense ; les fichiers statiques sont gratuits et illimités. |
| Meilisearch, Typesense, Algolia | Payants, à héberger soi-même, ou trop limités en gratuit pour 1,5 million d'espèces. |
| MapLibre, Leaflet | Pas de projection Equal Earth. |

## Risques à surveiller

| Risque | Ce qu'on fait |
|---|---|
| D1 gratuit : **500 Mo par base**, **100 000 écritures** et 5 millions de lectures par jour ; au-delà, les requêtes **échouent** | Constaté pendant l'essai de la recherche (lot 1) : la recherche passe par des fichiers statiques. Pour les listes par pays (lot 3), mesurer le volume avant de choisir. |
| Workers gratuit : environ **100 000 requêtes par jour**, temps de calcul court par requête | Cache des pages et des réponses d'API. Si un jour ça ne suffit plus : offre payante à 5 $ par mois. |
| Les tuiles GBIF en EPSG:4326 couvrent une zone plus petite que celles en Mercator | À vérifier au début du lot de la carte de répartition. |
| GBIF ne garantit pas de débit (erreur 429) | Cache, et un message clair si GBIF ne répond pas (écran d'erreur déjà maquetté). |

## Sources

- Cloudflare D1 : [tarifs](https://developers.cloudflare.com/d1/platform/pricing/), [application stricte des limites gratuites](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/)
- Astro : [Astro 6](https://astro.build/blog/astro-6-beta/), [adaptateur Cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- GBIF : [cartes en haute résolution (EPSG:4326)](https://labs.gbif.org/~mblissett/2021/03/high-resolution-maps), [API des cartes](https://www.gbif.org/developer/maps)

Voir aussi : [Sources de données](../01-Cadrage/Sources%20de%20donnees.md) · [Checklist qualité](../Checklist%20qualite.md) · [Décisions](../Decisions.md) · [Glossaire](../Glossaire.md)

## Ajustement après l'essai de la recherche (18.11.2026)

L'essai du lot 1 ([détails](../../tools/essai-recherche/README.md)) a montré que la recherche fonctionne bien (40/40 recherches de test), mais que son index (1,3 Go) ne tient pas dans D1 gratuit, limité à **500 Mo par base** et à **100 000 écritures par jour**. Décision de l'utilisateur : **servir la recherche par des fichiers statiques**. Les noms et leurs clés phonétiques sont découpés en petits fichiers selon leur début, publiés avec le site. Les requêtes vers ces fichiers sont gratuites et illimitées (20 000 fichiers au plus, 25 Mo chacun). Le navigateur charge le fichier qui correspond au texte tapé, puis trie les résultats.

**Verdict du lot 1** (validé par l'utilisateur) : index **sans synonymes latins**, avec des fichiers d'environ 64 Ko.

| Mesure | Résultat |
|---|---|
| Qualité (40 recherches réelles) | 39/40 dans les 5 premiers, 32/40 en premier |
| Fichiers publiés | 10 868 sur 20 000 autorisés (127 Mo compressés) ; moins après le filtre « espèces observées » du lot 3 |
| Première recherche d'un visiteur | 60 Ko en médiane (0,6 s en 4G à 1 Mbit/s), 231 Ko au pire ; puis les fichiers restent en cache |

À reprendre dans les lots suivants :
- **Lot 2** : vérifier que Cloudflare compresse les fichiers statiques ; sinon, publier des fichiers déjà compressés et les décompresser dans le navigateur.
- **Lot 3** : construire l'index depuis l'import mensuel du Catalogue of Life XR ; ajouter un vrai score de notoriété (observations GBIF, photo, Wikipédia) ; décider, en mesurant le volume, si les listes par pays vont dans D1 ou en fichiers.
- **Lot 5** : réécrire la clé phonétique et le score en TypeScript, avec les mêmes tests.
