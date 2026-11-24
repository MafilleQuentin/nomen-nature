// Données des fiches espèces (lot 4, QUE-22), décidées le 23.11.2026 (journal des décisions) :
// une ligne par espèce observée, regroupées par genre dans NOMBRE_FICHIERS fichiers
// (fiches/<n>.json, format décrit dans src/lib/especes/fiche.ts). Une seule lecture donne au
// serveur la fiche et les autres espèces du genre.
//
// Pour chaque espèce : noms (latin, auteur, français, anglais), statut UICN, groupe,
// classification, observations dans le monde, nombre de pays, continent principal, Wikidata,
// photo Commons, articles Wikipédia, faits pour « Sais-tu ? » et jusqu'à 4 espèces proches :
// celles du même genre les mieux classées (score, puis observations), complétées par celles de
// la même famille.
//
// Faits : valeurs maximales de Wikidata (CC0) en unités du système international, par QLever :
// longévité (P2250 espérance de vie, P4214 longévité maximale observée), hauteur (P2048) ou
// longueur (P2043), masse (P2067), envergure (P2050).
//
// Utilisation seule : node tools/donnees/fiches.ts <dossier COL> <dossier de sortie>
import { createReadStream, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { adresseAvecIdentifiant, adresseEspece, fichierDeLAdresse, NOMBRE_FICHIERS } from "../../src/lib/especes/adresse.ts";
import { COLONNES_FICHE, type Faits, type FichierFiches } from "../../src/lib/especes/fiche.ts";
import { lignesTsv } from "./col.ts";
import { nomPrincipal } from "./score.ts";
import { AGENT } from "./zip.ts";

export const MAX_PROCHES = 4;

const QLEVER = "https://qlever.dev/api/wikidata";
const REQUETE_FAITS = `PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX p: <http://www.wikidata.org/prop/>
PREFIX psn: <http://www.wikidata.org/prop/statement/value-normalized/>
PREFIX wikibase: <http://wikiba.se/ontology#>
SELECT ?col (MAX(?vie) AS ?longevite) (MAX(?haut) AS ?taille) (MAX(?poids) AS ?masse) (MAX(?env) AS ?envergure) WHERE {
  ?item wdt:P10585 ?col .
  { ?item p:P2250/psn:P2250/wikibase:quantityAmount ?vie } UNION
  { ?item p:P4214/psn:P4214/wikibase:quantityAmount ?vie } UNION
  { ?item p:P2048/psn:P2048/wikibase:quantityAmount ?haut } UNION
  { ?item p:P2043/psn:P2043/wikibase:quantityAmount ?haut } UNION
  { ?item p:P2067/psn:P2067/wikibase:quantityAmount ?poids } UNION
  { ?item p:P2050/psn:P2050/wikibase:quantityAmount ?env }
} GROUP BY ?col`;
const SECONDES_PAR_AN = 365.25 * 24 * 3600;

export const CITATION_FAITS = "Wikidata (longévité P2250 et P4214, taille P2048 et P2043, masse P2067, envergure P2050), interrogé par QLever";

/** Valeur numérique d'une cellule TSV de QLever : « "12.5"^^<…#decimal> » → 12.5. */
export function nombreQlever(brut = ""): number | undefined {
  const m = /^"?(-?[0-9.eE+-]+)"?/.exec(brut.trim());
  const n = m ? Number(m[1]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Arrondi lisible : 3 chiffres significatifs (1 234 → 1 230, 0,04567 → 0,0457). */
export function arrondir(n: number): number {
  return Number(n.toPrecision(3));
}

/** Interroge QLever, en réessayant si le service est saturé (429) ou indisponible. */
async function qlever(requete: string, essais = 6): Promise<string> {
  for (let essai = 1; ; essai++) {
    const reponse = await fetch(QLEVER, {
      method: "POST",
      headers: { "User-Agent": AGENT, Accept: "text/tab-separated-values", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ query: requete }),
    });
    if (reponse.ok) return reponse.text();
    if (essai >= essais || (reponse.status !== 429 && reponse.status < 500)) {
      throw new Error(`QLever a répondu ${reponse.status} : ${(await reponse.text()).slice(0, 300)}`);
    }
    const attente = 30 * essai;
    console.log(`QLever a répondu ${reponse.status}, nouvel essai dans ${attente} s (${essai}/${essais - 1})`);
    await new Promise((ok) => setTimeout(ok, attente * 1000));
  }
}

/** Faits de Wikidata par identifiant Catalogue of Life. */
export async function faitsWikidata(): Promise<Map<string, Faits>> {
  const lignes = (await qlever(REQUETE_FAITS)).split("\n").slice(1);
  const resultat = new Map<string, Faits>();
  for (const ligne of lignes) {
    const [col, vie, haut, poids, env] = ligne.split("\t");
    const id = (col ?? "").replace(/^"(.*)"$/, "$1");
    if (!id) continue;
    const f: Faits = {};
    const longevite = nombreQlever(vie);
    const taille = nombreQlever(haut);
    const masse = nombreQlever(poids);
    const envergure = nombreQlever(env);
    // Longévité normalisée en secondes par Wikidata : en années, à partir d'un mois.
    if (longevite && longevite >= SECONDES_PAR_AN / 12) f.longevite = arrondir(longevite / SECONDES_PAR_AN);
    if (taille) f.taille = arrondir(taille);
    if (masse) f.masse = arrondir(masse);
    if (envergure) f.envergure = arrondir(envergure);
    if (Object.keys(f).length) resultat.set(id, f);
  }
  return resultat;
}

interface Espece {
  id: string;
  adresse: string;
  nom: string;
  auteur: string;
  nomFr: string;
  nomEn: string;
  uicn: string;
  groupe: string;
  regne: string;
  embranchement: string;
  classe: string;
  ordre: string;
  famille: string;
  genre: string;
  observations: number;
  score: number;
  pays: number;
  continent: string;
  wikidata: string;
  photo: string;
  wikipediaFr: string;
  wikipediaEn: string;
}

function ajouter<C, V>(table: Map<C, V[]>, cle: C, valeur: V): void {
  const liste = table.get(cle);
  if (liste) liste.push(valeur);
  else table.set(cle, [valeur]);
}

const ordre = (a: Espece, b: Espece) => b.score - a.score || b.observations - a.observations || (a.id < b.id ? -1 : 1);

/**
 * Espèces proches : les mieux classées du même genre, puis de la même famille (autres genres).
 * `genre` et `famille` sont déjà triées (score, puis observations).
 */
export function proches(
  e: { id: string; genre: string },
  genre: { id: string; genre: string }[],
  famille: { id: string; genre: string }[],
  max = MAX_PROCHES,
): string[] {
  const choisies: string[] = [];
  for (const autre of genre) {
    if (choisies.length >= max) return choisies;
    if (autre.id !== e.id) choisies.push(autre.id);
  }
  for (const autre of famille) {
    if (choisies.length >= max) return choisies;
    if (autre.genre !== e.genre) choisies.push(autre.id);
  }
  return choisies;
}

/**
 * Adresses de fiches, homonymes départagés : l'espèce la plus observée garde l'adresse simple,
 * les autres reçoivent leur identifiant à la fin.
 */
export function attribuerAdresses(especes: { id: string; nom: string; observations: number }[]): Map<string, string> {
  const parAdresse = new Map<string, { id: string; nom: string; observations: number }[]>();
  for (const e of especes) {
    const a = adresseEspece(e.nom);
    ajouter(parAdresse, a, e);
  }
  const adresses = new Map<string, string>();
  for (const [a, liste] of parAdresse) {
    liste.sort((x, y) => y.observations - x.observations || (x.id < y.id ? -1 : 1));
    liste.forEach((e, rang) => adresses.set(e.id, rang === 0 ? a : adresseAvecIdentifiant(e.nom, e.id)));
  }
  return adresses;
}

export async function construireFiches(dossierCol: string, donnees: string, sortie: string) {
  // 1. Espèces observées : statut, groupe, score, documentation (data/especes.tsv).
  const especes = new Map<string, Espece>();
  for await (const e of lignesTsv(createReadStream(join(donnees, "especes.tsv")))) {
    const id = e["id"] ?? "";
    especes.set(id, {
      id,
      adresse: "",
      nom: "",
      auteur: "",
      nomFr: e["nom_fr"] ?? "",
      nomEn: "",
      uicn: e["uicn"] || "NE",
      groupe: e["groupe"] ?? "",
      regne: "",
      embranchement: "",
      classe: "",
      ordre: "",
      famille: "",
      genre: "",
      observations: Number(e["observations"] ?? 0),
      score: Number(e["score"] ?? 0),
      pays: 0,
      continent: "",
      wikidata: e["wikidata"] ?? "",
      photo: e["photo"] ?? "",
      wikipediaFr: e["wikipedia_fr"] ?? "",
      wikipediaEn: e["wikipedia_en"] ?? "",
    });
  }

  // 2. Nom latin, auteur et classification (Catalogue of Life).
  for await (const t of lignesTsv(createReadStream(join(dossierCol, "taxons.tsv")))) {
    const e = t["rang"] === "species" ? especes.get(t["id"] ?? "") : undefined;
    if (!e) continue;
    e.nom = t["nom"] ?? "";
    e.auteur = t["auteur"] ?? "";
    e.regne = t["regne"] ?? "";
    e.embranchement = t["embranchement"] ?? "";
    e.classe = t["classe"] ?? "";
    e.ordre = t["ordre"] ?? "";
    e.famille = t["famille"] ?? "";
    e.genre = t["genre"] ?? "";
  }
  for (const [id, e] of especes) if (!e.nom) especes.delete(id);

  // 3. Nom anglais principal : celui qui correspond au titre de l'article Wikipédia anglais, sinon le premier.
  const nomsAnglais = new Map<string, string[]>();
  for await (const n of lignesTsv(createReadStream(join(dossierCol, "noms.tsv")))) {
    const id = n["taxon_id"] ?? "";
    if (n["langue"] !== "en" || n["type"] !== "courant" || !especes.has(id)) continue;
    nomsAnglais.set(id, [...(nomsAnglais.get(id) ?? []), n["nom"] ?? ""]);
  }
  for (const [id, noms] of nomsAnglais) {
    const e = especes.get(id);
    if (e) e.nomEn = nomPrincipal(noms, e.wikipediaEn);
  }

  // 4. Nombre de pays et continent principal (GBIF).
  for await (const c of lignesTsv(createReadStream(join(donnees, "gbif", "pays.tsv")))) {
    const e = especes.get(c["id"] ?? "");
    if (e && c["pays"] && c["pays"] !== "ZZ") e.pays++;
  }
  const maxContinent = new Map<string, number>();
  for await (const c of lignesTsv(createReadStream(join(donnees, "gbif", "continents.tsv")))) {
    const id = c["id"] ?? "";
    const e = especes.get(id);
    const n = Number(c["observations"] ?? 0);
    if (e && c["continent"] && n > (maxContinent.get(id) ?? 0)) {
      maxContinent.set(id, n);
      e.continent = c["continent"];
    }
  }

  // 5. Faits de Wikidata.
  const faits = await faitsWikidata();

  // 6. Adresses, puis espèces proches (genre, puis famille ; un même nom de genre peut exister dans deux règnes).
  const adresses = attribuerAdresses([...especes.values()]);
  const parGenre = new Map<string, Espece[]>();
  const parFamille = new Map<string, Espece[]>();
  for (const e of especes.values()) {
    e.adresse = adresses.get(e.id) ?? "";
    const g = `${e.regne}|${e.famille}|${e.genre}`;
    ajouter(parGenre, g, e);
    if (e.famille) ajouter(parFamille, `${e.regne}|${e.famille}`, e);
  }
  for (const liste of [...parGenre.values(), ...parFamille.values()]) liste.sort(ordre);

  // 7. Écriture : un fichier par numéro.
  const parFichier = new Map<number, Espece[]>();
  for (const e of especes.values()) {
    const n = fichierDeLAdresse(e.adresse);
    ajouter(parFichier, n, e);
  }
  rmSync(sortie, { recursive: true, force: true });
  mkdirSync(sortie, { recursive: true });
  const carte = (e: Espece) => [e.adresse, e.nom, e.nomFr, e.nomEn, e.uicn, e.groupe, e.photo];
  let plusGros = 0;
  let avecFaits = 0;
  let avecProches = 0;
  for (let n = 0; n < NOMBRE_FICHIERS; n++) {
    const liste = (parFichier.get(n) ?? []).sort((a, b) => (a.adresse < b.adresse ? -1 : 1));
    const fichier: FichierFiches = { colonnes: [...COLONNES_FICHE], lignes: [], cartes: {} };
    for (const e of liste) {
      const memeGenre = parGenre.get(`${e.regne}|${e.famille}|${e.genre}`) ?? [];
      const ids = proches(e, memeGenre, parFamille.get(`${e.regne}|${e.famille}`) ?? []);
      for (const id of ids) {
        const p = especes.get(id);
        if (p) fichier.cartes[id] = carte(p);
      }
      const f = faits.get(e.id) ?? {};
      if (Object.keys(f).length) avecFaits++;
      if (ids.length) avecProches++;
      fichier.lignes.push([
        e.id, e.adresse, e.nom, e.auteur, e.nomFr, e.nomEn, e.uicn, e.groupe, e.regne, e.embranchement, e.classe,
        e.ordre, e.famille, e.genre, e.observations, e.pays, e.continent, e.wikidata, e.photo, e.wikipediaFr,
        e.wikipediaEn, f, ids,
      ]);
    }
    const contenu = JSON.stringify(fichier);
    plusGros = Math.max(plusGros, contenu.length);
    writeFileSync(join(sortie, `${n}.json`), contenu);
  }
  return {
    fichiers: NOMBRE_FICHIERS,
    especes: especes.size,
    homonymes: [...especes.values()].filter((e) => e.adresse !== adresseEspece(e.nom)).length,
    avec_faits: avecFaits,
    avec_proches: avecProches,
    plus_gros_fichier_ko: Math.round(plusGros / 1024),
  };
}

if (import.meta.main) {
  const [dossierCol, sortie] = process.argv.slice(2);
  if (!dossierCol || !sortie) {
    console.error("Utilisation : node tools/donnees/fiches.ts <dossier COL> <dossier de sortie>");
    process.exit(1);
  }
  console.log(await construireFiches(dossierCol, "tools/donnees/data", sortie));
}
