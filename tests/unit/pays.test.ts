// Pages des pays (lot 7, QUE-32) : adresses, continent, carte de situation et espèces.
import { describe, expect, it } from "vitest";
import { adresseChoixPays, especesDuPays, lireChoixPays, pucesGroupesPays, pucesTri, MAX_CARTES } from "../../src/lib/carte/especes-pays.ts";
import regions from "../fixtures/donnees/listes/regions.json";
import {
  adressePays,
  centreDuPays,
  continentDuPays,
  coordonneesPays,
  enAdresse,
  estPays,
  paysDeLAdresse,
  situationDuPays,
  vueDeSituation,
} from "../../src/lib/carte/pays.ts";

const CODES = Object.keys(regions)
  .filter((cle) => cle.startsWith("pays/"))
  .map((cle) => cle.slice("pays/".length));

describe("adresses des pays", () => {
  it("écrit les noms sans accents ni espaces", () => {
    expect(enAdresse("Côte d’Ivoire")).toBe("cote-d-ivoire");
    expect(adressePays("ch", "fr")).toBe("suisse");
    expect(adressePays("ch", "en")).toBe("switzerland");
    expect(adressePays("us", "fr")).toBe("etats-unis");
  });

  it("donne une adresse différente à chacun des pays des listes, dans les deux langues", () => {
    const pays = CODES.filter(estPays);
    expect(pays.length).toBeGreaterThan(240);
    for (const langue of ["fr", "en"] as const) {
      const adresses = pays.map((c) => adressePays(c, langue));
      expect(new Set(adresses).size).toBe(adresses.length);
    }
  });

  it("retrouve le pays d'une adresse, et rien pour une adresse inconnue ou « xz »", () => {
    expect(paysDeLAdresse("suisse", "fr", CODES)).toBe("ch");
    expect(paysDeLAdresse("switzerland", "en", CODES)).toBe("ch");
    expect(paysDeLAdresse("suisse", "en", CODES)).toBeUndefined();
    expect(paysDeLAdresse("atlantide", "fr", CODES)).toBeUndefined();
    expect(estPays("xz")).toBe(false);
  });
});

describe("continent et position", () => {
  it("donne le continent de Natural Earth, ou celui des territoires", () => {
    expect(continentDuPays("ch")).toBe("EUROPE");
    expect(continentDuPays("ru")).toBe("EUROPE");
    expect(continentDuPays("gf")).toBe("SOUTH_AMERICA");
    expect(continentDuPays("re")).toBe("AFRICA");
    expect(CODES.filter((c) => c !== "xz" && !continentDuPays(c))).toEqual([]);
  });

  it("écrit les coordonnées avec deux décimales", () => {
    expect(coordonneesPays([8.23, 46.8])).toBe("46.80°N 8.23°E");
    expect(coordonneesPays([-58.5, -34.6])).toBe("34.60°S 58.50°W");
    expect(centreDuPays("gf")).toBeUndefined();
  });
});

describe("carte de situation", () => {
  it("centre la vue sur le pays, aux proportions de la maquette", () => {
    const [x, y, l, h] = vueDeSituation([100, 50, 10, 5], 200);
    expect(l / h).toBeCloseTo(460 / 300, 1);
    expect(x + l / 2).toBeCloseTo(105, 0);
    expect(y + h / 2).toBeCloseTo(52.5, 0);
    expect(l).toBeGreaterThanOrEqual(30);
    // Un tout petit pays : au moins 4 % de la largeur du continent.
    expect(vueDeSituation([100, 50, 0.1, 0.1], 200)[2]).toBeGreaterThanOrEqual(8);
  });

  it("montre la Suisse et ses grands voisins, nommés au milieu de leur partie visible", () => {
    const situation = situationDuPays("ch");
    expect(situation).toBeDefined();
    const codes = situation?.pays.map((p) => p.code) ?? [];
    expect(codes).toEqual(expect.arrayContaining(["CH", "FR", "DE", "IT", "AT"]));
    expect(situation?.pays.filter((p) => p.choisi).map((p) => p.code)).toEqual(["CH"]);
    const [vx, vy, vl, vh] = situation?.vue ?? [0, 0, 0, 0];
    for (const p of situation?.pays ?? []) {
      expect(p.etiquette[0]).toBeGreaterThanOrEqual(vx);
      expect(p.etiquette[0]).toBeLessThanOrEqual(vx + vl);
      expect(p.etiquette[1]).toBeGreaterThanOrEqual(vy);
      expect(p.etiquette[1]).toBeLessThanOrEqual(vy + vh);
    }
    // Les territoires sans forme dans Natural Earth n'ont pas de carte.
    expect(situationDuPays("gf")).toBeUndefined();
  });
});

