// Carte interactive (lot 6, QUE-29 ; la carte des fiches est dans carte.test.ts) : géométrie de l'outil (simplification, découpe, chemins),
// continents (adresses, rattachement des terres lointaines) et choix des étiquettes.
import { describe, expect, it } from "vitest";
import { CONTINENTS, continentDeLAdresse, coordonnees } from "../../src/lib/carte/continents.ts";
import { choisirEtiquettes } from "../../src/lib/carte/etiquettes.ts";
import { lienContinent } from "../../src/lib/liens.ts";
import { chemin, decouper, simplifier, simplifierAnneau } from "../../tools/carte/geometrie.ts";
import { continentDuMorceau, vueDuContinent } from "../../tools/carte/pays.ts";

describe("géométrie de la carte", () => {
  it("simplifie une ligne en gardant les points qui comptent", () => {
    const ligne: [number, number][] = [
      [0, 0],
      [1, 0.01],
      [2, 0],
      [3, 2],
      [4, 0],
    ];
    expect(simplifier(ligne, 0.1)).toEqual([
      [0, 0],
      [2, 0],
      [3, 2],
      [4, 0],
    ]);
  });

  it("abandonne un anneau devenu trop petit", () => {
    expect(
      simplifierAnneau(
        [
          [0, 0],
          [0.01, 0],
          [0, 0.01],
        ],
        1,
      ),
    ).toBeUndefined();
  });

  it("découpe un anneau par un rectangle", () => {
    const carre: [number, number][] = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
    const coupe = decouper(carre, [0, 0, 5, 5]);
    expect(coupe).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]);
    expect(decouper(carre, [10, 10, 1, 1])).toBeUndefined();
  });

  it("écrit un chemin compact en dixièmes d'unité, en déplacements relatifs", () => {
    expect(
      chemin([
        [
          [1, 2],
          [1.5, 2],
          [1.5, 1.2],
        ],
      ]),
    ).toBe("M10 20l5 0 0-8z");
  });
});

describe("continents", () => {
  it("trouve un continent par son adresse dans chaque langue", () => {
    expect(continentDeLAdresse("amerique-du-nord", "fr")?.code).toBe("NORTH_AMERICA");
    expect(continentDeLAdresse("north-america", "en")?.code).toBe("NORTH_AMERICA");
    expect(continentDeLAdresse("north-america", "fr")).toBeUndefined();
    expect(lienContinent(CONTINENTS.SOUTH_AMERICA.adresse, "fr")).toBe("/fr/continent/amerique-du-sud");
  });

  it("écrit la position du surtitre comme la maquette", () => {
    expect(coordonnees(CONTINENTS.EUROPE.centre)).toBe("52°N 15°E");
    expect(coordonnees(CONTINENTS.SOUTH_AMERICA.centre)).toBe("15°S 60°W");
  });

  it("rattache les terres lointaines au continent où elles sont", () => {
    expect(continentDuMorceau([2, 47], "EUROPE")).toBe("EUROPE"); // France métropolitaine
    expect(continentDuMorceau([-53, 4], "EUROPE")).toBe("SOUTH_AMERICA"); // Guyane
    expect(continentDuMorceau([55.5, -21], "EUROPE")).toBe("AFRICA"); // La Réunion
    expect(continentDuMorceau([95, 62], "EUROPE")).toBe("ASIA"); // Sibérie
    expect(continentDuMorceau([-18, 65], "EUROPE")).toBe("EUROPE"); // Islande, aussi dans la zone de l'Amérique du Nord
  });

  it("cadre un continent aux proportions de la carte", () => {
    const [, , largeur, hauteur] = vueDuContinent(CONTINENTS.EUROPE.vue);
    expect(largeur / hauteur).toBeGreaterThanOrEqual(625 / 490 - 0.01);
    expect(largeur / hauteur).toBeLessThanOrEqual(2);
  });
});

describe("étiquettes des pays", () => {
  const vue: [number, number, number, number] = [0, 0, 100, 100];

  it("garde les pays les plus importants sans chevauchement", () => {
    const etiquettes = choisirEtiquettes(
      [
        { code: "DE", nom: "ALLEMAGNE", point: [50, 50], rang: 2 },
        { code: "LU", nom: "LUXEMBOURG", point: [52, 51], rang: 5 },
        { code: "FR", nom: "FRANCE", point: [20, 70], rang: 2 },
      ],
      vue,
      4,
    );
    expect(etiquettes.map((e) => e.code)).toEqual(["DE", "FR"]);
  });

  it("saute une étiquette qui sortirait de la carte, et s'arrête au maximum", () => {
    const loin = choisirEtiquettes([{ code: "RU", nom: "RUSSIE", point: [99, 50], rang: 1 }], vue, 4);
    expect(loin).toEqual([]);
    const beaucoup = Array.from({ length: 20 }, (_, i) => ({
      code: `P${i}`,
      nom: "X",
      point: [5 + (i % 5) * 20, 5 + Math.floor(i / 5) * 20] as [number, number],
      rang: i,
    }));
    expect(choisirEtiquettes(beaucoup, vue, 2, 14)).toHaveLength(14);
  });
});
