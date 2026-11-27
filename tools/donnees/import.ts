// Import mensuel des données de Nomen Nature (lot 3, QUE-18) : enchaîne toutes les étapes et
// prépare le paquet de données publié en release GitHub (« donnees-AAAA-MM »).
//
// 1. Catalogue of Life XR, dernière version (col.ts) ;
// 2. observations GBIF : réutilise un téléchargement récent ou en demande un (~20 minutes) (gbif.ts) ;
// 3. groupes courants des espèces observées, avec les formes de vie de WCVP (groupes.ts) ;
// 4. statut UICN et score « bien documentée », avec Wikidata (score.ts) : data/especes.tsv ;
// 5. fiches espèces : un fichier par groupe de genres, faits de Wikidata, et les compléments
//    de l'index (adresse, statut, noms principaux…) (fiches.ts) ;
// 6. index de la recherche, avec ces compléments (index-recherche.ts) ;
// 7. pays et continents de chaque espèce, pour le filtre « Où » de la recherche (zones.ts) ;
// 8. courbes de niveau de la carte, d'après les espèces par case d'un degré (tools/carte/courbes.ts) ;
// 9. listes par pays et par continent (listes.ts) ;
// 10. sources.json : éditions, DOI, licences et citations, pour la page des crédits.
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
import { CITATION_WCVP, classer, telechargerWcvp } from "./groupes.ts";
import { CITATION_FAITS, construireFiches, FICHIER_COMPLEMENTS } from "./fiches.ts";
import { construire } from "./index-recherche.ts";
import { construireListes } from "./listes.ts";
import { CITATION_WIKIDATA, calculer } from "./score.ts";
import { construireZones } from "./zones.ts";
import { construireCourbes } from "../carte/courbes.ts";

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

etape("3. Groupes courants");
const groupes = await classer(dossierCol, join(DONNEES, "gbif", "especes.tsv"), await telechargerWcvp(join(DONNEES, "wcvp")), join(DONNEES, "groupes.tsv"));
console.log(groupes);

etape("4. Score « bien documentée »");
const documentation = await calculer(dossierCol, DONNEES);
console.log(documentation);

etape("5. Fiches espèces (et compléments de l'index)");
rmSync(PAQUET, { recursive: true, force: true });
mkdirSync(PAQUET, { recursive: true });
const fiches = await construireFiches(dossierCol, DONNEES, join(PAQUET, "fiches"));
console.log(fiches);

etape("6. Index de la recherche");
const index = await construire(dossierCol, join(DONNEES, "gbif", "especes.tsv"), join(PAQUET, "recherche"), undefined, join(DONNEES, FICHIER_COMPLEMENTS));
console.log(index);

etape("7. Pays et continents des espèces (filtre « Où »)");
const zones = await construireZones(DONNEES, join(PAQUET, "zones"));
console.log(zones);

etape("8. Courbes de niveau de la carte");
const courbes = await construireCourbes(join(DONNEES, "gbif", "cases.tsv"), join(PAQUET, "carte", "courbes.json"));
console.log(courbes);

etape("9. Listes par pays et par continent");
const listes = await construireListes(dossierCol, DONNEES, join(PAQUET, "listes"));
console.log(listes);

etape("10. Sources");
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
  wcvp: { usage: "formes de vie des plantes (groupe « arbres »)", licence: "CC BY 3.0", citation: CITATION_WCVP },
  wikidata: { usage: "photos et articles Wikipédia (score « bien documentée »)", licence: "CC0", citation: CITATION_WIKIDATA },
  wikidata_faits: { usage: "encadré « Sais-tu ? » des fiches (longévité, taille, masse, envergure)", licence: "CC0", citation: CITATION_FAITS },
  chiffres: { especes_observees: gbif.especes, index_fichiers: index.fichiers, zones, courbes, listes, groupes, documentation, fiches },
};
writeFileSync(join(PAQUET, "sources.json"), JSON.stringify(sources, null, 2) + "\n");
const mois = sources.construction.slice(0, 7);
writeFileSync(join(DONNEES, "paquet-nom.txt"), `donnees-${mois}\n`);
console.log(JSON.parse(readFileSync(join(PAQUET, "sources.json"), "utf8")));
console.log(`\nPaquet prêt : ${PAQUET} (release « donnees-${mois} »)`);
