// Recherche (lot 5, QUE-27) : moteur traduit du lot 1, classement des espèces, suggestions.
// Sur le petit index d'exemple (tests/fixtures/donnees/recherche) et quelques cas fabriqués ;
// la qualité sur le vrai index est mesurée par tools/donnees/evaluer-recherche.ts.
import { describe, expect, it } from "vitest";
import { correction, chercherEspeces, noteEspece } from "../../src/lib/recherche/especes.ts";
import { bonusLangue, fichiersPour, rechercher, resumeDeLigne, scoreNom, type Resultat } from "../../src/lib/recherche/moteur.ts";
import { suggestion, texteValide } from "../../src/lib/recherche/suggestions.ts";
import { bonneReponse, CAS_LOT_1, fichesDisque, sourceDisque } from "../../tools/donnees/evaluer-recherche.ts";

const source = sourceDisque("tests/fixtures/donnees/recherche");
const fiches = fichesDisque("tests/fixtures/donnees/fiches");

const resultat = (r: Partial<Resultat>): Resultat => ({
  taxon: "X",
  scientifique: "Genus species",
  rang: "species",
  genre: "Genus",
  famille: "Familia",
  nomTrouve: "nom",
  langue: "fr",
  score: 50,
  raisons: [],
  ...r,
});

describe("moteur (traduit du lot 1)", () => {
  it("trouve les fichiers d'un début de clé par dichotomie, trois au plus", () => {
    const premiers = ["", "bou", "boul", "boula", "boule", "chene"];
    expect(fichiersPour(premiers, "boul")).toEqual([2, 3, 4]);
    expect(fichiersPour(premiers, "chat")).toEqual([4]);
    expect(fichiersPour(premiers, "a")).toEqual([0]);
  });

  it("note un nom comme au lot 1", () => {
    const bonus = bonusLangue("fr");
    expect(scoreNom("chene pedoncule", "chêne pédonculé", "fr", "courant", bonus)).toEqual({ points: 106, raisons: ["identique", "même son"] });
    expect(scoreNom("boulot", "bouleau", "fr", "courant", bonus).raisons).toEqual(["même son"]);
    expect(scoreNom("chene", "chêne pédonculé", "fr", "synonyme", bonus).points).toBeCloseTo(60 + 6 - 10 - 5);
  });

  it("lit les fichiers de l'index en même temps, sans changer les résultats", async () => {
    let enCours = 0;
    let auPlus = 0;
    const lente = {
      manifeste: source.manifeste,
      lire: async (dico: "noms" | "cles" | "courts", numero: number) => {
        enCours++;
        auPlus = Math.max(auPlus, enCours);
        await new Promise((ok) => setTimeout(ok, 5));
        enCours--;
        return source.lire(dico, numero);
      },
    };
    const attendus = await rechercher(source, "chene", "fr");
    expect(await rechercher(lente, "chene", "fr")).toEqual(attendus);
    expect(auPlus).toBeGreaterThan(1);
  });

  it("donne la priorité à la langue du site", () => {
    expect(bonusLangue("fr")).toEqual({ fr: 6, la: 4, en: 3 });
    expect(bonusLangue("en")).toEqual({ en: 6, la: 4, fr: 3 });
  });

  it("trouve le chêne pédonculé en français, en latin et avec une faute", async () => {
    for (const texte of ["chêne pédonculé", "chene pedoncule", "Quercus robur", "Querkus robur", "pedunculate oak"]) {
      const [premier] = await rechercher(source, texte, "fr");
      expect(premier?.scientifique, texte).toBe("Quercus robur");
    }
  });

  it("reconnaît les bonnes réponses du jeu de test, genre compris", () => {
    expect(CAS_LOT_1).toHaveLength(40);
    expect(bonneReponse({ scientifique: "Betula pendula", genre: "Betula" }, ["genre:Betula"])).toBe(true);
    expect(bonneReponse({ scientifique: "Sciurus (Sciurus) vulgaris", genre: "Sciurus" }, ["Sciurus vulgaris"])).toBe(true);
    expect(bonneReponse({ scientifique: "Alnus glutinosa", genre: "Alnus" }, ["genre:Betula"])).toBe(false);
  });
});

