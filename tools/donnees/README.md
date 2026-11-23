# Import des données (lot 3)

Outils de l'import mensuel de Nomen Nature, en TypeScript (Node 22.18 ou plus les exécute directement). Architecture et volumes : note [Données](../../docs/02-Conception/Donnees.md).

Les fichiers téléchargés et produits vont dans `tools/donnees/data/`, ignoré par git.

## Outils

| Fichier | Rôle |
|---|---|
| [`col.ts`](col.ts) | Trouve la dernière version du Catalogue of Life XR, télécharge l'export (~137 Mo), prend la table des noms courants dans l'archive mensuelle (~35 Mo sur 1,4 Go) et écrit `taxons.tsv`, `noms.tsv` et `version.json` dans `data/col/<clé>/` |
| [`gbif-sql.ts`](gbif-sql.ts) | Téléchargements SQL de GBIF : valider, demander, attendre, télécharger. `obtenir` réutilise un résultat identique de moins de 25 jours du compte, sinon demande et attend (~20 minutes), et **refuse un résultat presque vide**. Identifiants dans `.env` (`GBIF_UTILISATEUR`, `GBIF_MOT_DE_PASSE`) |
| [`gbif.ts`](gbif.ts) | Obtient les deux téléchargements et écrit `data/gbif/especes.tsv` (id, observations, statut UICN), `pays.tsv` (pays, id, observations) et `gbif.json` (DOI, licences, citations) |
| [`index-recherche.ts`](index-recherche.ts) | Construit l'index de la recherche (dictionnaires `noms`, `cles`, `courts` et `manifeste.json`) à partir du Catalogue of Life et des espèces observées, en fichiers `.txt` d'environ 64 Ko, dans `data/index/` |
| [`import.ts`](import.ts) | `npm run donnees:import` : enchaîne Catalogue of Life, GBIF et index, écrit `sources.json` (éditions, DOI, licences, citations) ; le paquet est le dossier `data/paquet/` |
| [`installer.ts`](installer.ts) | `npm run donnees:installer` : installe le paquet de la dernière release GitHub « donnees-AAAA-MM » dans `public/donnees/` avant la construction du site (`--local` : le paquet construit sur ce poste) |
| [`notes-release.ts`](notes-release.ts) | Texte de la release de données |
| [`requetes/`](requetes/) | Les requêtes SQL envoyées à GBIF : espèces observées, espèces par pays, diagnostic des colonnes |
| [`mesurer.ts`](mesurer.ts) | Mesures du 23.11.2026 (volumes, statuts UICN, lien avec le COL XR) |
| [`zip.ts`](zip.ts) | Lit un seul fichier dans un zip, local ou distant (requêtes partielles), sans dépendance |

La clé phonétique de la recherche est dans [`src/lib/recherche/phonetique.ts`](../../src/lib/recherche/phonetique.ts), partagée avec le navigateur.

## Chaque mois, sur GitHub

- Workflow [Données mensuelles](../../.github/workflows/donnees.yml) : le 20 du mois (une fois sur `main`), ou à la main. Import, paquet zippé, release « donnees-AAAA-MM » (qui ne prend pas la place de « latest »).
- Workflow [Déploiement du site de test](../../.github/workflows/deploiement-test.yml) : après chaque import réussi et chaque fusion dans `develop`. Installe le paquet, construit, déploie sur https://test.nomenature.org et vérifie quelques adresses.
- Secrets GitHub : `GBIF_UTILISATEUR`, `GBIF_MOT_DE_PASSE`, `CLOUDFLARE_API_TOKEN` (deux politiques : le compte, pour *Workers Scripts*, et le domaine nomenature.org, pour *Workers Routes*), `CLOUDFLARE_ACCOUNT_ID`.

## Utilisation

```bash
node tools/donnees/col.ts                      # dernière version du Catalogue of Life XR
node tools/donnees/gbif.ts                     # observations GBIF (réutilise ou demande, ~20 minutes)
node tools/donnees/gbif-sql.ts etat            # derniers téléchargements du compte
node --max-old-space-size=6144 tools/donnees/index-recherche.ts tools/donnees/data/col/<clé>
```

## Résultats

**Catalogue of Life XR, COL26.10 XR** (extraction du 23.11.2026, 1 minute) : 2 382 960 espèces, 278 301 genres et 18 517 familles acceptés ; 2 679 778 noms latins, 84 456 noms courants français et 353 829 anglais (52 748 espèces avec un nom français, 174 321 avec un nom anglais). **Identique à l'extraction Python du lot 1**, ligne à ligne, à un détail près : 13 noms contenant des guillemets sont désormais écrits tels quels (Python les entourait de guillemets supplémentaires).

**GBIF** (préparation du 23.11.2026, 24 secondes en réutilisant les téléchargements du jour) : 1 648 413 espèces avec leur nombre d'observations et leur statut UICN, 5 986 994 couples espèce × pays.

**Index de la recherche** (construction du 23.11.2026) : 1 648 413 espèces observées, 181 312 genres et 12 646 familles qui en contiennent ; **7 965 fichiers** (noms 3 790, clés 3 845, débuts courts 329), 97 Mo en gzip, 81 Mo en brotli. Évalué avec le jeu de 40 recherches du lot 1 (`evaluer.py --fichiers`, inchangé) : **39/40** dans les 5 premiers, 32/40 en premier, 60 Ko par première recherche en médiane, 212 Ko au pire. Même qualité que le lot 1 (10 868 fichiers, 231 Ko au pire) ; le seul échec reste le synonyme latin *Quercus pedunculata*, écarté par le verdict du lot 1.

Sources : Catalogue of Life (CC BY 4.0, citer l'édition et son DOI, dans `version.json`) ; GBIF (**CC BY-NC 4.0** pour nos téléchargements, car certaines sources interdisent l'usage commercial : compatible avec un site non commercial ; citer le DOI de chaque téléchargement, dans `gbif.json`).
