// Catalogue of Life XR (lot 3, QUE-18) : trouver la dernière version, la télécharger et en
// extraire ce dont Nomen a besoin. Reprend en TypeScript tools/essai-recherche/telecharger.py
// et extraire_noms.py (lot 1), sans les synonymes latins (verdict du lot 1).
//
// Sources (licence CC BY 4.0, citer l'édition et son DOI) :
// - l'export « à plat » de ChecklistBank : un taxon par ligne avec sa classification (~137 Mo) ;
// - la table des noms courants (VernacularName.tsv), prise seule dans l'archive mensuelle
//   (~1,4 Go) par requêtes partielles (~35 Mo).
//
// Sorties, dans tools/donnees/data/col/<clé>/ :
// - taxons.tsv : espèces, genres et familles acceptés des animaux, plantes et champignons,
//   avec leur classification et le groupe ChecklistBank (utile pour les groupes courants) ;
// - noms.tsv : nom latin accepté et noms courants français et anglais, rattachés à un taxon ;
// - version.json : clé, nom, DOI et date de l'édition, et les chiffres de l'extraction.
//
// Utilisation : node tools/donnees/col.ts [clé ChecklistBank]   (sans clé : la dernière XR)
import { createWriteStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import type { Readable } from "node:stream";
import { Readable as ReadableNode } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as FluxWeb } from "node:stream/web";
import { AGENT, ouvrirParNom, sourceDistante, sourceLocale } from "./zip.ts";

const API = "https://api.checklistbank.org";
const REGNES = new Set(["Animalia", "Plantae", "Fungi"]);
const STATUTS_ACCEPTES = new Set(["accepted", "provisionally accepted"]);
const RANGS = new Set(["species", "genus", "family"]);
const LANGUES: Record<string, "fr" | "en"> = { fra: "fr", eng: "en" };
const LONGUEUR_MAX = 100;

export interface Version {
  cle: number;
  nom: string; // ex. « COL26.10 XR »
  doi: string;
  publication: string; // AAAA-MM-JJ
}

async function json<T>(url: string): Promise<T> {
  const reponse = await fetch(url, { headers: { "User-Agent": AGENT } });
  if (!reponse.ok) throw new Error(`${url} : ${reponse.status}`);
  return (await reponse.json()) as T;
}

/** La version demandée, ou la dernière version étendue (alias ChecklistBank « 3LXR »). */
export async function version(cle?: number): Promise<Version> {
  const d = await json<{ key: number; alias: string; doi: string; issued: string }>(`${API}/dataset/${cle ?? "3LXR"}`);
  return { cle: d.key, nom: d.alias, doi: d.doi, publication: d.issued };
}

async function telecharger(url: string, destination: string): Promise<void> {
  const reponse = await fetch(url, { headers: { "User-Agent": AGENT }, redirect: "follow" });
  if (!reponse.ok || !reponse.body) throw new Error(`${url} : ${reponse.status}`);
  await pipeline(ReadableNode.fromWeb(reponse.body as FluxWeb), createWriteStream(destination));
}

/** Lignes d'un TSV ColDP, en colonnes nommées (préfixes « col: » et « clb: » retirés). */
export async function* lignesTsv(flux: Readable): AsyncGenerator<Record<string, string>> {
  let entete: string[] | undefined;
  for await (const ligne of createInterface({ input: flux, crlfDelay: Infinity })) {
    if (!ligne) continue;
    const champs = ligne.split("\t");
    if (!entete) {
      entete = champs.map((c) => c.replace(/^\w+:/, ""));
      continue;
    }
    yield Object.fromEntries(entete.map((nom, i) => [nom, champs[i] ?? ""]));
  }
}

/** Écrit un TSV ligne par ligne (des millions de lignes : pas de chaîne géante en mémoire). */
async function ecrire(chemin: string, lignes: Iterable<string[]>): Promise<void> {
  const sortie = createWriteStream(chemin);
  for (const ligne of lignes) {
    if (!sortie.write(ligne.join("\t") + "\n")) await new Promise<void>((ok) => sortie.once("drain", () => ok()));
  }
  await new Promise<void>((ok, echec) => sortie.end((erreur?: Error | null) => (erreur ? echec(erreur) : ok())));
}

/** Retire espaces superflus, guillemets et remarque finale entre parenthèses. */
export function nettoyer(nom: string): string {
  return nom
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s*\([^()]*\)\s*$/, "")
    .replaceAll('"', "")
    .replace(/^[ ,;]+|[ ,;]+$/g, "");
}

