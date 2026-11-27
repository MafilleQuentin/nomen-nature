// Catalogue of Life XR (lot 3, QUE-18) : trouver la dernière version, la télécharger et en
// extraire ce dont Nomen a besoin. Reprend en TypeScript tools/essai-recherche/telecharger.py
// et extraire_noms.py (lot 1), sans les synonymes latins (verdict du lot 1).
//
// Sources (licence CC BY 4.0, citer l'édition et son DOI) :
// - l'export ColDP de ChecklistBank (NameUsage, un taxon par ligne, ~180 Mo compressé). La
//   classification (règne… genre) est reconstruite en remontant les parents (parentID) : selon
//   l'export que ChecklistBank a déjà prêt, ses colonnes de classification sont là ou non (en
//   novembre 2026, elles manquaient et l'import n'avait trouvé aucune espèce) ;
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

/** Rangs de la classification gardée, dans l'ordre des colonnes de taxons.tsv. */
export const RANGS_CLASSIFICATION = ["kingdom", "phylum", "class", "order", "family", "genus"] as const;
/** Rangs qui ne sont jamais parents d'un genre ou d'une famille : inutile de les garder en mémoire. */
const RANGS_SOUS_ESPECE = new Set([
  "species",
  "subspecies",
  "variety",
  "subvariety",
  "form",
  "subform",
  "infraspecific name",
  "infrasubspecific name",
  "cultivar",
  "strain",
]);
/** En dessous, l'extraction a échoué (export vide ou d'un autre format) : l'import s'arrête. */
export const ESPECES_MIN = 1_000_000;

export interface Usage {
  parent: string;
  rang: string;
  /** Nom, seulement pour les rangs de la classification (sinon vide). */
  nom: string;
}

/**
 * Copie d'un morceau de ligne : V8 garde sinon toute la ligne en mémoire derrière chaque
 * identifiant (8,5 millions de lignes dans l'export : la mémoire de Node n'y suffisait pas).
 */
const copie = (texte: string) => (" " + texte).slice(1);

/**
 * Classification d'un taxon (règne, embranchement, classe, ordre, famille, genre) en remontant ses
 * parents. `memoire` garde celle de chaque taxon déjà vu (les espèces d'un genre partagent tout).
 */
export function classification(id: string, usages: Map<string, Usage>, memoire = new Map<string, string[]>()): string[] {
  const chemin: string[] = [];
  let courant: string | undefined = id;
  let connue: string[] | undefined;
  while (courant && chemin.length < 80) {
    connue = memoire.get(courant);
    if (connue) break;
    chemin.push(courant);
    courant = usages.get(courant)?.parent;
  }
  let resultat = connue ?? RANGS_CLASSIFICATION.map(() => "");
  // Redescendre : chaque taxon ajoute son propre rang à la classification de son parent ; le plus
  // proche l'emporte (un « genre » mal rangé plus haut, comme Pellonulinae, ne masque pas le vrai).
  for (const noeud of chemin.reverse()) {
    const u = usages.get(noeud);
    const i = u ? (RANGS_CLASSIFICATION as readonly string[]).indexOf(u.rang) : -1;
    if (u && i >= 0) {
      resultat = [...resultat];
      resultat[i] = u.nom;
    }
    memoire.set(noeud, resultat);
  }
  return resultat;
}

export async function extraire(v: Version, dossier: string): Promise<Record<string, number | string>> {
  mkdirSync(dossier, { recursive: true });
  const exportZip = join(dossier, "export.zip");
  if (!existsSync(exportZip)) {
    console.log(`Téléchargement de l'export ${v.nom}…`);
    await telecharger(`${API}/dataset/${v.cle}/export.zip?format=ColDP`, exportZip);
  }
  const compteurs: Record<string, number> = {};
  const compter = (cle: string) => (compteurs[cle] = (compteurs[cle] ?? 0) + 1);

  // Le tableau des taxons dans l'archive : NameUsage.tsv (ColDP), ou dataset-<clé>.tsv (export à plat).
  const ouvrirExport = async () => (await ouvrirParNom(await sourceLocale(exportZip), /(^|\/)(NameUsage|dataset-\d+)\.tsv$/)).flux;

  // 1a. Les taxons acceptés au-dessus de l'espèce et leurs parents, pour reconstruire la classification.
  const usages = new Map<string, Usage>();
  for await (const t of lignesTsv(await ouvrirExport())) {
    const rang = t["rank"] ?? "";
    if (!STATUTS_ACCEPTES.has(t["status"] ?? "") || RANGS_SOUS_ESPECE.has(rang)) continue;
    const utile = (RANGS_CLASSIFICATION as readonly string[]).includes(rang);
    usages.set(copie(t["ID"] ?? ""), { parent: copie(t["parentID"] ?? ""), rang: utile ? rang : "", nom: utile ? copie(t["scientificName"] ?? "") : "" });
  }

  // 1b. Taxons cherchables, et synonymes d'espèces (pour rattacher leurs noms courants).
  const taxons = new Map<string, string[]>();
  const rangs = new Map<string, string>();
  const synonymes = new Map<string, string>(); // id du synonyme → id de l'espèce acceptée
  const memoire = new Map<string, string[]>();
  for await (const t of lignesTsv(await ouvrirExport())) {
    const rang = t["rank"] ?? "";
    if (!RANGS.has(rang)) continue;
    if (STATUTS_ACCEPTES.has(t["status"] ?? "")) {
      const id = t["ID"] ?? "";
      // Classification des parents (comme l'export à plat : un genre n'a pas son propre nom en « genre »).
      const [regne = "", embranchement = "", classe = "", ordre = "", famille = "", genre = ""] = classification(t["parentID"] ?? "", usages, memoire);
      if (!REGNES.has(regne)) continue;
      const ligne = [id, rang, t["scientificName"] ?? "", t["authorship"] ?? "", regne, embranchement, classe, ordre, famille, genre, t["taxGroup"] ?? ""];
      taxons.set(copie(id), ligne.map(copie));
      rangs.set(copie(id), rang);
      compter(`taxons_${rang}`);
    } else if (t["status"] === "synonym" && rang === "species") {
      synonymes.set(copie(t["ID"] ?? ""), copie(t["parentID"] ?? ""));
    }
  }
  usages.clear();
  memoire.clear();
  if ((compteurs["taxons_species"] ?? 0) < ESPECES_MIN) {
    throw new Error(
      `Catalogue of Life : ${compteurs["taxons_species"] ?? 0} espèces seulement dans ${exportZip} (au moins ${ESPECES_MIN} attendues) : export vide ou d'un autre format.`,
    );
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
