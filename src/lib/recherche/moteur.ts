// Moteur de la recherche (lot 5, QUE-27) : traduction en TypeScript de l'essai du lot 1
// (tools/essai-recherche/recherche_fichiers.py et le score de recherche.py), qui donnait 39 bonnes
// réponses sur 40 dans les 5 premiers résultats. Même découpage, même score, même tri ; seule
// différence : le bonus de langue suit la langue du site (le lot 1 ne connaissait que le français).
//
// 1. La table de l'index (manifeste) donne la première clé de chaque fichier : on trouve par
//    dichotomie le ou les fichiers qui contiennent les entrées commençant par le texte tapé.
// 2. On lit au plus MAX_FICHIERS fichiers par dictionnaire :
//    - noms/ pour le début du nom normalisé (« chene ped ») ;
//    - cles/ pour le début de la clé phonétique, dans chaque langue (« fr|bUlo ») ;
//    - courts/ pour un texte court : les 30 entrées les plus connues de ce début.
// 3. Chaque nom candidat reçoit un score ; chaque taxon garde son meilleur nom ; un genre ou une
//    famille dont plusieurs membres ressortent remonte.
//
// Le moteur ne sait pas d'où viennent les fichiers (serveur, tests) : on lui passe une `Source`.
import { cle, normaliser, type LangueNom } from "./phonetique.ts";

export const LANGUES: readonly LangueNom[] = ["fr", "la", "en"];
const POINTS_MEME_SON: Record<LangueNom, number> = { fr: 70, la: 70, en: 55 };
const POINTS_DEBUT_SON: Record<LangueNom, number> = { fr: 35, la: 35, en: 25 };
const BONUS_PAR_MEMBRE = 15;
const MEMBRES_MAX = 3;
const MAX_FICHIERS = 3;
const LONGUEUR_COURTE = 5;
const MAX_CANDIDATS = 300;

/** Bonus de langue : la langue du site d'abord, puis le latin, puis l'autre langue. */
export function bonusLangue(langueSite: "fr" | "en"): Record<LangueNom, number> {
  return langueSite === "fr" ? { fr: 6, la: 4, en: 3 } : { en: 6, la: 4, fr: 3 };
}

export interface Manifeste {
  extension: string;
  dictionnaires: Record<"noms" | "cles" | "courts", { premiers: string[] }>;
}

/** D'où viennent la table et les fichiers de l'index. */
export interface Source {
  manifeste: Manifeste;
  /** Lignes d'un fichier (déjà découpées en colonnes). */
  lire(dictionnaire: "noms" | "cles" | "courts", numero: number): Promise<string[][]>;
}

/**
 * Ce qu'il faut pour proposer une espèce (lot 5) : écrit dans les lignes de l'index par l'import
 * (colonnes après la notoriété), pour ne pas avoir à lire sa fiche. Absent d'un index plus ancien.
 */
export interface ResumeEspece {
  id: string;
  adresse: string;
  nom: string;
  nomFr: string;
  nomEn: string;
  uicn: string;
  groupe: string;
  observations: number;
  genre: string;
  famille: string;
}

export interface Resultat {
  /** Résumé de l'espèce, si l'index le contient. */
  espece?: ResumeEspece;
  taxon: string;
  scientifique: string;
  rang: string;
  genre: string;
  famille: string;
  /** Le nom qui a été trouvé (courant ou latin) et sa langue. */
  nomTrouve: string;
  langue: LangueNom;
  score: number;
  raisons: string[];
}

/** Dichotomie : dernier indice dont la valeur est <= cle (comme bisect_right − 1). */
function dernierAvant(premiers: string[], cleCherchee: string): number {
  let bas = 0;
  let haut = premiers.length;
  while (bas < haut) {
    const milieu = (bas + haut) >> 1;
    if ((premiers[milieu] ?? "") <= cleCherchee) bas = milieu + 1;
    else haut = milieu;
  }
  return Math.max(0, bas - 1);
}

/** Numéros des fichiers pouvant contenir des clés qui commencent par `prefixe`. */
export function fichiersPour(premiers: string[], prefixe: string): number[] {
  let i = dernierAvant(premiers, prefixe);
  const numeros = [i];
  while (numeros.length < MAX_FICHIERS && i + 1 < premiers.length && (premiers[i + 1] ?? "").startsWith(prefixe)) {
    i++;
    numeros.push(i);
  }
  return numeros;
}

async function entrees(source: Source, dico: "noms" | "cles", prefixe: string): Promise<string[][]> {
  const trouvees: string[][] = [];
  for (const numero of fichiersPour(source.manifeste.dictionnaires[dico].premiers, prefixe)) {
    for (const ligne of await source.lire(dico, numero)) if ((ligne[0] ?? "").startsWith(prefixe)) trouvees.push(ligne);
  }
  return trouvees;
}

async function entreesCourtes(source: Source, groupe: string, debut: string): Promise<string[][]> {
  const trouvees: string[][] = [];
  for (const numero of fichiersPour(source.manifeste.dictionnaires.courts.premiers, groupe)) {
    for (const ligne of await source.lire("courts", numero)) {
      if (ligne[0] === groupe && (ligne[1] ?? "").startsWith(debut)) trouvees.push(ligne.slice(1));
    }
  }
  return trouvees;
}

