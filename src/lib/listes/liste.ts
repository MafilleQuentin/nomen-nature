// Listes d'espèces (lot 7, QUE-33 ; Figma « Liste d'un groupe — Oiseaux ») : la liste d'un groupe
// (/fr/groupe/oiseaux) et la page des espèces menacées (/fr/especes-menacees), qui reprend le
// même modèle avec le filtre « Menacées » activé. Lieu, statut ou groupe, tri et nombre de cartes
// sont dans l'adresse (?lieu=CH&statut=menacees&tri=menacees&n=32), pour marcher sans JavaScript.
// Le lieu proposé est le pays de la connexion (décision du 27.11.2026). Fonctions pures, testées
// dans tests/unit/listes.test.ts ; les fichiers sont lus par serveur.ts.
import type { Langue } from "../../i18n/langues.ts";
import { t } from "../../i18n/textes.ts";
import { enAdresse } from "../carte/pays.ts";
import { MAX_CARTES, PAS, PREMIERES, TRIS, type Tri } from "../carte/especes-pays.ts";
import type { Resume } from "../carte/panneau.ts";
import { lireLieu, memeLieu, MONDE, type Lieu } from "../recherche/lieux.ts";
import { nomDuLieu, type Puce } from "../recherche/resultats.ts";

/** Liste d'un groupe, ou toutes les espèces menacées. */
export type Mode = "groupe" | "menacees";

export interface ChoixListe {
  lieu: Lieu;
  /** Groupe de la liste (mode « groupe ») ou groupe choisi parmi les menacées (vide : tous). */
  groupe: string;
  /** Seulement les menacées (toujours vrai pour la page des espèces menacées). */
  menacees: boolean;
  tri: Tri;
  nombre: number;
}

const groupesDe = (langue: Langue) => t(langue).groupes as Record<string, string>;

/** Tri par défaut : les plus observées pour un groupe (maquette), les plus menacées d'abord pour les menacées. */
export const triParDefaut = (mode: Mode): Tri => (mode === "groupe" ? "observees" : "menacees");

/** Adresse d'un groupe dans une langue (« oiseaux », « birds »). */
export function adresseGroupe(groupe: string, langue: Langue): string {
  return enAdresse(groupesDe(langue)[groupe] ?? groupe);
}

/** Groupe d'une adresse dans une langue, ou undefined. */
export function groupeDeLAdresse(adresse: string, langue: Langue): string | undefined {
  return Object.keys(groupesDe(langue)).find((g) => adresseGroupe(g, langue) === adresse);
}

/**
 * Choix lus dans l'adresse. `defaut` : le lieu proposé au visiteur (son pays, sinon son continent,
 * sinon le monde) quand l'adresse n'en donne pas ; « lieu=monde » choisit le monde.
 */
export function lireChoixListe(parametres: URLSearchParams, mode: Mode, groupe: string, defaut: Lieu): ChoixListe {
  const valeurLieu = parametres.get("lieu");
  const lieu = !valeurLieu ? defaut : valeurLieu.toLowerCase() === "monde" ? MONDE : lireLieu(valeurLieu);
  const tri = parametres.get("tri") ?? "";
  const n = Number.parseInt(parametres.get("n") ?? "", 10);
  const paliers = Number.isFinite(n) ? Math.round((n - PREMIERES) / PAS) : 0;
  const groupeChoisi = parametres.get("groupe") ?? "";
  return {
    lieu,
    groupe: mode === "groupe" ? groupe : Object.hasOwn(groupesDe("fr"), groupeChoisi) ? groupeChoisi : "",
    menacees: mode === "menacees" || parametres.get("statut") === "menacees",
    tri: (TRIS as readonly string[]).includes(tri) ? (tri as Tri) : triParDefaut(mode),
    nombre: Math.min(MAX_CARTES, PREMIERES + Math.max(0, paliers) * PAS),
  };
}

/** Adresse de la liste avec ces choix (les choix par défaut sont omis, le lieu proposé aussi). */
export function adresseListe(base: string, mode: Mode, choix: ChoixListe, defaut: Lieu): string {
  const parametres = new URLSearchParams();
  if (!memeLieu(choix.lieu, defaut)) parametres.set("lieu", choix.lieu.type === "monde" ? "monde" : choix.lieu.code);
  if (mode === "groupe" && choix.menacees) parametres.set("statut", "menacees");
  if (mode === "menacees" && choix.groupe) parametres.set("groupe", choix.groupe);
  if (choix.tri !== triParDefaut(mode)) parametres.set("tri", choix.tri);
  if (choix.nombre > PREMIERES) parametres.set("n", String(choix.nombre));
  const texte = parametres.toString();
  return texte ? `${base}?${texte}` : base;
}

