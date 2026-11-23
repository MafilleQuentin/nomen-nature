# Glossaire

| Terme | Explication |
|---|---|
| **Espèce** | Groupe d'êtres vivants qui se ressemblent et peuvent se reproduire entre eux (ex. le chêne pédonculé). |
| **Nom scientifique** | Nom latin unique d'une espèce, en deux mots : le genre puis l'espèce (ex. *Quercus robur*). |
| **Nom vernaculaire** | Nom courant dans une langue (ex. « chêne pédonculé », « pedunculate oak »). |
| **Taxon** | N'importe quel groupe de la classification : espèce, genre, famille, ordre, classe, embranchement, règne. |
| **Règne** | Le plus grand groupe : animaux, plantes, champignons… |
| **Famille** | Groupe d'espèces apparentées (ex. les Fagacées regroupent chênes, hêtres, châtaigniers). |
| **Occurrence / observation** | Une trace qu'une espèce a été vue à un endroit et à une date (photo, spécimen de musée, relevé). C'est ce qui permet de dessiner la carte de répartition. |
| **Carte de répartition** | Carte des endroits où une espèce a été observée. |
| **GBIF** | *Global Biodiversity Information Facility* : réseau international qui rassemble les observations d'espèces du monde entier. Notre source principale. |
| **UICN / Liste rouge** | Union internationale pour la conservation de la nature. Sa Liste rouge classe les espèces selon leur risque de disparition. |
| **Statuts UICN** | LC : préoccupation mineure · NT : quasi menacée · VU : vulnérable · EN : en danger · CR : en danger critique · EW : éteinte à l'état sauvage · EX : éteinte · DD : données insuffisantes. VU, EN et CR sont les espèces dites « menacées ». |
| **Pl@ntNet** | Service scientifique gratuit d'identification des plantes par photo. |
| **CC BY, CC BY-SA, CC BY-NC, CC0** | Licences Creative Commons. BY : créditer l'auteur. SA : partager sous la même licence. NC : pas d'usage commercial. CC0 : aucune condition. |
| **WCAG AA** | Niveau de référence des règles d'accessibilité du web (contrastes, clavier, lecteurs d'écran…). |
| **V1** | Première version publique du site. |
| **FigJam / Figma** | Outils de conception : FigJam pour les schémas de parcours, Figma pour les maquettes. |
| **Release** | Version publiée et numérotée du projet (ex. v0.1.0), avec la liste de ses changements. |
| **Stack technique** | L'ensemble des outils et technologies avec lesquels le site est construit et hébergé. |
| **Astro** | Outil qui fabrique le site : il produit des pages HTML légères et n'envoie du JavaScript que là où c'est utile. |
| **Îlot (island)** | Morceau interactif d'une page Astro (la carte, la recherche…) ; le reste de la page reste du simple HTML. |
| **Svelte** | Outil pour écrire les parties interactives ; il produit très peu de code dans le navigateur. |
| **TypeScript** | JavaScript avec des types : beaucoup d'erreurs sont repérées avant même de lancer le site. |
| **hreflang** | Balise qui indique aux moteurs de recherche les versions d'une page dans les autres langues (`/fr` ↔ `/en`). `x-default` désigne la version à proposer quand aucune langue ne correspond. |
| **Accept-Language** | Information envoyée par le navigateur à chaque page, qui donne les langues préférées de la personne (« fr-FR, en ; q=0.8 »). La racine du site s'en sert pour choisir la langue, sans cookie. |
| **Cloudflare Workers** | Petits programmes qui tournent sur les serveurs de Cloudflare, près du visiteur. C'est notre serveur. |
| **D1** | Base de données de Cloudflare (SQLite). Elle contient notre index de recherche et nos listes. |
| **Cache** | Copie d'une page ou d'une réponse gardée de côté pour la resservir aussitôt, sans tout recalculer. |
| **API** | Porte d'entrée d'un service pour les programmes (par ex. l'API de GBIF renvoie les données d'une espèce). |
| **Projection Equal Earth** | Façon d'aplatir la Terre sur une carte qui respecte la surface des continents. |
| **EPSG:4326** | Code d'une façon simple de placer des points sur la Terre (latitude et longitude). Les tuiles GBIF sont disponibles dans ce format. |
| **d3** | Bibliothèque JavaScript de dessin de données ; d3-geo dessine les cartes, d3-zoom gère le zoom. |
| **Recherche phonétique** | Recherche par le son plutôt que l'orthographe : « boulot » retrouve « bouleau ». |
| **Clé phonétique** | Version simplifiée d'un nom qui ne garde que son « son », selon les règles de sa langue : « boulot » et « bouleau » donnent tous deux `bUlo`. Elle est calculée pour chaque nom à l'import, et pour le texte tapé au moment de la recherche. |
| **Trigramme** | Groupe de 3 lettres qui se suivent (« chêne » → `che`, `hen`, `ene`). Un index par trigrammes retrouve un mot à partir de n'importe quel morceau. |
| **Intégration continue (GitHub Actions)** | Vérifications lancées automatiquement à chaque envoi de code : tests, accessibilité, vitesse, liens cassés. |
| **Playwright** | Outil qui pilote un vrai navigateur pour tester le site comme un visiteur : cliquer, taper au clavier, vérifier ce qui s'affiche. |
| **axe** | Outil qui vérifie automatiquement l'accessibilité d'une page (règles WCAG) ; nous le lançons depuis Playwright. |
| **Vitest** | Outil de tests unitaires : il vérifie de petites fonctions isolées (par ex. le choix de la langue d'après le navigateur), sans navigateur, en quelques millisecondes. |
| **lychee** | Outil qui vérifie que les liens d'un site ou d'une documentation ne sont pas cassés. |
| **Budget de poids** | Poids maximal autorisé pour une page (fichiers, scripts, polices). La vérification Lighthouse échoue s'il est dépassé. |
| **Lighthouse** | Outil de Google qui mesure la vitesse, l'accessibilité et le référencement d'une page. |
| **WCVP** | *World Checklist of Vascular Plants*, la liste mondiale des plantes vasculaires tenue par les jardins botaniques de Kew. Nomen y prend la forme de vie de chaque plante pour reconnaître les arbres. Licence CC BY 3.0. |
| **Forme de vie** | Allure générale d'une plante : arbre, arbuste, herbe annuelle, liane… (« tree », « shrub », « annual »… dans WCVP). |
| **Wikidata** | Base de connaissances libre (CC0) liée à Wikipédia. Nomen y trouve, pour chaque espèce, sa photo (Wikimedia Commons) et ses articles Wikipédia, grâce à l'identifiant du Catalogue of Life. |
| **QLever** | Moteur de requêtes sur Wikidata (université de Fribourg-en-Brisgau), assez rapide pour lire les 2,3 millions d'espèces en quelques secondes. |
| **Score « bien documentée »** | Note sur 10 d'une espèce (photo, nom français, article Wikipédia, nombre d'observations) : elle classe les listes. « Bien documentée » = photo, nom français et article ; ces espèces ont la fiche complète. |
| **Téléchargement SQL (GBIF)** | Demande faite à GBIF sous forme de requête SQL (ex. « nombre d'observations par espèce et par pays ») ; GBIF la calcule sur ses milliards d'observations en 15 à 20 minutes et renvoie un fichier. Il faut un compte GBIF. |
| **DOI** | Identifiant permanent d'un jeu de données ou d'un article (ex. `10.15468/dl.hjxn9v`), qui permet de le citer. GBIF en attribue un à chaque téléchargement. |
| **NE (non évaluée)** | Espèce que l'UICN n'a pas encore évaluée : la grande majorité (1,5 million sur 1,65 million d'espèces observées). Ce n'est pas un statut de menace. |
| **Sentry** | Service qui signale les erreurs du site en ligne. Chez nous, seulement celles du serveur, sans aucune donnée sur le visiteur. |
| **DSN (Sentry)** | Adresse qui permet au site d'envoyer ses erreurs à notre projet Sentry. Gardée dans les secrets Cloudflare, jamais dans le dépôt. |
| **Analyses intégrées de Cloudflare** | Statistiques (requêtes, pages vues, visites, pays) que Cloudflare calcule sur ses serveurs pour chaque domaine, sans rien ajouter dans la page : ni script, ni cookie. |
| **Site de test** | Copie du site en ligne (`test.nomenature.org`) pour vérifier une version avant de l'ouvrir au public. Les moteurs de recherche ne l'indexent pas. |
| **Compression (gzip, brotli)** | Le serveur réduit les fichiers texte avant de les envoyer, et le navigateur les remet en état : un fichier de 65 Ko n'en pèse plus que 12. |
| **Catalogue of Life (COL) / COL XR** | Liste mondiale de référence des noms d'espèces. La version « XR » (étendue) est complétée par des milliers d'autres listes ; c'est celle qu'utilise GBIF depuis 2026. |
| **Genre** | Groupe d'espèces très proches, première partie du nom latin (*Quercus* = les chênes). Beaucoup de noms courants désignent un genre plutôt qu'une espèce (« chêne », « bouleau »). |
| **Synonyme** | Ancien ou autre nom latin d'une espèce (*Quercus pedunculata* est un synonyme de *Quercus robur*). La recherche doit les comprendre et renvoyer vers le nom accepté. |
| **Essai (spike)** | Petit développement jetable pour vérifier qu'une solution tient la route avant de bâtir dessus. |
