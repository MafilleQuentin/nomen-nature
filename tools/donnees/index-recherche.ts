// Index de la recherche en fichiers statiques (lot 3, QUE-18). Reprend en TypeScript
// tools/essai-recherche/construire_index.py (lot 1), sans SQLite, avec le verdict du lot 1 :
// sans synonymes latins, fichiers d'environ 64 Ko, et la décision de la note Données :
// seulement les espèces observées (GBIF), en fichiers .txt (compressés par Cloudflare).
//
// Entrées : data/col/<clé>/taxons.tsv et noms.tsv (col.ts), data/gbif/especes.tsv (gbif.ts).
// Sortie, dans data/index/ :
// - noms/NNNN.txt : les entrées triées par nom normalisé (« chene pedoncule ») ;
// - cles/NNNN.txt : les mêmes, triées par langue + clé phonétique (« fr|bUlo ») ;
// - courts/NNNN.txt : pour chaque début de 3 lettres (ou de 3 sons), les 30 entrées les plus
//   connues ; sans lui, « che » ne verrait que les premiers noms de l'alphabet (Chelonia…) ;
// - manifeste.json : la première clé de chaque fichier (pour trouver le bon par dichotomie),
//   et sa taille compressée (gzip et brotli).
// Une ligne : tri, nom affiché, langue, type, taxon, rang, nom scientifique, genre, famille,
// notoriété. Les infos du taxon sont recopiées sur chaque ligne : une recherche n'a besoin que
// d'un fichier, et la compression efface l'essentiel des répétitions.
//
// Notoriété : pour l'instant, comme au lot 1, le nombre de noms courants du taxon. Le score
// « bien documentée » (QUE-20) la remplacera.
//
// Utilisation : node tools/donnees/index-recherche.ts <dossier COL> [taille cible en octets]
import { createReadStream, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { constants, brotliCompressSync, gzipSync } from "node:zlib";
import { cle, normaliser, type LangueNom } from "../../src/lib/recherche/phonetique.ts";
import { lignesTsv } from "./col.ts";

export const PREFIXE_COURT = 3;
export const PAR_PREFIXE_COURT = 30;
const TAILLE_CIBLE = 64 * 1024;

interface Entree {
  tri: string;
  ligne: string;
  notoriete: number;
}

export interface Dictionnaire {
  premiers: string[];
  tailles_gz: number[];
  tailles_br: number[];
  brut: number;
  gz: number;
  br: number;
}

const comparer = (a: Entree, b: Entree) => (a.tri < b.tri ? -1 : a.tri > b.tri ? 1 : 0);

/** Pour chaque début de `longueur` caractères, les entrées les plus connues (puis les plus courtes). */
export function debutsCourts(entrees: Entree[], groupe: string, longueur: number): Entree[] {
  const parPrefixe = new Map<string, Entree[]>();
  for (const e of entrees) {
    if (e.tri.length < longueur) continue;
    const prefixe = e.tri.slice(0, longueur);
    const liste = parPrefixe.get(prefixe) ?? [];
    liste.push(e);
    parPrefixe.set(prefixe, liste);
  }
  const courts: Entree[] = [];
  for (const [prefixe, liste] of parPrefixe) {
    liste.sort((a, b) => b.notoriete - a.notoriete || a.tri.length - b.tri.length);
    liste.slice(0, PAR_PREFIXE_COURT).forEach((e, i) => {
      const cleGroupe = `${groupe}${prefixe}`;
      courts.push({ tri: `${cleGroupe}\t${String(i + 1).padStart(3, "0")}`, ligne: `${cleGroupe}\t${e.ligne}`, notoriete: e.notoriete });
    });
  }
  return courts;
}

/** Écrit un dictionnaire en fichiers d'environ `tailleCible` octets, sans couper un groupe. */
export function ecrireDictionnaire(entrees: Entree[], dossier: string, tailleCible: number): Dictionnaire {
  mkdirSync(dossier, { recursive: true });
  entrees.sort(comparer);
  const d: Dictionnaire = { premiers: [], tailles_gz: [], tailles_br: [], brut: 0, gz: 0, br: 0 };
  let tampon: string[] = [];
  let taille = 0;
  let premier = "";
  let precedent: string | undefined;
  const vider = () => {
    if (!tampon.length) return;
    const contenu = Buffer.from(tampon.join("\n") + "\n", "utf8");
    writeFileSync(join(dossier, `${String(d.premiers.length).padStart(4, "0")}.txt`), contenu);
    const gz = gzipSync(contenu, { level: 9 }).length;
    // Qualité moyenne : plus proche de la compression à la volée de Cloudflare que la qualité
    // maximale (11), qui prenait plus de 10 minutes sur les ~10 000 fichiers de l'index.
    const br = brotliCompressSync(contenu, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }).length;
    d.premiers.push(premier);
    d.tailles_gz.push(gz);
    d.tailles_br.push(br);
    d.brut += contenu.length;
    d.gz += gz;
    d.br += br;
    tampon = [];
    taille = 0;
  };
  for (const { tri, ligne } of entrees) {
    // Jamais de coupure au milieu d'une même clé de tri : toutes ses lignes restent ensemble.
    const groupe = tri.split("\t", 1)[0] ?? tri;
    if (taille >= tailleCible && groupe !== precedent) vider();
    if (!tampon.length) premier = groupe;
    tampon.push(ligne);
    taille += Buffer.byteLength(ligne) + 1;
    precedent = groupe;
  }
  vider();
  return d;
}

