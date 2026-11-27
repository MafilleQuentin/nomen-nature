// Fiche espèce (lot 4, QUE-22) : adresses et fichiers de fiches, choix des espèces proches,
// lecture d'un fichier, mise en forme (statut, chiffres, « Sais-tu ? », résumé).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  adresseAvecIdentifiant,
  adresseEspece,
  estAdresseEspece,
  fichierDeLAdresse,
  NOMBRE_FICHIERS,
} from "../../src/lib/especes/adresse.ts";
import {
  couperResume,
  descripteur,
  listeDesManques,
  majuscule,
  manques,
  nomAffiche,
  nomFrancais,
  nombreCourt,
  phraseSaisTu,
  statutAffiche,
} from "../../src/lib/especes/affichage.ts";
import { cheminDuFichier, trouverFiche, type FichierFiches } from "../../src/lib/especes/fiche.ts";
import { lienEspece, traductionsEspece } from "../../src/lib/liens.ts";
import { arrondir, attribuerAdresses, nombreQlever, proches } from "../../tools/donnees/fiches.ts";

describe("adresse d'une fiche", () => {
  it("vient du nom latin, en minuscules et sans accents", () => {
    expect(adresseEspece("Quercus robur")).toBe("quercus-robur");
    expect(adresseEspece("Abies × borisii-regis")).toBe("abies-x-borisii-regis");
    expect(adresseEspece("Pieris napi bryoniæ")).toBe("pieris-napi-bryoniae");
    expect(adresseEspece("Phylloscopus collybità")).toBe("phylloscopus-collybita");
    expect(adresseAvecIdentifiant("Morus alba", "4X7QZ")).toBe("morus-alba-4x7qz");
  });

  it("refuse ce qui ne peut pas être une adresse", () => {
    expect(estAdresseEspece("quercus-robur")).toBe(true);
    expect(estAdresseEspece("quercus")).toBe(false);
    expect(estAdresseEspece("Quercus-robur")).toBe(false);
    expect(estAdresseEspece("quercus--robur")).toBe(false);
    expect(estAdresseEspece("../etc")).toBe(false);
  });

  it("donne le même fichier pour tout un genre, entre 0 et NOMBRE_FICHIERS − 1", () => {
    const n = fichierDeLAdresse("quercus-robur");
    expect(fichierDeLAdresse("quercus-petraea")).toBe(n);
    expect(fichierDeLAdresse("quercus-robur-4r5yn")).toBe(n);
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThan(NOMBRE_FICHIERS);
    // Valeur figée : changer le calcul obligerait à reconstruire tous les fichiers.
    expect(n).toBe(301);
    expect(cheminDuFichier("quercus-robur")).toBe("/donnees/fiches/301.json");
  });

  it("se traduit : /fr/espece/… et /en/species/…", () => {
    expect(lienEspece("quercus-robur", "fr")).toBe("/fr/espece/quercus-robur");
    expect(traductionsEspece("quercus-robur")).toEqual({ fr: "/fr/espece/quercus-robur", en: "/en/species/quercus-robur" });
  });
});

describe("import des fiches", () => {
  it("départage les homonymes : la plus observée garde l'adresse simple", () => {
    const adresses = attribuerAdresses([
      { id: "AAA1", nom: "Morus alba", observations: 10 },
      { id: "BBB2", nom: "Morus alba", observations: 500 },
      { id: "CCC3", nom: "Morus nigra", observations: 3 },
    ]);
    expect(adresses.get("BBB2")).toBe("morus-alba");
    expect(adresses.get("AAA1")).toBe("morus-alba-aaa1");
    expect(adresses.get("CCC3")).toBe("morus-nigra");
  });

  it("choisit les espèces proches dans le genre, puis dans la famille", () => {
    const e = { id: "a", genre: "Quercus" };
    const genre = [e, { id: "b", genre: "Quercus" }];
    const famille = [
      { id: "a", genre: "Quercus" },
      { id: "b", genre: "Quercus" },
      { id: "c", genre: "Fagus" },
      { id: "d", genre: "Castanea" },
      { id: "e", genre: "Fagus" },
      { id: "f", genre: "Fagus" },
    ];
    expect(proches(e, genre, famille)).toEqual(["b", "c", "d", "e"]);
    expect(proches(e, [e], [])).toEqual([]);
  });

  it("lit les nombres de QLever et les arrondit", () => {
    expect(nombreQlever('"12.5"^^<http://www.w3.org/2001/XMLSchema#decimal>')).toBe(12.5);
    expect(nombreQlever("0.00134")).toBe(0.00134);
    expect(nombreQlever("")).toBeUndefined();
    expect(nombreQlever("-3")).toBeUndefined();
    expect(arrondir(29_307_600_000 / 31_557_600)).toBe(929);
    expect(arrondir(0.045678)).toBe(0.0457);
  });
});

describe("lecture d'un fichier de fiches", () => {
  const fichier = JSON.parse(readFileSync("tests/fixtures/donnees/fiches/301.json", "utf8")) as FichierFiches;

  it("trouve la fiche et ses espèces proches", () => {
    const trouvee = trouverFiche(fichier, "quercus-robur");
    expect(trouvee?.fiche).toMatchObject({ nom: "Quercus robur", nomFr: "chêne pédonculé", uicn: "LC", groupe: "arbres", famille: "Fagaceae" });
    expect(trouvee?.fiche.faits.longevite).toBe(929);
    expect(trouvee?.proches).toHaveLength(4);
    expect(trouvee?.proches[0]?.adresse).toMatch(/^quercus-/);
  });

  it("ne trouve pas une adresse absente", () => {
    expect(trouverFiche(fichier, "quercus-inexistant")).toBeUndefined();
  });
});

