// Suggestions de la barre de recherche (lot 5, QUE-27) : ce que l'API renvoie pour chaque espèce,
// déjà prêt à afficher dans la langue du site.
import type { Langue } from "../../i18n/langues.ts";
import { t } from "../../i18n/textes.ts";
import { majuscule, nomAffiche, statutAffiche } from "../especes/affichage.ts";
import { lienEspece } from "../liens.ts";
import { normaliser } from "./phonetique.ts";
import type { EspeceTrouvee } from "./especes.ts";

export interface Suggestion {
  /** Nom affiché (courant dans la langue du site, sinon latin). */
  nom: string;
  latin: string;
  /** Le nom tapé ou approché, s'il diffère du nom affiché (« fayard » pour le hêtre commun). */
  trouve: string;
  lien: string;
  statut: string;
  libelleStatut: string;
  groupe: string;
}

export function suggestion({ resultat, fiche }: EspeceTrouvee, langue: Langue): Suggestion {
  const nom = nomAffiche(fiche, langue);
  const trouve = majuscule(resultat.nomTrouve);
  const differe = ![nom, fiche.nom].some((n) => normaliser(n) === normaliser(trouve));
  const statut = statutAffiche(fiche.uicn);
  const groupes = t(langue).groupes as Record<string, string>;
  return {
    nom,
    latin: fiche.nom,
    trouve: differe ? trouve : "",
    lien: lienEspece(fiche.adresse, langue),
    statut,
    libelleStatut: t(langue).statuts[statut],
    groupe: groupes[fiche.groupe] ?? "",
  };
}

/** Texte de recherche accepté : au moins 3 caractères utiles, au plus 80. */
export function texteValide(texte: string): boolean {
  const propre = normaliser(texte);
  return propre.replace(/ /g, "").length >= 3 && texte.length <= 80;
}
