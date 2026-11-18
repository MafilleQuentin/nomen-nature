"""Charge taxa.tsv et noms.tsv dans une base, avec l'index par trigrammes (QUE-6).

Deux cibles :
- sqlite : un fichier SQLite construit directement par Python (rapide), pour comparer
  la taille de plusieurs variantes ;
- d1 : la base D1 locale de Wrangler, alimentée par des fichiers SQL découpés,
  exactement comme on le ferait pour la base en ligne.

Usage :
  python -X utf8 charger.py sqlite [--sans-synonymes]
  python -X utf8 charger.py d1 [--sans-synonymes]
"""

from __future__ import annotations

import argparse
import csv
import os
import sqlite3
import subprocess
import time
from collections.abc import Iterator
from pathlib import Path

ICI = Path(__file__).parent
DONNEES = ICI / "data"
SCHEMA = (ICI / "schema.sql").read_text(encoding="utf-8")
LIGNES_PAR_INSTRUCTION = 300  # D1 limite une instruction SQL à 100 Ko
LIGNES_PAR_FICHIER = 200_000

csv.field_size_limit(2**31 - 1)


def lire(chemin: Path) -> Iterator[list[str]]:
    with chemin.open(encoding="utf-8", newline="") as fichier:
        lecteur = csv.reader(fichier, delimiter="\t", quoting=csv.QUOTE_NONE)
        next(lecteur)
        yield from lecteur


def taxons() -> Iterator[list[str]]:
    yield from lire(DONNEES / "taxa.tsv")


def noms(sans_synonymes: bool) -> Iterator[list[str]]:
    for ligne in lire(DONNEES / "noms.tsv"):
        if sans_synonymes and ligne[3] == "synonyme":
            continue
        yield ligne


def vers_sqlite(sans_synonymes: bool) -> None:
    chemin = DONNEES / ("essai-sans-synonymes.sqlite" if sans_synonymes else "essai.sqlite")
    chemin.unlink(missing_ok=True)
    base = sqlite3.connect(chemin)
    base.executescript(SCHEMA)
    debut = time.perf_counter()
    base.executemany("INSERT INTO taxon VALUES (?,?,?,?,?,?,?,?)", ([v or None for v in t] for t in taxons()))
    base.executemany("INSERT INTO nom (taxon_id, nom, langue, type) VALUES (?,?,?,?)", noms(sans_synonymes))
    base.commit()
    print(f"Données insérées en {time.perf_counter() - debut:.0f} s")
    debut = time.perf_counter()
    base.execute("INSERT INTO nom_fts(nom_fts) VALUES ('rebuild')")
    base.commit()
    print(f"Index par trigrammes construit en {time.perf_counter() - debut:.0f} s")
    base.execute("VACUUM")
    rapport(base, chemin)
    base.close()


def rapport(base: sqlite3.Connection, chemin: Path) -> None:
    taille_page = base.execute("PRAGMA page_size").fetchone()[0]
    print(f"Fichier : {chemin.name}, {chemin.stat().st_size / 1e6:.0f} Mo")
    try:  # répartition par table, si SQLite a été compilé avec dbstat
        lignes = base.execute("SELECT name, count(*) FROM dbstat GROUP BY name ORDER BY 2 DESC").fetchall()
        for nom, pages in lignes[:8]:
            print(f"  {nom:28} {pages * taille_page / 1e6:8.0f} Mo")
    except sqlite3.OperationalError:
        pass
    n_taxons = base.execute("SELECT count(*) FROM taxon").fetchone()[0]
    n_noms = base.execute("SELECT count(*) FROM nom").fetchone()[0]
    print(f"  {n_taxons:,} taxons, {n_noms:,} noms".replace(",", " "))


def sql_texte(valeur: str) -> str:
    return "NULL" if valeur == "" else "'" + valeur.replace("'", "''") + "'"


def fichiers_sql(table: str, colonnes: str, lignes: Iterator[list[str]], dossier: Path, prefixe: str) -> list[Path]:
    fichiers: list[Path] = []
    lot: list[str] = []
    contenu: list[str] = []
    compte = 0

    def vider_lot() -> None:
        if lot:
            contenu.append(f"INSERT INTO {table} ({colonnes}) VALUES\n" + ",\n".join(lot) + ";\n")
            lot.clear()

    def ecrire_fichier() -> None:
        vider_lot()
        if contenu:
            chemin = dossier / f"{prefixe}-{len(fichiers):03d}.sql"
            chemin.write_text("".join(contenu), encoding="utf-8")
            fichiers.append(chemin)
            contenu.clear()

    for ligne in lignes:
        lot.append("(" + ",".join(sql_texte(v) for v in ligne) + ")")
        compte += 1
        if len(lot) == LIGNES_PAR_INSTRUCTION:
            vider_lot()
        if compte % LIGNES_PAR_FICHIER == 0:
            ecrire_fichier()
    ecrire_fichier()
    return fichiers


def wrangler(*arguments: str) -> None:
    commande = ["npx", "wrangler", "d1", "execute", "nomen-essai", "--local", "--yes", *arguments]
    env = {**os.environ, "WRANGLER_SEND_METRICS": "false"}
    resultat = subprocess.run(commande, cwd=ICI, env=env, capture_output=True, text=True, encoding="utf-8", shell=os.name == "nt")
    if resultat.returncode != 0:
        raise RuntimeError(resultat.stdout[-2000:] + resultat.stderr[-2000:])


def vers_d1(sans_synonymes: bool) -> None:
    dossier = DONNEES / "d1"
    dossier.mkdir(exist_ok=True)
    for ancien in dossier.glob("*.sql"):
        ancien.unlink()
    (dossier / "000-schema.sql").write_text(SCHEMA, encoding="utf-8")
    fichiers = [dossier / "000-schema.sql"]
    fichiers += fichiers_sql("taxon", "id, rang, nom_scientifique, auteur, regne, famille, genre, groupe", taxons(), dossier, "100-taxon")
    fichiers += fichiers_sql("nom", "taxon_id, nom, langue, type", noms(sans_synonymes), dossier, "200-nom")
    print(f"{len(fichiers)} fichiers SQL écrits dans {dossier}")

    debut = time.perf_counter()
    for i, chemin in enumerate(fichiers, 1):
        wrangler("--file", str(chemin))
        print(f"  [{i}/{len(fichiers)}] {chemin.name} ({time.perf_counter() - debut:.0f} s)", flush=True)
    debut_index = time.perf_counter()
    wrangler("--command", "INSERT INTO nom_fts(nom_fts) VALUES ('rebuild')")
    print(f"Index par trigrammes construit en {time.perf_counter() - debut_index:.0f} s")

    base_locale = max((ICI / ".wrangler" / "state").rglob("*.sqlite"), key=lambda p: p.stat().st_size)
    print(f"Base D1 locale : {base_locale.stat().st_size / 1e6:.0f} Mo ({base_locale.name})")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("cible", choices=["sqlite", "d1"])
    parser.add_argument("--sans-synonymes", action="store_true", help="ne pas charger les synonymes latins")
    args = parser.parse_args()
    (vers_sqlite if args.cible == "sqlite" else vers_d1)(args.sans_synonymes)


if __name__ == "__main__":
    main()
