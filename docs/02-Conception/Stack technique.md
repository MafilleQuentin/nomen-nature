# Stack technique

*Étape 4. Validée le 18 novembre 2026. Les limites des offres gratuites ont été vérifiées le même jour ; elles changent, il faudra les revérifier avant la mise en ligne.*

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
| Site | **Astro 6** + **TypeScript** | Fait pour les sites de contenu. Pages générées à la demande puis mises en cache, bilingue `/fr/` et `/en/`, plan du site. |
| Parties interactives | **Svelte** (îlots Astro) | Très peu de code envoyé au navigateur, code lisible. |
| Hébergement | **Cloudflare Workers**, offre gratuite | Même compte que le domaine, HTTPS automatique, cache dans le monde entier, pris en charge nativement par Astro 6. |
| Base de données | **Cloudflare D1** (SQLite) | Index de recherche (noms FR/EN/latin et leur forme phonétique), listes par pays et par continent triées par « bien documentées », statuts UICN. |
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
3. Sinon, le Worker lit nos données dans D1 (noms, statut, groupe), appelle GBIF et Wikipédia, construit la page HTML et la met en cache.
4. Le navigateur affiche la page ; seule la carte de répartition charge du JavaScript.

## Alternatives écartées

| Alternative | Pourquoi écartée |
|---|---|
| Next.js + Vercel | Plus lourd côté navigateur ; hébergeur séparé du domaine. |
| SvelteKit | Très bon aussi, mais Astro convient mieux à un site surtout fait de contenu. |
| Supabase (Postgres) pour la base | Recherche approximative excellente, mais 500 Mo en gratuit et projet mis en pause après une semaine sans activité. **Plan B** si D1 ne suffit pas pour la recherche. |
| Meilisearch, Typesense, Algolia | Payants, à héberger soi-même, ou trop limités en gratuit pour 1,5 million d'espèces. |
| MapLibre, Leaflet | Pas de projection Equal Earth. |

## Risques à surveiller

| Risque | Ce qu'on fait |
|---|---|
| D1 gratuit : **5 millions de lignes lues par jour** ; au-delà, les requêtes **échouent** (pas de ralentissement) | Le développement commence par un **essai de la recherche** : qualité des fautes tolérées et consommation de lignes. Cache sur les suggestions. |
| Workers gratuit : environ **100 000 requêtes par jour**, temps de calcul court par requête | Cache des pages et des réponses d'API. Si un jour ça ne suffit plus : offre payante à 5 $ par mois. |
| Les tuiles GBIF en EPSG:4326 couvrent une zone plus petite que celles en Mercator | À vérifier au début du lot de la carte de répartition. |
| GBIF ne garantit pas de débit (erreur 429) | Cache, et un message clair si GBIF ne répond pas (écran d'erreur déjà maquetté). |

## Sources

- Cloudflare D1 : [tarifs](https://developers.cloudflare.com/d1/platform/pricing/), [application stricte des limites gratuites](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/)
- Astro : [Astro 6](https://astro.build/blog/astro-6-beta/), [adaptateur Cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- GBIF : [cartes en haute résolution (EPSG:4326)](https://labs.gbif.org/~mblissett/2021/03/high-resolution-maps), [API des cartes](https://www.gbif.org/developer/maps)

Voir aussi : [Sources de données](../01-Cadrage/Sources%20de%20donnees.md) · [Checklist qualité](../Checklist%20qualite.md) · [Décisions](../Decisions.md) · [Glossaire](../Glossaire.md)
