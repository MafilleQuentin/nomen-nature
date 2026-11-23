// Outils de l'import mensuel (tools/donnees) : lecture d'une archive zip sans tout extraire,
// lecture des TSV du Catalogue of Life, nettoyage des noms courants.
import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { lignesTsv, nettoyer } from "../../tools/donnees/col.ts";
import { choisirUicn } from "../../tools/donnees/gbif.ts";
import { lireRequete } from "../../tools/donnees/gbif-sql.ts";
import { entrees, ouvrirParNom, sourceLocale } from "../../tools/donnees/zip.ts";

const ARCHIVE = "tests/unit/fixtures/exemple.zip"; // créée avec le module zipfile de Python

async function texte(flux: Readable): Promise<string> {
  const morceaux: Buffer[] = [];
  for await (const morceau of flux) morceaux.push(Buffer.from(morceau));
  return Buffer.concat(morceaux).toString("utf8");
}

describe("lecture d'une archive zip", () => {
  it("liste les fichiers et leurs tailles", async () => {
    const liste = await entrees(await sourceLocale(ARCHIVE));
    expect(liste.map((e) => [e.nom, e.methode, e.tailleDecompressee])).toEqual([
      ["compresse.tsv", 8, 2550],
      ["stocke.txt", 0, 7],
      ["zip64.txt", 0, 13],
    ]);
  });

  it("lit un fichier compressé (deflate)", async () => {
    const { flux } = await ouvrirParNom(await sourceLocale(ARCHIVE), "compresse.tsv");
    const contenu = await texte(flux);
    expect(contenu).toHaveLength(2550);
    expect(contenu.startsWith("col:ID\tcol:name\nA1\tQuercus robur\n")).toBe(true);
  });

  it("lit un fichier stocké tel quel, et un en-tête zip64", async () => {
    const source = await sourceLocale(ARCHIVE);
    expect(await texte((await ouvrirParNom(source, "stocke.txt")).flux)).toBe("bonjour");
    expect(await texte((await ouvrirParNom(source, /zip64/)).flux)).toBe("grand fichier");
  });

  it("signale un fichier absent", async () => {
    await expect(ouvrirParNom(await sourceLocale(ARCHIVE), "absent.tsv")).rejects.toThrow("absent");
  });
});

describe("TSV du Catalogue of Life", () => {
  it("nomme les colonnes sans les préfixes col: et clb:", async () => {
    const flux = Readable.from(["col:ID\tcol:scientificName\tclb:taxGroup\n4R5YN\tQuercus robur\tangiosperms\n"]);
    const lignes = [];
    for await (const ligne of lignesTsv(flux)) lignes.push(ligne);
    expect(lignes).toEqual([{ ID: "4R5YN", scientificName: "Quercus robur", taxGroup: "angiosperms" }]);
  });
});

describe("nettoyage des noms courants", () => {
  it.each([
    ['"Bébête coco" (créole réunionais)', "Bébête coco"],
    ["  Chêne   pédonculé ", "Chêne pédonculé"],
    ["Mésange bleue,", "Mésange bleue"],
    ["Renard roux", "Renard roux"],
  ])("« %s » → « %s »", (brut, propre) => {
    expect(nettoyer(brut)).toBe(propre);
  });
});

describe("statut UICN d'une espèce (règle de la note Données)", () => {
  const statuts = (paires: [string, number][]) => new Map(paires);
  it.each([
    ["un statut évalué l'emporte sur NE, même moins observé", [["NE", 5000], ["LC", 3]], "LC"],
    ["un statut évalué l'emporte sur l'absence de statut", [["", 100], ["VU", 1]], "VU"],
    ["entre deux statuts évalués, le plus observé", [["LC", 10], ["NT", 50]], "NT"],
    ["sans statut évalué : NE", [["NE", 7]], "NE"],
    ["aucun statut du tout : NE", [["", 7]], "NE"],
  ] as [string, [string, number][], string][])("%s", (_cas, paires, attendu) => {
    expect(choisirUicn(statuts(paires))).toBe(attendu);
  });
});

describe("requêtes SQL envoyées à GBIF", () => {
  it("sont mises sur une seule ligne, sans commentaires", () => {
    const sql = lireRequete("tools/donnees/requetes/especes-par-pays.sql");
    expect(sql).not.toContain("\n");
    expect(sql).toMatch(/^SELECT countrycode, specieskey, COUNT\(\*\) AS observations FROM occurrence WHERE /);
    expect(sql).toContain("occurrencestatus = 'DETECTED'");
  });
});
