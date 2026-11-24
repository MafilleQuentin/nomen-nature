// Lecture des données d'une fiche espèce par le serveur (Worker Cloudflare), lot 4, QUE-22.
//
// - Fichier de fiches : lu dans les fichiers du site (/donnees/fiches/<n>.json) par le
//   binding ASSETS, sans requête vers l'extérieur ; les derniers fichiers lus restent en
//   mémoire tant que le Worker tourne (lecture et analyse évitées pour les fiches voisines).
// - Résumé Wikipédia : API REST de Wikipédia, appelée par notre serveur (le navigateur du
//   visiteur ne contacte pas Wikipédia). En cas d'échec ou de lenteur, la fiche s'affiche
//   sans résumé.
// - GBIF (fiche courte, QUE-23) : année de la dernière observation (API des cartes, avec notre
//   identifiant du Catalogue of Life) et page de l'espèce sur gbif.org (recherche du nom).
//   Même principe : appelés par notre serveur, et la fiche s'affiche sans eux en cas d'échec.
// - Photos (QUE-24) : auteur et licence demandés à l'API de Commons (un seul appel pour la fiche
//   et ses espèces proches) ; sinon, photo par défaut du taxon sur iNaturalist.
// - Cache (QUE-26) : chaque réponse réussie est gardée dans le cache de Cloudflare : Commons,
//   iNaturalist (qui demande 60 requêtes par minute au plus) et la page GBIF 30 jours, Wikipédia
//   7 jours, la carte et la dernière observation un jour.
import { env } from "cloudflare:workers";
import type { Langue } from "../../i18n/langues.ts";
import { cheminDuFichier, trouverFiche, type FichierFiches } from "./fiche.ts";
import {
  apercuCommons,
  licenceInaturalist,
  nomCommons,
  relaisCommons,
  relaisInaturalist,
  srcsetCommons,
  TAILLES_INATURALIST,
  texteBrut,
  type Photo,
} from "./photos.ts";

export const AGENT = "NomenNature/0.8 (+https://nomenature.org)";
const UN_JOUR = 24 * 3600;
const SEPT_JOURS = 7 * UN_JOUR;
const TRENTE_JOURS = 30 * UN_JOUR;

/** Cache de Cloudflare (absent hors du Worker : tests, construction). */
function cacheCloudflare(): Cache | undefined {
  return typeof caches !== "undefined" && "default" in caches ? (caches as unknown as { default: Cache }).default : undefined;
}

/**
 * Réponse JSON d'une API, gardée `duree` secondes dans le cache de Cloudflare (seulement les
 * réponses réussies). Délai de 2,5 s ; undefined en cas d'échec.
 */
