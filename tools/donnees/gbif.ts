// Observations GBIF pour l'import mensuel (lot 3, QUE-18) : obtient les deux téléchargements SQL
// (espèces observées, espèces par pays), puis écrit deux fichiers compacts, reliés au Catalogue
// of Life XR par l'identifiant d'espèce (GBIF utilise déjà celui du COL XR).
//
// Sorties, dans tools/donnees/data/gbif/ :
// - especes.tsv : id, observations, uicn — une ligne par espèce ;
// - pays.tsv : pays, id, observations — une ligne par couple espèce × pays ;
// - continents.tsv : continent, id, observations — une ligne par couple espèce × continent
//   (continent de chaque observation d'après ses coordonnées, décision du 23.11.2026) ;
// - cases.tsv : lat, lon, especes — espèces distinctes par case d'un degré, pour les courbes de
//   niveau de la carte (lot 6, QUE-31, décision du 25.11.2026) ;
// - gbif.json : clés, dates, DOI et licences des téléchargements (à citer), et chiffres.
//
// Utilisation : node tools/donnees/gbif.ts
import { createWriteStream, writeFileSync } from "node:fs";
import { join } from "node:path";
import { lignesTsv } from "./col.ts";
import { DOSSIER, obtenir } from "./gbif-sql.ts";
import { ouvrirParNom, sourceLocale } from "./zip.ts";

const REQUETES = "tools/donnees/requetes";
// Volumes du 23.11.2026 : 1 734 319 et 5 986 994 lignes. Bien en dessous, quelque chose a changé.
// Cases d'un degré : environ 25 000 attendues (terres et côtes) ; bien en dessous, quelque chose a changé.
const LIGNES_MIN = { especes: 1_000_000, pays: 3_000_000, continents: 1_000_000, cases: 10_000 };

/** Catégories UICN « évaluées » : tout sauf NE (non évaluée) et l'absence de statut. */
const NON_EVALUEE = new Set(["", "NE"]);

/**
 * Statut UICN d'une espèce quand ses observations en donnent plusieurs (85 362 espèces le
 * 23.11.2026, souvent « LC » et « NE ») : un statut évalué l'emporte toujours sur « NE » ;
 * entre deux statuts évalués, celui du plus grand nombre d'observations.
 */
export function choisirUicn(statuts: Map<string, number>): string {
  let choix = "";
  let poids = -1;
  for (const [statut, observations] of statuts) {
    const evalue = !NON_EVALUEE.has(statut);
    const choixEvalue = !NON_EVALUEE.has(choix);
    if ((evalue && !choixEvalue) || (evalue === choixEvalue && observations > poids)) {
      choix = statut;
      poids = observations;
    }
  }
  return choix || "NE";
}

async function* lignesDuZip(fichier: string) {
  const { flux } = await ouvrirParNom(await sourceLocale(fichier), /\.(csv|tsv)$/);
  yield* lignesTsv(flux);
}

async function ecrireFlux(chemin: string, lignes: AsyncIterable<string[]> | Iterable<string[]>): Promise<number> {
  const sortie = createWriteStream(chemin);
  let n = 0;
  for await (const ligne of lignes) {
    if (!sortie.write(ligne.join("\t") + "\n")) await new Promise<void>((ok) => sortie.once("drain", () => ok()));
    n++;
  }
  await new Promise<void>((ok, echec) => sortie.end((erreur?: Error | null) => (erreur ? echec(erreur) : ok())));
  return n - 1; // sans l'en-tête
}

export async function preparer(dossier = DOSSIER) {
  const [especes, pays, continents, cases] = await Promise.all([
    obtenir(join(REQUETES, "especes.sql"), { lignesMin: LIGNES_MIN.especes, dossier }),
    obtenir(join(REQUETES, "especes-par-pays.sql"), { lignesMin: LIGNES_MIN.pays, dossier }),
    obtenir(join(REQUETES, "especes-par-continent.sql"), { lignesMin: LIGNES_MIN.continents, dossier }),
    obtenir(join(REQUETES, "especes-par-case.sql"), { lignesMin: LIGNES_MIN.cases, dossier }),
  ]);

  // 1. Une ligne par espèce : observations additionnées, statut UICN choisi.
  const observations = new Map<string, number>();
  const statuts = new Map<string, Map<string, number>>();
  for await (const e of lignesDuZip(especes.fichier)) {
    const id = e["specieskey"] ?? "";
    const n = Number(e["observations"] ?? 0);
    observations.set(id, (observations.get(id) ?? 0) + n);
    const parStatut = statuts.get(id) ?? new Map<string, number>();
    const statut = e["iucnredlistcategory"] ?? "";
    parStatut.set(statut, (parStatut.get(statut) ?? 0) + n);
    statuts.set(id, parStatut);
  }
  const nEspeces = await ecrireFlux(join(dossier, "especes.tsv"), [
    ["id", "observations", "uicn"],
    ...[...observations].map(([id, n]) => [id, String(n), choisirUicn(statuts.get(id) ?? new Map())]),
  ]);

  // 2. Couples espèce × pays, tels quels (le choix des pays et des seuils se fait aux listes).
  const nCouples = await ecrireFlux(
    join(dossier, "pays.tsv"),
    (async function* () {
      yield ["pays", "id", "observations"];
      for await (const c of lignesDuZip(pays.fichier)) yield [c["countrycode"] ?? "", c["specieskey"] ?? "", c["observations"] ?? "0"];
    })(),
  );

  // 3. Couples espèce × continent.
  const nCouplesContinent = await ecrireFlux(
    join(dossier, "continents.tsv"),
    (async function* () {
      yield ["continent", "id", "observations"];
      for await (const c of lignesDuZip(continents.fichier)) yield [c["continent"] ?? "", c["specieskey"] ?? "", c["observations"] ?? "0"];
    })(),
  );

  // 4. Espèces distinctes par case d'un degré (courbes de niveau de la carte).
  const nCases = await ecrireFlux(
    join(dossier, "cases.tsv"),
    (async function* () {
      yield ["lat", "lon", "especes"];
      for await (const c of lignesDuZip(cases.fichier)) yield [c["lat"] ?? "", c["lon"] ?? "", c["especes"] ?? "0"];
    })(),
  );

  const resume = {
    preparation: new Date().toISOString(),
    especes: nEspeces,
    couples_espece_pays: nCouples,
    couples_espece_continent: nCouplesContinent,
    cases_un_degre: nCases,
    telechargements: [especes, pays, continents, cases].map(({ cle, creation, lignes, doi, licence }) => ({
      cle,
      creation,
      lignes,
      doi,
      licence,
      citation: `GBIF.org (${creation.slice(0, 10)}) GBIF Occurrence Download https://doi.org/${doi}`,
    })),
  };
  writeFileSync(join(dossier, "gbif.json"), JSON.stringify(resume, null, 2) + "\n");
  return resume;
}

if (import.meta.main) {
  try {
    console.log(await preparer());
  } catch (erreur) {
    console.error((erreur as Error).message);
    process.exit(1);
  }
}
