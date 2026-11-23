// Tests de la normalisation et des clés phonétiques : les mêmes paires que le lot 1
// (tools/essai-recherche/test_phonetique.py), qui doivent rester vraies en TypeScript.
import { describe, expect, it } from "vitest";
import { cle, cleEn, cleFr, cleLa, normaliser } from "../../src/lib/recherche/phonetique";

describe("normaliser", () => {
  it.each([
    ["Chêne PÉDONCULÉ", "chene pedoncule"],
    ["Cœur-de-bœuf", "coeur de boeuf"],
    ["Hernandez's  Short-horned Lizard", "hernandez s short horned lizard"],
    ["Zéna d’Hispaniola", "zena d hispaniola"],
  ])("« %s » → « %s »", (texte, attendu) => {
    expect(normaliser(texte)).toBe(attendu);
  });
});

describe("même son, même clé (tapé ↔ nom réel)", () => {
  it.each([
    ["boulot", "bouleau"],
    ["chene", "chêne"],
    ["chênes", "chêne"],
    ["renar roux", "renard roux"],
    ["bouleau verruqueu", "bouleau verruqueux"],
    ["bouleau verukeux", "bouleau verruqueux"],
    ["ecureuil", "écureuil"],
    ["ekureuil", "écureuil"],
    ["sapain", "sapin"],
    ["pinçon", "pinson"],
    ["aigle royale", "aigle royal"],
    ["mesange charbonniere", "mésange charbonnière"],
    ["mezange charbonière", "mésange charbonnière"],
    ["coquelico", "coquelicot"],
    ["muget", "muguet"],
    ["rouge gorge", "rouge-gorge"],
    ["herisson", "hérisson"],
    ["erisson", "hérisson"],
    ["chevreuille", "chevreuil"],
    ["faucon pelerin", "faucon pèlerin"],
    ["lievre", "lièvre"],
    ["cerf", "serf"],
  ])("français : « %s » ≈ « %s »", (tape, reel) => {
    expect(cleFr(tape)).toBe(cleFr(reel));
  });

  it.each([
    ["birtch", "birch"],
    ["red focks", "red fox"],
    ["oke", "oak"],
    ["pedunculat oak", "pedunculate oak"],
    ["hedgehog", "hejhog"],
    ["nightingale", "nitingale"],
    ["squirel", "squirrel"],
    ["feasant", "pheasant"],
  ])("anglais : « %s » ≈ « %s »", (tape, reel) => {
    expect(cleEn(tape)).toBe(cleEn(reel));
  });

  it.each([
    ["Querkus robur", "Quercus robur"],
    ["Vulpes vulpes", "vulpes vulpes"],
    ["Betula pendulla", "Betula pendula"],
    ["Erinaceus europeus", "Erinaceus europaeus"],
    ["Fagus silvatica", "Fagus sylvatica"],
    ["Filadelfus", "Philadelphus"],
  ])("latin : « %s » ≈ « %s »", (tape, reel) => {
    expect(cleLa(tape)).toBe(cleLa(reel));
  });
});

describe("sons différents, clés différentes", () => {
  it.each([
    ["bouleau", "boule"],
    ["chêne", "chien"],
    ["pin", "pain noir"],
    ["renard", "canard"],
    ["ours", "orme"],
  ])("français : « %s » ≠ « %s »", (a, b) => {
    expect(cleFr(a)).not.toBe(cleFr(b));
  });

  it.each([
    ["oak", "ash"],
    ["fox", "fish"],
    ["birch", "beech"],
  ])("anglais : « %s » ≠ « %s »", (a, b) => {
    expect(cleEn(a)).not.toBe(cleEn(b));
  });
});

describe("valeurs exactes (identiques à Python)", () => {
  it("clés de référence", () => {
    expect(cle("bouleau", "fr")).toBe("bUlo");
    expect(cle("Chêne pédonculé", "fr")).toBe("Xen pedOkul");
    expect(cle("pheasant", "en")).toBe("fasant");
    expect(cle("Quercus robur", "la")).toBe("kuerkus robur");
  });
});