describe("espèces de la page", () => {
  const BASE = "/fr/pays/suisse";

  it("lit le groupe, le tri et le nombre de cartes, ramené à un palier permis", () => {
    expect(lireChoixPays(new URLSearchParams(""))).toEqual({ groupe: "", tri: "menacees", nombre: 8 });
    expect(lireChoixPays(new URLSearchParams("groupe=oiseaux&tri=observees&n=32"))).toEqual({ groupe: "oiseaux", tri: "observees", nombre: 32 });
    expect(lireChoixPays(new URLSearchParams("groupe=dragons&tri=hasard&n=30"))).toEqual({ groupe: "", tri: "menacees", nombre: 32 });
    expect(lireChoixPays(new URLSearchParams("n=100000")).nombre).toBe(MAX_CARTES);
    expect(lireChoixPays(new URLSearchParams("n=-5")).nombre).toBe(8);
  });

  it("écrit l'adresse sans les choix par défaut", () => {
    expect(adresseChoixPays(BASE, { groupe: "", tri: "menacees", nombre: 8 })).toBe(BASE);
    expect(adresseChoixPays(BASE, { groupe: "oiseaux", tri: "observees", nombre: 32 })).toBe(`${BASE}?groupe=oiseaux&tri=observees&n=32`);
  });

  const colonnes = ["id", "nom", "nom_fr", "nom_en", "uicn", "score", "observations", "photo", "adresse", "groupe"];
  const menacees = {
    colonnes,
    lignes: [
      ["2", "B", "", "", "EN", 5, 10, "", "b", "oiseaux"],
      ["1", "A", "", "", "CR", 5, 5, "", "a", "poissons"],
    ],
  };
  const toutes = {
    colonnes,
    lignes: [
      ["3", "C", "", "", "LC", 9, 1000, "c.jpg", "c", "fleurs"],
      ["4", "D", "", "", "NT", 9, 50, "", "d", "fleurs"],
      ["2", "B", "", "", "EN", 5, 10, "", "b", "oiseaux"],
      ["5", "Sans fiche", "", "", "CR", 9, 50, "", "", "fleurs"],
    ],
  };

  it("met les menacées d'abord (CR, EN, VU, NT, puis les autres), sans doublon ni espèce sans fiche", () => {
    expect(especesDuPays([menacees, toutes], "menacees").map((e) => `${e.nom}:${e.uicn}`)).toEqual(["A:CR", "B:EN", "D:NT", "C:LC"]);
  });

  it("ou les plus observées d'abord", () => {
    const especes = especesDuPays([menacees, toutes], "observees");
    expect(especes.map((e) => e.nom)).toEqual(["C", "D", "B", "A"]);
    expect(especes[0]).toMatchObject({ adresse: "c", photo: "c.jpg", groupe: "fleurs", observations: 1000 });
  });

  it("propose « Tous les groupes » puis les groupes présents, dans l'ordre du site", () => {
    const resume = {
      especes: 30,
      menacees: 2,
      groupes: { insectes: { especes: 20, menacees: 1 }, oiseaux: { especes: 10, menacees: 1 }, reptiles: { especes: 0, menacees: 0 } },
    };
    const puces = pucesGroupesPays(resume, { groupe: "oiseaux", tri: "observees", nombre: 32 }, BASE, "fr");
    expect(puces.map((p) => [p.libelle, p.actif])).toEqual([
      ["Tous les groupes", false],
      ["Oiseaux", true],
      ["Insectes", false],
    ]);
    // Changer de groupe garde le tri et revient aux premières cartes.
    expect(puces[2]?.lien).toBe(`${BASE}?groupe=insectes&tri=observees`);
    expect(pucesTri({ groupe: "oiseaux", tri: "menacees", nombre: 32 }, BASE, "en").map((p) => [p.libelle, p.lien])).toEqual([
      ["threatened first", `${BASE}?groupe=oiseaux`],
      ["most observed", `${BASE}?groupe=oiseaux&tri=observees`],
    ]);
  });
});
