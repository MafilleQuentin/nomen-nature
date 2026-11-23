// Les 13 groupes du langage courant (lot 3, QUE-19), décidés le 23.11.2026 (journal des
// décisions) : tirés de la classification du Catalogue of Life, et pour « arbres » de la forme de
// vie donnée par la World Checklist of Vascular Plants (WCVP, Kew, CC BY 3.0).
//
// Une espèce appartient à un seul groupe (un arbre en fleurs est un arbre). Les espèces hors des
// 13 groupes (crustacés, vers, coraux, algues…) restent trouvables par la recherche, sans liste.
//
// Sortie de l'import : data/groupes.tsv (id, groupe) pour les espèces observées.
// Utilisation seule : node tools/donnees/groupes.ts <dossier COL>
import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import type { ReadableStream as FluxWeb } from "node:stream/web";
import { createInterface } from "node:readline";
import { lignesTsv } from "./col.ts";
import { AGENT, ouvrirParNom, sourceLocale } from "./zip.ts";

export const GROUPES = [
  "mammiferes",
  "oiseaux",
  "reptiles",
  "amphibiens",
  "poissons",
  "insectes",
  "araignees",
  "mollusques",
  "champignons",
  "arbres",
  "fleurs",
  "fougeres",
  "mousses",
] as const;
export type Groupe = (typeof GROUPES)[number];

const CLASSES_POISSONS = new Set([
  "Teleostei", "Elasmobranchii", "Holocephali", "Chondrostei", "Holostei", "Cladistii",
  "Myxini", "Petromyzonti", "Cephalaspidomorphi", "Dipnoi", "Coelacanthi", "Actinistia",
]);
// Cœlacanthes et dipneustes n'ont pas de classe dans le Catalogue of Life : on les prend par l'ordre.
const ORDRES_POISSONS = new Set(["Coelacanthiformes", "Ceratodontiformes", "Lepidosireniformes"]);
const CLASSES_FLEURS = new Set(["Magnoliopsida", "Liliopsida"]);
const CLASSES_FOUGERES = new Set(["Polypodiopsida", "Lycopodiopsida"]);
const EMBRANCHEMENTS_MOUSSES = new Set(["Bryophyta", "Marchantiophyta", "Anthocerotophyta"]);

export interface Classification {
  regne: string;
  embranchement: string;
  classe: string;
  ordre: string;
}

/** Groupe courant d'une espèce, ou undefined si elle n'entre dans aucun des 13. */
export function groupe(t: Classification, formeDeVie = ""): Groupe | undefined {
  if (t.regne === "Fungi") return "champignons";
  if (t.regne === "Animalia") {
    switch (t.classe) {
      case "Mammalia": return "mammiferes";
      case "Aves": return "oiseaux";
      case "Reptilia": return "reptiles";
      case "Amphibia": return "amphibiens";
      case "Insecta": return "insectes";
    }
    if (CLASSES_POISSONS.has(t.classe) || ORDRES_POISSONS.has(t.ordre)) return "poissons";
    if (t.ordre === "Araneae") return "araignees";
    if (t.embranchement === "Mollusca") return "mollusques";
    return undefined;
  }
  if (t.regne === "Plantae") {
    if (EMBRANCHEMENTS_MOUSSES.has(t.embranchement)) return "mousses";
    if (t.embranchement !== "Tracheophyta") return undefined; // algues
    if (/\btree\b/.test(formeDeVie)) return "arbres";
    if (CLASSES_FLEURS.has(t.classe)) return "fleurs";
    if (CLASSES_FOUGERES.has(t.classe)) return "fougeres";
    return undefined; // conifères, cycas… qui ne sont pas des arbres
  }
  return undefined;
}

const URL_WCVP = "https://sftp.kew.org/pub/data-repositories/WCVP/wcvp.zip";

export const CITATION_WCVP =
  "Govaerts R (ed.). WCVP: World Checklist of Vascular Plants. Facilitated by the Royal Botanic Gardens, Kew. https://doi.org/10.34885/egs6-cp24";

