// Panneau des espèces de la carte (lot 6, QUE-30) : choix lus dans l'adresse, puces des pays,
// onglets, groupes et lignes.
import { describe, expect, it } from "vitest";
import { adressePanneau, groupeAffiche, lignesPanneau, lireChoix, onglets, pucesGroupes, pucesPays, type Choix } from "../../src/lib/carte/panneau.ts";

const BASE = "/fr/continent/europe";
const choix = (c: Partial<Choix> = {}): Choix => ({ pays: "", onglet: "toutes", groupe: "", tousLesPays: false, ...c });

describe("choix du panneau", () => {
  it("lit le pays, l'onglet et le groupe, et ignore ce qui n'existe pas", () => {
    expect(lireChoix(new URLSearchParams("pays=CH&onglet=menacees"), ["ch", "fr"])).toEqual(choix({ pays: "ch", onglet: "menacees" }));
    expect(lireChoix(new URLSearchParams("pays=us&onglet=tout&groupe=dragons&tous=1"), ["ch"])).toEqual(choix({ tousLesPays: true }));
  });

  it("écrit l'adresse sans les choix par défaut", () => {
    expect(adressePanneau(BASE, choix())).toBe(BASE);
    expect(adressePanneau(BASE, choix({ pays: "ch", onglet: "groupes", groupe: "oiseaux" }))).toBe(`${BASE}?pays=ch&onglet=groupes&groupe=oiseaux`);
    // Le groupe ne compte que dans l'onglet « Par groupe ».
    expect(adressePanneau(BASE, choix({ onglet: "menacees", groupe: "oiseaux" }))).toBe(`${BASE}?onglet=menacees`);
  });
});

describe("puces et onglets", () => {
  const pays = ["fr", "de", "gb", "es", "it", "se", "ch", "li"].map((code, i) => ({ code, especes: 1000 - i * 10 }));

  it("montre les 6 pays les plus riches, puis « + N » ; le pays choisi reste visible", () => {
    const puces = pucesPays(pays, choix(), BASE, "fr");
    expect(puces.map((p) => p.libelle)).toEqual(["France", "Allemagne", "Royaume-Uni", "Espagne", "Italie", "Suède", "+ 2"]);
    expect(puces[6]?.lien).toBe(`${BASE}?tous=1`);
    const avecChoix = pucesPays(pays, choix({ pays: "li", onglet: "menacees" }), BASE, "fr");
    expect(avecChoix.map((p) => [p.libelle, p.actif])).toContainEqual(["Liechtenstein", true]);
    // Cliquer le pays choisi revient au continent, en gardant l'onglet.
    expect(avecChoix.find((p) => p.actif)?.lien).toBe(`${BASE}?onglet=menacees`);
  });

  it("garde le pays dans les onglets", () => {
    const [toutes, menacees] = onglets(choix({ pays: "ch" }), BASE, "en");
    expect(toutes).toEqual({ libelle: "All", lien: `${BASE}?pays=ch`, actif: true });
    expect(menacees?.lien).toBe(`${BASE}?pays=ch&onglet=menacees`);
  });

  it("montre le groupe le plus fourni d'abord, ou celui choisi", () => {
    const resume = { especes: 30, menacees: 2, groupes: { oiseaux: { especes: 10, menacees: 1 }, insectes: { especes: 20, menacees: 1 } } };
    expect(groupeAffiche(resume, choix({ onglet: "groupes" }))).toBe("insectes");
    expect(groupeAffiche(resume, choix({ onglet: "groupes", groupe: "oiseaux" }))).toBe("oiseaux");
    expect(pucesGroupes(resume, choix({ onglet: "groupes" }), BASE, "fr").map((p) => [p.libelle, p.actif])).toEqual([
      ["Insectes · 20", true],
      ["Oiseaux · 10", false],
    ]);
  });
});

describe("lignes du panneau", () => {
  it("prépare les espèces dans la langue du site et saute celles sans fiche", () => {
    const fichier = {
      colonnes: ["id", "nom", "nom_fr", "nom_en", "uicn", "score", "observations", "photo", "adresse", "groupe"],
      lignes: [
        ["1", "Anguilla anguilla", "anguille européenne", "European eel", "CR", 9, 1000, "", "anguilla-anguilla", "poissons"],
        ["2", "Sans fiche", "", "", "EN", 9, 10, "", "", "poissons"],
      ],
    };
    expect(lignesPanneau(fichier, "en")).toEqual([
      { nom: "European eel", latin: "Anguilla anguilla", meta: "Fish", uicn: "CR", lien: "/en/species/anguilla-anguilla" },
    ]);
  });
});
