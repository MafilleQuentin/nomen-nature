// Petit paquet de données d'exemple pour les tests (lot 4) : quelques fiches tirées du vrai
// paquet, pour que l'intégration continue teste les fiches espèces sans télécharger le paquet
// complet (131 Mo). Résultat dans tests/fixtures/donnees/, committé ; installé dans le site par
// `npm run donnees:installer -- --exemple`.
//
// Données : Catalogue of Life (CC BY 4.0), GBIF (comptes d'observations), Wikidata (CC0).
//
// Utilisation (après un import ou une installation complète) :
//   node tools/donnees/exemple.ts [adresse…]
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fichierDeLAdresse } from "../../src/lib/especes/adresse.ts";
import type { FichierFiches } from "../../src/lib/especes/fiche.ts";

export const ADRESSES_EXEMPLE = ["quercus-robur", "agrilus-cyanescens", "agrilus-obscuricollis"];
const SOURCE = process.env["SOURCE_FICHES"] ?? "public/donnees/fiches";
const SORTIE = "tests/fixtures/donnees/fiches";

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
