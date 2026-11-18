"""Jeu de recherches de test et mesure de la qualité (QUE-8).

Chaque cas : le texte tapé, ce qu'il teste, et les taxons acceptés comme bonne réponse.
« genre:Betula » accepte le genre Betula ou n'importe laquelle de ses espèces.
Un cas est réussi si une bonne réponse sort dans les 5 premiers résultats.

En cas d'échec, on regarde si la bonne réponse a seulement un nom proche dans les
données : sinon, c'est la donnée qui manque, pas la recherche qui se trompe.

Usage : python -X utf8 evaluer.py [--details]
"""

from __future__ import annotations

import re
import sqlite3
import sys
from pathlib import Path

from recherche import BASE, rechercher

# (texte tapé, catégorie, bonnes réponses)
CAS: list[tuple[str, str, list[str]]] = [
    # Français : nom exact, sans accents, fautes de son
    ("chêne pédonculé", "fr exact", ["Quercus robur"]),
    ("chene pedoncule", "fr sans accents", ["Quercus robur"]),
    ("bouleau", "fr exact (genre)", ["genre:Betula"]),
    ("boulot", "fr faute de son", ["genre:Betula"]),
    ("bouleau verruqueux", "fr exact", ["Betula pendula"]),
    ("bouleau verukeux", "fr faute de son", ["Betula pendula"]),
    ("renard roux", "fr exact", ["Vulpes vulpes"]),
    ("renar", "fr faute de son", ["genre:Vulpes"]),
    ("écureuil roux", "fr exact", ["Sciurus vulgaris"]),
    ("ecureuil", "fr sans accents", ["Sciuridae", "genre:Sciurus"]),
    ("mésange charbonnière", "fr exact", ["Parus major"]),
    ("mezange charboniere", "fr faute de son", ["Parus major"]),
    ("rouge gorge", "fr sans trait d'union", ["Erithacus rubecula"]),
    ("herisson", "fr sans accents", ["genre:Erinaceus", "Erinaceidae"]),
    ("coquelico", "fr faute de son", ["Papaver rhoeas"]),
    ("muget", "fr faute de son", ["Convallaria majalis"]),
    ("pissenlit", "fr exact (genre)", ["genre:Taraxacum"]),
    ("amanite tue mouche", "fr sans trait d'union", ["Amanita muscaria"]),
    ("cèpe de bordeaux", "fr exact", ["Boletus edulis"]),
    ("lynx", "fr exact", ["genre:Lynx"]),
    ("loup gris", "fr exact", ["Canis lupus"]),
    ("abeille domestique", "fr exact", ["Apis mellifera"]),
    ("coccinelle a sept points", "fr sans accents", ["Coccinella septempunctata"]),
    # Anglais
    ("red fox", "en exact", ["Vulpes vulpes"]),
    ("silver birch", "en exact", ["Betula pendula"]),
    ("birtch", "en faute de son", ["genre:Betula"]),
    ("pedunculate oak", "en exact", ["Quercus robur"]),
    ("honey bee", "en exact", ["Apis mellifera", "genre:Apis"]),
    ("hedgehog", "en exact", ["genre:Erinaceus", "Erinaceidae"]),
    ("fly agaric", "en exact", ["Amanita muscaria"]),
    # Latin
    ("Quercus robur", "latin exact", ["Quercus robur"]),
    ("Querkus robur", "latin faute de son", ["Quercus robur"]),
    ("Vulpes vulpes", "latin exact", ["Vulpes vulpes"]),
    ("Quercus pedunculata", "latin synonyme", ["Quercus robur"]),
    ("Betula pendula", "latin exact", ["Betula pendula"]),
    # Début de mot (autocomplétion)
    ("Quercus rob", "autocomplétion", ["Quercus robur"]),
    ("mesange ch", "autocomplétion", ["Parus major"]),
    ("ecureuil r", "autocomplétion", ["Sciurus vulgaris"]),
    ("pissen", "autocomplétion", ["genre:Taraxacum"]),
    ("Vulpes v", "autocomplétion", ["Vulpes vulpes"]),
]

SOUS_GENRE = re.compile(r"\s*\([^)]*\)")


def sans_sous_genre(nom: str | None) -> str:
    return SOUS_GENRE.sub("", nom or "").strip()


def bonne_reponse(resultat, attendus: list[str]) -> bool:
    nom = sans_sous_genre(resultat.nom_scientifique)
    for attendu in attendus:
        if attendu.startswith("genre:"):
            genre = attendu.split(":", 1)[1]
            if nom == genre or sans_sous_genre(resultat.genre) == genre:
                return True
        elif nom == attendu:
            return True
    return False


def noms_dans_les_donnees(base: sqlite3.Connection, attendus: list[str]) -> list[str]:
    """Les noms courants fr/en des bonnes réponses, pour comprendre un échec."""
    noms = []
    for attendu in attendus:
        cible = attendu.split(":", 1)[-1]
        lignes = base.execute(
            "SELECT n.nom, n.langue FROM taxon t JOIN nom n ON n.taxon_id = t.id "
            "WHERE t.nom_scientifique = ? AND n.type = 'courant' AND n.langue IN ('fr', 'en') LIMIT 6",
            (cible,),
        ).fetchall()
        noms += [f"{nom} ({langue})" for nom, langue in lignes]
    return noms


def main() -> None:
    details = "--details" in sys.argv
    base = sqlite3.connect(BASE)
    reussis, durees, lignes = 0, [], []
    par_categorie: dict[str, list[bool]] = {}
    for texte, categorie, attendus in CAS:
        resultats, trace = rechercher(base, texte, limite=5)
        rang = next((i for i, r in enumerate(resultats, 1) if bonne_reponse(r, attendus)), None)
        ok = rang is not None
        reussis += ok
        durees.append(trace.duree_ms)
        par_categorie.setdefault(categorie.split(" (")[0], []).append(ok)
        premier = resultats[0].nom_scientifique if resultats else "—"
        lignes.append(f"| {'✅' if ok else '❌'} | « {texte} » | {categorie} | {rang or '—'} | {premier} | {trace.duree_ms:.0f} ms |")
        if details or not ok:
            print(f"\n{'OK ' if ok else 'ÉCHEC'} « {texte} » → attendu {attendus}")
            for i, r in enumerate(resultats, 1):
                print(f"   {i}. {r.score:6.1f} {r.nom_scientifique:32} {r.rang:8} « {r.nom_trouve} » ({r.langue})")
            if not ok:
                print(f"   noms dans les données : {noms_dans_les_donnees(base, attendus) or 'aucun nom courant fr/en'}")

    print("\n| | Recherche | Ce qu'elle teste | Rang | Premier résultat | Durée |")
    print("|---|---|---|---|---|---|")
    print("\n".join(lignes))
    print(f"\n**Score : {reussis}/{len(CAS)}** ({100 * reussis / len(CAS):.0f} %) dans les 5 premiers résultats.")
    durees.sort()
    print(f"Durée (SQLite local) : médiane {durees[len(durees) // 2]:.0f} ms, max {durees[-1]:.0f} ms.")
    print("\nPar catégorie :")
    for categorie, resultats_cat in sorted(par_categorie.items()):
        print(f"- {categorie} : {sum(resultats_cat)}/{len(resultats_cat)}")


if __name__ == "__main__":
    main()