export async function jsonEnCache<T>(adresse: string, duree = TRENTE_JOURS): Promise<T | undefined> {
  const cache = cacheCloudflare();
  try {
    const connue = await cache?.match(adresse);
    if (connue) return (await connue.json()) as T;
    const reponse = await fetch(adresse, { headers: { "User-Agent": AGENT, Accept: "application/json" }, signal: AbortSignal.timeout(2500) });
    if (!reponse.ok) return undefined;
    const texte = await reponse.text();
    await cache?.put(adresse, new Response(texte, { headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${duree}` } }));
    return JSON.parse(texte) as T;
  } catch {
    return undefined;
  }
}
const MAX_EN_MEMOIRE = 16;
const memoire = new Map<string, FichierFiches>();

/** Lit un fichier du site (dist/) : par le binding ASSETS en ligne, sinon par le réseau (astro dev). */
export async function lireFichierDuSite(chemin: string, origine: URL): Promise<Response> {
  const adresse = new URL(chemin, origine);
  return env?.ASSETS ? env.ASSETS.fetch(adresse) : fetch(adresse);
}

/** Un fichier de fiches (/donnees/fiches/<n>.json), gardé en mémoire. */
export async function lireFichier(chemin: string, origine: URL): Promise<FichierFiches | undefined> {
  const connu = memoire.get(chemin);
  if (connu) return connu;
  const reponse = await lireFichierDuSite(chemin, origine);
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

/** Résumé de l'article Wikipédia (introduction), ou undefined ; gardé 7 jours dans le cache. */
export async function resumeWikipedia(titre: string, langue: Langue): Promise<Resume | undefined> {
  if (!titre) return undefined;
  const donnees = await jsonEnCache<{ type?: string; extract?: string; content_urls?: { desktop?: { page?: string } } }>(
    `https://${langue}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titre)}`,
    SEPT_JOURS,
  );
  if (!donnees || donnees.type === "disambiguation" || !donnees.extract) return undefined;
  return {
    texte: donnees.extract,
    lien: donnees.content_urls?.desktop?.page ?? `https://${langue}.wikipedia.org/wiki/${encodeURIComponent(titre)}`,
    langue,
  };
}

const LISTE_COL_XR = "7ddf754f-d193-4cc9-b351-99906754a03b"; // Catalogue of Life XR sur GBIF

/** Année de la dernière observation connue de GBIF, ou undefined ; gardée un jour dans le cache. */
export async function derniereObservation(id: string): Promise<number | undefined> {
  const capacites = await jsonEnCache<{ maxYear?: number }>(
    `https://api.gbif.org/v2/map/occurrence/density/capabilities.json?taxonKey=${encodeURIComponent(id)}&checklistKey=${LISTE_COL_XR}`,
    UN_JOUR,
  );
  return capacites?.maxYear;
}

/**
 * Page de l'espèce sur gbif.org : celle de son nom exact (identifiant de GBIF, différent du
 * nôtre), sinon la recherche de son nom.
 */
export async function lienGbif(nom: string, regne: string): Promise<string> {
  const recherche = `https://www.gbif.org/species/search?q=${encodeURIComponent(nom)}`;
  const parametres = new URLSearchParams({ name: nom, strict: "true" });
  if (regne) parametres.set("kingdom", regne);
  const resultat = await jsonEnCache<{ usageKey?: number; matchType?: string; rank?: string }>(`https://api.gbif.org/v1/species/match?${parametres}`);
  return resultat?.usageKey && resultat.matchType === "EXACT" && resultat.rank === "SPECIES" ? `https://www.gbif.org/species/${resultat.usageKey}` : recherche;
}

/**
 * Octets d'une ressource (tuile de carte), gardés `duree` secondes dans le cache de Cloudflare
 * (seulement les réponses réussies). Une réponse « 204 » (aucune donnée) donne un tableau vide.
 */
export async function octetsEnCache(adresse: string, duree = UN_JOUR): Promise<Uint8Array | undefined> {
  const cache = cacheCloudflare();
  try {
    const connue = await cache?.match(adresse);
    if (connue) return new Uint8Array(await connue.arrayBuffer());
    const reponse = await fetch(adresse, { headers: { "User-Agent": AGENT }, signal: AbortSignal.timeout(2500) });
    if (!reponse.ok) return undefined;
    const octets = new Uint8Array(await reponse.arrayBuffer());
    await cache?.put(adresse, new Response(octets, { headers: { "Content-Type": "application/octet-stream", "Cache-Control": `public, max-age=${duree}` } }));
    return octets;
  } catch {
    return undefined;
  }
}

interface ReponseCommons {
  query?: {
    normalized?: { from: string; to: string }[];
    pages?: {
      title: string;
      missing?: boolean;
      imageinfo?: {
        width: number;
        height: number;
        descriptionurl: string;
        extmetadata?: Record<string, { value: string } | undefined>;
      }[];
    }[];
  };
}

/**
 * Photos Commons (auteur, licence, taille) de plusieurs fichiers en un seul appel, rangées par
 * nom de fichier tel que donné. Un fichier introuvable n'a pas d'entrée.
 */
export async function photosCommons(fichiers: string[]): Promise<Map<string, Photo>> {
  const photos = new Map<string, Photo>();
  const uniques = [...new Set(fichiers.filter(Boolean))].slice(0, 50);
  if (!uniques.length) return photos;
  const parametres = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "imageinfo",
    iiprop: "size|extmetadata|url",
    iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl",
    titles: uniques.map((f) => `File:${f}`).join("|"),
  });
  const reponse = await jsonEnCache<ReponseCommons>(`https://commons.wikimedia.org/w/api.php?${parametres}`);
  const pages = new Map((reponse?.query?.pages ?? []).map((p) => [p.title, p]));
  const normalises = new Map((reponse?.query?.normalized ?? []).map((n) => [n.from, n.to]));
  for (const fichier of uniques) {
    const titre = `File:${fichier}`;
    const info = pages.get(normalises.get(titre) ?? titre)?.imageinfo?.[0];
    if (!info) continue;
    const meta = info.extmetadata ?? {};
    const moyenne = info.width >= 500 ? 500 : 330;
    photos.set(fichier, {
      source: "commons",
      src: relaisCommons(fichier, moyenne),
      srcset: srcsetCommons(fichier, info.width),
      srcsetCarte: srcsetCommons(fichier, info.width, 500),
      apercu: apercuCommons(fichier, info.width),
      largeur: info.width,
      hauteur: info.height,
      auteur: texteBrut(meta["Artist"]?.value ?? "") || "Wikimedia Commons",
      licence: texteBrut(meta["LicenseShortName"]?.value ?? "", 40),
      lienLicence: meta["LicenseUrl"]?.value ?? "",
      page: info.descriptionurl || `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(nomCommons(fichier))}`,
    });
  }
  return photos;
}

interface ReponseInaturalist {
  results?: {
    name: string;
    default_photo?: {
      id: number;
      license_code: string | null;
      attribution: string;
      attribution_name?: string | null;
      medium_url?: string;
      original_dimensions?: { width: number; height: number };
    } | null;
  }[];
}

/** Photo par défaut d'une espèce sur iNaturalist (nom exact, licence libre), ou undefined. */
export async function photoInaturalist(nomLatin: string): Promise<Photo | undefined> {
  const parametres = new URLSearchParams({ q: nomLatin, rank: "species", is_active: "true", per_page: "1" });
  const reponse = await jsonEnCache<ReponseInaturalist>(`https://api.inaturalist.org/v1/taxa?${parametres}`);
  const taxon = reponse?.results?.[0];
  const photo = taxon?.default_photo;
  const licence = licenceInaturalist(photo?.license_code);
  const extension = /\.(jpe?g|png)(?:\?|$)/i.exec(photo?.medium_url ?? "")?.[1]?.toLowerCase();
  if (!taxon || taxon.name !== nomLatin || !photo || !licence || !extension) return undefined;
  const largeur = photo.original_dimensions?.width ?? TAILLES_INATURALIST.medium;
  const hauteur = photo.original_dimensions?.height ?? Math.round((largeur * 3) / 4);
  return {
    source: "inaturalist",
    src: relaisInaturalist(photo.id, "medium", extension),
    // 1024 px (~300 Ko) seulement sur ordinateur : sur téléphone, 500 px.
    srcset: `${relaisInaturalist(photo.id, "medium", extension)} ${TAILLES_INATURALIST.medium}w`,
    srcsetOrdinateur: `${relaisInaturalist(photo.id, "large", extension)} ${TAILLES_INATURALIST.large}w`,
    srcsetCarte: `${relaisInaturalist(photo.id, "medium", extension)} ${TAILLES_INATURALIST.medium}w`,
    apercu: relaisInaturalist(photo.id, "large", extension),
    largeur,
    hauteur,
    auteur: texteBrut(photo.attribution_name ?? "") || texteBrut(photo.attribution),
    licence: licence.nom,
    lienLicence: licence.lien,
    page: `https://www.inaturalist.org/photos/${photo.id}`,
  };
}
