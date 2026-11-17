# Checklist qualité et mise en ligne

*Établie le 17 novembre 2026 à partir de la liste de l'utilisateur, triée et adaptée à Nomen Nature. À vérifier à chaque lot de développement et avant chaque mise en ligne.*

## Retenu tel quel

| # | Règle | Comment pour Nomen |
|---|---|---|
| 1 | **Page Politique de confidentialité** | Obligatoire (loi suisse nLPD et RGPD pour les visiteurs européens). Expliquer : géolocalisation jamais stockée, photos envoyées à Pl@ntNet pour l'identification, statistiques sans cookies. |
| 3 | **Aucun secret dans le code du navigateur** | Les clés (Pl@ntNet, etc.) restent côté serveur : le site passe par notre propre serveur, qui appelle Pl@ntNet. Le `.env` n'est jamais versionné. |
| 4 | **HTTPS obligatoire** | Redirection automatique (Cloudflare). Indispensable aussi parce que la géolocalisation et l'appareil photo ne fonctionnent qu'en HTTPS. |
| 6 | **Titres et descriptions de page** | Uniques pour chaque page et chaque espèce, en français et en anglais (balises de langue alternative). |
| 7 | **Image d'aperçu pour les réseaux sociaux** | Une image générique, et une image par fiche espèce (photo + nom + badge de statut). |
| 8 | **Favicon** | À partir du vrai logo, une fois créé. |
| 9 | **Plan du site et robots.txt** | Plan du site en plusieurs fichiers (des milliers d'espèces) ; seulement les fiches bien documentées. |
| 10 | **Texte alternatif sur les images** | Pour chaque photo : nom de l'espèce et ce qu'on voit. Engagement WCAG AA. |
| 11 | **Images compressées** | Photos redimensionnées à la taille d'affichage, formats WebP/AVIF, chargement différé. |
| 12 | **Vitesse de chargement mesurée** | Critère de réussite : rapide en 4G. Mesure Lighthouse à chaque lot, budget de poids par page. |
| 13 | **Contrastes des couleurs** | Déjà vérifiés dans le design system (au moins 4,5:1) ; à revérifier à chaque nouvel écran. |
| 14 | **Adapté au téléphone** | Déjà au cœur du projet : chaque écran est conçu en version téléphone et ordinateur. |
| 15 | **Page 404 personnalisée** | Dans le style du site, avec une recherche et un lien vers la carte. |
| 16 | **Liens cassés** | Vérification automatique (liens vers Wikipédia, UICN, GBIF, photos), par exemple dans l'intégration continue. |
| 20 | **Un seul appel à l'action clair** | Déjà une règle du style : un seul bouton ambre par écran. |

## Retenu, mais adapté

| # | Règle d'origine | Version Nomen |
|---|---|---|
| 2 | Page Conditions générales | **Mentions légales et conditions d'utilisation, courtes** : qui édite le site, licences des contenus (CC BY, CC BY-SA, CC BY-NC…), limites de l'identification (« une aide, pas une certitude »). Pas de conditions commerciales : le site est gratuit et sans compte. |
| 5 | Bannière de consentement aux cookies | **Faire en sorte de ne pas en avoir besoin** : aucun cookie publicitaire ni de pistage, statistiques sans cookies. Si un jour un cookie non essentiel devient nécessaire, une bannière respectueuse (refuser aussi facile qu'accepter). |
| 17 | Validation des formulaires | Peu de formulaires en V1 : **valider la recherche et l'envoi de photo** (type et poids du fichier) côté navigateur et côté serveur, avec des messages d'erreur clairs. |
| 18 | Protection anti-spam | Pas de formulaire de contact ni de contributions en V1, donc pas de spam au sens classique. À la place : **limiter le nombre d'identifications par visiteur** pour protéger le quota Pl@ntNet (500/jour). L'anti-spam deviendra nécessaire avec les comptes et les observations (V2). |
| 19 | Mettre en place des statistiques | **Statistiques sans cookies et sans données personnelles** (déjà décidé), compatibles avec les écoles. |

## Écarté

Rien : toutes les règles servent, certaines sous une forme adaptée.

Voir aussi : [Brief](01-Cadrage/Brief.md) · [Décisions](Decisions.md) · [Feuille de route](Feuille%20de%20route.md)
