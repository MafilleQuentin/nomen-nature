// Format des fichiers de fiches (/donnees/fiches/<n>.json, lot 4, QUE-22), écrits par l'import
// mensuel (tools/donnees/fiches.ts) et lus par le serveur pour construire une fiche espèce.
//
// Un fichier = tous les genres dont le nom tombe sur ce numéro (voir adresse.ts) :
// - « colonnes » et « lignes » : une ligne par espèce observée, dans l'ordre des colonnes ;
// - « cartes » : de quoi afficher la carte de chaque espèce proche citée dans le fichier
//   (y compris celles d'un autre genre, rangées dans un autre fichier).
import { fichierDeLAdresse } from "./adresse.ts";

export const COLONNES_FICHE = [
  "id",
  "adresse",
  "nom",
  "auteur",
  "nom_fr",
  "nom_en",
  "uicn",
  "groupe",
  "regne",
  "embranchement",
  "classe",
  "ordre",
  "famille",
  "genre",
  "observations",
  "pays",
  "continent",
  "wikidata",
  "photo",
  "wikipedia_fr",
  "wikipedia_en",
  "faits",
  "proches",
] as const;

export const COLONNES_CARTE = ["adresse", "nom", "nom_fr", "nom_en", "uicn", "groupe", "photo"] as const;

/** Valeurs maximales connues dans Wikidata (« peut vivre jusqu'à… »), en unités du système international. */
export interface Faits {
  /** Longévité, en années (P2250, P4214). */
  longevite?: number;
  /** Hauteur ou longueur, en mètres (P2048, P2043). */
  taille?: number;
  /** Masse, en kilogrammes (P2067). */
  masse?: number;
  /** Envergure, en mètres (P2050). */
  envergure?: number;
}

export interface Fiche {
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
  /** Nombre de pays où l'espèce a été observée (pays inconnu exclu). */
  pays: number;
  /** Continent où elle a été le plus observée (code GBIF : EUROPE, AFRICA…), ou vide. */
  continent: string;
  wikidata: string;
  /** Nom du fichier Wikimedia Commons de la photo, ou vide. */
  photo: string;
  wikipediaFr: string;
  wikipediaEn: string;
  faits: Faits;
}

export interface CarteEspece {
  id: string;
  adresse: string;
  nom: string;
  nomFr: string;
  nomEn: string;
  uicn: string;
  groupe: string;
  photo: string;
}

export interface FichierFiches {
  colonnes: string[];
  lignes: (string | number | Faits | string[])[][];
  cartes: Record<string, (string | number)[]>;
}

const texte = (v: unknown) => (typeof v === "string" ? v : "");
const nombre = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

/** La fiche d'une espèce par son identifiant (recherche), sans ses espèces proches. */
export function ficheParIdentifiant(fichier: FichierFiches, id: string): Fiche | undefined {
  const ligne = fichier.lignes.find((l) => l[fichier.colonnes.indexOf("id")] === id);
  const adresse = ligne?.[fichier.colonnes.indexOf("adresse")];
  return typeof adresse === "string" ? trouverFiche(fichier, adresse)?.fiche : undefined;
}

/** Les fiches d'un genre (tout le genre est dans le même fichier), les plus observées d'abord. */
export function fichesDuGenre(fichier: FichierFiches, genre: string, max = 8): Fiche[] {
  const iGenre = fichier.colonnes.indexOf("genre");
  const iObs = fichier.colonnes.indexOf("observations");
  const iAdresse = fichier.colonnes.indexOf("adresse");
  return fichier.lignes
    .filter((l) => l[iGenre] === genre)
    .sort((a, b) => Number(b[iObs] ?? 0) - Number(a[iObs] ?? 0))
    .slice(0, max)
    .flatMap((l) => {
      const fiche = trouverFiche(fichier, String(l[iAdresse] ?? ""))?.fiche;
      return fiche ? [fiche] : [];
    });
}

/** La fiche d'une adresse et ses espèces proches, ou undefined si elle n'est pas dans le fichier. */
export function trouverFiche(fichier: FichierFiches, adresse: string): { fiche: Fiche; proches: CarteEspece[] } | undefined {
  const i = (nom: (typeof COLONNES_FICHE)[number]) => fichier.colonnes.indexOf(nom);
  const ligne = fichier.lignes.find((l) => l[i("adresse")] === adresse);
  if (!ligne) return undefined;
  const v = (nom: (typeof COLONNES_FICHE)[number]) => ligne[i(nom)];
  const faitsBruts = v("faits");
  const faits: Faits = faitsBruts && typeof faitsBruts === "object" && !Array.isArray(faitsBruts) ? faitsBruts : {};
  const fiche: Fiche = {
    id: texte(v("id")),
    adresse,
    nom: texte(v("nom")),
    auteur: texte(v("auteur")),
    nomFr: texte(v("nom_fr")),
    nomEn: texte(v("nom_en")),
    uicn: texte(v("uicn")) || "NE",
    groupe: texte(v("groupe")),
    regne: texte(v("regne")),
    embranchement: texte(v("embranchement")),
    classe: texte(v("classe")),
    ordre: texte(v("ordre")),
    famille: texte(v("famille")),
    genre: texte(v("genre")),
    observations: nombre(v("observations")),
    pays: nombre(v("pays")),
    continent: texte(v("continent")),
    wikidata: texte(v("wikidata")),
    photo: texte(v("photo")),
    wikipediaFr: texte(v("wikipedia_fr")),
    wikipediaEn: texte(v("wikipedia_en")),
    faits,
  };
  const idsProches = Array.isArray(v("proches")) ? (v("proches") as string[]) : [];
  const proches = idsProches.flatMap((id) => {
    const c = fichier.cartes[id];
    if (!c) return [];
    const [adresseProche, nom, nomFr, nomEn, uicn, groupe, photo] = c.map(texte);
    return [{ id, adresse: adresseProche ?? "", nom: nom ?? "", nomFr: nomFr ?? "", nomEn: nomEn ?? "", uicn: uicn || "NE", groupe: groupe ?? "", photo: photo ?? "" }];
  });
  return { fiche, proches };
}

/** Chemin du fichier de données d'une adresse : /donnees/fiches/1234.json. */
export function cheminDuFichier(adresse: string): string {
  return `/donnees/fiches/${fichierDeLAdresse(adresse)}.json`;
}
