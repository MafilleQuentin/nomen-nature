# Nomen Nature

> Réapprendre à reconnaître la nature qui nous entoure, et faire connaître les espèces menacées.

**Nomen Nature** est un site web gratuit et non commercial qui permet d'explorer la faune, la flore et les champignons du monde entier. On y navigue sur une carte interactive, par continent puis par pays, on découvre ce qui vit autour de soi et on identifie une plante à partir d'une simple photo. Il s'adresse au grand public, aux enfants et aux écoles.

*English: Nomen Nature is a free, non-commercial website to explore the world's wildlife, plants and fungi through an interactive map, discover what lives around you, identify plants from a photo, and learn which species are threatened. French and English from day one.*

## État du projet

🟡 **Développement de la V1 commencé.** Le site lui-même n'existe pas encore : le projet avance étape par étape, lot par lot.

Le site sera construit avec [Astro](https://astro.build) et TypeScript, et hébergé sur [Cloudflare Workers](https://workers.cloudflare.com). Détail : [stack technique](docs/02-Conception/Stack%20technique.md).

Le premier lot de développement, un **essai de la recherche**, est terminé : la recherche tolérante aux fautes (« boulot » trouve le bouleau) fonctionnera avec un index en fichiers statiques. Outils et résultats : [`tools/essai-recherche/`](tools/essai-recherche/README.md).

Le troisième lot, les **données**, est terminé (v0.7.0) : un import mensuel automatique prépare l'index de la recherche, les groupes, les statuts UICN, le score « bien documentée » et les listes par pays et par continent ([`tools/donnees/`](tools/donnees/README.md)).

Le deuxième lot, le **socle du site**, est terminé (v0.6.0) : gabarit bilingue (français et anglais) fidèle aux maquettes, page 404, tests automatiques sur GitHub, et un site de test en ligne sur <https://test.nomenature.org> (non indexé).

Le sixième lot, la **carte**, est en cours : la carte du monde est sur l'accueil, et chaque continent a sa page avec ses pays (`/fr/continent/europe`), zoomable à la souris, aux doigts et au clavier.

Le cinquième lot, la **recherche**, est terminé (pas encore publié en release) : la barre de recherche propose les espèces pendant la frappe, en français, anglais et latin, même avec des fautes (« boulot » → bouleaux), et mène à une page de résultats (`/fr/recherche?q=boulot`) avec « Tu voulais dire… » et des filtres par groupe, par statut et par lieu (Monde, ton pays, ton continent), qui marche sans JavaScript.

Le quatrième lot, la **fiche espèce**, est terminé (v0.8.0) : chaque espèce observée a sa page, en français (`/fr/espece/quercus-robur`) et en anglais (`/en/species/quercus-robur`), avec son statut, ses noms, le résumé Wikipédia, ses chiffres et des espèces proches ; les espèces peu documentées ont une « fiche courte » qui dit ce qui manque et renvoie vers GBIF. Les photos (Wikimedia Commons, sinon iNaturalist) sont créditées et servies par notre serveur, et la carte de répartition (observations GBIF en Equal Earth) est dessinée par notre serveur, sans JavaScript. Les fiches complètes sont gardées en cache et seules elles sont proposées aux moteurs de recherche.

| Étape | État |
|---|---|
| 1. Cadrage et brief | ✅ Terminé |
| 2. Parcours utilisateurs (FigJam) | ✅ Terminé |
| 3. Maquettes Figma (mobile et ordinateur) | ✅ Terminé |
| 4. Choix de la stack technique | ✅ Terminé |
| 5. Développement de la V1, lot par lot | ⏳ En cours (lots 1 à 4 sur 10 terminés) |

Détail : [feuille de route](docs/Feuille%20de%20route.md).

## Ce que fera la première version

- 🗺️ **Carte interactive** : le monde par continents, puis les pays et leurs espèces, avec zoom libre.
- 🔎 **Recherche** en français, en anglais ou en latin, avec suggestions et tolérance aux fautes.
- 📍 **Autour de moi** : les espèces observées près de toi (la position n'est jamais enregistrée).
- 📷 **Identifier une plante** à partir d'une photo.
- 🦉 **Fiches espèces** : photos, noms, statut de menace, description, carte de répartition, famille, espèces proches.
- ⚠️ **Espèces menacées** mises en avant dans chaque pays.
- 🏫 **Utilisable en classe** : pas de compte, pas de publicité, pas de pistage. Accessibilité visée : WCAG AA.

## Développer en local

Il faut **Node 22.23.4 ou plus** (Node 24 LTS conseillé, voir `.node-version`).

```bash
npm install
```

```bash
npm run dev
```

Le site s'ouvre sur <http://localhost:4321>, qui envoie vers `/fr` ou `/en` selon la langue du navigateur. Le premier démarrage prend une vingtaine de secondes.

Les textes de l'interface sont dans `src/i18n/textes.ts` (français et anglais) et les adresses des pages dans `src/lib/liens.ts`.

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement, avec le moteur de Cloudflare (workerd) |
| `npm run build` | Construit le site dans `dist/` |
| `npm run preview` | Construit puis sert le site comme en ligne (Wrangler) |
| `npm run check` | Vérifie les types (TypeScript, fichiers Astro) |
| `npm run test:unit` | Tests unitaires (Vitest), sans navigateur |
| `npm run test:e2e` | Tests dans un vrai navigateur, dont l'audit d'accessibilité axe, sur le site compilé |
| `npm test` | Tous les tests (types, unitaires, puis navigateur) |
| `npm run donnees:import` | Import des données : Catalogue of Life, observations GBIF, index de la recherche, listes, fiches (voir [`tools/donnees/`](tools/donnees/README.md)) |
| `npm run donnees:installer` | Installe le dernier paquet de données publié dans `public/donnees/`, avant la construction (`-- --exemple` : quelques fiches pour les tests, sans téléchargement) |
| `npm run deploy:test` | Construit et publie le site de test sur <https://test.nomenature.org> (après `npx wrangler login`) |

Avant le premier `npm run test:e2e`, installer le navigateur de test : `npx playwright install chromium`.

## Vérifications automatiques

À chaque envoi sur GitHub, le workflow [Vérifications](.github/workflows/verifications.yml) lance quatre vérifications en parallèle :

| Vérification | Outil | Échoue si… |
|---|---|---|
| Types et tests unitaires | `astro check`, Vitest | une erreur de type ou un test unitaire échoue, ou la construction échoue |
| Navigateur et accessibilité | Playwright + axe, ordinateur et téléphone | un parcours échoue ou axe trouve une violation WCAG 2.2 AA |
| Vitesse et qualité | Lighthouse CI ([réglages](lighthouserc.json)) | un score passe sous 90 (100 pour l'accessibilité), ou une page dépasse son budget : 200 Ko en tout (300 Ko pour une fiche espèce, avec sa photo), 50 Ko de scripts, 120 Ko de polices, aucune requête vers un tiers |
| Liens cassés | lychee ([réglages](lychee.toml)) | un lien interne du site ou de la documentation est cassé |

`develop` et `main` sont protégées : on y fusionne seulement par pull request, une fois les quatre vérifications réussies.

Chaque mois, le workflow [Données mensuelles](.github/workflows/donnees.yml) met à jour les données et les publie en release « donnees-AAAA-MM » ; le site de test est redéployé après chaque import et chaque fusion dans `develop`.

Les liens vers les sites externes sont vérifiés chaque lundi par le workflow [Liens externes](.github/workflows/liens-externes.yml).

Les secrets ne sont jamais dans le dépôt : copier `.env.example` en `.dev.vars` pour le développement local.

## Documentation

Toute la documentation du projet se trouve dans [`docs/`](docs/Accueil.md). C'est aussi un **coffre Obsidian** : ouvre le dossier `docs` comme coffre dans Obsidian pour naviguer dans les notes.

- [Brief du projet](docs/01-Cadrage/Brief.md)
- [Style visuel](docs/02-Conception/Style%20visuel.md) et [design system](docs/02-Conception/Design%20system.md)
- [Sources de données](docs/01-Cadrage/Sources%20de%20donnees.md)
- [Journal des décisions](docs/Decisions.md)
- [Glossaire](docs/Glossaire.md)

## Données et crédits

Nomen Nature ne rédige pas sa propre encyclopédie : il met en valeur des bases scientifiques ouvertes, toujours citées.

- [GBIF](https://www.gbif.org) : espèces, observations, cartes de répartition
- [Wikipédia](https://www.wikipedia.org) et [Wikimedia Commons](https://commons.wikimedia.org) : descriptions et photos
- [iNaturalist](https://www.inaturalist.org) : photos
- [Liste rouge de l'UICN](https://www.iucnredlist.org) : statuts de conservation
- [Pl@ntNet](https://plantnet.org) : identification des plantes
- [Natural Earth](https://www.naturalearthdata.com) : frontières des pays

Chaque contenu garde sa propre licence. Les photos et les textes sont crédités à leurs auteurs.

## Licence

Le code est publié sous [licence MIT](LICENSE). Les données et les médias affichés restent sous la licence de leur source.
