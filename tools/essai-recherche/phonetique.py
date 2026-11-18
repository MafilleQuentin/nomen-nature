"""Normalisation des noms et clés phonétiques (QUE-7).

But : retrouver un nom mal orthographié par son « son ».
« boulot » et « bouleau » donnent la même clé française, « bUlo ».

Trois clés, une par langue de nom, calculées à l'import pour chaque nom et, au moment
de la recherche, pour le texte tapé :
- cle_fr : règles de prononciation du français (eau → o, lettres finales muettes,
  nasales, ch, qu, ph…) ;
- cle_en : règles simplifiées de l'anglais, dans l'esprit de Metaphone (ph → f,
  ck → k, tch → ch…) ; chaque groupe de voyelles devient « a » : retirer les voyelles,
  comme Metaphone, confondait trop de mots courts (boulot, bluet, belut) ;
- cle_la : latin scientifique, très régulier (ae → e, y → i, ph → f, lettres doublées).

Les clés sont volontairement simples, sans dépendance, pour être réécrites telles
quelles en TypeScript dans le Worker : la clé de la recherche doit être calculée
exactement comme celle de l'import. Les majuscules dans une clé sont des sons
(A = an/en, O = on, I = in/un, U = ou, E = eu, X = ch, N = gn), pas des lettres.
"""

from __future__ import annotations

import re
import unicodedata

LIGATURES = {"œ": "oe", "Œ": "oe", "æ": "ae", "Æ": "ae", "ß": "ss"}
SEPARATEURS = re.compile(r"[\s\-‐‑–—'’`´.,;:/()\[\]\"«»×]+")


def normaliser(texte: str) -> str:
    """Minuscules, sans accents ni ligatures, ponctuation et traits d'union → espaces."""
    for ligature, remplacement in LIGATURES.items():
        texte = texte.replace(ligature, remplacement)
    texte = unicodedata.normalize("NFKD", texte)
    texte = "".join(c for c in texte if not unicodedata.combining(c))
    texte = SEPARATEURS.sub(" ", texte.lower())
    texte = re.sub(r"[^a-z0-9 ]", "", texte)
    return " ".join(texte.split())


def _sans_doubles(mot: str) -> str:
    return re.sub(r"(.)\1+", r"\1", mot)


# --- Français -------------------------------------------------------------------

VOYELLE = "aeiouyAEIOU"
REGLES_FR: list[tuple[str, str]] = [
    (r"eaux?$", "o"), (r"eau", "o"), (r"aux$", "o"), (r"au", "o"),
    (r"oeu|eu", "E"), (r"oe", "e"),
    (r"sch", "X"), (r"ch", "X"),
    (r"ph", "f"), (r"qu", "k"), (r"q", "k"), (r"ck", "k"),
    (r"gu(?=[eiy])", "g"), (r"ge(?=[aou])", "j"), (r"g(?=[eiy])", "j"), (r"gn", "N"),
    (r"c(?=[eiy])", "s"), (r"c", "k"), (r"ç", "s"),
    (r"ou", "U"), (r"oi", "wa"),
    (rf"(?:ain|ein|aim|eim|in|im|yn|ym|un|um)(?![{VOYELLE}nm])", "I"),
    (rf"(?:an|am|en|em)(?![{VOYELLE}nm])", "A"),
    (rf"(?:on|om)(?![{VOYELLE}nm])", "O"),
    (r"ai|ei|ay|ey", "e"), (r"(?:er|et|ez)$", "e"),
    (r"y", "i"), (r"h", ""), (r"w", "v"),
    (r"(?<=[aeiouyEU])s(?=[aeiouyEUAOI])", "z"),  # après une voyelle orale (mésange → z), pas après une nasale (pinson → s)
    (r"x(?!$)", "ks"),
]
FINALES_MUETTES_FR = re.compile(r"(?:e|[stdxzp])+$")


def _mot_fr(mot: str) -> str:
    if len(mot) <= 2:
        return mot
    for motif, remplacement in REGLES_FR:
        mot = re.sub(motif, remplacement, mot)
    if len(mot) > 2:
        mot = FINALES_MUETTES_FR.sub("", mot) or mot
    return _sans_doubles(mot)


def cle_fr(texte: str) -> str:
    texte = texte.replace("ç", "s").replace("Ç", "s")  # avant normaliser(), qui retirerait la cédille
    return " ".join(_mot_fr(m) for m in normaliser(texte).split())


# --- Anglais --------------------------------------------------------------------

REGLES_EN: list[tuple[str, object]] = [  # remplacement : texte ou fonction
    (r"^kn|^gn|^pn|^wr", lambda m: m.group(0)[1]),
    (r"tch", "X"), (r"sch", "sk"), (r"ch|sh", "X"),
    (r"ph", "f"), (r"th", "0"), (r"ck", "k"), (r"q", "k"),
    (r"c(?=[eiy])", "s"), (r"c", "k"),
    (r"dg(?=[eiy])", "j"), (r"g(?=[eiy])", "j"), (r"gh(?![aeiou])", ""),
    (r"x", "ks"), (r"z", "s"), (r"wh", "w"),
    (r"(?<=[aeiou])[wy](?![aeiou])", ""),
]


def _mot_en(mot: str) -> str:
    if len(mot) <= 2:
        return mot
    for motif, remplacement in REGLES_EN:
        mot = re.sub(motif, remplacement, mot)
    if len(mot) > 2:  # e final muet (oke, pedunculate)
        mot = re.sub(r"e$", "", mot)
    mot = mot[0] + mot[1:].replace("h", "")  # h muet sauf en première lettre
    mot = re.sub(r"[aeiouy]+", "a", mot)  # chaque groupe de voyelles devient « a » : on garde sa place
    return _sans_doubles(mot)


def cle_en(texte: str) -> str:
    return " ".join(_mot_en(m) for m in normaliser(texte).split())


# --- Latin ----------------------------------------------------------------------

REGLES_LA: list[tuple[str, str]] = [
    (r"ae|oe", "e"), (r"y", "i"), (r"ph", "f"), (r"th", "t"), (r"rh", "r"),
    (r"ch", "k"), (r"c", "k"), (r"q", "k"), (r"z", "s"), (r"j", "i"), (r"w", "v"), (r"h", ""),
]


def _mot_la(mot: str) -> str:
    for motif, remplacement in REGLES_LA:
        mot = re.sub(motif, remplacement, mot)
    return _sans_doubles(mot)


def cle_la(texte: str) -> str:
    return " ".join(_mot_la(m) for m in normaliser(texte).split())


CLES = {"fr": cle_fr, "en": cle_en, "la": cle_la}


def cle(texte: str, langue: str) -> str:
    return CLES[langue](texte)
