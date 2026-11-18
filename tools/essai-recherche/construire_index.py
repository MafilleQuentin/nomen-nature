"""Construit l'index de recherche en fichiers statiques (QUE-9).

À partir de data/essai.sqlite (charger.py sqlite), écrit dans data/index/ :

- noms/NNNN.tsv : toutes les entrées triées par nom normalisé (« chene pedoncule ») ;
- cles/NNNN.tsv : les mêmes entrées triées par langue + clé phonétique (« fr|bUlo ») ;
- courts/NNNN.tsv : pour chaque début de 3 lettres, les 30 entrées les plus connues.
  Sans lui, « che » ne verrait que les premiers noms dans l'ordre alphabétique
  (Chelonia…), pas « chêne » ;
- manifeste.json : pour chaque dictionnaire, la première clé de chaque fichier
  (on y cherche le bon fichier par dichotomie) et sa taille compressée.

Une ligne d'un fichier : tri, nom affiché, langue, type, taxon, rang, nom scientifique,
genre, famille, notoriété. Les infos du taxon sont recopiées sur chaque ligne : c'est
plus lourd, mais une recherche n'a besoin que d'un fichier, et gzip efface l'essentiel
des répétitions.

Usage : python -X utf8 construire_index.py [--taille-cible 131072] [--sans-synonymes]
"""

from __future__ import annotations

import argparse
import gzip
import json
import shutil
import sqlite3
import time
from pathlib import Path

from phonetique import normaliser

DONNEES = Path(__file__).parent / "data"
SORTIE = DONNEES / "index"
PREFIXE_COURT = 3
PAR_PREFIXE_COURT = 30


def preparer(base: sqlite3.Connection, sans_synonymes: bool) -> None:
    """Table temporaire des entrées des trois dictionnaires, avec leur clé de tri."""
    base.executescript(
        """
        DROP TABLE IF EXISTS entree;
        CREATE TABLE entree (dico TEXT, tri TEXT, ligne TEXT, notoriete INTEGER);
        DROP TABLE IF EXISTS notoriete;
        CREATE TABLE notoriete AS
          SELECT taxon_id, count(*) AS n FROM nom WHERE type = 'courant' GROUP BY taxon_id;
        CREATE INDEX notoriete_taxon ON notoriete(taxon_id);
        """
    )
    filtre = "WHERE n.type != 'synonyme'" if sans_synonymes else ""
    curseur = base.execute(
        f"""SELECT n.nom, n.langue, n.type, n.cle, n.taxon_id, t.rang, t.nom_scientifique,
                   coalesce(t.genre, ''), coalesce(t.famille, ''), coalesce(o.n, 0)
            FROM nom n JOIN taxon t ON t.id = n.taxon_id LEFT JOIN notoriete o ON o.taxon_id = n.taxon_id
            {filtre}"""
    )
    lot: list[tuple] = []
    for nom, langue, type_nom, cle, taxon, rang, scientifique, genre, famille, notoriete in curseur:
        reste = "\t".join([nom, langue, type_nom, taxon, rang, scientifique, genre, famille, str(notoriete)])
        nom_normalise = normaliser(nom)
        lot.append(("noms", nom_normalise, f"{nom_normalise}\t{reste}", notoriete))
        if cle:
            tri_cle = f"{langue}|{cle}"
            lot.append(("cles", tri_cle, f"{tri_cle}\t{reste}", notoriete))
        if len(lot) >= 100_000:
            base.executemany("INSERT INTO entree VALUES (?,?,?,?)", lot)
            lot.clear()
    base.executemany("INSERT INTO entree VALUES (?,?,?,?)", lot)
    base.execute("CREATE INDEX entree_tri ON entree(dico, tri)")
    # Dictionnaire des débuts courts : les plus connus d'abord (notoriété, puis noms les plus courts).
    # Pour les clés, le début porte sur le son, après « fr| » : « fr|bUl ».
    # Une ligne : groupe (« nche » pour les noms, « cfr|bUl » pour les clés), puis la ligne d'origine.
    # Le tri « groupe + rang » garde chaque groupe dans l'ordre de notoriété.
    base.execute(
        f"""INSERT INTO entree
            SELECT 'courts', 'n' || prefixe || char(9) || printf('%03d', rang_dans_prefixe), 'n' || prefixe || char(9) || ligne, notoriete FROM (
              SELECT substr(tri, 1, {PREFIXE_COURT}) AS prefixe, ligne, notoriete,
                     row_number() OVER (PARTITION BY substr(tri, 1, {PREFIXE_COURT})
                                        ORDER BY notoriete DESC, length(tri)) AS rang_dans_prefixe
              FROM entree WHERE dico = 'noms' AND length(tri) >= {PREFIXE_COURT}
            ) WHERE rang_dans_prefixe <= {PAR_PREFIXE_COURT}"""
    )
    base.execute(
        f"""INSERT INTO entree
            SELECT 'courts', 'c' || prefixe || char(9) || printf('%03d', rang_dans_prefixe), 'c' || prefixe || char(9) || ligne, notoriete FROM (
              SELECT substr(tri, 1, {PREFIXE_COURT + 3}) AS prefixe, ligne, notoriete,
                     row_number() OVER (PARTITION BY substr(tri, 1, {PREFIXE_COURT + 3})
                                        ORDER BY notoriete DESC, length(tri)) AS rang_dans_prefixe
              FROM entree WHERE dico = 'cles' AND length(tri) >= {PREFIXE_COURT + 3}
            ) WHERE rang_dans_prefixe <= {PAR_PREFIXE_COURT}"""
    )
    base.commit()


