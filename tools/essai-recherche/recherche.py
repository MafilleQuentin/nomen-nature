"""Fonction de recherche de l'essai (QUE-8) : trigrammes + clé phonétique + tri.

Deux sources de candidats, puis un score par nom, et chaque taxon garde son meilleur nom :
1. l'index par trigrammes (sous-chaîne, sans accents) : « chene pedonc », « Quercus rob » ;
2. la clé phonétique de chaque langue, par début de clé : « boulot », « mezange », « birtch ».

Les requêtes SQL sont celles que lancera le Worker sur D1 ; le score est calculé à côté
(en Python ici, en TypeScript plus tard). On garde la trace des requêtes pour QUE-9.

Usage : python -X utf8 recherche.py "boulot"
"""

from __future__ import annotations

import sqlite3
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

from phonetique import cle, normaliser

BASE = Path(__file__).parent / "data" / "essai.sqlite"
LANGUES = ("fr", "la", "en")
BONUS_LANGUE = {"fr": 6, "la": 4, "en": 3}  # site affiché en français
# Une ressemblance de son vaut moins en anglais : la clé anglaise est plus large que les autres.
POINTS_MEME_SON = {"fr": 70, "la": 70, "en": 55}
POINTS_DEBUT_SON = {"fr": 35, "la": 35, "en": 25}
BONUS_PAR_MEMBRE = 15  # un genre ou une famille dont plusieurs membres ressortent remonte
MEMBRES_MAX = 3
CANDIDATS_TRIGRAMMES = 200
CANDIDATS_CLE = 100


@dataclass
class Resultat:
    taxon_id: str
    nom_scientifique: str
    rang: str
    genre: str | None
    famille: str | None
    nom_trouve: str
    langue: str
    score: float
    raisons: list[str] = field(default_factory=list)


@dataclass
class Trace:
    requetes: list[tuple[str, tuple]] = field(default_factory=list)
    duree_ms: float = 0.0


def _executer(base: sqlite3.Connection, trace: Trace, sql: str, parametres: tuple) -> list[tuple]:
    trace.requetes.append((sql, parametres))
    return base.execute(sql, parametres).fetchall()


def candidats(base: sqlite3.Connection, texte: str, trace: Trace) -> dict[int, tuple]:
    """Noms candidats : id -> (taxon_id, nom, langue, type, cle)."""
    trouves: dict[int, tuple] = {}
    q = normaliser(texte)
    if len(q) >= 3:  # un trigramme demande au moins 3 caractères
        phrase = '"' + q.replace('"', "") + '"'
        lignes = _executer(
            base, trace,
            "SELECT n.id, n.taxon_id, n.nom, n.langue, n.type, n.cle FROM nom_fts "
            "JOIN nom n ON n.id = nom_fts.rowid WHERE nom_fts MATCH ? ORDER BY rank LIMIT ?",
            (phrase, CANDIDATS_TRIGRAMMES),
        )
        for identifiant, *reste in lignes:
            trouves[identifiant] = tuple(reste)
    for langue in LANGUES:
        k = cle(texte, langue)
        if len(k.replace(" ", "")) < 3:  # clé trop courte : trop de réponses
            continue
        lignes = _executer(
            base, trace,
            "SELECT id, taxon_id, nom, langue, type, cle FROM nom "
            "WHERE langue = ? AND cle >= ? AND cle < ? || '~' ORDER BY length(cle) LIMIT ?",
            (langue, k, k, CANDIDATS_CLE),
        )
        for identifiant, *reste in lignes:
            trouves[identifiant] = tuple(reste)
    return trouves


