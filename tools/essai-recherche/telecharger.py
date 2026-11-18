"""Télécharge les données du Catalogue of Life XR utilisées par l'essai de la recherche.

Deux fichiers, rangés dans data/col/ (ignoré par git) :

1. L'export « à plat » de la version XR (un taxon par ligne, avec sa classification),
   via l'API de ChecklistBank : environ 137 Mo compressés, 1,5 Go une fois décompressé.
2. La table des noms courants (VernacularName.tsv) de l'archive mensuelle ColDP.
   L'archive complète pèse 1,4 Go : on ne télécharge que les octets de cette table
   (environ 35 Mo) grâce aux requêtes HTTP partielles (« Range »).

Licence des données : CC BY 4.0. Citation : Catalogue of Life, version indiquée
dans data/col/metadata.yaml (DOI 10.48580/dgzlf pour COL26.10 XR).

Usage : python telecharger.py [--version 2026-10-16] [--dataset 316691]
"""

from __future__ import annotations

import argparse
import io
import struct
import urllib.request
import zipfile
import zlib
from pathlib import Path

USER_AGENT = "NomenNature/0.4 (+https://github.com/MafilleQuentin/nomen-nature)"
DOSSIER = Path(__file__).parent / "data" / "col"


def requete(url: str, debut: int | None = None, fin: int | None = None) -> bytes:
    entetes = {"User-Agent": USER_AGENT}
    if debut is not None:
        entetes["Range"] = f"bytes={debut}-{'' if fin is None else fin}"
    with urllib.request.urlopen(urllib.request.Request(url, headers=entetes)) as reponse:
        return reponse.read()


def telecharger_export_plat(dataset: int) -> None:
    url = f"https://api.checklistbank.org/dataset/{dataset}/export.zip?format=ColDP"
    print(f"Export à plat : {url}")
    donnees = requete(url)
    with zipfile.ZipFile(io.BytesIO(donnees)) as archive:
        archive.extractall(DOSSIER)
    print(f"  {len(donnees) / 1e6:.0f} Mo téléchargés, extraits dans {DOSSIER}")


def entree_zip(repertoire: bytes, nom_voulu: str) -> tuple[int, int, int, int]:
    """Cherche une entrée dans le répertoire central d'un zip (zip64 compris).

    Renvoie (méthode, taille compressée, taille décompressée, position de l'en-tête local).
    """
    i = 0
    while (i := repertoire.find(b"PK\x01\x02", i)) >= 0:
        methode = struct.unpack("<H", repertoire[i + 10 : i + 12])[0]
        compresse, decompresse = struct.unpack("<II", repertoire[i + 20 : i + 28])
        n, m = struct.unpack("<HH", repertoire[i + 28 : i + 32])
        position = struct.unpack("<I", repertoire[i + 42 : i + 46])[0]
        nom = repertoire[i + 46 : i + 46 + n].decode("utf-8", errors="replace")
        if nom == nom_voulu:
            extra = repertoire[i + 46 + n : i + 46 + n + m]
            if extra[:2] == b"\x01\x00":  # champs zip64, dans cet ordre s'ils valent 0xFFFFFFFF
                valeurs = list(struct.unpack(f"<{(len(extra) - 4) // 8}Q", extra[4 : 4 + 8 * ((len(extra) - 4) // 8)]))
                if decompresse == 0xFFFFFFFF:
                    decompresse = valeurs.pop(0)
                if compresse == 0xFFFFFFFF:
                    compresse = valeurs.pop(0)
                if position == 0xFFFFFFFF:
                    position = valeurs.pop(0)
            return methode, compresse, decompresse, position
        i += 4
    raise LookupError(f"{nom_voulu} absent de l'archive")


def telecharger_table(version: str, table: str) -> None:
    url = f"https://download.checklistbank.org/col/monthly/{version}_xr_coldp.zip"
    print(f"Table {table} extraite de {url}")
    # Le répertoire central est à la fin du zip ; 8 Mo suffisent largement.
    repertoire = _fin_du_fichier(url, 8 * 1024 * 1024)
    methode, compresse, decompresse, position = entree_zip(repertoire, table)
    entete_local = requete(url, position, position + 29)
    n, m = struct.unpack("<HH", entete_local[26:30])
    debut = position + 30 + n + m
    donnees = requete(url, debut, debut + compresse - 1)
    if methode == 8:
        donnees = zlib.decompressobj(-15).decompress(donnees)
    elif methode != 0:
        raise ValueError(f"Méthode de compression {methode} non gérée")
    if len(donnees) != decompresse:
        raise ValueError(f"Taille inattendue : {len(donnees)} au lieu de {decompresse}")
    (DOSSIER / table).write_bytes(donnees)
    print(f"  {compresse / 1e6:.0f} Mo téléchargés, {decompresse / 1e6:.0f} Mo écrits")


def _fin_du_fichier(url: str, taille: int) -> bytes:
    entetes = {"User-Agent": USER_AGENT, "Range": f"bytes=-{taille}"}
    with urllib.request.urlopen(urllib.request.Request(url, headers=entetes)) as reponse:
        return reponse.read()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--version", default="2026-10-16", help="date de la version mensuelle XR")
    parser.add_argument("--dataset", type=int, default=316691, help="clé ChecklistBank de cette version")
    args = parser.parse_args()
    DOSSIER.mkdir(parents=True, exist_ok=True)
    telecharger_export_plat(args.dataset)
    telecharger_table(args.version, "VernacularName.tsv")


if __name__ == "__main__":
    main()
