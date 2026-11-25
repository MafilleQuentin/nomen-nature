// Petit paquet de données d'exemple pour les tests (lots 4 et 5) : quelques fiches tirées du vrai
// paquet, un index de recherche réduit à ces espèces et à leurs genres, et leurs pays et
// continents (filtre « Où »), pour que l'intégration continue teste les fiches et la recherche
// sans télécharger le paquet complet (221 Mo). Résultat dans tests/fixtures/donnees/, committé ;
// installé dans le site par `npm run donnees:installer -- --exemple`.
//
// Données : Catalogue of Life (CC BY 4.0), GBIF (comptes d'observations), Wikidata (CC0).
//
// Utilisation (après un import ou une installation complète) :
//   node tools/donnees/exemple.ts [adresse…]
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fichierDeLAdresse } from "../../src/lib/especes/adresse.ts";
import type { FichierFiches } from "../../src/lib/especes/fiche.ts";

export const ADRESSES_EXEMPLE = ["quercus-robur", "agrilus-cyanescens", "agrilus-obscuricollis"];
const SOURCE = process.env["SOURCE_FICHES"] ?? "public/donnees/fiches";
const SORTIE = "tests/fixtures/donnees/fiches";
const SOURCE_RECHERCHE = process.env["SOURCE_RECHERCHE"] ?? "public/donnees/recherche";
const SORTIE_RECHERCHE = "tests/fixtures/donnees/recherche";
const ids = new Set<string>();
const genres = new Set<string>();

const adresses = process.argv.length > 2 ? process.argv.slice(2) : ADRESSES_EXEMPLE;
rmSync(SORTIE, { recursive: true, force: true });
mkdirSync(SORTIE, { recursive: true });
const parFichier = new Map<number, string[]>();
for (const a of adresses) parFichier.set(fichierDeLAdresse(a), [...(parFichier.get(fichierDeLAdresse(a)) ?? []), a]);

for (const [n, liste] of parFichier) {
  const complet = JSON.parse(readFileSync(join(SOURCE, `${n}.json`), "utf8")) as FichierFiches;
  const iAdresse = complet.colonnes.indexOf("adresse");
  const iProches = complet.colonnes.indexOf("proches");
  const lignes = complet.lignes.filter((l) => liste.includes(String(l[iAdresse])));
  for (const l of lignes) {
    ids.add(String(l[complet.colonnes.indexOf("id")]));
    genres.add(String(l[complet.colonnes.indexOf("genre")]));
  }
  const cartes: FichierFiches["cartes"] = {};
  for (const l of lignes) {
    for (const id of l[iProches] as string[]) {
      const carte = complet.cartes[id];
      if (carte) cartes[id] = carte;
    }
  }
  writeFileSync(join(SORTIE, `${n}.json`), JSON.stringify({ colonnes: complet.colonnes, lignes, cartes }, null, 1) + "\n");
  console.log(`${n}.json : ${lignes.length} fiche(s), ${Object.keys(cartes).length} carte(s)`);
}

// Index réduit : les lignes de ces espèces et de leurs genres, un fichier par dictionnaire.
rmSync(SORTIE_RECHERCHE, { recursive: true, force: true });
const manifeste = JSON.parse(readFileSync(join(SOURCE_RECHERCHE, "manifeste.json"), "utf8")) as { extension: string };
const dictionnaires: Record<string, { premiers: string[] }> = {};
const FIN_DE_LIGNE = "\n";
const TABULATION = "\t";
for (const dico of ["noms", "cles", "courts"]) {
  // Colonnes : (groupe pour « courts »), tri, nom, langue, type, taxon, rang, nom scientifique…
  const decalage = dico === "courts" ? 1 : 0;
  const gardees: string[] = [];
  for (const nom of readdirSync(join(SOURCE_RECHERCHE, dico)).sort()) {
    for (const ligne of readFileSync(join(SOURCE_RECHERCHE, dico, nom), "utf8").split(FIN_DE_LIGNE)) {
      const c = ligne.split(TABULATION);
      const taxon = c[4 + decalage] ?? "";
      const rang = c[5 + decalage] ?? "";
      const scientifique = c[6 + decalage] ?? "";
      if (ids.has(taxon) || (rang === "genus" && genres.has(scientifique))) gardees.push(ligne);
    }
  }
  gardees.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  mkdirSync(join(SORTIE_RECHERCHE, dico), { recursive: true });
  writeFileSync(join(SORTIE_RECHERCHE, dico, `0000${manifeste.extension}`), gardees.join(FIN_DE_LIGNE) + FIN_DE_LIGNE);
  dictionnaires[dico] = { premiers: [""] };
  console.log(`recherche/${dico} : ${gardees.length} lignes`);
}
writeFileSync(join(SORTIE_RECHERCHE, "manifeste.json"), JSON.stringify({ extension: manifeste.extension, dictionnaires }, null, 1) + FIN_DE_LIGNE);

// Pays et continents de ces espèces (filtre « Où » de la recherche), même numéro de fichier.
const SOURCE_ZONES = process.env["SOURCE_ZONES"] ?? "public/donnees/zones";
const SORTIE_ZONES = "tests/fixtures/donnees/zones";
rmSync(SORTIE_ZONES, { recursive: true, force: true });
mkdirSync(SORTIE_ZONES, { recursive: true });
for (const n of parFichier.keys()) {
  const toutes = JSON.parse(readFileSync(join(SOURCE_ZONES, `${n}.json`), "utf8")) as Record<string, string>;
  const gardees = Object.fromEntries(Object.entries(toutes).filter(([id]) => ids.has(id)));
  writeFileSync(join(SORTIE_ZONES, `${n}.json`), JSON.stringify(gardees, null, 1) + FIN_DE_LIGNE);
  console.log(`zones/${n}.json : ${Object.keys(gardees).length} espèce(s)`);
}

// Listes du panneau de la carte (lot 6, QUE-30) : le décompte des régions en entier, et l'Europe,
// la France et la Suisse avec les 5 premières lignes de chaque liste.
const SOURCE_LISTES = process.env["SOURCE_LISTES"] ?? "public/donnees/listes";
const SORTIE_LISTES = "tests/fixtures/donnees/listes";
rmSync(SORTIE_LISTES, { recursive: true, force: true });
mkdirSync(SORTIE_LISTES, { recursive: true });
writeFileSync(join(SORTIE_LISTES, "regions.json"), readFileSync(join(SOURCE_LISTES, "regions.json"), "utf8"));
for (const region of ["continents/europe", "pays/fr", "pays/ch"]) {
  mkdirSync(join(SORTIE_LISTES, region), { recursive: true });
  for (const nom of readdirSync(join(SOURCE_LISTES, region)).sort()) {
    const contenu = JSON.parse(readFileSync(join(SOURCE_LISTES, region, nom), "utf8")) as { lignes?: unknown[] };
    if (contenu.lignes) contenu.lignes = contenu.lignes.slice(0, 5);
    writeFileSync(join(SORTIE_LISTES, region, nom), JSON.stringify(contenu) + FIN_DE_LIGNE);
  }
  console.log(`listes/${region} : ${readdirSync(join(SORTIE_LISTES, region)).length} fichiers`);
}

// Courbes de niveau de la carte (lot 6, QUE-31), telles quelles.
const SOURCE_COURBES = process.env["SOURCE_COURBES"] ?? "public/donnees/carte/courbes.json";
mkdirSync("tests/fixtures/donnees/carte", { recursive: true });
writeFileSync("tests/fixtures/donnees/carte/courbes.json", readFileSync(SOURCE_COURBES, "utf8"));
console.log("carte/courbes.json copié");