const COLONNES_TAXONS = ["id", "rang", "nom", "auteur", "regne", "embranchement", "classe", "ordre", "famille", "genre", "groupe_col"];

export async function extraire(v: Version, dossier: string): Promise<Record<string, number | string>> {
  mkdirSync(dossier, { recursive: true });
  const exportZip = join(dossier, "export.zip");
  if (!existsSync(exportZip)) {
    console.log(`Téléchargement de l'export ${v.nom}…`);
    await telecharger(`${API}/dataset/${v.cle}/export.zip?format=ColDP`, exportZip);
  }
  const compteurs: Record<string, number> = {};
  const compter = (cle: string) => (compteurs[cle] = (compteurs[cle] ?? 0) + 1);

  // 1. Taxons cherchables, et synonymes d'espèces (pour rattacher leurs noms courants).
  const taxons = new Map<string, string[]>();
  const rangs = new Map<string, string>();
  const synonymes = new Map<string, string>(); // id du synonyme → id de l'espèce acceptée
  const { flux: fluxExport } = await ouvrirParNom(await sourceLocale(exportZip), /\.tsv$/);
  for await (const t of lignesTsv(fluxExport)) {
    if (!REGNES.has(t["kingdom"] ?? "") || !RANGS.has(t["rank"] ?? "")) continue;
    if (STATUTS_ACCEPTES.has(t["status"] ?? "")) {
      const id = t["ID"] ?? "";
      taxons.set(id, [
        id, t["rank"], t["scientificName"], t["authorship"], t["kingdom"], t["phylum"],
        t["class"], t["order"], t["family"], t["genus"], t["taxGroup"],
      ].map((x) => x ?? ""));
      rangs.set(id, t["rank"] ?? "");
      compter(`taxons_${t["rank"]}`);
    } else if (t["status"] === "synonym" && t["rank"] === "species") {
      synonymes.set(t["ID"] ?? "", t["parentID"] ?? "");
    }
  }
  await ecrire(join(dossier, "taxons.tsv"), [COLONNES_TAXONS, ...taxons.values()]);

  // 2. Noms : latin accepté, puis noms courants français et anglais.
  const noms: string[][] = [["taxon_id", "nom", "langue", "type"]];
  const vus = new Set<string>();
  const ajouter = (taxon: string, nom: string, langue: string, type: string): void => {
    const cle = `${taxon}|${langue}|${nom.toLowerCase()}`;
    if (vus.has(cle)) {
      compter("doublons");
      return;
    }
    vus.add(cle);
    noms.push([taxon, nom, langue, type]);
    compter(`noms_${langue}`);
  };
  for (const [id, valeurs] of taxons) ajouter(id, valeurs[2] ?? "", "la", "accepte");

  const archive = `https://download.checklistbank.org/col/monthly/${v.publication}_xr_coldp.zip`;
  console.log(`Noms courants extraits de ${archive}…`);
  const { flux: fluxNoms } = await ouvrirParNom(await sourceDistante(archive), "VernacularName.tsv");
  const especesAvec = { fr: new Set<string>(), en: new Set<string>() };
  for await (const n of lignesTsv(fluxNoms)) {
    const langue = LANGUES[n["language"] ?? ""];
    if (!langue) continue;
    let taxon = n["taxonID"] ?? "";
    taxon = synonymes.get(taxon) ?? taxon; // nom courant posé sur un synonyme : renvoyé vers l'espèce
    if (!taxons.has(taxon)) {
      compter(`courants_${langue}_hors_perimetre`);
      continue;
    }
    const nom = nettoyer(n["name"] ?? "");
    if (!nom || nom.length > LONGUEUR_MAX) {
      compter(`courants_${langue}_rejetes`);
      continue;
    }
    ajouter(taxon, nom, langue, "courant");
    if (rangs.get(taxon) === "species") especesAvec[langue].add(taxon);
  }
  await ecrire(join(dossier, "noms.tsv"), noms);

  const resultat = {
    ...v,
    extraction: new Date().toISOString(),
    ...compteurs,
    especes_avec_nom_fr: especesAvec.fr.size,
    especes_avec_nom_en: especesAvec.en.size,
    synonymes: synonymes.size,
  };
  writeFileSync(join(dossier, "version.json"), JSON.stringify(resultat, null, 2) + "\n");
  return resultat;
}

if (import.meta.main) {
  const v = await version(process.argv[2] ? Number(process.argv[2]) : undefined);
  console.log(`${v.nom} (clé ${v.cle}, DOI ${v.doi}, publiée le ${v.publication})`);
  console.log(await extraire(v, join("tools/donnees/data/col", String(v.cle))));
}
