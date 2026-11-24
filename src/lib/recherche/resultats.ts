// Page de résultats de la recherche (lot 5, QUE-28) : filtres lus dans l'adresse, puces de
// filtre (des liens, pour marcher sans JavaScript) et lignes d'espèces prêtes à afficher.
// Fonctions pures, testées dans tests/unit/resultats.test.ts ; la page appelle le même moteur
// que les suggestions (serveur.ts).
import type { Langue } from "../../i18n/langues.ts";
import { t } from "../../i18n/textes.ts";
import { nomAffiche, remplir, statutAffiche, type Statut } from "../especes/affichage.ts";
import { lienEspece } from "../liens.ts";
import type { EspeceTrouvee } from "./especes.ts";

/** Nombre d'espèces cherchées pour la page (les filtres trient ensuite parmi elles). */
export const MAX_RESULTATS = 30;

/** Statuts du filtre « Menacées seulement » (Liste rouge : en danger critique, en danger, vulnérable). */
export const MENACEES: readonly Statut[] = ["CR", "EN", "VU"];

export interface Filtres {
  /** Clé du groupe (« arbres »), ou vide pour tous. */
  groupe: string;
  menacees: boolean;
}

export interface Puce {
  libelle: string;
  lien: string;
  actif: boolean;
}

export interface LigneResultat {
  nom: string;
  latin: string;
  /** « Arbres · 312 000 observations » */
  meta: string;
  uicn: string;
  lien: string;
}

const groupesDe = (langue: Langue) => t(langue).groupes as Record<string, string>;

/** Filtres de l'adresse (?groupe=arbres&statut=menacees) ; un groupe inconnu est ignoré. */
export function lireFiltres(parametres: URLSearchParams): Filtres {
  const groupe = parametres.get("groupe") ?? "";
  return {
    groupe: Object.hasOwn(groupesDe("fr"), groupe) ? groupe : "",
    menacees: parametres.get("statut") === "menacees",
  };
}

/** Adresse de la page de résultats pour un texte et des filtres (les filtres vides sont omis). */
export function adresseRecherche(base: string, texte: string, filtres: Partial<Filtres> = {}): string {
  const parametres = new URLSearchParams({ q: texte });
  if (filtres.groupe) parametres.set("groupe", filtres.groupe);
  if (filtres.menacees) parametres.set("statut", "menacees");
  return `${base}?${parametres}`;
}

export const estMenacee = (uicn: string) => MENACEES.includes(statutAffiche(uicn));

/** Espèces qui passent les filtres, dans le même ordre. */
export function filtrer(especes: EspeceTrouvee[], filtres: Filtres): EspeceTrouvee[] {
  return especes.filter(({ fiche }) => (!filtres.groupe || fiche.groupe === filtres.groupe) && (!filtres.menacees || estMenacee(fiche.uicn)));
}

/**
 * Puces des groupes : « Tous », puis les groupes présents dans les résultats, du plus fourni au
 * moins fourni (à égalité, dans l'ordre des groupes du site), plus le groupe choisi s'il n'y est
 * pas. Choisir un groupe garde le statut.
 */
export function pucesGroupes(especes: EspeceTrouvee[], filtres: Filtres, base: string, texte: string, langue: Langue): Puce[] {
  const nombres = new Map<string, number>();
  for (const { fiche } of especes) nombres.set(fiche.groupe, (nombres.get(fiche.groupe) ?? 0) + 1);
  if (filtres.groupe && !nombres.has(filtres.groupe)) nombres.set(filtres.groupe, 0);
  const groupes = Object.entries(groupesDe(langue))
    .filter(([cle]) => nombres.has(cle))
    .sort(([a], [b]) => (nombres.get(b) ?? 0) - (nombres.get(a) ?? 0)); // tri stable : l'ordre du site à égalité
  return [
    {
      libelle: t(langue).resultats.tous,
      lien: adresseRecherche(base, texte, { ...filtres, groupe: "" }),
      actif: !filtres.groupe,
    },
    ...groupes.map(([cle, libelle]) => ({
      libelle,
      lien: adresseRecherche(base, texte, { ...filtres, groupe: cle }),
      actif: filtres.groupe === cle,
    })),
  ];
}

/** Puces du statut : « Toutes » et « Menacées seulement ». Choisir garde le groupe. */
export function pucesStatut(filtres: Filtres, base: string, texte: string, langue: Langue): Puce[] {
  const textes = t(langue).resultats;
  return [
    {
      libelle: textes.toutes,
      lien: adresseRecherche(base, texte, { ...filtres, menacees: false }),
      actif: !filtres.menacees,
    },
    {
      libelle: textes.menacees,
      lien: adresseRecherche(base, texte, { ...filtres, menacees: true }),
      actif: filtres.menacees,
    },
  ];
}

/** Nombre d'observations lisible : « 312 000 observations », « 1 observation », rien pour 0. */
export function texteObservations(n: number, langue: Langue): string {
  if (n <= 0) return "";
  const textes = t(langue).resultats;
  if (n === 1) return textes.uneObservation;
  return remplir(textes.observations, {
    n: new Intl.NumberFormat(langue === "fr" ? "fr-FR" : "en-US").format(n),
  });
}

/** Ligne d'une espèce : nom dans la langue du site, nom latin, groupe et observations, statut. */
export function ligneResultat({ fiche }: EspeceTrouvee, langue: Langue): LigneResultat {
  const meta = [groupesDe(langue)[fiche.groupe] ?? "", texteObservations(fiche.observations, langue)].filter(Boolean).join(" · ");
  return {
    nom: nomAffiche(fiche, langue),
    latin: fiche.nom,
    meta,
    uicn: fiche.uicn,
    lien: lienEspece(fiche.adresse, langue),
  };
}

/**
 * « 5 espèces pour « bouleau » » (le texte corrigé s'il y en a un) ; « Aucune espèce pour « … »
 * avec ces filtres » quand les filtres ont tout retiré.
 */
export function titreResultats(nombre: number, texte: string, langue: Langue): string {
  const textes = t(langue).resultats;
  const modele = nombre === 0 ? textes.aucuneFiltres : nombre === 1 ? textes.uneEspece : textes.nbEspeces;
  return remplir(modele, { n: String(nombre), q: texte });
}
