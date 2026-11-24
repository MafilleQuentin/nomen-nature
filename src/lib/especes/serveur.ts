// Lecture des données d'une fiche espèce par le serveur (Worker Cloudflare), lot 4, QUE-22.
//
// - Fichier de fiches : lu dans les fichiers du site (/donnees/fiches/<n>.json) par le
//   binding ASSETS, sans requête vers l'extérieur ; les derniers fichiers lus restent en
//   mémoire tant que le Worker tourne (lecture et analyse évitées pour les fiches voisines).
// - Résumé Wikipédia : API REST de Wikipédia, appelée par notre serveur (le navigateur du
//   visiteur ne contacte pas Wikipédia). En cas d'échec ou de lenteur, la fiche s'affiche
//   sans résumé. Le cache des réponses viendra avec QUE-26.
import { env } from "cloudflare:workers";
import type { Langue } from "../../i18n/langues.ts";
import { cheminDuFichier, trouverFiche, type FichierFiches } from "./fiche.ts";

const AGENT = "NomenNature/0.8 (+https://nomenature.org)";
const MAX_EN_MEMOIRE = 16;
const memoire = new Map<string, FichierFiches>();

async function lireFichier(chemin: string, origine: URL): Promise<FichierFiches | undefined> {
  const connu = memoire.get(chemin);
  if (connu) return connu;
  const adresse = new URL(chemin, origine);
  // ASSETS en ligne et avec Wrangler ; sinon (astro dev), le serveur de développement sert public/.
  const reponse = env?.ASSETS ? await env.ASSETS.fetch(adresse) : await fetch(adresse);
  if (!reponse.ok) return undefined;
  const fichier = (await reponse.json()) as FichierFiches;
  memoire.set(chemin, fichier);
  if (memoire.size > MAX_EN_MEMOIRE) memoire.delete(memoire.keys().next().value ?? "");
  return fichier;
}

/** La fiche d'une adresse et ses espèces proches, ou undefined si elle n'existe pas. */
export async function lireFiche(adresse: string, origine: URL) {
  const fichier = await lireFichier(cheminDuFichier(adresse), origine);
  return fichier ? trouverFiche(fichier, adresse) : undefined;
}

export interface Resume {
  texte: string;
  lien: string;
  langue: Langue;
}

/** Résumé de l'article Wikipédia (introduction), ou undefined. */
export async function resumeWikipedia(titre: string, langue: Langue): Promise<Resume | undefined> {
  if (!titre) return undefined;
  try {
    const reponse = await fetch(`https://${langue}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titre)}`, {
      headers: { "User-Agent": AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(2500),
    });
    if (!reponse.ok) return undefined;
    const donnees = (await reponse.json()) as { type?: string; extract?: string; content_urls?: { desktop?: { page?: string } } };
    if (donnees.type === "disambiguation" || !donnees.extract) return undefined;
    return {
      texte: donnees.extract,
      lien: donnees.content_urls?.desktop?.page ?? `https://${langue}.wikipedia.org/wiki/${encodeURIComponent(titre)}`,
      langue,
    };
  } catch {
    return undefined;
  }
}