/** Dossier des listes d'un lieu dans le paquet de données. */
export function dossierDuLieu(lieu: Lieu): string {
  if (lieu.type === "monde") return "/donnees/listes/monde";
  return lieu.type === "pays" ? `/donnees/listes/pays/${lieu.code.toLowerCase()}` : `/donnees/listes/continents/${lieu.code.toLowerCase()}`;
}

/** Clé d'un lieu dans listes/regions.json (« pays/ch », « continents/europe », « monde »). */
export function cleRegion(lieu: Lieu): string {
  if (lieu.type === "monde") return "monde";
  return lieu.type === "pays" ? `pays/${lieu.code.toLowerCase()}` : `continents/${lieu.code.toLowerCase()}`;
}

/**
 * Puces du lieu : le pays et le continent du visiteur, le monde (ordre de la maquette : « Suisse,
 * Europe, Monde »), plus le lieu choisi s'il n'en fait pas partie (lien partagé). Changer de lieu
 * garde le reste, sauf le nombre de cartes.
 */
export function pucesLieuListe(mode: Mode, choix: ChoixListe, visiteur: Lieu[], base: string, defaut: Lieu, langue: Langue): Puce[] {
  const lieux = [...visiteur, MONDE];
  if (!lieux.some((l) => memeLieu(l, choix.lieu))) lieux.push(choix.lieu);
  return lieux.map((lieu) => ({
    libelle: nomDuLieu(lieu, langue),
    lien: adresseListe(base, mode, { ...choix, lieu, nombre: PREMIERES }, defaut),
    actif: memeLieu(lieu, choix.lieu),
  }));
}

/** Puces du statut d'un groupe : « Toutes », « Menacées ». */
export function pucesStatutListe(choix: ChoixListe, base: string, defaut: Lieu, langue: Langue): Puce[] {
  const textes = t(langue).panneau;
  return [false, true].map((menacees) => ({
    libelle: menacees ? textes.menacees : textes.toutes,
    lien: adresseListe(base, "groupe", { ...choix, menacees, nombre: PREMIERES }, defaut),
    actif: choix.menacees === menacees,
  }));
}

/** Puces des groupes de la page des menacées : « Tous les groupes », puis ceux qui ont des menacées dans ce lieu (ordre du site). */
export function pucesGroupesMenacees(resume: Resume, choix: ChoixListe, base: string, defaut: Lieu, langue: Langue): Puce[] {
  const tous: Puce = {
    libelle: t(langue).pays.tousLesGroupes,
    lien: adresseListe(base, "menacees", { ...choix, groupe: "", nombre: PREMIERES }, defaut),
    actif: !choix.groupe,
  };
  const groupes = Object.keys(groupesDe(langue))
    .filter((g) => (resume.groupes[g]?.menacees ?? 0) > 0 || g === choix.groupe)
    .map((g) => ({
      libelle: groupesDe(langue)[g] ?? g,
      lien: adresseListe(base, "menacees", { ...choix, groupe: g, nombre: PREMIERES }, defaut),
      actif: g === choix.groupe,
    }));
  return [tous, ...groupes];
}

/** Choix du tri (menu « Tri : … »). */
export function pucesTriListe(mode: Mode, choix: ChoixListe, base: string, defaut: Lieu, langue: Langue): Puce[] {
  const textes = t(langue).pays;
  const libelles: Record<Tri, string> = { menacees: textes.triMenacees, observees: textes.triObservees };
  return TRIS.map((tri) => ({
    libelle: libelles[tri],
    lien: adresseListe(base, mode, { ...choix, tri, nombre: PREMIERES }, defaut),
    actif: tri === choix.tri,
  }));
}

/** Nombre d'espèces de la liste dans ce lieu (toutes, ou les menacées ; d'un groupe, ou de tous). */
export function totalDeLaListe(resume: Resume, choix: ChoixListe): number {
  const chiffres = choix.groupe ? resume.groupes[choix.groupe] : resume;
  return (choix.menacees ? chiffres?.menacees : chiffres?.especes) ?? 0;
}
