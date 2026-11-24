// Filtre « Où » de la page de résultats (lot 5, QUE-28) : lieu de l'adresse, lieux du visiteur
// (Cloudflare), zones des espèces, puces et filtre.
import { describe, expect, it } from "vitest";
import type { EspeceTrouvee } from "../../src/lib/recherche/especes.ts";
import { estObserveeA, lieuxDuVisiteur, lireLieu, MONDE, zonesDe } from "../../src/lib/recherche/lieux.ts";
import { adresseRecherche, filtrer, nomDuLieu, pucesLieu } from "../../src/lib/recherche/resultats.ts";

describe("lieux", () => {
  it("lit le lieu de l'adresse : pays, continent ou Monde", () => {
    expect(lireLieu("ch")).toEqual({ type: "pays", code: "CH" });
    expect(lireLieu("EUROPE")).toEqual({ type: "continent", code: "EUROPE" });
    expect(lireLieu(null)).toEqual(MONDE);
    for (const inconnu of ["XX", "ZZ", "suisse", "C1", "ATLANTIS"]) expect(lireLieu(inconnu)).toEqual(MONDE);
  });

  it("prend le pays et le continent du visiteur chez Cloudflare, sans les codes inconnus", () => {
    expect(lieuxDuVisiteur({ country: "CH", continent: "EU" })).toEqual([
      { type: "pays", code: "CH" },
      { type: "continent", code: "EUROPE" },
    ]);
    expect(lieuxDuVisiteur({ country: "XX", continent: "NA" })).toEqual([{ type: "continent", code: "NORTH_AMERICA" }]);
    expect(lieuxDuVisiteur({ country: "T1" })).toEqual([]);
    expect(lieuxDuVisiteur(undefined)).toEqual([]);
  });

  it("lit les zones d'une espèce et dit si elle a été observée dans un lieu", () => {
    const zones = zonesDe("AT CH FR|EUROPE ASIA");
    expect(estObserveeA(zones, { type: "pays", code: "CH" })).toBe(true);
    expect(estObserveeA(zones, { type: "pays", code: "US" })).toBe(false);
    expect(estObserveeA(zones, { type: "continent", code: "ASIA" })).toBe(true);
    expect(estObserveeA(zonesDe(undefined), MONDE)).toBe(true);
    expect(estObserveeA(zonesDe(undefined), { type: "continent", code: "EUROPE" })).toBe(false);
  });
});

describe("filtre « Où » de la page de résultats", () => {
  const espece = (id: string): EspeceTrouvee => ({
    rang: 0,
    fiche: {
      id,
      adresse: `genus-${id.toLowerCase()}`,
      nom: `Genus ${id}`,
      nomFr: "",
      nomEn: "",
      uicn: "LC",
      groupe: "insectes",
      observations: 0,
      genre: "Genus",
      famille: "",
    },
    resultat: { taxon: id, scientifique: `Genus ${id}`, rang: "species", genre: "Genus", famille: "", nomTrouve: "", langue: "fr", score: 50, raisons: [] },
  });
  const zones = new Map([
    ["A", zonesDe("CH FR|EUROPE")],
    ["B", zonesDe("US|NORTH_AMERICA")],
  ]);
  const especes = [espece("A"), espece("B"), espece("C")];

  it("garde les espèces observées dans le lieu choisi (pas celles sans zones)", () => {
    const ids = (lieu: string) => filtrer(especes, { groupe: "", menacees: false, lieu: lireLieu(lieu) }, zones).map((e) => e.fiche.id);
    expect(ids("CH")).toEqual(["A"]);
    expect(ids("NORTH_AMERICA")).toEqual(["B"]);
    expect(ids("")).toEqual(["A", "B", "C"]);
  });

  it("nomme les lieux dans la langue du site", () => {
    expect(nomDuLieu({ type: "pays", code: "CH" }, "fr")).toBe("Suisse");
    expect(nomDuLieu({ type: "pays", code: "CH" }, "en")).toBe("Switzerland");
    expect(nomDuLieu({ type: "continent", code: "NORTH_AMERICA" }, "fr")).toBe("Amérique du Nord");
    expect(nomDuLieu(MONDE, "en")).toBe("World");
  });

  it("propose Monde, le pays et le continent du visiteur, en gardant les autres filtres", () => {
    const visiteur = lieuxDuVisiteur({ country: "CH", continent: "EU" });
    const puces = pucesLieu({ groupe: "insectes", menacees: false, lieu: MONDE }, visiteur, "/fr/recherche", "agrile", "fr");
    expect(puces.map((p) => [p.libelle, p.actif])).toEqual([
      ["Monde", true],
      ["Suisse", false],
      ["Europe", false],
    ]);
    expect(puces[1]?.lien).toBe("/fr/recherche?q=agrile&groupe=insectes&lieu=CH");
  });

  it("ajoute le lieu d'un lien partagé s'il n'est pas celui du visiteur", () => {
    const puces = pucesLieu({ groupe: "", menacees: false, lieu: lireLieu("US") }, [], "/en/search", "oak", "en");
    expect(puces.map((p) => [p.libelle, p.actif])).toEqual([
      ["World", false],
      ["United States", true],
    ]);
    expect(adresseRecherche("/fr/recherche", "x", { lieu: MONDE })).toBe("/fr/recherche?q=x");
  });
});