def ecrire(base: sqlite3.Connection, dico: str, taille_cible: int) -> dict:
    dossier = SORTIE / dico
    dossier.mkdir(parents=True)
    premiers: list[str] = []
    tailles_gz: list[int] = []
    tampon: list[str] = []
    taille = 0
    total_brut = 0
    premier_tri = ""

    def vider() -> None:
        nonlocal taille, total_brut
        if not tampon:
            return
        contenu = ("\n".join(tampon) + "\n").encode("utf-8")
        chemin = dossier / f"{len(premiers):04d}.tsv"
        chemin.write_bytes(contenu)
        premiers.append(premier_tri)
        tailles_gz.append(len(gzip.compress(contenu, compresslevel=9)))
        total_brut += len(contenu)
        tampon.clear()
        taille = 0

    precedent = None
    for tri, ligne in base.execute("SELECT tri, ligne FROM entree WHERE dico = ? ORDER BY tri", (dico,)):
        # On ne coupe jamais au milieu d'une même clé de tri : toutes ses lignes restent ensemble.
        cle_groupe = tri.split("\t", 1)[0]
        if taille >= taille_cible and cle_groupe != precedent:
            vider()
        if not tampon:
            premier_tri = cle_groupe
        tampon.append(ligne)
        taille += len(ligne.encode("utf-8")) + 1
        precedent = cle_groupe
    vider()
    return {"premiers": premiers, "tailles_gz": tailles_gz, "brut": total_brut, "gz": sum(tailles_gz)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--taille-cible", type=int, default=128 * 1024, help="taille brute visée par fichier, en octets")
    parser.add_argument("--sans-synonymes", action="store_true")
    args = parser.parse_args()

    debut = time.perf_counter()
    base = sqlite3.connect(DONNEES / "essai.sqlite")
    preparer(base, args.sans_synonymes)
    print(f"Entrées préparées en {time.perf_counter() - debut:.0f} s")

    if SORTIE.exists():
        shutil.rmtree(SORTIE)
    manifeste = {"taille_cible": args.taille_cible, "prefixe_court": PREFIXE_COURT, "dictionnaires": {}}
    for dico in ("noms", "cles", "courts"):
        resume = ecrire(base, dico, args.taille_cible)
        manifeste["dictionnaires"][dico] = resume
        n = len(resume["premiers"])
        print(f"{dico:7} {n:6} fichiers  {resume['brut'] / 1e6:7.0f} Mo bruts  {resume['gz'] / 1e6:6.0f} Mo compressés"
              f"  (moyenne {resume['gz'] / n / 1024:.0f} Ko compressés par fichier)")
    chemin = SORTIE / "manifeste.json"
    chemin.write_text(json.dumps(manifeste, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    contenu = chemin.read_bytes()
    total_fichiers = sum(len(d["premiers"]) for d in manifeste["dictionnaires"].values()) + 1
    print(f"Manifeste : {len(contenu) / 1024:.0f} Ko bruts, {len(gzip.compress(contenu)) / 1024:.0f} Ko compressés")
    print(f"Total : {total_fichiers} fichiers (limite gratuite : 20 000), en {time.perf_counter() - debut:.0f} s")
    base.execute("DROP TABLE entree")
    base.execute("DROP TABLE notoriete")
    base.commit()


if __name__ == "__main__":
    main()