describe("espèces proposées", () => {
  it("ne corrige que si aucun nom ne correspond par l'écriture", () => {
    const parLeSon = resultat({ nomTrouve: "Bouleau", raisons: ["même son"] });
    expect(correction("boulot", [parLeSon])).toBe("Bouleau");
    expect(correction("boulot", [parLeSon, resultat({ raisons: ["début"] })])).toBe("");
    expect(correction("bouleau", [resultat({ nomTrouve: "Bouleau", raisons: ["même son"] })])).toBe("");
    expect(correction("x", [])).toBe("");
  });

  it("classe par ressemblance plafonnée, puis par observations", () => {
    const debut = resultat({ score: 70, raisons: ["début"] });
    const identique = resultat({ score: 106, raisons: ["identique"] });
    expect(noteEspece(debut, 0)).toBe(60);
    expect(noteEspece(identique, 0)).toBe(68);
    // Une espèce très observée passe devant un nom identique rare.
    expect(noteEspece(debut, 1_000_000)).toBeGreaterThan(noteEspece(identique, 100));
  });

  it("renvoie les espèces avec leur fiche, sans les genres", async () => {
    const { especes, correction: corrigee } = await chercherEspeces(source, "chene ped", "fr", fiches.ficheDe, 8, 60, fiches.especesDuGenre);
    expect(corrigee).toBe("");
    expect(especes.map((e) => e.fiche.adresse)).toEqual(["quercus-robur"]);
    const agrile = await chercherEspeces(source, "agrile bleuatre", "fr", fiches.ficheDe);
    expect(agrile.especes[0]?.fiche.nom).toBe("Agrilus cyanescens");
  });

  it("prépare les suggestions dans la langue du site", async () => {
    const [chene] = (await chercherEspeces(source, "pedunculate oak", "en", fiches.ficheDe)).especes;
    expect(chene && suggestion(chene, "en")).toMatchObject({
      nom: "English oak",
      latin: "Quercus robur",
      trouve: "Pedunculate oak",
      lien: "/en/species/quercus-robur",
      statut: "LC",
      libelleStatut: "Least Concern",
      groupe: "Trees",
    });
    const [memeNom] = (await chercherEspeces(source, "chene pedoncule", "fr", fiches.ficheDe)).especes;
    expect(memeNom && suggestion(memeNom, "fr").trouve).toBe("");
  });

  it("refuse les textes trop courts ou trop longs", () => {
    expect(texteValide("ch")).toBe(false);
    expect(texteValide("  c h  ")).toBe(false);
    expect(texteValide("che")).toBe(true);
    expect(texteValide("a".repeat(81))).toBe(false);
  });
});

describe("résumé des espèces dans l'index (sans lire les fiches)", () => {
  const ligne = ["chene pedoncule", "chêne pédonculé", "fr", "courant", "4R5YN", "species", "Quercus robur", "Quercus", "Fagaceae", "12", "quercus-robur", "1606550", "LC", "arbres", "chêne pédonculé", "English oak"];

  it("lit l'adresse, les observations, le statut et les noms principaux", () => {
    expect(resumeDeLigne(ligne)).toEqual({
      id: "4R5YN",
      adresse: "quercus-robur",
      nom: "Quercus robur",
      nomFr: "chêne pédonculé",
      nomEn: "English oak",
      uicn: "LC",
      groupe: "arbres",
      observations: 1606550,
      genre: "Quercus",
      famille: "Fagaceae",
    });
  });

  it("n'en trouve pas dans une ligne ancienne ou une ligne de genre", () => {
    expect(resumeDeLigne(ligne.slice(0, 10))).toBeUndefined();
    expect(resumeDeLigne(["quercus", "Quercus", "la", "accepte", "Q1", "genus", "Quercus", "", "Fagaceae", "3"])).toBeUndefined();
  });

  it("propose l'espèce sans demander sa fiche quand l'index la résume", async () => {
    const source = {
      manifeste: { extension: ".txt", dictionnaires: { noms: { premiers: [""] }, cles: { premiers: [""] }, courts: { premiers: [""] } } },
      lire: async (dico: string) => (dico === "noms" ? [ligne] : []),
    };
    let fichesLues = 0;
    const { especes } = await chercherEspeces(source, "chene pedoncule", "fr", async () => {
      fichesLues++;
      return undefined;
    });
    expect(fichesLues).toBe(0);
    expect(especes[0]?.fiche.adresse).toBe("quercus-robur");
  });
});

