// Espèces de la page d'un pays (lot 7, QUE-32 ; Figma « Pays — Suisse ») : groupe choisi, tri
// (menacées d'abord ou les plus observées) et nombre de cartes, tout dans l'adresse
// (?groupe=oiseaux&tri=observees&n=32) pour marcher sans JavaScript. Fonctions pures, testées dans
// tests/unit/pays.test.ts ; les fichiers sont lus par serveur.ts.
import type { Langue } from "../../i18n/langues.ts";
import { t } from "../../i18n/textes.ts";
import { statutAffiche } from "../especes/affichage.ts";
import type { CarteEspece } from "../especes/fiche.ts";
import type { Puce } from "../recherche/resultats.ts";
import type { FichierListe, Resume } from "./panneau.ts";

export const TRIS = ["menacees", "observees"] as const;
export type Tri = (typeof TRIS)[number];

/** Cartes montrées d'abord (deux rangées de quatre), puis par paquets de 24 (« Afficher plus »). */
export const PREMIERES = 8;
export const PAS = 24;
/** Au plus 56 cartes (les photos sont demandées à Commons en un seul appel, 50 au plus). */
export const MAX_CARTES = PREMIERES + 2 * PAS;

export interface ChoixPays {
  /** Groupe choisi (« oiseaux »), ou vide pour tous les groupes. */
  groupe: string;
  tri: Tri;
  /** Nombre de cartes montrées. */
  nombre: number;
}

const groupesDe = (langue: Langue) => t(langue).groupes as Record<string, string>;

/** Choix lus dans l'adresse ; un groupe inconnu est ignoré, le nombre ramené à un palier permis. */
export function lireChoixPays(parametres: URLSearchParams): ChoixPays {
  const groupe = parametres.get("groupe") ?? "";
  const tri = parametres.get("tri") ?? "";
  const n = Number.parseInt(parametres.get("n") ?? "", 10);
  const paliers = Number.isFinite(n) ? Math.round((n - PREMIERES) / PAS) : 0;
  return {
    groupe: Object.hasOwn(groupesDe("fr"), groupe) ? groupe : "",
    tri: (TRIS as readonly string[]).includes(tri) ? (tri as Tri) : "menacees",
    nombre: Math.min(MAX_CARTES, PREMIERES + Math.max(0, paliers) * PAS),
  };
}

/** Adresse de la page du pays avec ces choix (les choix par défaut sont omis). */
export function adresseChoixPays(base: string, choix: Partial<ChoixPays>): string {
  const parametres = new URLSearchParams();
  if (choix.groupe) parametres.set("groupe", choix.groupe);
  if (choix.tri && choix.tri !== "menacees") parametres.set("tri", choix.tri);
  if (choix.nombre && choix.nombre > PREMIERES) parametres.set("n", String(choix.nombre));
  const texte = parametres.toString();
  return texte ? `${base}?${texte}` : base;
}

/** Rang d'un statut pour « menacées d'abord » : CR, EN, VU, NT, puis tous les autres. */
const RANGS: Record<string, number> = { CR: 0, EN: 1, VU: 2, NT: 3 };
const rang = (uicn: string) => RANGS[statutAffiche(uicn)] ?? 4;

export interface EspecePays extends CarteEspece {
  observations: number;
}

/**
 * Espèces des listes données (sans doublon, dans l'ordre des fichiers : les mieux documentées
 * d'abord), triées : menacées d'abord (CR, EN, VU, NT, puis les autres) ou les plus observées.
 */
export function especesDuPays(fichiers: FichierListe[], tri: Tri): EspecePays[] {
  const vues = new Set<string>();
  const especes: EspecePays[] = [];
  for (const fichier of fichiers) {
    const i = (nom: string) => fichier.colonnes.indexOf(nom);
    const texte = (ligne: (string | number)[], nom: string) => String(ligne[i(nom)] ?? "");
    for (const ligne of fichier.lignes) {
      const id = texte(ligne, "id");
      if (!texte(ligne, "adresse") || vues.has(id)) continue;
      vues.add(id);
      especes.push({
        id,
        adresse: texte(ligne, "adresse"),
        nom: texte(ligne, "nom"),
        nomFr: texte(ligne, "nom_fr"),
        nomEn: texte(ligne, "nom_en"),
        uicn: texte(ligne, "uicn") || "NE",
        groupe: texte(ligne, "groupe"),
        photo: texte(ligne, "photo"),
        observations: Number(ligne[i("observations")] ?? 0),
      });
    }
  }
  // Tri stable : à statut égal (ou à observations égales), l'ordre des listes est gardé.
  return tri === "observees" ? especes.sort((a, b) => b.observations - a.observations) : especes.sort((a, b) => rang(a.uicn) - rang(b.uicn));
}

/**
 * Puces des groupes : « Tous les groupes », puis les groupes présents dans le pays, dans l'ordre
 * habituel du site (mammifères, oiseaux… champignons, comme la maquette et l'accueil).
 */
export function pucesGroupesPays(resume: Resume, choix: ChoixPays, base: string, langue: Langue): Puce[] {
  const tous: Puce = { libelle: t(langue).pays.tousLesGroupes, lien: adresseChoixPays(base, { tri: choix.tri }), actif: !choix.groupe };
  const groupes = Object.keys(groupesDe(langue))
    .filter((groupe) => (resume.groupes[groupe]?.especes ?? 0) > 0)
    .map((groupe) => ({
      libelle: groupesDe(langue)[groupe] ?? groupe,
      lien: adresseChoixPays(base, { groupe, tri: choix.tri }),
      actif: groupe === choix.groupe,
    }));
  return [tous, ...groupes];
}

/** Choix du tri (menu « Tri : … ») : le groupe est gardé, le nombre de cartes revient au départ. */
export function pucesTri(choix: ChoixPays, base: string, langue: Langue): Puce[] {
  const textes = t(langue).pays;
  const libelles: Record<Tri, string> = { menacees: textes.triMenacees, observees: textes.triObservees };
  return TRIS.map((tri) => ({ libelle: libelles[tri], lien: adresseChoixPays(base, { groupe: choix.groupe, tri }), actif: tri === choix.tri }));
}
