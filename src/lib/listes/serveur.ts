// Lecture des listes d'un groupe et des espèces menacées (lot 7, QUE-33) : fichiers du paquet de
// données (listes/pays/…, listes/continents/…, listes/monde/…), lus par le serveur avec le binding
// ASSETS et gardés en mémoire. Le pays et le continent du visiteur viennent de Cloudflare
// (requête en cours) et ne sont jamais enregistrés.
import type { Langue } from "../../i18n/langues.ts";
import { especesDuPays, PAS, MAX_CARTES, type EspecePays } from "../carte/especes-pays.ts";
import type { FichierListe, Resume } from "../carte/panneau.ts";
import { lireJson } from "../carte/serveur.ts";
import type { Photo } from "../especes/photos.ts";
import { photosCommons } from "../especes/serveur.ts";
import { lien, lienGroupe } from "../liens.ts";
import { MONDE, type Lieu } from "../recherche/lieux.ts";
import { estMenacee, nomDuLieu, type Puce } from "../recherche/resultats.ts";
import {
  adresseGroupe,
  adresseListe,
  cleRegion,
  dossierDuLieu,
  groupeDeLAdresse,
  lireChoixListe,
  pucesGroupesMenacees,
  pucesLieuListe,
  pucesStatutListe,
  pucesTriListe,
  totalDeLaListe,
  type ChoixListe,
  type Mode,
} from "./liste.ts";

export interface ContenuListe {
  mode: Mode;
  choix: ChoixListe;
  /** Nom du lieu choisi (« Suisse », « Monde »). */
  nomLieu: string;
  /** Adresse de la page dans chaque langue (sans les choix). */
  adresses: Record<Langue, string>;
  /** Espèces (ou espèces menacées) observées dans le monde : surtitre. */
  totalMonde: number;
  lieux: Puce[];
  statuts: Puce[];
  groupes: Puce[];
  tris: Puce[];
  especes: EspecePays[];
  photos: Map<string, Photo>;
  /** Espèces de la liste dans le lieu choisi. */
  total: number;
  plus?: { nombre: number; lien: string };
  /** La page montre-t-elle autre chose que les choix par défaut (pas indexée) ? */
  avecChoix: boolean;
}

/**
 * Contenu d'une liste : `adresse` est celle du groupe dans la langue de la page (mode « groupe »).
 * « inconnu » si le groupe n'existe pas, « indisponible » si les listes ne sont pas installées.
 */
export async function chargerListe(
  url: URL,
  langue: Langue,
  mode: Mode,
  adresse: string,
  visiteur: Lieu[],
): Promise<ContenuListe | "inconnu" | "indisponible"> {
  const groupe = mode === "groupe" ? groupeDeLAdresse(adresse, langue) : "";
  if (groupe === undefined) return "inconnu";
  const regions = await lireJson<Record<string, { especes: number; menacees: number }>>("/donnees/listes/regions.json", url);
  if (!regions) return "indisponible";
  // Lieux du visiteur qui ont des listes ; le premier est proposé par défaut.
  const lieuxVisiteur = visiteur.filter((l) => regions[cleRegion(l)]);
  const defaut = lieuxVisiteur[0] ?? MONDE;
  const choix = lireChoixListe(url.searchParams, mode, groupe, defaut);
  if (!regions[cleRegion(choix.lieu)]) choix.lieu = MONDE; // lieu sans liste (lien ancien ou inventé)
  const [resume, resumeMonde] = await Promise.all([
    lireJson<Resume>(`${dossierDuLieu(choix.lieu)}/resume.json`, url),
    lireJson<Resume>("/donnees/listes/monde/resume.json", url),
  ]);
  if (!resume) return "indisponible";
  const nomFichier = choix.groupe || "menacees";
  const fichier = await lireJson<FichierListe>(`${dossierDuLieu(choix.lieu)}/${nomFichier}.json`, url);
  const toutes = especesDuPays(fichier ? [fichier] : [], choix.tri).filter((e) => !choix.menacees || estMenacee(e.uicn));
  const especes = toutes.slice(0, choix.nombre);
  const base = mode === "groupe" ? lienGroupe(adresse, langue) : lien("menacees", langue);
  const reste = toutes.length - especes.length;
  const chiffresMonde = groupe ? resumeMonde?.groupes[groupe] : resumeMonde;
  return {
    mode,
    choix,
    nomLieu: nomDuLieu(choix.lieu, langue),
    adresses:
      mode === "groupe"
        ? { fr: lienGroupe(adresseGroupe(groupe, "fr"), "fr"), en: lienGroupe(adresseGroupe(groupe, "en"), "en") }
        : { fr: lien("menacees", "fr"), en: lien("menacees", "en") },
    totalMonde: (mode === "menacees" ? chiffresMonde?.menacees : chiffresMonde?.especes) ?? 0,
    lieux: pucesLieuListe(mode, choix, lieuxVisiteur, base, defaut, langue),
    statuts: mode === "groupe" ? pucesStatutListe(choix, base, defaut, langue) : [],
    groupes: mode === "menacees" ? pucesGroupesMenacees(resume, choix, base, defaut, langue) : [],
    tris: pucesTriListe(mode, choix, base, defaut, langue),
    especes,
    photos: await photosCommons(especes.map((e) => e.photo)),
    total: totalDeLaListe(resume, choix),
    ...(reste > 0 && choix.nombre < MAX_CARTES
      ? { plus: { nombre: Math.min(PAS, reste), lien: `${adresseListe(base, mode, { ...choix, nombre: choix.nombre + PAS }, defaut)}#especes` } }
      : {}),
    avecChoix: url.search !== "",
  };
}
