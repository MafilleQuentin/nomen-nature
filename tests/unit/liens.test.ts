import { describe, expect, it } from "vitest";
import { langues } from "../../src/i18n/langues";
import { lien, traductions, type Page } from "../../src/lib/liens";

const pages: Page[] = [
  "accueil",
  "autourDeMoi",
  "identifier",
  "menacees",
  "recherche",
  "aPropos",
  "sources",
  "confidentialite",
  "mentionsLegales",
];

describe("table des adresses", () => {
  it("chaque adresse commence par sa langue et n'a pas de barre finale", () => {
    for (const page of pages) {
      for (const langue of langues) {
        const adresse = lien(page, langue);
        expect(adresse === `/${langue}` || adresse.startsWith(`/${langue}/`), adresse).toBe(true);
        expect(adresse.endsWith("/"), adresse).toBe(false);
      }
    }
  });

  it("deux pages n'ont jamais la même adresse", () => {
    const adresses = pages.flatMap((page) => langues.map((langue) => lien(page, langue)));
    expect(new Set(adresses).size).toBe(adresses.length);
  });

  it("adresses en minuscules, sans accent ni espace", () => {
    for (const page of pages) {
      for (const langue of langues) expect(lien(page, langue)).toMatch(/^\/[a-z0-9/-]+$/);
    }
  });

  it("la carte est l'accueil", () => {
    expect(lien("carte", "fr")).toBe("/fr");
    expect(lien("carte", "en")).toBe("/en");
  });

  it("traductions donne la page dans chaque langue", () => {
    expect(traductions("aPropos")).toEqual({ fr: "/fr/a-propos", en: "/en/about" });
  });
});
