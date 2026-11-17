# Nomen Nature — consignes pour Claude

Site web non commercial d'exploration de la biodiversité mondiale. Brief : `docs/01-Cadrage/Brief.md`. Le brief et `docs/Decisions.md` font foi : ne pas réouvrir une décision qui y est consignée sans que l'utilisateur le demande.

## Méthode

- Avancer **une étape à la fois** et faire valider chaque étape par l'utilisateur avant la suivante.
- **Aucun code applicatif avant que la maquette Figma soit validée.** La stack technique se choisit avec l'utilisateur, après le Figma.
- Toutes les réponses et la documentation en **français** ; le contenu du site est en français et en anglais.

## Coffre Obsidian (`docs/`)

`docs/` est à la fois la documentation du dépôt et un coffre Obsidian. Il doit rester rangé et à jour :

- À la fin de chaque session de travail : ajouter une note dans `docs/03-Journal/AAAA-MM-JJ.md` (ce qui a été fait, décidé, ce qui reste) et mettre à jour `docs/Feuille de route.md`.
- Chaque décision structurante : une ligne dans `docs/Decisions.md` (date, décision, pourquoi, alternatives écartées).
- Nouveau terme métier ou technique : l'ajouter à `docs/Glossaire.md`.
- Liens : **liens Markdown relatifs**, espaces encodés en `%20` (`[Brief](01-Cadrage/Brief.md)`), jamais de `[[wikiliens]]`, pour que les liens marchent à la fois dans Obsidian et sur GitHub.
- Noms de fichiers et de dossiers sans accents ; titres avec accents.
- Ne jamais committer d'images ou de textes tiers dont la licence n'est pas compatible ou pas connue.

## Git et GitHub

- Messages de commit en français, au format `type: description` (`docs:`, `feat:`, `fix:`, `chore:`, `refactor:`, `test:`). Des commits petits et cohérents : un sujet par commit.
- **Ne jamais travailler ni committer directement sur `main`.** `main` ne reçoit que les releases.
- Branches :
  - `develop` : branche d'intégration, toujours dans un état sain.
  - Une branche de travail par sujet, créée depuis `develop` : `feat/…`, `fix/…`, `docs/…`, `chore/…` (noms en minuscules, sans accents).
  - Une branche de travail terminée est fusionnée dans `develop` avec `git merge --no-ff`, puis supprimée (en local et sur GitHub).
  - Release : depuis `develop`, branche `release/vX.Y.Z` (changelog, version), fusion `--no-ff` dans `main`, tag sur `main`, puis `main` refusionnée dans `develop`.
- Aucun secret dans le dépôt (`.env` ignoré ; fournir un `.env.example`).
- Mettre à jour `README.md` quand l'état du projet ou les fonctionnalités changent.

## Versions et releases

- Numérotation SemVer. Tant que la V1 n'est pas publiée : `0.x.y`.
- Toute évolution notable va d'abord dans la section `[Non publié]` de `CHANGELOG.md`.
- Pour publier une version (sur la branche `release/vX.Y.Z`) : déplacer `[Non publié]` sous un nouveau numéro daté, mettre à jour les liens de comparaison, committer, fusionner dans `main`, créer le tag `vX.Y.Z` sur `main` et une release GitHub (`gh release create`) dont le texte reprend la section du changelog.
- Proposer une release à la fin de chaque étape validée ou de chaque lot livré ; ne pas publier sans l'accord de l'utilisateur.

## Données (contraintes à respecter)

- Le site est **non commercial pour toujours** : pas de publicité ni d'abonnement. C'est ce qui autorise les photos iNaturalist en CC BY-NC et le plan non-profit de Pl@ntNet.
- Créditer partout les auteurs des photos et les sources (GBIF, Wikipédia, UICN…).
- UICN : afficher uniquement la catégorie (LC, VU, EN…) ; ne pas republier les textes ni les cartes de l'UICN.
- Détails : `docs/01-Cadrage/Sources de donnees.md`.