def score_nom(texte: str, nom: str, langue: str, type_nom: str, cle_nom: str) -> tuple[float, list[str]]:
    q, n = normaliser(texte), normaliser(nom)
    k = cle(texte, langue)
    points, raisons = 0.0, []
    if n == q:
        points, raisons = 100, ["identique"]
    elif n.startswith(q):
        points, raisons = 60, ["début"]
    elif f" {q}" in f" {n}":
        points, raisons = 40, ["début de mot"]
    if cle_nom == k:
        points, raisons = max(points, POINTS_MEME_SON[langue]), raisons + ["même son"]
    elif k and cle_nom.startswith(k):
        points, raisons = max(points, POINTS_DEBUT_SON[langue]), raisons + ["début du son"]
    if not raisons:
        points, raisons = 15, ["morceau"]
    points += BONUS_LANGUE[langue]
    if type_nom == "synonyme":
        points -= 10
    points -= 0.5 * max(0, len(n) - len(q))  # préférer les noms courts, plus proches du texte tapé
    return points, raisons


def rechercher(base: sqlite3.Connection, texte: str, limite: int = 5) -> tuple[list[Resultat], Trace]:
    trace = Trace()
    debut = time.perf_counter()
    meilleurs: dict[str, tuple[float, str, str, list[str]]] = {}

    def noter(recherche: str, facteur: float, raison: str | None) -> None:
        for taxon_id, nom, langue, type_nom, cle_nom in candidats(base, recherche, trace).values():
            points, raisons = score_nom(recherche, nom, langue, type_nom, cle_nom)
            points *= facteur
            if raison:
                raisons = [*raisons, raison]
            if taxon_id not in meilleurs or points > meilleurs[taxon_id][0]:
                meilleurs[taxon_id] = (points, nom, langue, raisons)

    noter(texte, 1.0, None)
    # Repli : rien trouvé pour la phrase entière (« cèpe de bordeaux », alors que les données
    # ne connaissent que « Cèpe ») → on cherche chaque mot d'au moins 4 lettres, avec moins de points.
    if not meilleurs:
        for mot in normaliser(texte).split():
            if len(mot) >= 4:
                noter(mot, 0.6, f"mot « {mot} » seul")
    if not meilleurs:
        trace.duree_ms = 1000 * (time.perf_counter() - debut)
        return [], trace

    # Notoriété : nombre de noms courants (fr + en) du taxon. Faute de mieux dans l'essai,
    # elle remplace le score « bien documentée » du lot 3 (photo, Wikipédia, observations).
    ids = list(meilleurs)
    marques = ",".join("?" * len(ids))
    notoriete = dict(_executer(
        base, trace,
        f"SELECT taxon_id, count(*) FROM nom WHERE taxon_id IN ({marques}) AND type = 'courant' GROUP BY taxon_id",
        tuple(ids),
    ))
    infos = {t[0]: t[1:] for t in _executer(
        base, trace,
        f"SELECT id, nom_scientifique, rang, genre, famille FROM taxon WHERE id IN ({marques})",
        tuple(ids),
    )}
    resultats = []
    for taxon_id, (points, nom, langue, raisons) in meilleurs.items():
        bonus = 2 * min(notoriete.get(taxon_id, 0), 15)
        nom_scientifique, rang, genre, famille = infos[taxon_id]
        resultats.append(Resultat(taxon_id, nom_scientifique, rang, genre, famille, nom, langue, points + bonus, raisons))

    # Regroupement : « bouleau » est posé sur plusieurs espèces de Betula ; c'est le genre
    # qu'on cherchait. Un genre (ou une famille) gagne des points pour chacun de ses membres trouvés.
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
    base = sqlite3.connect(BASE)
    for texte in sys.argv[1:] or ["boulot"]:
        resultats, trace = rechercher(base, texte)
        print(f"« {texte} » ({trace.duree_ms:.0f} ms, {len(trace.requetes)} requêtes)")
        for r in resultats:
            print(f"  {r.score:6.1f}  {r.nom_scientifique:32} {r.rang:8} « {r.nom_trouve} » ({r.langue}, {', '.join(r.raisons)})")


if __name__ == "__main__":
    main()
