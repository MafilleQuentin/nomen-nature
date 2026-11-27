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
  if (n < 10_000) return new Intl.NumberFormat(localeDe(langue), { useGrouping: "always" }).format(n);
  return new Intl.NumberFormat(localeDe(langue), { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/** Nom affiché en titre : le nom courant dans la langue de la page, sinon le nom latin. */
export function nomAffiche(fiche: Pick<Fiche, "nom" | "nomFr" | "nomEn">, langue: Langue): string {
  const courant = langue === "fr" ? nomFrancais(fiche.nomFr) : fiche.nomEn;
  return majuscule(courant) || fiche.nom;
}

/**
 * Nom français remis en forme (lot 7, QUE-33) : certains noms de Wikidata ou du Catalogue of Life
 * ont une majuscule à chaque mot, à l'anglaise (« L'Anguille Européenne », « Compère De Guinée ») ;
 * en français, seul le premier mot en prend une, avec les noms propres. Un nom dont le premier
 * mot, le deuxième et tous les mots de trois lettres ou plus commencent par une majuscule est donc
 * remis en minuscules, sauf le premier mot et le mot qui suit « de », « du » ou « des » (souvent un
 * nom propre : « Compère de Guinée »). « Vanneau d'Abyssinie », « Pic de Bonaparte » ou « lilas
 * Josika » sont gardés. Le « á » (espagnol, « Bouleau á papier ») devient « à ».
 */
export function nomFrancais(nom: string): string {
  const texte = nom.replace(/ á /g, " à ");
  const mots = texte.split(" ");
  const debut = /^\p{Lu}/u;
  const morceaux = mots.flatMap((m) => m.split("-")).slice(1);
  const enCapitales = debut.test(mots[0] ?? "") && debut.test(morceaux[0] ?? "") && morceaux.filter((m) => m.length >= 3).every((m) => debut.test(m));
  if (!enCapitales) return texte;
  const minuscule = (m: string) => m.charAt(0).toLocaleLowerCase("fr") + m.slice(1);
  return mots
    .map((mot, i) => {
      const parties = mot.split("-");
      // Premier mot : la majuscule reste, l'élision et les mots composés passent en minuscules (« L'anguille »).
      if (i === 0)
        return parties
          .map((p, j) => (j === 0 ? p.replace(/(['’])(\p{Lu})/u, (_, a: string, l: string) => a + l.toLocaleLowerCase("fr")) : minuscule(p)))
          .join("-");
      if (/^(de|du|des)$/i.test(mots[i - 1] ?? "")) return mot;
      return parties.map(minuscule).join("-");
    })
    .join(" ");
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

export type Manque = "nom" | "description" | "photo";

/**
 * Ce qui manque à une fiche pour être complète (QUE-23) : nom courant dans la langue de la page,
 * description (un article Wikipédia, quelle que soit sa langue), photo libre. Une fiche à laquelle il
 * manque au moins une de ces choses est une « fiche courte ». En français, c'est la règle
 * « bien documentée » du score (photo, nom français, article).
 */
export function manques(fiche: Pick<Fiche, "nomFr" | "nomEn" | "photo">, langue: Langue, avecArticle: boolean): Manque[] {
  const liste: Manque[] = [];
  if (!(langue === "fr" ? fiche.nomFr : fiche.nomEn)) liste.push("nom");
  if (!avecArticle) liste.push("description");
  if (!fiche.photo) liste.push("photo");
  return liste;
}

/** « pas de nom français, pas de description ni de photo libre » ; « no English name, no description or free photo ». */
export function listeDesManques(liste: Manque[], langue: Langue): string {
  const textes = t(langue).fiche;
  const noms = { nom: textes.manqueNom, description: textes.manqueDescription, photo: textes.manquePhoto };
  const mots = liste.map((m) => noms[m]);
  if (mots.length <= 1) return mots.map((m) => `${textes.pasDe} ${m}`).join("");
  const debut = mots
    .slice(0, -1)
    .map((m) => `${textes.pasDe} ${m}`)
    .join(", ");
  return `${debut} ${textes.niDe} ${mots.at(-1)}`;
}

/** « insecte de la famille des Buprestidae » ; sans famille connue, une chaîne vide. */
export function descripteur(fiche: Pick<Fiche, "groupe" | "famille">, langue: Langue): string {
  if (!fiche.famille) return "";
  const singuliers = t(langue).singuliers as Record<string, string>;
  const groupe = singuliers[fiche.groupe] ?? singuliers["autre"] ?? "";
  return remplir(t(langue).fiche.deLaFamille, { groupe, famille: fiche.famille });
}
