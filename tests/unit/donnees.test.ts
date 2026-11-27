// Outils de l'import mensuel (tools/donnees) : lecture d'une archive zip sans tout extraire,
// lecture des TSV du Catalogue of Life, nettoyage des noms courants.
import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { classification, lignesTsv, nettoyer, type Usage } from "../../tools/donnees/col.ts";
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

describe("construction de l'index de recherche", async () => {
  const { mkdtempSync, readFileSync, readdirSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { debutsCourts, ecrireDictionnaire, PAR_PREFIXE_COURT } = await import("../../tools/donnees/index-recherche.ts");
  const entree = (tri: string, notoriete = 0) => ({ tri, ligne: `${tri}\tnom`, notoriete });

  it("débuts courts : les plus connus d'abord, puis les plus courts, 30 au plus", () => {
    const entrees = [entree("chenille", 1), entree("chene", 5), entree("chevreuil", 5), entree("ch"), ...Array.from({ length: 40 }, (_, i) => entree(`che${i}`))];
    const courts = debutsCourts(entrees, "n", 3);
    expect(courts).toHaveLength(PAR_PREFIXE_COURT);
    expect(courts.slice(0, 3).map((c) => c.ligne)).toEqual(["nche\tchene\tnom", "nche\tchevreuil\tnom", "nche\tchenille\tnom"]);
    expect(courts[0]?.tri).toBe("nche\t001");
  });

  it("découpe en fichiers triés, sans couper une même clé, et note la première clé", () => {
    const dossier = mkdtempSync(join(tmpdir(), "index-"));
    const entrees = [entree("b"), entree("a"), ...Array.from({ length: 5 }, () => entree("c")), entree("d")];
    // Lignes de 6 octets, cible de 5 : un fichier par clé, mais les 5 lignes « c » restent ensemble.
    const d = ecrireDictionnaire(entrees, dossier, 5);
    expect(d.premiers).toEqual(["a", "b", "c", "d"]);
    expect(readdirSync(dossier)).toEqual(["0000.txt", "0001.txt", "0002.txt", "0003.txt"]);
    expect(readFileSync(join(dossier, "0002.txt"), "utf8").split("\n").filter(Boolean)).toHaveLength(5);
    expect(d.tailles_gz).toHaveLength(4);
  });
});

describe("les 13 groupes courants (QUE-19)", async () => {
  const { groupe } = await import("../../tools/donnees/groupes.ts");
  const c = (regne: string, embranchement: string, classe: string, ordre = "") => ({ regne, embranchement, classe, ordre });
  it.each([
    ["renard roux", c("Animalia", "Chordata", "Mammalia", "Carnivora"), "", "mammiferes"],
    ["mésange", c("Animalia", "Chordata", "Aves", "Passeriformes"), "", "oiseaux"],
    ["lézard", c("Animalia", "Chordata", "Reptilia", "Squamata"), "", "reptiles"],
    ["grenouille", c("Animalia", "Chordata", "Amphibia", "Anura"), "", "amphibiens"],
    ["truite", c("Animalia", "Chordata", "Teleostei", "Salmoniformes"), "", "poissons"],
    ["requin", c("Animalia", "Chordata", "Elasmobranchii", "Lamniformes"), "", "poissons"],
    ["cœlacanthe (sans classe)", c("Animalia", "Chordata", "", "Coelacanthiformes"), "", "poissons"],
    ["coccinelle", c("Animalia", "Arthropoda", "Insecta", "Coleoptera"), "", "insectes"],
    ["épeire", c("Animalia", "Arthropoda", "Arachnida", "Araneae"), "", "araignees"],
    ["escargot", c("Animalia", "Mollusca", "Gastropoda", "Stylommatophora"), "", "mollusques"],
    ["amanite", c("Fungi", "Basidiomycota", "Agaricomycetes", "Agaricales"), "", "champignons"],
    ["chêne", c("Plantae", "Tracheophyta", "Magnoliopsida", "Fagales"), "tree", "arbres"],
    ["noisetier", c("Plantae", "Tracheophyta", "Magnoliopsida", "Fagales"), "shrub or tree", "arbres"],
    ["pin", c("Plantae", "Tracheophyta", "Pinopsida", "Pinales"), "tree", "arbres"],
    ["coquelicot", c("Plantae", "Tracheophyta", "Magnoliopsida", "Ranunculales"), "annual", "fleurs"],
    ["plante à fleurs sans forme connue", c("Plantae", "Tracheophyta", "Liliopsida", "Poales"), "", "fleurs"],
    ["fougère aigle", c("Plantae", "Tracheophyta", "Polypodiopsida", "Polypodiales"), "perennial", "fougeres"],
    ["lycopode", c("Plantae", "Tracheophyta", "Lycopodiopsida", "Lycopodiales"), "", "fougeres"],
    ["sphaigne", c("Plantae", "Bryophyta", "Sphagnopsida", "Sphagnales"), "", "mousses"],
    ["hépatique", c("Plantae", "Marchantiophyta", "Marchantiopsida", "Marchantiales"), "", "mousses"],
  ] as const)("%s → %s", (_nom, classification, forme, attendu) => {
    expect(groupe(classification, forme)).toBe(attendu);
  });

  it.each([
    ["crabe", c("Animalia", "Arthropoda", "Malacostraca", "Decapoda")],
    ["acarien (pas une araignée)", c("Animalia", "Arthropoda", "Arachnida", "Trombidiformes")],
    ["méduse", c("Animalia", "Cnidaria", "Scyphozoa", "Semaeostomeae")],
    ["algue rouge", c("Plantae", "Rhodophyta", "Florideophyceae", "Ceramiales")],
    ["genévrier rampant (conifère non arbre)", c("Plantae", "Tracheophyta", "Pinopsida", "Pinales")],
  ] as const)("%s → aucun groupe", (_nom, classification) => {
    expect(groupe(classification, "shrub")).toBeUndefined();
  });
});

describe("score « bien documentée » (QUE-20)", async () => {
  const { bienDocumentee, cellule, fichierCommons, score } = await import("../../tools/donnees/score.ts");
  const doc = (photo: boolean, nomFrancais: boolean, wikipedia: "fr" | "en" | "", observations: number) => ({ photo, nomFrancais, wikipedia, observations });

  it.each([
    ["chêne pédonculé : tout, très observé", doc(true, true, "fr", 1_606_550), 10, true],
    ["photo, nom, article anglais seulement", doc(true, true, "en", 500), 7, true],
    ["photo seule, observée 1 000 fois", doc(true, false, "", 1_000), 4, false],
    ["article anglais, 99 999 observations", doc(false, false, "en", 99_999), 2, false],
    ["rien, 999 observations", doc(false, false, "", 999), 0, false],
    ["nom français sans photo ni article", doc(false, true, "", 50), 3, false],
  ] as const)("%s → %i", (_cas, d, attendu, bien) => {
    expect(score(d)).toBe(attendu);
    expect(bienDocumentee(d)).toBe(bien);
  });

  it("lit les cellules de QLever et le nom du fichier Commons", () => {
    expect(cellule('"4R5YN"')).toBe("4R5YN");
    expect(cellule("<http://www.wikidata.org/entity/Q165145>")).toBe("http://www.wikidata.org/entity/Q165145");
    expect(fichierCommons("http://commons.wikimedia.org/wiki/Special:FilePath/Paprastasis%20azuolas.JPG")).toBe("Paprastasis azuolas.JPG");
    expect(fichierCommons("")).toBe("");
  });
});

describe("listes par pays et par continent (QUE-21)", async () => {
  const { menaceesDAbord, selectionner } = await import("../../tools/donnees/listes.ts");
  const c = (id: string, score: number, observations: number, uicn = "LC") => ({ id, score, observations, uicn });

  it("trie par score, puis par observations dans la région", () => {
    const liste = selectionner([c("a", 3, 10), c("b", 10, 5), c("c", 3, 500), c("d", 10, 50)]);
    expect(liste.map((x) => x.id)).toEqual(["d", "b", "c", "a"]);
  });

  it("garde les N premières, plus les menacées au-delà", () => {
    const liste = selectionner([c("a", 9, 10), c("b", 8, 10), c("c", 7, 10), c("menacee", 0, 5, "EN"), c("d", 6, 10), c("quasi", 0, 5, "NT")], 3);
    expect(liste.map((x) => x.id)).toEqual(["a", "b", "c", "menacee"]);
  });

  it("au-delà, garde au plus les N premières menacées : les plus graves, puis les plus observées (lot 7)", () => {
    const liste = selectionner([c("a", 9, 10), c("vu", 0, 900, "VU"), c("cr", 0, 1, "CR"), c("en", 0, 5, "EN")], 1, 2);
    // La VU, pourtant plus observée, est laissée ; l'ordre reste celui du classement (observations).
    expect(liste.map((x) => x.id)).toEqual(["a", "en", "cr"]);
  });

  it("liste les menacées du panneau : CR, puis EN, puis VU, les plus observées d'abord (lot 6)", () => {
    const liste = menaceesDAbord([c("vu", 9, 900, "VU"), c("en-peu", 9, 5, "EN"), c("lc", 9, 9000), c("cr", 1, 1, "CR"), c("en-beaucoup", 1, 50, "EN")], 4);
    expect(liste.map((x) => x.id)).toEqual(["cr", "en-beaucoup", "en-peu", "vu"]);
  });
});

describe("nom français principal", async () => {
  const { nomPrincipal } = await import("../../tools/donnees/score.ts");
  it("préfère le nom qui correspond au titre de l'article Wikipédia", () => {
    expect(nomPrincipal(["Casseron", "Seiche commune"], "Seiche_commune")).toBe("Seiche commune");
    expect(nomPrincipal(["La Decticelle trompeuse", "Decticelle trompeuse"], "Decticelle_trompeuse")).toBe("Decticelle trompeuse");
    expect(nomPrincipal(["moule comestible", "moule commune"], "Moule_commune_(mollusque)")).toBe("moule commune");
  });
  it("garde le premier nom si aucun ne correspond, et rien s'il n'y en a pas", () => {
    expect(nomPrincipal(["fayard", "hêtre"], "Hêtre_commun")).toBe("fayard");
    expect(nomPrincipal(["renard roux"], "")).toBe("renard roux");
    expect(nomPrincipal([], "Quercus_robur")).toBe("");
  });
});

describe("classification du Catalogue of Life, par les parents", () => {
  // Règne > embranchement > classe > ordre > famille > sous-famille > « genre » mal rangé > genre.
  const usages = new Map<string, Usage>([
    ["K", { parent: "", rang: "kingdom", nom: "Animalia" }],
    ["P", { parent: "K", rang: "phylum", nom: "Chordata" }],
    ["C", { parent: "P", rang: "class", nom: "Teleostei" }],
    ["O", { parent: "C", rang: "order", nom: "Clupeiformes" }],
    ["F", { parent: "O", rang: "family", nom: "Dorosomatidae" }],
    ["SF", { parent: "F", rang: "", nom: "" }],
    ["G1", { parent: "SF", rang: "genus", nom: "Pellonulinae" }],
    ["G2", { parent: "G1", rang: "genus", nom: "Congothrissa" }],
  ]);

  it("remonte jusqu'au règne ; le rang le plus proche l'emporte", () => {
    expect(classification("G2", usages)).toEqual(["Animalia", "Chordata", "Teleostei", "Clupeiformes", "Dorosomatidae", "Congothrissa"]);
    expect(classification("SF", usages)).toEqual(["Animalia", "Chordata", "Teleostei", "Clupeiformes", "Dorosomatidae", ""]);
  });

  it("partage les classifications déjà vues, et s'arrête sur un parent inconnu ou une boucle", () => {
    const memoire = new Map<string, string[]>();
    classification("G2", usages, memoire);
    expect(memoire.get("F")).toEqual(["Animalia", "Chordata", "Teleostei", "Clupeiformes", "Dorosomatidae", ""]);
    expect(classification("inconnu", usages)).toEqual(["", "", "", "", "", ""]);
    const boucle = new Map<string, Usage>([
      ["A", { parent: "B", rang: "genus", nom: "A" }],
      ["B", { parent: "A", rang: "family", nom: "B" }],
    ]);
    expect(classification("A", boucle)[5]).toBe("A");
  });
});
