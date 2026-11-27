// Lecture des listes pour le panneau de la carte (lot 6, QUE-30) : /donnees/listes/… (binding
// ASSETS), fichiers gardés en mémoire tant que le Worker tourne. La page est rendue par le serveur
// avant d'être envoyée : le code de réponse et le cache se décident ici.
import type { Langue } from "../../i18n/langues.ts";
import { t } from "../../i18n/textes.ts";
import type { Photo } from "../especes/photos.ts";
import { lireFichierDuSite, photosCommons } from "../especes/serveur.ts";
import { lienContinent, lienPays } from "../liens.ts";
import type { LigneResultat, Puce } from "../recherche/resultats.ts";
import { CONTINENTS, coordonnees, type CodeContinent } from "./continents.ts";
import { paysDuContinent } from "./donnees.ts";
import {
  adresseChoixPays,
  especesDuPays,
  lireChoixPays,
  MAX_CARTES as MAX_CARTES_PAGE,
  PAS,
  pucesGroupesPays,
  pucesTri,
  type ChoixPays,
  type EspecePays,
} from "./especes-pays.ts";
import { adressePays, centreDuPays, continentDuPays, estPays, paysDeLAdresse, situationDuPays, type Situation } from "./pays.ts";
import {
  groupeAffiche,
  lignesPanneau,
  lireChoix,
  nomDuPays,
  onglets,
  pucesGroupes,
  pucesPays,
  type Choix,
  type FichierListe,
  type Resume,
} from "./panneau.ts";

const MAX_EN_MEMOIRE = 64;
const memoire = new Map<string, Promise<unknown>>();

function lireJson<T>(chemin: string, origine: URL): Promise<T | undefined> {
  const connu = memoire.get(chemin) as Promise<T | undefined> | undefined;
  if (connu) return connu;
  const lecture = lireFichierDuSite(chemin, origine).then((r) => (r.ok ? (r.json() as Promise<T>) : undefined));
  memoire.set(chemin, lecture);
  lecture.then((v) => v === undefined && memoire.delete(chemin)).catch(() => memoire.delete(chemin));
  if (memoire.size > MAX_EN_MEMOIRE) memoire.delete(memoire.keys().next().value ?? "");
  return lecture;
}

export interface ContenuPanneau {
  choix: Choix;
  surtitre: string;
  titre: string;
  chiffres: { valeur: number; libelle: string; accent?: boolean }[];
  pays: Puce[];
  /** Lien de chaque pays de la carte (code ISO en minuscules) vers sa page (lot 7). */
  liensPays: Record<string, string>;
  onglets: Puce[];
  groupes: Puce[];
  /** Nom de la liste affichée, pour les lecteurs d'écran (« Espèces menacées »). */
  nomListe: string;
  lignes: LigneResultat[];
}

/** Contenu du panneau, ou undefined si les listes ne sont pas installées (paquet absent). */
export async function chargerPanneau(url: URL, langue: Langue, code: CodeContinent): Promise<ContenuPanneau | undefined> {
  const textes = t(langue);
  const continent = CONTINENTS[code];
  const base = lienContinent(continent.adresse, langue);
  const regions = await lireJson<Record<string, { especes: number; menacees: number }>>("/donnees/listes/regions.json", url);
  if (!regions) return undefined;
  const pays = paysDuContinent(code)
    .map((c) => ({ code: c, especes: regions[`pays/${c}`]?.especes ?? 0 }))
    .filter((p) => p.especes > 0);
  const choix = lireChoix(url.searchParams);
  const dossier = `/donnees/listes/continents/${code.toLowerCase()}`;
  const resume = await lireJson<Resume>(`${dossier}/resume.json`, url);
  if (!resume) return undefined;

  const groupe = choix.onglet === "groupes" ? groupeAffiche(resume, choix) : "";
  const nomFichier = choix.onglet === "groupes" ? groupe : choix.onglet;
  const liste = nomFichier ? await lireJson<FichierListe>(`${dossier}/${nomFichier}.json`, url) : undefined;
  const nomContinent = textes.continents[code];
  const nomListe =
    choix.onglet === "menacees"
      ? textes.panneau.listeMenacees
      : choix.onglet === "groupes"
        ? ((textes.groupes as Record<string, string>)[groupe] ?? "")
        : textes.panneau.listeToutes;

  return {
    choix,
    surtitre: `${textes.carte.continent} · ${coordonnees(continent.centre)}`,
    titre: nomContinent,
    chiffres: [
      { valeur: resume.especes, libelle: textes.panneau.especesObservees },
      { valeur: resume.menacees, libelle: textes.panneau.menaceesChiffre, accent: true },
      { valeur: pays.length, libelle: textes.panneau.paysChiffre },
    ],
    pays: pucesPays(pays, choix, base, langue, (c) => lienDuPays(c, langue)),
    liensPays: Object.fromEntries(pays.filter((p) => estPays(p.code)).map((p) => [p.code, lienDuPays(p.code, langue)])),
    onglets: onglets(choix, base, langue),
    groupes: choix.onglet === "groupes" ? pucesGroupes(resume, choix, base, langue) : [],
    nomListe,
    lignes: liste ? lignesPanneau(liste, langue) : [],
  };
}

