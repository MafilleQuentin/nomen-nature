// Courbes de niveau de la carte (lot 6, QUE-31) : lissage, niveaux et courbes sur une grille
// fabriquée (une « montagne » d'espèces autour d'un point).
import { describe, expect, it } from "vitest";
import { calculerCourbes, HAUTEUR_GRILLE, LARGEUR_GRILLE, lisser, niveaux, remplir } from "../../tools/carte/courbes.ts";

describe("courbes de niveau", () => {
  it("lisse sans perdre la quantité, en faisant le tour du monde en longitude", () => {
    const grille = new Float64Array(10 * 5);
    grille[2 * 10 + 0] = 100; // bord ouest : déborde à l'est
    const lisse = lisser(grille, 10, 5, 1);
    expect(lisse.reduce((a, b) => a + b, 0)).toBeGreaterThan(90);
    expect(lisse[2 * 10 + 9]).toBeGreaterThan(0);
    expect(lisse[2 * 10 + 5]).toBeLessThan(lisse[2 * 10 + 9] ?? 0);
  });

  it("répartit les niveaux régulièrement en logarithme, à partir de 10 espèces", () => {
    const n = niveaux(4, 10, 4); // jusqu'à 10 000 espèces
    expect(n).toHaveLength(4);
    expect(Math.round(10 ** (n[0] ?? 0) - 1)).toBe(10);
    expect((n[2] ?? 0) - (n[1] ?? 0)).toBeCloseTo((n[1] ?? 0) - (n[0] ?? 0));
  });

  it("remplit les cases vides avec leurs voisines, de proche en proche", () => {
    const grille = new Float64Array([0, 0, 4, 0, 0, 0]);
    expect(Array.from(remplir(grille, 6, 1))).toEqual([4, 4, 4, 4, 4, 4]);
  });

  it("trace des courbes fermées autour d'un point riche, projetées sur la carte, une maîtresse sur quatre", () => {
    const grille = new Float64Array(LARGEUR_GRILLE * HAUTEUR_GRILLE);
    // Autour de 46°N 8°E (la Suisse) : jusqu'à 20 000 espèces au centre.
    for (let dy = -6; dy <= 6; dy++) {
      for (let dx = -6; dx <= 6; dx++) {
        grille[(89 - 46 + dy) * LARGEUR_GRILLE + (8 + 180 + dx)] = 20_000 / (1 + dx * dx + dy * dy);
      }
    }
    const { niveaux: seuils, courbes } = calculerCourbes(grille);
    expect(seuils).toHaveLength(16);
    expect(seuils[0]).toBe(10);
    expect(courbes.filter((c) => c.maitresse)).toHaveLength(4);
    // La courbe la plus haute entoure le sommet : autour de la Suisse dans le plan de la carte
    // (Equal Earth : x ≈ 523, y ≈ 105 sur 1 000 × 487).
    const sommet = courbes.at(-1)?.anneaux[0] ?? [];
    expect(sommet.length).toBeGreaterThan(3);
    for (const [x, y] of sommet) {
      expect(Math.abs(x - 523)).toBeLessThan(30);
      expect(Math.abs(y - 105)).toBeLessThan(30);
    }
  });
});
