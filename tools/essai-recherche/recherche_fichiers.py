"""Recherche par l'index en fichiers (QUE-9) : ce que fera le navigateur.

1. Le manifeste (chargé une fois) donne la première clé de chaque fichier : on trouve par
   dichotomie le ou les fichiers qui contiennent les entrées commençant par le texte tapé.
2. On charge au plus MAX_FICHIERS par dictionnaire et par recherche :
   - noms/ pour le début du nom normalisé (« chene ped ») ;
   - cles/ pour le début de la clé phonétique, dans chaque langue (« fr|bUlo ») ;
   - courts/ pour un début de moins de 6 lettres : les 30 entrées les plus connues de ce
     début, sinon « che » ne verrait que les premiers noms dans l'ordre alphabétique.
3. Même score et même tri que recherche.py (SQLite), pour comparer.

Le poids transféré est celui des fichiers compressés (gzip), relevé dans le manifeste.
Chaque recherche part d'un cache vide : c'est le pire cas (première recherche du visiteur).

Usage : python -X utf8 recherche_fichiers.py "boulot"
"""

from __future__ import annotations

import bisect
import json
import sys
import time
from dataclasses import dataclass, field
from functools import cache
from pathlib import Path

from phonetique import cle, normaliser
from recherche import BONUS_PAR_MEMBRE, LANGUES, MEMBRES_MAX, Resultat, score_nom

INDEX = Path(__file__).parent / "data" / "index"
MAX_FICHIERS = 3
LONGUEUR_COURTE = 5  # en dessous ou égal : on ajoute le dictionnaire des débuts courts
MAX_CANDIDATS = 300


@dataclass
class Trace:
    fichiers: set[str] = field(default_factory=set)
    octets: int = 0
    duree_ms: float = 0.0
    requetes: list = field(default_factory=list)  # pour l'interface commune avec recherche.py


@cache
def manifeste() -> dict:
    return json.loads((INDEX / "manifeste.json").read_text(encoding="utf-8"))


@cache
def lire_fichier(dico: str, numero: int) -> list[list[str]]:
    texte = (INDEX / dico / f"{numero:04d}.tsv").read_text(encoding="utf-8")
    return [ligne.split("\t") for ligne in texte.splitlines()]


def fichiers_pour(dico: str, prefixe: str) -> list[int]:
    """Numéros des fichiers pouvant contenir des clés qui commencent par prefixe."""
    premiers = manifeste()["dictionnaires"][dico]["premiers"]
    i = max(0, bisect.bisect_right(premiers, prefixe) - 1)
    numeros = [i]
    while len(numeros) < MAX_FICHIERS and i + 1 < len(premiers) and premiers[i + 1].startswith(prefixe):
        i += 1
        numeros.append(i)
    return numeros


def charger(dico: str, numero: int, trace: Trace) -> list[list[str]]:
    nom = f"{dico}/{numero:04d}"
    if nom not in trace.fichiers:
        trace.fichiers.add(nom)
        trace.octets += manifeste()["dictionnaires"][dico]["tailles_gz"][numero]
    return lire_fichier(dico, numero)


def entrees(dico: str, prefixe: str, trace: Trace) -> list[list[str]]:
    """Lignes (tri, nom, langue, type, taxon, rang, scientifique, genre, famille, notoriété)."""
    trouvees = []
    for numero in fichiers_pour(dico, prefixe):
        for ligne in charger(dico, numero, trace):
            if ligne[0].startswith(prefixe):
                trouvees.append(ligne)
    return trouvees


def entrees_courtes(groupe: str, debut: str, trace: Trace) -> list[list[str]]:
    trouvees = []
    for numero in fichiers_pour("courts", groupe):
        for ligne in charger("courts", numero, trace):
            if ligne[0] == groupe and ligne[1].startswith(debut):
                trouvees.append(ligne[1:])
    return trouvees


def candidats(texte: str, trace: Trace) -> list[list[str]]:
    lignes: list[list[str]] = []
    q = normaliser(texte)
    if len(q) >= 3:
        lignes += entrees("noms", q, trace)[:MAX_CANDIDATS]
        if len(q) <= LONGUEUR_COURTE:
            lignes += entrees_courtes("n" + q[:3], q, trace)
    for langue in LANGUES:
        k = cle(texte, langue)
        if len(k.replace(" ", "")) < 3:
            continue
        tri = f"{langue}|{k}"
        lignes += entrees("cles", tri, trace)[:MAX_CANDIDATS]
        if len(k) <= LONGUEUR_COURTE:
            lignes += entrees_courtes("c" + tri[:6], tri, trace)
    return lignes


def rechercher(texte: str, limite: int = 5) -> tuple[list[Resultat], Trace]:
    trace = Trace()
    debut = time.perf_counter()
    meilleurs: dict[str, Resultat] = {}

    def noter(recherche: str, facteur: float, raison: str | None) -> None:
        for _tri, nom, langue, type_nom, taxon, rang, scientifique, genre, famille, notoriete in candidats(recherche, trace):
            points, raisons = score_nom(recherche, nom, langue, type_nom, cle(nom, langue))
            points = points * facteur + 2 * min(int(notoriete), 15)
            if raison:
                raisons = [*raisons, raison]
            if taxon not in meilleurs or points > meilleurs[taxon].score:
                meilleurs[taxon] = Resultat(taxon, scientifique, rang, genre or None, famille or None, nom, langue, points, raisons)

    noter(texte, 1.0, None)
    if not meilleurs:  # repli mot par mot, comme recherche.py
        for mot in normaliser(texte).split():
            if len(mot) >= 4:
                noter(mot, 0.6, f"mot « {mot} » seul")

    resultats = list(meilleurs.values())
    for r in resultats:
        if r.rang in ("genus", "family"):
            champ = "genre" if r.rang == "genus" else "famille"
            membres = sum(1 for autre in resultats if autre is not r and getattr(autre, champ) == r.nom_scientifique)
            if membres:
                r.score += BONUS_PAR_MEMBRE * min(membres, MEMBRES_MAX)
                r.raisons.append(f"{membres} membres trouvés")
    resultats.sort(key=lambda r: -r.score)
    trace.duree_ms = 1000 * (time.perf_counter() - debut)
    return resultats[:limite], trace


def main() -> None:
    for texte in sys.argv[1:] or ["boulot"]:
        lire_fichier.cache_clear()
        resultats, trace = rechercher(texte)
        print(f"« {texte} » : {len(trace.fichiers)} fichiers, {trace.octets / 1024:.0f} Ko compressés")
        for r in resultats:
            print(f"  {r.score:6.1f}  {r.nom_scientifique:32} {r.rang:8} « {r.nom_trouve} » ({r.langue}, {', '.join(r.raisons)})")


if __name__ == "__main__":
    main()