/** Codes (en minuscules) des pays qui ont des listes ce mois-ci, ou undefined si les listes manquent. */
export async function paysDesListes(origine: URL): Promise<string[] | undefined> {
  const regions = await lireJson<Record<string, { especes: number }>>("/donnees/listes/regions.json", origine);
  if (!regions) return undefined;
  return Object.entries(regions)
    .filter(([cle, r]) => cle.startsWith("pays/") && r.especes > 0)
    .map(([cle]) => cle.slice("pays/".length))
    .filter(estPays);
}

/** Lien de la page d'un pays dans une langue (code ISO en minuscules). */
export const lienDuPays = (code: string, langue: Langue) => lienPays(adressePays(code, langue), langue);

export interface ContenuPays {
  code: string;
  nom: string;
  continent: CodeContinent;
  /** Point de l'étiquette en degrés, si le pays a une forme dans Natural Earth. */
  centre: [number, number] | undefined;
  situation: Situation | undefined;
  /** Adresse de la page dans chaque langue. */
  adresses: Record<Langue, string>;
  resume: Resume;
  choix: ChoixPays;
  groupes: Puce[];
  tris: Puce[];
  especes: EspecePays[];
  photos: Map<string, Photo>;
  /** Espèces observées dans le pays (ou dans le groupe choisi). */
  total: number;
  /** « Afficher N espèces de plus », s'il en reste dans les listes. */
  plus?: { nombre: number; lien: string };
}

/**
 * Contenu de la page d'un pays (adresse dans la langue de la page) ; « inconnu » si l'adresse ne
 * correspond à aucun pays, « indisponible » si les listes ne sont pas installées (paquet absent).
 */
export async function chargerPays(url: URL, langue: Langue, adresse: string): Promise<ContenuPays | "inconnu" | "indisponible"> {
  const codes = await paysDesListes(url);
  if (!codes) return "indisponible";
  const code = paysDeLAdresse(adresse, langue, codes);
  const continent = code && continentDuPays(code);
  if (!code || !continent) return "inconnu";
  const dossier = `/donnees/listes/pays/${code}`;
  const resume = await lireJson<Resume>(`${dossier}/resume.json`, url);
  if (!resume) return "indisponible";
  const choix = lireChoixPays(url.searchParams);
  if (choix.groupe && !resume.groupes[choix.groupe]) choix.groupe = "";
  const noms = choix.groupe ? [choix.groupe] : ["menacees", "toutes"];
  const fichiers = (await Promise.all(noms.map((n) => lireJson<FichierListe>(`${dossier}/${n}.json`, url)))).filter((f) => f !== undefined);
  const toutes = especesDuPays(fichiers, choix.tri);
  const especes = toutes.slice(0, choix.nombre);
  const base = lienPays(adresse, langue);
  const reste = toutes.length - especes.length;
  return {
    code,
    nom: nomDuPays(code, langue),
    continent,
    centre: centreDuPays(code),
    situation: situationDuPays(code),
    adresses: { fr: lienDuPays(code, "fr"), en: lienDuPays(code, "en") },
    resume,
    choix,
    groupes: pucesGroupesPays(resume, choix, base, langue),
    tris: pucesTri(choix, base, langue),
    especes,
    photos: await photosCommons(especes.map((e) => e.photo)),
    total: choix.groupe ? (resume.groupes[choix.groupe]?.especes ?? 0) : resume.especes,
    ...(reste > 0 && choix.nombre < MAX_CARTES_PAGE
      ? { plus: { nombre: Math.min(PAS, reste), lien: `${adresseChoixPays(base, { ...choix, nombre: choix.nombre + PAS })}#especes` } }
      : {}),
  };
}
