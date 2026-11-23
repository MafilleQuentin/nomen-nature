// Import mensuel des données de Nomen Nature (lot 3, QUE-18) : enchaîne toutes les étapes et
// prépare le paquet de données publié en release GitHub (« donnees-AAAA-MM »).
//
// 1. Catalogue of Life XR, dernière version (col.ts) ;
// 2. observations GBIF : réutilise un téléchargement récent ou en demande un (~20 minutes) (gbif.ts) ;
// 3. index de la recherche (index-recherche.ts) ;
// 4. sources.json : éditions, DOI, licences et citations, pour la page des crédits.
//
// Le paquet est le dossier tools/donnees/data/paquet/ : à zipper tel quel (le workflow
// GitHub le fait), puis à installer dans public/donnees/ avant de construire le site
// (tools/donnees/installer.ts).
//
// Utilisation : npm run donnees:import
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { extraire, version } from "./col.ts";
import { preparer } from "./gbif.ts";
import { construire } from "./index-recherche.ts";

const DONNEES = "tools/donnees/data";
export const PAQUET = join(DONNEES, "paquet");

const etape = (texte: string) => console.log(`\n=== ${texte} (${new Date().toISOString().slice(11, 19)})`);

etape("1. Catalogue of Life XR");
const v = await version();
const dossierCol = join(DONNEES, "col", String(v.cle));
const col = await extraire(v, dossierCol);
console.log(`${v.nom}, DOI ${v.doi} : ${col["taxons_species"]} espèces`);

etape("2. Observations GBIF");
const gbif = await preparer();
console.log(`${gbif.especes} espèces observées, ${gbif.couples_espece_pays} couples espèce × pays`);

etape("3. Index de la recherche");
rmSync(PAQUET, { recursive: true, force: true });
mkdirSync(PAQUET, { recursive: true });
const index = await construire(dossierCol, join(DONNEES, "gbif", "especes.tsv"), join(PAQUET, "recherche"));
console.log(index);

etape("4. Sources");
const sources = {
  construction: new Date().toISOString(),
  catalogue_of_life: {
    edition: v.nom,
    cle_checklistbank: v.cle,
    publication: v.publication,
    doi: v.doi,
    licence: "CC BY 4.0",
    citation: `Catalogue of Life (${v.nom}), https://doi.org/${v.doi}`,
  },
  gbif: gbif.telechargements,
  chiffres: { especes_observees: gbif.especes, index_fichiers: index.fichiers },
};
writeFileSync(join(PAQUET, "sources.json"), JSON.stringify(sources, null, 2) + "\n");
const mois = sources.construction.slice(0, 7);
writeFileSync(join(DONNEES, "paquet-nom.txt"), `donnees-${mois}\n`);
console.log(JSON.parse(readFileSync(join(PAQUET, "sources.json"), "utf8")));
console.log(`\nPaquet prêt : ${PAQUET} (release « donnees-${mois} »)`);