/** Télécharge WCVP (~88 Mo), sauf si la copie locale a moins de 30 jours (WCVP change rarement). */
export async function telechargerWcvp(dossier: string): Promise<string> {
  const fichier = join(dossier, "wcvp.zip");
  if (existsSync(fichier) && Date.now() - statSync(fichier).mtimeMs < 30 * 86_400_000) return fichier;
  mkdirSync(dossier, { recursive: true });
  const reponse = await fetch(URL_WCVP, { headers: { "User-Agent": AGENT } });
  if (!reponse.ok || !reponse.body) throw new Error(`WCVP : ${reponse.status}`);
  await pipeline(Readable.fromWeb(reponse.body as FluxWeb), createWriteStream(fichier));
  return fichier;
}

/**
 * Forme de vie par nom scientifique (« Quercus robur » → « tree »). Les noms acceptés d'abord ;
 * les synonymes reçoivent la forme de leur nom accepté, pour relier les plantes que le Catalogue
 * of Life nomme autrement que WCVP.
 */
export async function formesDeVie(fichierWcvp: string): Promise<Map<string, string>> {
  const { flux } = await ouvrirParNom(await sourceLocale(fichierWcvp), "wcvp_names.csv");
  let colonnes: string[] | undefined;
  const parId = new Map<string, string>();
  const synonymes: [string, string][] = []; // nom → id du nom accepté
  const formes = new Map<string, string>();
  for await (const ligne of createInterface({ input: flux, crlfDelay: Infinity })) {
    const champs = ligne.split("|");
    if (!colonnes) {
      colonnes = champs;
      continue;
    }
    const v = (nom: string) => champs[colonnes!.indexOf(nom)] ?? "";
    if (v("taxon_rank") !== "Species") continue;
    if (v("taxon_status") === "Accepted") {
      parId.set(v("plant_name_id"), v("lifeform_description"));
      formes.set(v("taxon_name"), v("lifeform_description"));
    } else if (v("accepted_plant_name_id")) {
      synonymes.push([v("taxon_name"), v("accepted_plant_name_id")]);
    }
  }
  for (const [nom, accepte] of synonymes) {
    const forme = parId.get(accepte);
    if (forme !== undefined && !formes.has(nom)) formes.set(nom, forme);
  }
  return formes;
}

/** Groupes des espèces observées, écrits dans data/groupes.tsv ; renvoie le décompte. */
export async function classer(dossierCol: string, fichierEspeces: string, fichierWcvp: string, sortie: string) {
  const observees = new Set<string>();
  for await (const e of lignesTsv(createReadStream(fichierEspeces))) observees.add(e["id"] ?? "");
  const formes = await formesDeVie(fichierWcvp);
  const decompte: Record<string, number> = Object.fromEntries([...GROUPES, "aucun"].map((g) => [g, 0]));
  let plantesVasculaires = 0;
  let plantesReliees = 0;
  const ecriture = createWriteStream(sortie);
  ecriture.write("id\tgroupe\n");
  for await (const t of lignesTsv(createReadStream(join(dossierCol, "taxons.tsv")))) {
    if (t["rang"] !== "species" || !observees.has(t["id"] ?? "")) continue;
    const classification = {
      regne: t["regne"] ?? "",
      embranchement: t["embranchement"] ?? "",
      classe: t["classe"] ?? "",
      ordre: t["ordre"] ?? "",
    };
    const forme = formes.get(t["nom"] ?? "");
    if (classification.embranchement === "Tracheophyta") {
      plantesVasculaires++;
      if (forme !== undefined) plantesReliees++;
    }
    const g = groupe(classification, forme);
    decompte[g ?? "aucun"] = (decompte[g ?? "aucun"] ?? 0) + 1;
    if (g && !ecriture.write(`${t["id"]}\t${g}\n`)) await new Promise<void>((ok) => ecriture.once("drain", () => ok()));
  }
  await new Promise<void>((ok) => ecriture.end(() => ok()));
  return { ...decompte, plantes_vasculaires: plantesVasculaires, plantes_reliees_a_wcvp: plantesReliees };
}

if (import.meta.main) {
  const dossierCol = process.argv[2];
  if (!dossierCol) {
    console.error("Utilisation : node tools/donnees/groupes.ts <dossier COL>");
    process.exit(1);
  }
  const wcvp = await telechargerWcvp("tools/donnees/data/wcvp");
  console.log(await classer(dossierCol, "tools/donnees/data/gbif/especes.tsv", wcvp, "tools/donnees/data/groupes.tsv"));
}