describe("mise en forme", () => {
  it("affiche la catégorie UICN, CD devient NT", () => {
    expect(statutAffiche("LC")).toBe("LC");
    expect(statutAffiche("CD")).toBe("NT");
    expect(statutAffiche("ex")).toBe("EX");
    expect(statutAffiche("")).toBe("NE");
    expect(statutAffiche("LR/lc")).toBe("NE");
  });

  it("met le nom courant en titre, sinon le nom latin", () => {
    const fiche = { nom: "Quercus robur", nomFr: "chêne pédonculé", nomEn: "" };
    expect(nomAffiche(fiche, "fr")).toBe("Chêne pédonculé");
    expect(nomAffiche(fiche, "en")).toBe("Quercus robur");
    expect(majuscule("")).toBe("");
  });

  it("remet en forme les noms français écrits à l'anglaise (lot 7)", () => {
    expect(nomFrancais("L'Anguille Européenne")).toBe("L'anguille européenne");
    expect(nomFrancais("Rouge-Gorge Familier")).toBe("Rouge-gorge familier");
    expect(nomFrancais("Bouleau á papier")).toBe("Bouleau à papier");
    // Un nom propre dans un nom bien écrit est gardé.
    expect(nomFrancais("Pic de Bonaparte")).toBe("Pic de Bonaparte");
    expect(nomFrancais("Mésange charbonnière")).toBe("Mésange charbonnière");
    expect(nomFrancais("pinson des arbres")).toBe("pinson des arbres");
    expect(nomFrancais("Compère De Guinée")).toBe("Compère de Guinée");
    expect(nomFrancais("Vanneau d'Abyssinie")).toBe("Vanneau d'Abyssinie");
    expect(nomFrancais("lilas Josika")).toBe("lilas Josika");
    expect(nomFrancais("Agrion Rougeâtre de l'Est")).toBe("Agrion Rougeâtre de l'Est");
    expect(nomAffiche({ nom: "Anguilla anguilla", nomFr: "L'Anguille Européenne", nomEn: "European Eel" }, "fr")).toBe("L'anguille européenne");
    expect(nomAffiche({ nom: "Anguilla anguilla", nomFr: "L'Anguille Européenne", nomEn: "European Eel" }, "en")).toBe("European Eel");
  });

  it("raccourcit les grands nombres", () => {
    expect(nombreCourt(97, "fr")).toBe("97");
    expect(nombreCourt(2340, "fr")).toBe("2 340");
    expect(nombreCourt(1_606_550, "fr")).toBe("1,6 M");
    expect(nombreCourt(1_606_550, "en")).toBe("1.6M");
  });

  it("écrit la phrase « Sais-tu ? » à partir des faits", () => {
    expect(phraseSaisTu({}, "fr")).toBe("");
    expect(phraseSaisTu({ longevite: 929 }, "fr")).toBe("Cette espèce peut vivre jusqu'à 929 ans.");
    expect(phraseSaisTu({ longevite: 25, masse: 4.5, envergure: 2.8 }, "fr")).toBe(
      "Cette espèce peut vivre jusqu'à 25 ans, peser jusqu'à 4,5 kg et atteindre 2,8 m d'envergure.",
    );
    expect(phraseSaisTu({ taille: 0.012, masse: 0.0013 }, "en")).toBe("This species can grow up to 1.2 cm and weigh up to 1.3 g.");
    expect(phraseSaisTu({ longevite: 0.5 }, "fr")).toBe("Cette espèce peut vivre jusqu'à 6 mois.");
  });

  it("coupe le résumé à la fin d'une phrase", () => {
    const texte = "Première phrase. Deuxième phrase un peu plus longue. Troisième.";
    expect(couperResume(texte, 40)).toBe("Première phrase.");
    expect(couperResume(texte, 500)).toBe(texte);
    expect(couperResume("Un mot puis encore des mots sans point final", 20)).toBe("Un mot puis encore…");
  });
});

describe("fiche courte (QUE-23)", () => {
  const complete = { nomFr: "chêne pédonculé", nomEn: "English oak", photo: "Chene.jpg" };

  it("relève ce qui manque : nom courant de la langue, article, photo", () => {
    expect(manques(complete, "fr", true)).toEqual([]);
    expect(manques({ ...complete, nomEn: "" }, "fr", true)).toEqual([]);
    expect(manques({ ...complete, nomEn: "" }, "en", true)).toEqual(["nom"]);
    expect(manques({ nomFr: "", nomEn: "", photo: "" }, "fr", false)).toEqual(["nom", "description", "photo"]);
  });

  it("le dit en une phrase, comme la maquette", () => {
    expect(listeDesManques(["nom", "description", "photo"], "fr")).toBe("pas de nom français, pas de description ni de photo libre");
    expect(listeDesManques(["description", "photo"], "fr")).toBe("pas de description ni de photo libre");
    expect(listeDesManques(["photo"], "fr")).toBe("pas de photo libre");
    expect(listeDesManques(["nom", "photo"], "en")).toBe("no English name or free photo");
  });

  it("décrit l'espèce par son groupe et sa famille", () => {
    expect(descripteur({ groupe: "insectes", famille: "Buprestidae" }, "fr")).toBe("insecte de la famille des Buprestidae");
    expect(descripteur({ groupe: "", famille: "Lumbricidae" }, "en")).toBe("species of the family Lumbricidae");
    expect(descripteur({ groupe: "insectes", famille: "" }, "fr")).toBe("");
  });
});
