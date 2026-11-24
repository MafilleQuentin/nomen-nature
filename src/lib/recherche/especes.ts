// Des résultats du moteur aux espèces proposées (lot 5, QUE-27) :
//
// 1. « Tu voulais dire… » : si aucun nom ne correspond par l'écriture (seulement par le son :
//    « boulot »), on cherche aussi avec le nom du meilleur résultat (« Bouleau ») et on ajoute ses
//    espèces à celles du texte tapé : bouleau verruqueux, pubescent…, comme dans la maquette.
// 2. Classement des espèces : le moteur du lot 1 ne connaît que la ressemblance des noms ; parmi
//    les bonnes correspondances (score plafonné à celui d'un « début de nom »), les espèces les
//    plus observées passent devant ; un nom identique garde un petit avantage.
// 3. Si le meilleur résultat est un genre (« birch » : Betula), ses espèces passent devant, comme
//    le genre passait devant au lot 1, y compris celles dont le nom ne commence pas par le texte
//    (« silver birch ») : les plus observées du genre sont prises dans son fichier de fiches. Pas
//    pour une famille : « muget » trouve les muges (Mugilidae) par le son, mais c'est le muguet,
//    bien plus observé, qu'on cherchait.
//
// Fonctions pures : le serveur leur donne l'index et les fiches (serveur.ts), l'outil
// d'évaluation les lit sur le disque. Depuis l'import de décembre 2026, chaque ligne d'espèce
// de l'index porte son résumé (adresse, observations, statut…) : plus besoin de lire les fiches,
// sauf celles du genre visé (un seul fichier).
import { rechercher, type ResumeEspece, type Resultat, type Source } from "./moteur.ts";
import { normaliser } from "./phonetique.ts";

const PLAFOND = 60;
const BONUS_IDENTIQUE = 8;
const POIDS_OBSERVATIONS = 8;
const BONUS_GENRE_VISE = 20;
const CORRESPONDANCES_ECRITES = new Set(["identique", "début", "début de mot"]);

export interface EspeceTrouvee {
  resultat: Resultat;
  /** L'espèce : résumé de l'index, ou sa fiche si l'index n'a pas de résumé. */
  fiche: ResumeEspece;
  rang: number;
}

const ecrit = (r: Resultat) => r.raisons.some((raison) => CORRESPONDANCES_ECRITES.has(raison));

/** Le nom à chercher en plus (« Bouleau » pour « boulot »), ou une chaîne vide. */
export function correction(texte: string, resultats: Resultat[]): string {
  const meilleur = resultats[0];
  if (!meilleur || resultats.slice(0, 10).some(ecrit)) return "";
  return normaliser(meilleur.nomTrouve) === normaliser(texte) ? "" : meilleur.nomTrouve;
}

/** Note de classement d'une espèce : ressemblance plafonnée, puis observations. */
export function noteEspece(resultat: Resultat, observations: number): number {
  const identique = resultat.raisons.includes("identique") ? BONUS_IDENTIQUE : 0;
  return Math.min(resultat.score, PLAFOND) + identique + POIDS_OBSERVATIONS * Math.log10(1 + observations);
}

export interface Trouvailles {
  /** Ce qu'on propose dans « Tu voulais dire… » (« bouleau »), ou vide si le texte a été trouvé tel quel. */
  correction: string;
  especes: EspeceTrouvee[];
}

/**
 * Espèces pour un texte, les mieux classées d'abord (au plus `limite`). `ficheDe` donne la fiche
 * d'un résultat (ou undefined). Les genres et familles servent au classement du moteur mais ne
 * sont pas renvoyés : ils n'ont pas de page.
 */
export async function chercherEspeces(
  source: Source,
  texte: string,
  langueSite: "fr" | "en",
  ficheDe: (resultat: Resultat) => Promise<ResumeEspece | undefined>,
  limite = 8,
  candidates = 60,
  especesDuGenre?: (genre: Resultat) => Promise<ResumeEspece[]>,
): Promise<Trouvailles> {
  const tapes = await rechercher(source, texte, langueSite, candidates);
  const corrige = correction(texte, tapes);
  const corriges = corrige ? await rechercher(source, corrige, langueSite, candidates) : [];

  // Genre visé : le meilleur résultat (de la recherche corrigée, s'il y en a une), si c'est un genre.
  const meilleur = (corrige ? corriges : tapes)[0];
  const genreVise = meilleur?.rang === "genus" ? meilleur.scientifique : "";

  // Les espèces des deux recherches, chacune avec son meilleur score.
  const parTaxon = new Map<string, { resultat: Resultat; corrigee: boolean }>();
  for (const [liste, corrigee] of [[tapes, false], [corriges, true]] as const) {
    for (const resultat of liste) {
      if (resultat.rang !== "species") continue;
      const connu = parTaxon.get(resultat.taxon);
      if (!connu || resultat.score > connu.resultat.score) parTaxon.set(resultat.taxon, { resultat, corrigee });
    }
  }
  const especes: (EspeceTrouvee & { corrigee: boolean })[] = [];
  const fiches = new Map<string, ResumeEspece>();
  // Les espèces les plus observées du genre visé, même si leur nom n'a pas été trouvé.
  if (genreVise && meilleur && especesDuGenre) {
    for (const fiche of await especesDuGenre(meilleur)) {
      fiches.set(fiche.id, fiche);
      if (parTaxon.has(fiche.id)) continue;
      const resultat: Resultat = {
        taxon: fiche.id,
        scientifique: fiche.nom,
        rang: "species",
        genre: fiche.genre,
        famille: fiche.famille,
        nomTrouve: meilleur.nomTrouve,
        langue: meilleur.langue,
        score: Math.min(meilleur.score, PLAFOND),
        raisons: [...meilleur.raisons.filter((r) => !r.includes("membres")), "espèce du genre"],
      };
      parTaxon.set(fiche.id, { resultat, corrigee: Boolean(corrige) });
    }
  }
  for (const { resultat, corrigee } of parTaxon.values()) {
    // Le résumé de l'index d'abord : lire une fiche coûte un fichier de 150 Ko à 1 Mo.
    const fiche = fiches.get(resultat.taxon) ?? resultat.espece ?? (await ficheDe(resultat));
    if (!fiche) continue;
    const rang = noteEspece(resultat, fiche.observations) + (genreVise && resultat.genre === genreVise ? BONUS_GENRE_VISE : 0);
    especes.push({ resultat, fiche, rang, corrigee });
  }
  especes.sort((a, b) => b.rang - a.rang);

  // « Tu voulais dire » : le mot corrigé si la première espèce vient de lui, sinon le nom de la
  // première espèce quand elle n'a été trouvée que par le son.
  const premiere = especes[0];
  const proposee = !premiere ? "" : premiere.corrigee ? corrige : ecrit(premiere.resultat) ? "" : premiere.resultat.nomTrouve;
  return {
    correction: normaliser(proposee) === normaliser(texte) ? "" : proposee,
    especes: especes.slice(0, limite).map(({ resultat, fiche, rang }) => ({ resultat, fiche, rang })),
  };
}
