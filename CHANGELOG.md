# Journal des versions

Toutes les évolutions notables du projet sont consignées ici.
Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/). Numérotation : [Semantic Versioning](https://semver.org/lang/fr/).

## [Non publié]

### Ajouté
- Directions visuelles (9 au total) et choix du style « Courbes de niveau » (direction E d'origine).
- Design system dans Figma : 71 variables (couleurs, espacements, rayons), 16 styles de texte, 9 composants (icônes, logo provisoire, bouton, bouton icône, barre de recherche, badge de statut UICN, puce de groupe, carte espèce, en-tête).
- Générateurs de maquettes dans `tools/maquettes/` (trame halftone, courbes de niveau).
- Composants Ligne espèce et Statistique.
- 12 écrans clés dans Figma : continent, pays, fiche espèce, recherche, identification d'une plante, Autour de moi (ordinateur et téléphone).
- Notes du coffre : Style visuel (palette illustrée), Écrans clés (avec aperçus), Checklist qualité.
- 20 écrans secondaires : fiche peu documentée, étape photo, liste d'un groupe, menu, 6 états d'erreur, chargement, 404, politique de confidentialité, sources et crédits, à propos.
- Composants Message d'état et Pied de page ; statuts DD et NE dans le badge.
- Carte du monde réelle : frontières Natural Earth 1:110 m, projection Equal Earth (`tools/maquettes/carte_monde.py`), composant « Carte du monde » dans Figma.

### Modifié
- Domaine visé : `nomenature.org` au lieu de `nomennature.org`.

### Corrigé
- Les maquettes utilisaient une carte dessinée à la main, géographiquement incohérente : remplacée partout (écrans clés, accueil).
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

[Non publié]: https://github.com/MafilleQuentin/nomen-nature/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/MafilleQuentin/nomen-nature/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/MafilleQuentin/nomen-nature/releases/tag/v0.1.0