export async function construire(dossierCol: string, fichierEspeces: string, sortie: string, tailleCible = TAILLE_CIBLE) {
  const debut = Date.now();
  // 1. Espèces observées (GBIF), puis les genres et familles qui en contiennent au moins une.
  const observees = new Set<string>();
  for await (const e of lignesTsv(createReadStream(fichierEspeces))) observees.add(e["id"] ?? "");

  interface Taxon {
    rang: string;
    nom: string;
    genre: string;
    famille: string;
  }
  const taxons = new Map<string, Taxon>();
  const genresObserves = new Set<string>();
  const famillesObservees = new Set<string>();
  const enAttente: [string, Taxon, string][] = []; // genres et familles, tranchés après les espèces
  for await (const t of lignesTsv(createReadStream(join(dossierCol, "taxons.tsv")))) {
    const taxon = { rang: t["rang"] ?? "", nom: t["nom"] ?? "", genre: t["genre"] ?? "", famille: t["famille"] ?? "" };
    const regne = t["regne"] ?? "";
    if (taxon.rang === "species") {
      if (!observees.has(t["id"] ?? "")) continue;
      taxons.set(t["id"] ?? "", taxon);
      genresObserves.add(`${regne}|${taxon.genre}`);
      famillesObservees.add(`${regne}|${taxon.famille}`);
    } else {
      enAttente.push([t["id"] ?? "", taxon, regne]);
    }
  }
  for (const [id, taxon, regne] of enAttente) {
    const garde = taxon.rang === "genus" ? genresObserves : famillesObservees;
    if (garde.has(`${regne}|${taxon.nom}`)) taxons.set(id, taxon);
  }

  // 2. Noms des taxons gardés, et notoriété (nombre de noms courants).
  const noms: { taxon: string; nom: string; langue: LangueNom; type: string }[] = [];
  const notoriete = new Map<string, number>();
  for await (const n of lignesTsv(createReadStream(join(dossierCol, "noms.tsv")))) {
    const taxon = n["taxon_id"] ?? "";
    if (!taxons.has(taxon)) continue;
    noms.push({ taxon, nom: n["nom"] ?? "", langue: (n["langue"] ?? "la") as LangueNom, type: n["type"] ?? "" });
    if (n["type"] === "courant") notoriete.set(taxon, (notoriete.get(taxon) ?? 0) + 1);
  }

  // 3. Entrées des dictionnaires « noms » et « clés ».
  const parNom: Entree[] = [];
  const parCle: Entree[] = [];
  let introuvables = 0;
  for (const { taxon, nom, langue, type } of noms) {
    const t = taxons.get(taxon);
    if (!t) continue;
    const nomNormalise = normaliser(nom);
    // Nom sans aucune lettre latine (ex. chinois étiqueté « anglais » dans le Catalogue of Life) :
    // vide une fois normalisé, il ne pourrait jamais être trouvé.
    if (!nomNormalise) {
      introuvables++;
      continue;
    }
    const n = notoriete.get(taxon) ?? 0;
    const reste = [nom, langue, type, taxon, t.rang, t.nom, t.genre, t.famille, String(n)].join("\t");
    parNom.push({ tri: nomNormalise, ligne: `${nomNormalise}\t${reste}`, notoriete: n });
    const k = cle(nom, langue);
    if (k) {
      const triCle = `${langue}|${k}`;
      parCle.push({ tri: triCle, ligne: `${triCle}\t${reste}`, notoriete: n });
    }
  }
  // Pour les clés, le début porte sur le son, après « fr| » : « fr|bUl ».
  const courts = [...debutsCourts(parNom, "n", PREFIXE_COURT), ...debutsCourts(parCle, "c", PREFIXE_COURT + 3)];

  // 4. Fichiers et manifeste.
  rmSync(sortie, { recursive: true, force: true });
  const dictionnaires: Record<string, Dictionnaire> = {
    noms: ecrireDictionnaire(parNom, join(sortie, "noms"), tailleCible),
    cles: ecrireDictionnaire(parCle, join(sortie, "cles"), tailleCible),
    courts: ecrireDictionnaire(courts, join(sortie, "courts"), tailleCible),
  };
  const manifeste = { taille_cible: tailleCible, prefixe_court: PREFIXE_COURT, extension: ".txt", dictionnaires };
  writeFileSync(join(sortie, "manifeste.json"), JSON.stringify(manifeste));
  const fichiers = Object.values(dictionnaires).reduce((s, d) => s + d.premiers.length, 1);
  return {
    especes: [...taxons.values()].filter((t) => t.rang === "species").length,
    genres: [...taxons.values()].filter((t) => t.rang === "genus").length,
    familles: [...taxons.values()].filter((t) => t.rang === "family").length,
    noms_total: noms.length,
    noms_sans_lettre_latine: introuvables,
    fichiers,
    ...Object.fromEntries(
      Object.entries(dictionnaires).map(([nom, d]) => [
        nom,
        `${d.premiers.length} fichiers, ${(d.brut / 1e6).toFixed(0)} Mo bruts, ${(d.gz / 1e6).toFixed(0)} Mo gzip, ${(d.br / 1e6).toFixed(0)} Mo brotli`,
      ]),
    ),
    secondes: Math.round((Date.now() - debut) / 1000),
  };
}

if (import.meta.main) {
  const [dossierCol, taille] = process.argv.slice(2);
  if (!dossierCol) {
    console.error("Utilisation : node tools/donnees/index-recherche.ts <dossier COL> [taille cible en octets]");
    process.exit(1);
  }
  console.log(await construire(dossierCol, "tools/donnees/data/gbif/especes.tsv", "tools/donnees/data/index", taille ? Number(taille) : undefined));
}