/** Lignes candidates : (tri, nom, langue, type, taxon, rang, scientifique, genre, famille, notoriété). */
export async function candidats(source: Source, texte: string): Promise<string[][]> {
  const lignes: string[][] = [];
  const q = normaliser(texte);
  if (q.length >= 3) {
    lignes.push(...(await entrees(source, "noms", q)).slice(0, MAX_CANDIDATS));
    if (q.length <= LONGUEUR_COURTE) lignes.push(...(await entreesCourtes(source, `n${q.slice(0, 3)}`, q)));
  }
  for (const langue of LANGUES) {
    const k = cle(texte, langue);
    if (k.replace(/ /g, "").length < 3) continue;
    const tri = `${langue}|${k}`;
    lignes.push(...(await entrees(source, "cles", tri)).slice(0, MAX_CANDIDATS));
    if (k.length <= LONGUEUR_COURTE) lignes.push(...(await entreesCourtes(source, `c${tri.slice(0, 6)}`, tri)));
  }
  return lignes;
}

/** Résumé d'une espèce lu dans les colonnes 10 à 15 d'une ligne de l'index, s'il y est. */
export function resumeDeLigne(ligne: string[]): ResumeEspece | undefined {
  const [, , , , taxon = "", rang = "", scientifique = "", genre = "", famille = "", , adresse = "", observations = "0", uicn = "", groupe = "", nomFr = "", nomEn = ""] = ligne;
  if (rang !== "species" || !adresse) return undefined;
  return { id: taxon, adresse, nom: scientifique, nomFr, nomEn, uicn: uicn || "NE", groupe, observations: Number(observations) || 0, genre, famille };
}

/** Score d'un nom pour un texte (même règle que le lot 1). */
export function scoreNom(texte: string, nom: string, langue: LangueNom, typeNom: string, bonus: Record<LangueNom, number>): { points: number; raisons: string[] } {
  const q = normaliser(texte);
  const n = normaliser(nom);
  const k = cle(texte, langue);
  const cleNom = cle(nom, langue);
  let points = 0;
  let raisons: string[] = [];
  if (n === q) [points, raisons] = [100, ["identique"]];
  else if (n.startsWith(q)) [points, raisons] = [60, ["début"]];
  else if (` ${n}`.includes(` ${q}`)) [points, raisons] = [40, ["début de mot"]];
  if (cleNom === k) [points, raisons] = [Math.max(points, POINTS_MEME_SON[langue]), [...raisons, "même son"]];
  else if (k && cleNom.startsWith(k)) [points, raisons] = [Math.max(points, POINTS_DEBUT_SON[langue]), [...raisons, "début du son"]];
  if (!raisons.length) [points, raisons] = [15, ["morceau"]];
  points += bonus[langue];
  if (typeNom === "synonyme") points -= 10;
  points -= 0.5 * Math.max(0, n.length - q.length);
  return { points, raisons };
}

/**
 * Recherche : les taxons les mieux classés (espèces, genres, familles), au plus `limite`.
 * `langueSite` règle le bonus de langue.
 */
export async function rechercher(source: Source, texte: string, langueSite: "fr" | "en", limite = 5): Promise<Resultat[]> {
  const bonus = bonusLangue(langueSite);
  const meilleurs = new Map<string, Resultat>();

  const noter = async (recherche: string, facteur: number, raison?: string) => {
    for (const ligne of await candidats(source, recherche)) {
      const [, nom = "", langue = "fr", typeNom = "", taxon = "", rang = "", scientifique = "", genre = "", famille = "", notoriete = "0"] = ligne;
      const langueNom = (LANGUES as readonly string[]).includes(langue) ? (langue as LangueNom) : "fr";
      const { points: base, raisons } = scoreNom(recherche, nom, langueNom, typeNom, bonus);
      const points = base * facteur + 2 * Math.min(Number.parseInt(notoriete, 10) || 0, 15);
      const avecRaison = raison ? [...raisons, raison] : raisons;
      const connu = meilleurs.get(taxon);
      if (!connu || points > connu.score) {
        const espece = resumeDeLigne(ligne);
        meilleurs.set(taxon, { ...(espece ? { espece } : {}), taxon, scientifique, rang, genre, famille, nomTrouve: nom, langue: langueNom, score: points, raisons: avecRaison });
      }
    }
  };

  await noter(texte, 1);
  // Repli mot par mot : « cèpe de bordeaux » alors que les données ne connaissent que « Cèpe ».
  if (!meilleurs.size) {
    for (const mot of normaliser(texte).split(" ")) if (mot.length >= 4) await noter(mot, 0.6, `mot « ${mot} » seul`);
  }

  const resultats = [...meilleurs.values()];
  // Un genre (ou une famille) gagne des points pour chacun de ses membres trouvés.
  for (const r of resultats) {
    if (r.rang !== "genus" && r.rang !== "family") continue;
    const membres = resultats.filter((autre) => autre !== r && (r.rang === "genus" ? autre.genre : autre.famille) === r.scientifique).length;
    if (membres) {
      r.score += BONUS_PAR_MEMBRE * Math.min(membres, MEMBRES_MAX);
      r.raisons.push(`${membres} membres trouvés`);
    }
  }
  resultats.sort((a, b) => b.score - a.score);
  return resultats.slice(0, limite);
}
