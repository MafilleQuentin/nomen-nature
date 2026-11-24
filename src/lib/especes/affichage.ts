// Mise en forme des données d'une fiche espèce (lot 4, QUE-22) : noms, statut, chiffres,
// phrase « Sais-tu ? », résumé Wikipédia. Fonctions pures, testées dans tests/unit/fiche.test.ts.
import type { Langue } from "../../i18n/langues.ts";
import { t } from "../../i18n/textes.ts";
import type { Faits, Fiche } from "./fiche.ts";

export type Statut = keyof ReturnType<typeof t>["statuts"];

/**
 * Statut à afficher : la catégorie de la Liste rouge. « CD » (dépendant de mesures de
 * conservation, catégorie de 1994) devient « NT », comme l'a fait l'UICN en 2001 ;
 * un code inconnu ou vide devient « NE ».
 */
export function statutAffiche(uicn: string): Statut {
  const code = uicn.toUpperCase();
  if (code === "CD") return "NT";
  return (["CR", "EN", "VU", "NT", "LC", "DD", "NE", "EX", "EW"] as const).find((s) => s === code) ?? "NE";
}

/** Remplace {cle} dans un texte. */
export function remplir(modele: string, valeurs: Record<string, string>): string {
  return modele.replace(/\{(\w+)\}/g, (_, cle: string) => valeurs[cle] ?? "");
}

const localeDe = (langue: Langue) => (langue === "fr" ? "fr-FR" : "en-US");

/** Nombre court : 1 234 567 → « 1,2 M » (français), « 1.2M » (anglais) ; exact sous 10 000. */
export function nombreCourt(n: number, langue: Langue): string {
  if (n < 10_000) return new Intl.NumberFormat(localeDe(langue)).format(n);
  return new Intl.NumberFormat(localeDe(langue), { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/** Nom affiché en titre : le nom courant dans la langue de la page, sinon le nom latin. */
export function nomAffiche(fiche: Pick<Fiche, "nom" | "nomFr" | "nomEn">, langue: Langue): string {
  const courant = langue === "fr" ? fiche.nomFr : fiche.nomEn;
  return majuscule(courant) || fiche.nom;
}

/** Première lettre en majuscule (« chêne pédonculé » → « Chêne pédonculé »). */
export function majuscule(texte: string): string {
  return texte ? texte.charAt(0).toLocaleUpperCase("fr") + texte.slice(1) : "";
}

function quantite(valeur: number, unite: string, langue: Langue): string {
  const nombre = new Intl.NumberFormat(localeDe(langue), { maximumSignificantDigits: 3 }).format(valeur);
  return `${nombre}${unite ? ` ${unite}` : ""}`;
}

/** Longueur lisible : 0,012 m → « 1,2 cm », 45 m → « 45 m ». */
function longueur(m: number, langue: Langue): string {
  if (m < 0.01) return quantite(m * 1000, "mm", langue);
  if (m < 1) return quantite(m * 100, "cm", langue);
  return quantite(m, "m", langue);
}

/** Masse lisible : 0,0013 kg → « 1,3 g », 4 500 kg → « 4,5 t ». */
function masse(kg: number, langue: Langue): string {
  if (kg < 0.001) return quantite(kg * 1_000_000, "mg", langue);
  if (kg < 1) return quantite(kg * 1000, "g", langue);
  if (kg >= 1000) return quantite(kg / 1000, "t", langue);
  return quantite(kg, "kg", langue);
}

function duree(ans: number, langue: Langue): string {
  const textes = t(langue).saisTu;
  if (ans < 1) return quantite(Math.round(ans * 12), textes.mois, langue);
  return quantite(ans, ans < 2 ? textes.an : textes.ans, langue);
}

/**
 * Phrase « Sais-tu ? » d'après les faits de Wikidata, ou une chaîne vide s'il n'y en a pas :
 * « Cette espèce peut vivre jusqu'à 25 ans, peser jusqu'à 4,5 kg et atteindre 2,8 m d'envergure. »
 */
export function phraseSaisTu(faits: Faits, langue: Langue): string {
  const textes = t(langue).saisTu;
  const morceaux: string[] = [];
  if (faits.longevite) morceaux.push(remplir(textes.longevite, { valeur: duree(faits.longevite, langue) }));
  if (faits.taille) morceaux.push(remplir(textes.taille, { valeur: longueur(faits.taille, langue) }));
  if (faits.masse) morceaux.push(remplir(textes.masse, { valeur: masse(faits.masse, langue) }));
  if (faits.envergure) morceaux.push(remplir(textes.envergure, { valeur: longueur(faits.envergure, langue) }));
  if (!morceaux.length) return "";
  const liste = morceaux.length === 1 ? morceaux[0] : `${morceaux.slice(0, -1).join(", ")} ${textes.et} ${morceaux.at(-1)}`;
  return `${textes.debut} ${liste}.`;
}

/**
 * Résumé raccourci : les premières phrases entières, sans dépasser `max` caractères
 * (au moins la première phrase, coupée sur un mot si elle est trop longue).
 */
export function couperResume(texte: string, max = 450): string {
  const propre = texte.replace(/\s+/g, " ").trim();
  if (propre.length <= max) return propre;
  const phrases = propre.match(/[^.!?]+[.!?]+(?:\s|$)/g) ?? [];
  let resultat = "";
  for (const phrase of phrases) {
    if ((resultat + phrase).trim().length > max) break;
    resultat += phrase;
  }
  if (resultat.trim()) return resultat.trim();
  return `${propre.slice(0, max).replace(/\s+\S*$/, "")}…`;
}
