import { describe, expect, it } from "vitest";
import { estLangue, langueDeLAdresse, langueDuNavigateur, langues } from "../../src/i18n/langues";

describe("langueDuNavigateur", () => {
  it.each([
    ["fr-FR,fr;q=0.9,en;q=0.8", "fr"],
    ["en-US,en;q=0.9", "en"],
    ["en-GB", "en"],
    ["EN-gb", "en"],
    ["de-DE,de;q=0.9,en;q=0.7", "en"],
    ["de-DE,de;q=0.9,fr;q=0.5,en;q=0.7", "en"],
    ["en;q=0.5,fr;q=0.8", "fr"],
    ["fr;q=0,en", "en"],
    ["fr, en", "fr"],
    ["*", "fr"],
    ["de-DE", "fr"],
    ["en;q=abc,fr;q=0.1", "fr"],
    ["", "fr"],
  ])("« %s » → %s", (entete, attendu) => {
    expect(langueDuNavigateur(entete)).toBe(attendu);
  });

  it("sans en-tête : français", () => {
    expect(langueDuNavigateur(null)).toBe("fr");
  });
});

describe("langueDeLAdresse", () => {
  it.each([
    ["/fr", "fr"],
    ["/en/about", "en"],
    ["/EN/about", "en"],
    ["/fr/dossier/page", "fr"],
    ["/", undefined],
    ["/design-system", undefined],
    ["/english", undefined],
    ["/de/seite", undefined],
  ])("%s → %s", (chemin, attendu) => {
    expect(langueDeLAdresse(chemin)).toBe(attendu);
  });
});

describe("estLangue", () => {
  it("reconnaît les langues du site et rien d'autre", () => {
    for (const langue of langues) expect(estLangue(langue)).toBe(true);
    expect(estLangue("de")).toBe(false);
    expect(estLangue(undefined)).toBe(false);
  });
});
