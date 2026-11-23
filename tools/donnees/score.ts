// Statut UICN et score « bien documentée » (lot 3, QUE-20), décidés le 23.11.2026 (journal
// des décisions).
//
// Score sur 10 : photo 3, nom français 3, article Wikipédia 2 (français) ou 1 (anglais
// seulement), observations dans le monde 1 (≥ 1 000) ou 2 (≥ 100 000). « Bien documentée » :
// photo + nom français + article (fiche complète au lot 4). Les listes trient par score, puis
// par observations dans le pays.
//
// Photo et articles viennent de Wikidata (propriété P10585 « identifiant Catalogue of Life »,
// données CC0), interrogé par QLever (université de Fribourg-en-Brisgau) : 2,3 millions
// d'espèces en quelques secondes, là où le service officiel dépasse sa limite de 60 secondes.
//
// Sortie : data/especes.tsv, une ligne par espèce observée :
// id, groupe, uicn, observations, score, bien_documentee, nom_fr, wikidata, photo, wikipedia_fr, wikipedia_en
//
// Utilisation seule : node tools/donnees/score.ts <dossier COL>
import { createReadStream, createWriteStream, mkdirSync } from "node:fs";
import { join } from "node:path";
import { normaliser } from "../../src/lib/recherche/phonetique.ts";
import { lignesTsv } from "./col.ts";
import { AGENT } from "./zip.ts";

const QLEVER = "https://qlever.dev/api/wikidata";
const REQUETE = `PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX schema: <http://schema.org/>
SELECT ?col (SAMPLE(?item) AS ?wikidata) (SAMPLE(?image) AS ?photo) (SAMPLE(?fr) AS ?wikipedia_fr) (SAMPLE(?en) AS ?wikipedia_en) WHERE {
  ?item wdt:P10585 ?col .
  OPTIONAL { ?item wdt:P18 ?image }
  OPTIONAL { ?fr schema:about ?item ; schema:isPartOf <https://fr.wikipedia.org/> }
  OPTIONAL { ?en schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }
} GROUP BY ?col`;
// 2 295 469 lignes le 23.11.2026 : bien en dessous, la réponse est sans doute tronquée.
const LIGNES_MIN = 1_500_000;

export const CITATION_WIKIDATA = "Wikidata, propriété P10585 « identifiant Catalogue of Life », interrogé par QLever";

export interface Documentation {
  photo: boolean;
  nomFrancais: boolean;
  wikipedia: "fr" | "en" | "";
  observations: number;
}

/** Score sur 10 (formule validée le 23.11.2026). */
export function score(d: Documentation): number {
  const photo = d.photo ? 3 : 0;
  const nom = d.nomFrancais ? 3 : 0;
  const article = d.wikipedia === "fr" ? 2 : d.wikipedia === "en" ? 1 : 0;
  const observations = d.observations >= 100_000 ? 2 : d.observations >= 1_000 ? 1 : 0;
  return photo + nom + article + observations;
}

/** Fiche complète (lot 4) : photo, nom français et article Wikipédia. */
export function bienDocumentee(d: Documentation): boolean {
  return d.photo && d.nomFrancais && d.wikipedia !== "";
}

/**
 * Nom français principal d'une espèce. Le Catalogue of Life ne marque aucun nom « préféré » ; quand
 * l'un de ses noms correspond au titre de l'article Wikipédia français, c'est presque toujours le
 * nom d'usage (« Seiche commune » plutôt que « Casseron ») ; sinon, le premier nom.
 */
export function nomPrincipal(noms: string[], titreWikipedia: string): string {
  const titre = normaliser(titreWikipedia.replaceAll("_", " ").replace(/\s*\([^()]*\)$/, ""));
  return (titre && noms.find((n) => normaliser(n) === titre)) || noms[0] || "";
}

/** Valeur d'une cellule TSV de QLever : « "4R5YN" » → 4R5YN, « <https://…/Q165145> » → https://…/Q165145. */
export function cellule(brut = ""): string {
  return brut.replace(/^"(.*)"$/, "$1").replace(/^<(.*)>$/, "$1");
}

/** Nom du fichier Commons dans une adresse Special:FilePath (décodé). */
export function fichierCommons(adresse: string): string {
  const nom = adresse.split("/Special:FilePath/")[1];
  return nom ? decodeURIComponent(nom) : "";
}

interface Wikidata {
  qid: string;
  photo: string;
  fr: string;
  en: string;
}

