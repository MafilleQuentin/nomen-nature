# Journal des versions

Toutes les évolutions notables du projet sont consignées ici.
Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/). Numérotation : [Semantic Versioning](https://semver.org/lang/fr/).

## [Non publié]

### Ajouté
- Fiche espèce complète, d'après la maquette « Chêne pédonculé » (ordinateur et téléphone), en français (`/fr/espece/quercus-robur`) et en anglais (`/en/species/quercus-robur`), rendue à la demande par le serveur : fil d'Ariane, badge de statut UICN, noms courant, latin et dans l'autre langue, encadré « Sais-tu ? » (faits de Wikidata), résumé Wikipédia avec lien, chiffres (pays, observations, aire principale), 4 espèces proches, sources ; page introuvable (404) pour une espèce inconnue (QUE-22).
- Import : 3 000 fichiers de fiches où chaque genre est rangé en entier (1 648 413 espèces, 4 espèces proches chacune, faits « Sais-tu ? » pour 5 897), branchés dans l'import mensuel (QUE-22).
- Fiche courte d'une espèce peu documentée, d'après la maquette *Agrilus cyanescens* (ordinateur et téléphone) : quand il manque le nom courant, l'article Wikipédia ou la photo, encadré « Fiche courte » qui dit ce qui manque, lien vers l'espèce sur GBIF, nom latin en titre avec « Pas encore de nom français · insecte de la famille des Buprestidae », mention « Pas encore de photo », chiffres dans l'en-tête dont l'année de la dernière observation (GBIF), section « Du même genre ou de la même famille » (QUE-23).
- Photos créditées sur les fiches : photo Wikimedia Commons (vignettes WebP de 330, 500 et 960 px), sinon photo par défaut d'iNaturalist sous licence libre (JPEG de 500 px, 1024 px sur ordinateur), avec auteur, licence et liens sous la photo ; photos des espèces proches (crédit court), chargées seulement quand la carte apparaît à l'écran ; texte alternatif ; une photo trouvée sur iNaturalist suffit pour que la fiche ne soit plus « courte » (QUE-24).
- Relais des photos par notre serveur (`/photos/commons/…`, `/photos/inaturalist/…`) : le navigateur ne contacte ni Wikimedia ni iNaturalist ; seules des adresses construites par nous sont relayées ; images gardées un an et réponses des API de Commons et d'iNaturalist 30 jours dans le cache de Cloudflare (QUE-24).
- Composants `BadgeStatut` (avec EX et EW, couleurs officielles de l'UICN), `Statistique` et `CarteEspece` (QUE-22).
- Données d'exemple pour les tests (`npm run donnees:installer -- --exemple`) ; la fiche du chêne pédonculé est contrôlée par Playwright, axe et Lighthouse dans l'intégration continue (QUE-22).

### Modifié
- Budget de poids des fiches espèces porté à 300 Ko (photo nette sur les écrans haute densité) ; 200 Ko pour les autres pages. Lighthouse ne fait plus de capture de la page entière, qui chargeait les photos que le visiteur ne voit pas.
- Budget de polices par page porté à 120 Ko (les 6 styles du design system sur la fiche espèce) ; poids total toujours limité à 200 Ko.

## [0.7.0] - 2026-11-23

Lot 3 terminé : les données. Un import mensuel automatique réunit le Catalogue of Life XR, les observations GBIF, la World Checklist of Vascular Plants et Wikidata pour produire l'index de la recherche, les 13 groupes courants, le statut UICN, le score « bien documentée » et les listes de 251 pays et 7 continents. Prochain lot : la fiche espèce.

### Ajouté
- Note de conception « Données » : volumes mesurés sur les vraies données (1 648 413 espèces observées, 5 986 994 couples espèce × pays) et architecture validée (QUE-18).
- Import mensuel des données en TypeScript (`npm run donnees:import`) : dernière version du Catalogue of Life XR, téléchargements SQL de GBIF (réutilisés s'ils sont récents, refus d'un résultat presque vide), index de la recherche limité aux espèces observées (7 965 fichiers `.txt`, 39/40 au jeu de test du lot 1) (QUE-18).
- Clé phonétique et normalisation de la recherche en TypeScript, partagées entre l'import et le navigateur, identiques à la version Python sur 5,1 millions de noms (QUE-18).
- Workflows « Données mensuelles » (le 20 du mois, release de données `donnees-AAAA-MM`) et « Déploiement du site de test » (après chaque fusion dans `develop` et chaque import) ; installation des données dans le site (`npm run donnees:installer`) (QUE-18).
- Les 13 groupes courants pour chaque espèce observée ; « arbres » d'après la forme de vie de la World Checklist of Vascular Plants (Kew, CC BY 3.0) (QUE-19).
- Statut UICN et score « bien documentée » (photo, nom français, article Wikipédia, observations), avec Wikidata interrogé par QLever ; 30 224 espèces bien documentées (QUE-20).
- Listes d'espèces par pays (251) et par continent (7) : par groupe, les 500 mieux classées plus toutes les menacées, à partir de 5 observations ; nom français principal choisi d'après le titre de l'article Wikipédia (QUE-21).

### Modifié
- Continents des listes d'après GBIF (continent de chaque observation) plutôt que déduits des pays.

## [0.6.0] - 2026-11-18

Lot 2 terminé : le socle du site. Gabarit bilingue fidèle aux maquettes, page 404, tests automatiques qui bloquent les fusions, et un site de test en ligne sur https://test.nomenature.org (non indexé). Prochain lot : les données.

### Ajouté
- Socle du site : projet Astro 7 + TypeScript + Svelte, adaptateur Cloudflare, configuration Wrangler, `.env.example` (QUE-11).
- Design system en CSS : variables du Figma, 16 styles de texte, polices hébergées chez nous, page de contrôle `/design-system` (QUE-12).
- Gabarit de page : en-tête, menu sur téléphone, pied de page, lien d'évitement ; composants Icône, Logo, Bouton, Bouton icône (QUE-13).
- Tests d'accessibilité automatiques (Playwright + axe) sur le site compilé, sur ordinateur et sur téléphone : aucune violation WCAG 2.2 AA, menu au clavier, lien d'évitement (`npm test`) (QUE-13).
- Site bilingue : chaque page existe en français (`/fr/…`) et en anglais (`/en/…`) avec des adresses traduites ; textes de l'interface dans les deux langues ; choix de la langue dans l'en-tête, le menu et le pied de page ; balises `hreflang` et adresse canonique ; la racine envoie vers la langue du navigateur, sans cookie (QUE-14).
- Page introuvable « Ce sentier ne mène nulle part », d'après la maquette (ordinateur et téléphone) : vrai code 404, en français ou en anglais selon l'adresse puis le navigateur, avec une barre de recherche et le retour à la carte (QUE-15).
- Intégration continue (GitHub Actions) : types et tests unitaires (Vitest), tests navigateur et accessibilité (Playwright + axe), vitesse et budget de poids par page (Lighthouse CI), liens cassés (lychee) ; liens externes vérifiés chaque semaine ; `develop` et `main` protégées, fusion par pull request seulement (QUE-16).
- Site de test en ligne sur `test.nomenature.org` (`npm run deploy:test`), jamais indexé ; suivi des erreurs du serveur avec Sentry, sans données personnelles ; `robots.txt` ; HTTPS forcé (QUE-17).

### Modifié
- Stack technique : Astro 7 au lieu d'Astro 6 ; Node 22.23.4 ou plus.
- Statistiques : analyses intégrées de Cloudflare au lieu de Web Analytics, pour n'ajouter aucun script ni tiers dans les pages.
- Index de recherche : fichiers à publier en `.txt` (Cloudflare ne compresse pas les `.tsv`).

### Sécurité
- Astro passé en 7.4.7 (avis GHSA-r3h5-4585-7x3w). Avis picomatch GHSA-fc5q-39xc-vjpf sans correctif disponible : utilisé seulement à la construction, risque accepté et suivi.

## [0.5.0] - 2026-11-18

Lot 1 terminé : essai de la recherche. La recherche tolérante aux fautes fonctionne (« boulot » trouve le bouleau) et sera servie par un index en fichiers statiques, D1 gratuit étant trop petit. Prochain lot : le socle du site.

### Ajouté
- Étape 5 découpée en 10 lots de développement (feuille de route et projet Linear « Nomen Nature — V1 »).
- Essai de la recherche : scripts de téléchargement et d'extraction des noms du Catalogue of Life XR (`tools/essai-recherche/`).
- Essai de la recherche : schéma D1 avec index par trigrammes et script de chargement dans D1 en local.
- Essai de la recherche : normalisation et clé phonétique par langue (français, anglais, latin), avec tests.
- Essai de la recherche : fonction de recherche avec tri et jeu de 40 recherches de test (40/40 dans les 5 premiers résultats).
- Essai de la recherche : index en fichiers statiques (construction, recherche « comme le navigateur », mesure du poids par recherche).

### Modifié
- Sources de données : le Catalogue of Life XR remplace la GBIF Backbone comme référentiel des noms.
- Stack technique : la recherche passe par un index en fichiers statiques au lieu de D1 (D1 gratuit limité à 500 Mo par base et 100 000 écritures par jour), sans synonymes latins (verdict du lot 1).

## [0.4.0] - 2026-11-18

Stack technique choisie : Astro + Cloudflare. Prochaine étape : le développement de la V1, lot par lot.

### Ajouté
- Stack technique choisie : Astro 6 + TypeScript, îlots Svelte, hébergement Cloudflare Workers, base Cloudflare D1, carte d3-geo en Equal Earth (`docs/02-Conception/Stack technique.md`).
- Glossaire complété avec les termes techniques de la stack.

## [0.3.0] - 2026-11-17

Maquettes terminées : toute la V1 est dessinée dans Figma. Prochaine étape : le choix de la stack technique.

### Ajouté
- Style visuel « Courbes de niveau » (direction E d'origine), choisi parmi 9 directions explorées ; note Style visuel avec la palette illustrée.
- Design system dans Figma : 73 variables (couleurs, espacements, rayons), 16 styles de texte et 13 composants (icônes, logo provisoire, bouton, bouton icône, barre de recherche, badge de statut UICN avec DD et NE, puce de groupe, carte espèce, ligne espèce, statistique, message d'état, en-tête, pied de page, carte du monde).
- 12 écrans clés : continent, pays, fiche espèce, recherche, identification d'une plante, Autour de moi (ordinateur et téléphone).
- 20 écrans secondaires : fiche peu documentée, étape photo, liste d'un groupe, menu, 6 états d'erreur, chargement, 404, politique de confidentialité, sources et crédits, à propos.
- Carte du monde réelle : frontières Natural Earth 1:110 m, projection Equal Earth (`tools/maquettes/carte_monde.py`).
- Générateurs de maquettes dans `tools/maquettes/` (trame halftone, courbes de niveau).
- Checklist qualité et mise en ligne (`docs/Checklist qualite.md`).

### Modifié
- Domaine : `nomenature.org` (réservé) au lieu de `nomennature.org`.

### Corrigé
- Les maquettes utilisaient une carte dessinée à la main, géographiquement incohérente : remplacée partout.
- Encodage du changelog (BOM UTF-8 retiré).

## [0.2.0] - 2026-11-17

Parcours utilisateurs validés. Prochaine étape : les maquettes Figma.

### Ajouté
- Parcours utilisateurs de la V1 validés : plan du site, explorer la carte, identifier une plante, autour de moi (FigJam et note dans `docs/02-Conception/`).

### Modifié
- Flux git : travail sur des branches issues de `develop`, `main` réservée aux releases.

## [0.1.0] - 2026-11-17

Fin du cadrage : le projet est défini, aucune ligne de code encore.

### Ajouté
- Brief complet de la V1 : mission, public, fonctionnalités, hors périmètre, critères de réussite.
- Étude des sources de données ouvertes (GBIF, Wikipédia, Wikimedia Commons, iNaturalist, UICN, Pl@ntNet).
- Choix du nom « Nomen Nature » après vérification des noms de domaine et des stores.
- Journal des décisions, glossaire, feuille de route.
- Coffre Obsidian dans `docs/`.
- Licence MIT.

[Non publié]: https://github.com/MafilleQuentin/nomen-nature/compare/v0.7.0...HEAD
[0.7.0]: https://github.com/MafilleQuentin/nomen-nature/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/MafilleQuentin/nomen-nature/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/MafilleQuentin/nomen-nature/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/MafilleQuentin/nomen-nature/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/MafilleQuentin/nomen-nature/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/MafilleQuentin/nomen-nature/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/MafilleQuentin/nomen-nature/releases/tag/v0.1.0
