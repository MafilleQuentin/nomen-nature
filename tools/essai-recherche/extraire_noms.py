"""Extrait les noms à rendre cherchables depuis le Catalogue of Life XR (QUE-5).

Entrées (data/col/, voir telecharger.py) :
- dataset-*.tsv : un taxon par ligne, avec statut, rang et classification ;
- VernacularName.tsv : les noms courants, toutes langues.

Sorties (data/) :
- taxa.tsv : les taxons cherchables des animaux, plantes et champignons :
  espèces acceptées, plus les genres et familles acceptés (« chêne » désigne le
  genre Quercus, « bouleau » le genre Betula) ;
- noms.tsv : un nom par ligne, rattaché à un taxon de taxa.tsv : nom latin accepté,
  synonyme latin (renvoyé vers l'espèce acceptée), nom courant français ou anglais ;
- extraction.json : les chiffres de l'extraction.

Usage : python extraire_noms.py
"""

from __future__ import annotations

import collections
import csv
import json
import re
from pathlib import Path

DOSSIER = Path(__file__).parent / "data"
REGNES = {"Animalia", "Plantae", "Fungi"}
STATUTS_ACCEPTES = {"accepted", "provisionally accepted"}
RANGS = {"species", "genus", "family"}
LANGUES = {"fra": "fr", "eng": "en"}
LONGUEUR_MAX = 100

csv.field_size_limit(2**31 - 1)  # sys.maxsize déborde sous Windows (long C sur 32 bits)


def lire_tsv(chemin: Path):
    with chemin.open(encoding="utf-8", newline="") as fichier:
        lecteur = csv.reader(fichier, delimiter="\t", quoting=csv.QUOTE_NONE)
        entete = [colonne.split(":", 1)[-1] for colonne in next(lecteur)]
        for ligne in lecteur:
            yield dict(zip(entete, ligne))


ESPACES = re.compile(r"\s+")
PARENTHESE_FINALE = re.compile(r"\s*\([^()]*\)\s*$")


def nettoyer(nom: str) -> str:
    """Retire espaces superflus, guillemets englobants et remarque finale entre parenthèses.

    Ex. : « "Bébête coco" (créole réunionais) » → « Bébête coco ».
    """
    nom = ESPACES.sub(" ", nom).strip()
    nom = PARENTHESE_FINALE.sub("", nom)
    nom = nom.replace('"', "").strip(" ,;")
    return nom


def main() -> None:
    export = next((DOSSIER / "col").glob("dataset-*.tsv"))
    compteurs: collections.Counter[str] = collections.Counter()

    # 1. Taxons cherchables et synonymes d'espèces.
    taxa: dict[str, tuple[str, ...]] = {}
    synonymes: dict[str, tuple[str, str]] = {}  # id du synonyme -> (nom, id de l'espèce acceptée)
    for t in lire_tsv(export):
        if t["kingdom"] not in REGNES or t["rank"] not in RANGS:
            continue
        if t["status"] in STATUTS_ACCEPTES:
            taxa[t["ID"]] = (t["rank"], t["scientificName"], t["authorship"], t["kingdom"], t["family"], t["genus"], t["taxGroup"])
            compteurs[f"taxa_{t['rank']}"] += 1
        elif t["status"] == "synonym" and t["rank"] == "species":
            synonymes[t["ID"]] = (t["scientificName"], t["parentID"])

    with (DOSSIER / "taxa.tsv").open("w", encoding="utf-8", newline="") as fichier:
        ecrivain = csv.writer(fichier, delimiter="\t", lineterminator="\n")
        ecrivain.writerow(["id", "rang", "nom_scientifique", "auteur", "regne", "famille", "genre", "groupe_col"])
        for identifiant, valeurs in taxa.items():
            ecrivain.writerow([identifiant, *valeurs])

    # 2. Noms : latin accepté, synonymes, noms courants.
    vus: set[tuple[str, str, str]] = set()
    with (DOSSIER / "noms.tsv").open("w", encoding="utf-8", newline="") as fichier:
        ecrivain = csv.writer(fichier, delimiter="\t", lineterminator="\n")
        ecrivain.writerow(["taxon_id", "nom", "langue", "type"])

        def ajouter(taxon: str, nom: str, langue: str, genre: str) -> None:
            cle = (taxon, langue, nom.casefold())
            if cle in vus:
                compteurs["doublons"] += 1
                return
            vus.add(cle)
            ecrivain.writerow([taxon, nom, langue, genre])
            compteurs[f"noms_{langue}_{genre}"] += 1

        for identifiant, (_, nom, *_reste) in taxa.items():
            ajouter(identifiant, nom, "la", "accepte")

        for nom, parent in synonymes.values():
            if parent in taxa and taxa[parent][0] == "species":
                ajouter(parent, nom, "la", "synonyme")
            else:
                compteurs["synonymes_sans_espece"] += 1

        for v in lire_tsv(DOSSIER / "col" / "VernacularName.tsv"):
            langue = LANGUES.get(v["language"])
            if not langue:
                continue
            taxon = v["taxonID"]
            if taxon in synonymes:  # nom courant posé sur un synonyme : on le renvoie vers l'espèce acceptée
                taxon = synonymes[taxon][1]
            if taxon not in taxa:
                compteurs[f"courants_{langue}_hors_perimetre"] += 1
                continue
            nom = nettoyer(v["name"])
            if not nom or len(nom) > LONGUEUR_MAX:
                compteurs[f"courants_{langue}_rejetes"] += 1
                continue
            ajouter(taxon, nom, langue, "courant")

    # 3. Couverture : combien d'espèces ont au moins un nom courant ?
    especes_avec = {"fr": set(), "en": set()}
    for ligne in lire_tsv(DOSSIER / "noms.tsv"):
        if ligne["type"] == "courant" and taxa[ligne["taxon_id"]][0] == "species":
            especes_avec[ligne["langue"]].add(ligne["taxon_id"])
    compteurs["especes_avec_nom_fr"] = len(especes_avec["fr"])
    compteurs["especes_avec_nom_en"] = len(especes_avec["en"])
    compteurs["noms_total"] = len(vus)

    for chemin in ("taxa.tsv", "noms.tsv"):
        compteurs[f"taille_{chemin}_octets"] = (DOSSIER / chemin).stat().st_size

    resultat = {"source": export.name, **dict(sorted(compteurs.items()))}
    (DOSSIER / "extraction.json").write_text(json.dumps(resultat, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(resultat, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
