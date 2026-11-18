"""Tests de la normalisation et des clés phonétiques : python -m unittest -v"""

import unittest

from phonetique import cle_en, cle_fr, cle_la, normaliser


class Normalisation(unittest.TestCase):
    def test_accents_majuscules_ligatures(self):
        self.assertEqual(normaliser("Chêne PÉDONCULÉ"), "chene pedoncule")
        self.assertEqual(normaliser("Cœur-de-bœuf"), "coeur de boeuf")
        self.assertEqual(normaliser("Hernandez's  Short-horned Lizard"), "hernandez s short horned lizard")
        self.assertEqual(normaliser("Zéna d’Hispaniola"), "zena d hispaniola")


class MemeSon(unittest.TestCase):
    """Chaque paire (tapé, nom réel) doit donner la même clé."""

    FR = [
        ("boulot", "bouleau"),
        ("chene", "chêne"),
        ("chênes", "chêne"),
        ("renar roux", "renard roux"),
        ("bouleau verruqueu", "bouleau verruqueux"),
        ("bouleau verukeux", "bouleau verruqueux"),
        ("ecureuil", "écureuil"),
        ("ekureuil", "écureuil"),
        ("sapain", "sapin"),
        ("pinçon", "pinson"),
        ("aigle royale", "aigle royal"),
        ("mesange charbonniere", "mésange charbonnière"),
        ("mezange charbonière", "mésange charbonnière"),
        ("coquelico", "coquelicot"),
        ("muget", "muguet"),
        ("rouge gorge", "rouge-gorge"),
        ("herisson", "hérisson"),
        ("erisson", "hérisson"),
        ("chevreuille", "chevreuil"),
        ("faucon pelerin", "faucon pèlerin"),
        ("lievre", "lièvre"),
        ("cerf", "serf"),
    ]
    EN = [
        ("birtch", "birch"),
        ("red focks", "red fox"),
        ("oke", "oak"),
        ("pedunculat oak", "pedunculate oak"),
        ("hedgehog", "hejhog"),
        ("nightingale", "nitingale"),
        ("squirel", "squirrel"),
        ("feasant", "pheasant"),
    ]
    LA = [
        ("Querkus robur", "Quercus robur"),
        ("Vulpes vulpes", "vulpes vulpes"),
        ("Betula pendulla", "Betula pendula"),
        ("Erinaceus europeus", "Erinaceus europaeus"),
        ("Fagus silvatica", "Fagus sylvatica"),
        ("Filadelfus", "Philadelphus"),
    ]

    def verifier(self, fonction, paires):
        for tape, reel in paires:
            with self.subTest(tape=tape, reel=reel):
                self.assertEqual(fonction(tape), fonction(reel))

    def test_francais(self):
        self.verifier(cle_fr, self.FR)

    def test_anglais(self):
        self.verifier(cle_en, self.EN)

    def test_latin(self):
        self.verifier(cle_la, self.LA)


class SonsDifferents(unittest.TestCase):
    """La clé ne doit pas tout confondre."""

    def test_francais(self):
        for a, b in [("bouleau", "boule"), ("chêne", "chien"), ("pin", "pain noir"), ("renard", "canard"), ("ours", "orme")]:
            with self.subTest(a=a, b=b):
                self.assertNotEqual(cle_fr(a), cle_fr(b))

    def test_anglais(self):
        for a, b in [("oak", "ash"), ("fox", "fish"), ("birch", "beech")]:
            with self.subTest(a=a, b=b):
                self.assertNotEqual(cle_en(a), cle_en(b))


if __name__ == "__main__":
    unittest.main()
