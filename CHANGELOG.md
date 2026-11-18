# Journal des versions

Toutes les évolutions notables du projet sont consignées ici.
Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/). Numérotation : [Semantic Versioning](https://semver.org/lang/fr/).

## [Non publié]

### Ajouté
- Socle du site : projet Astro 7 + TypeScript + Svelte, adaptateur Cloudflare, configuration Wrangler, `.env.example` (QUE-11).
- Design system en CSS : variables du Figma, 16 styles de texte, polices hébergées chez nous, page de contrôle `/design-system` (QUE-12).
- Gabarit de page : en-tête, menu sur téléphone, pied de page, lien d'évitement ; composants Icône, Logo, Bouton, Bouton icône (QUE-13).
- Site bilingue : chaque page existe en français (`/fr/…`) et en anglais (`/en/…`) avec des adresses traduites ; textes de l'interface dans les deux langues ; choix de la langue dans l'en-tête, le menu et le pied de page ; balises `hreflang` et adresse canonique ; la racine envoie vers la langue du navigateur, sans cookie (QUE-14).
- Page introuvable « Ce sentier ne mène nulle part », d'après la maquette (ordinateur et téléphone) : vrai code 404, en français ou en anglais selon l'adresse puis le navigateur, avec une barre de recherche et le retour à la carte (QUE-15).
- Tests d'accessibilité automatiques (Playwright + axe) sur le site compilé, sur ordinateur et sur téléphone : aucune violation WCAG 2.2 AA, menu au clavier, lien d'évitement (`npm test`) (QUE-13).

### Modifié
- Stack technique : Astro 7 au lieu d'Astro 6 ; Node 22.23.4 ou plus.

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

[Non publié]: https://github.com/MafilleQuentin/nomen-nature/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/MafilleQuentin/nomen-nature/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/MafilleQuentin/nomen-nature/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/MafilleQuentin/nomen-nature/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/MafilleQuentin/nomen-nature/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/MafilleQuentin/nomen-nature/releases/tag/v0.1.0