/** Interroge Wikidata (QLever) : photo et articles par identifiant Catalogue of Life. */
export async function wikidata(): Promise<Map<string, Wikidata>> {
  const reponse = await fetch(QLEVER, {
    method: "POST",
    headers: { "User-Agent": AGENT, Accept: "text/tab-separated-values", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ query: REQUETE }),
  });
  if (!reponse.ok) throw new Error(`QLever a répondu ${reponse.status} : ${(await reponse.text()).slice(0, 300)}`);
  const lignes = (await reponse.text()).split("\n").slice(1);
  const resultat = new Map<string, Wikidata>();
  for (const ligne of lignes) {
    if (!ligne) continue;
    const [col, item, photo, fr, en] = ligne.split("\t").map(cellule);
    if (!col) continue;
    resultat.set(col, {
      qid: (item ?? "").split("/").pop() ?? "",
      photo: fichierCommons(photo ?? ""),
      fr: decodeURIComponent((fr ?? "").split("/wiki/")[1] ?? ""),
      en: decodeURIComponent((en ?? "").split("/wiki/")[1] ?? ""),
    });
  }
  if (resultat.size < LIGNES_MIN) throw new Error(`Wikidata : ${resultat.size} espèces seulement (minimum attendu : ${LIGNES_MIN}).`);
  return resultat;
}

/** Table des espèces observées avec groupe, statut UICN et score ; renvoie les chiffres. */
export async function calculer(dossierCol: string, donnees: string) {
  const wd = await wikidata();
  const nomsFr = new Map<string, string[]>();
  for await (const n of lignesTsv(createReadStream(join(dossierCol, "noms.tsv")))) {
    if (n["langue"] !== "fr" || n["type"] !== "courant") continue;
    const id = n["taxon_id"] ?? "";
    const liste = nomsFr.get(id) ?? [];
    liste.push(n["nom"] ?? "");
    nomsFr.set(id, liste);
  }
  const groupes = new Map<string, string>();
  for await (const g of lignesTsv(createReadStream(join(donnees, "groupes.tsv")))) groupes.set(g["id"] ?? "", g["groupe"] ?? "");

  mkdirSync(donnees, { recursive: true });
  const sortie = createWriteStream(join(donnees, "especes.tsv"));
  const colonnes = ["id", "groupe", "uicn", "observations", "score", "bien_documentee", "nom_fr", "wikidata", "photo", "wikipedia_fr", "wikipedia_en"];
  sortie.write(colonnes.join("\t") + "\n");
  const chiffres = { especes: 0, dans_wikidata: 0, photo: 0, nom_fr: 0, wikipedia_fr: 0, wikipedia_en: 0, bien_documentees: 0 };
  const parScore = new Array<number>(11).fill(0);
  for await (const e of lignesTsv(createReadStream(join(donnees, "gbif", "especes.tsv")))) {
    const id = e["id"] ?? "";
    const w = wd.get(id);
    const nomFr = nomPrincipal(nomsFr.get(id) ?? [], w?.fr ?? "");
    const d: Documentation = {
      photo: Boolean(w?.photo),
      nomFrancais: Boolean(nomFr),
      wikipedia: w?.fr ? "fr" : w?.en ? "en" : "",
      observations: Number(e["observations"] ?? 0),
    };
    const s = score(d);
    const bien = bienDocumentee(d);
    chiffres.especes++;
    if (w) chiffres.dans_wikidata++;
    if (d.photo) chiffres.photo++;
    if (d.nomFrancais) chiffres.nom_fr++;
    if (w?.fr) chiffres.wikipedia_fr++;
    if (w?.en) chiffres.wikipedia_en++;
    if (bien) chiffres.bien_documentees++;
    parScore[s] = (parScore[s] ?? 0) + 1;
    const ligne = [id, groupes.get(id) ?? "", e["uicn"] ?? "NE", String(d.observations), String(s), bien ? "1" : "0", nomFr, w?.qid ?? "", w?.photo ?? "", w?.fr ?? "", w?.en ?? ""];
    if (!sortie.write(ligne.join("\t") + "\n")) await new Promise<void>((ok) => sortie.once("drain", () => ok()));
  }
  await new Promise<void>((ok) => sortie.end(() => ok()));
  return { ...chiffres, repartition_des_scores: parScore };
}

if (import.meta.main) {
  const dossierCol = process.argv[2];
  if (!dossierCol) {
    console.error("Utilisation : node tools/donnees/score.ts <dossier COL>");
    process.exit(1);
  }
  console.log(await calculer(dossierCol, "tools/donnees/data"));
}
