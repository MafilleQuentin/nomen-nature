# Import des données (lot 3)

Outils de l'import mensuel de Nomen Nature, en TypeScript (Node 22.18 ou plus les exécute directement). Architecture et volumes : note [Données](../../docs/02-Conception/Donnees.md).

Les fichiers téléchargés et produits vont dans `tools/donnees/data/`, ignoré par git.

## Outils

| Fichier | Rôle |
|---|---|
| [`col.ts`](col.ts) | Trouve la dernière version du Catalogue of Life XR, télécharge l'export (~137 Mo), prend la table des noms courants dans l'archive mensuelle (~35 Mo sur 1,4 Go) et écrit `taxons.tsv`, `noms.tsv` et `version.json` dans `data/col/<clé>/` |
| [`gbif-sql.ts`](gbif-sql.ts) | Téléchargements SQL de GBIF : valider, demander, suivre, télécharger. Identifiants dans `.env` (`GBIF_UTILISATEUR`, `GBIF_MOT_DE_PASSE`) |
| [`requetes/`](requetes/) | Les requêtes SQL envoyées à GBIF : espèces observées, espèces par pays, diagnostic des colonnes |
| [`mesurer.ts`](mesurer.ts) | Mesures du 23.11.2026 (volumes, statuts UICN, lien avec le COL XR) |
| [`zip.ts`](zip.ts) | Lit un seul fichier dans un zip, local ou distant (requêtes partielles), sans dépendance |

La clé phonétique de la recherche est dans [`src/lib/recherche/phonetique.ts`](../../src/lib/recherche/phonetique.ts), partagée avec le navigateur.

## Utilisation

```bash
node tools/donnees/col.ts                      # dernière version du Catalogue of Life XR
node tools/donnees/gbif-sql.ts demander tools/donnees/requetes/especes.sql
node tools/donnees/gbif-sql.ts etat            # ~20 minutes chez GBIF
node tools/donnees/gbif-sql.ts telecharger <clé>
```

## Résultats

**Catalogue of Life XR, COL26.10 XR** (extraction du 23.11.2026, 1 minute) : 2 382 960 espèces, 278 301 genres et 18 517 familles acceptés ; 2 679 778 noms latins, 84 456 noms courants français et 353 829 anglais (52 748 espèces avec un nom français, 174 321 avec un nom anglais). **Identique à l'extraction Python du lot 1**, ligne à ligne, à un détail près : 13 noms contenant des guillemets sont désormais écrits tels quels (Python les entourait de guillemets supplémentaires).

Sources : Catalogue of Life (CC BY 4.0, citer l'édition et son DOI, dans `version.json`) ; GBIF (un DOI par téléchargement).
