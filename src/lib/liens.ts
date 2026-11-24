// Adresses des pages de la V1, en un seul endroit, dans les deux langues.
// Les adresses sont traduites (/fr/a-propos ↔ /en/about) : on passe d'une langue à l'autre
// en gardant la même clé de page. La plupart des pages arriveront avec leur lot.
import { langues, type Langue } from "../i18n/langues";

const pages = {
  accueil: { fr: "/fr", en: "/en" },
  autourDeMoi: { fr: "/fr/autour-de-moi", en: "/en/near-me" },
  identifier: { fr: "/fr/identifier", en: "/en/identify" },
  menacees: { fr: "/fr/especes-menacees", en: "/en/threatened-species" },
  recherche: { fr: "/fr/recherche", en: "/en/search" },
  aPropos: { fr: "/fr/a-propos", en: "/en/about" },
  sources: { fr: "/fr/sources-et-credits", en: "/en/sources-and-credits" },
  confidentialite: { fr: "/fr/confidentialite", en: "/en/privacy" },
  mentionsLegales: { fr: "/fr/mentions-legales", en: "/en/legal-notice" },
} as const satisfies Record<string, Record<Langue, string>>;

export type Page = keyof typeof pages;

/** Adresse d'une page dans une langue. La carte est l'accueil. */
export function lien(page: Page | "carte", langue: Langue): string {
  return pages[page === "carte" ? "accueil" : page][langue];
}

/** Adresses d'une même page dans toutes les langues (balises hreflang, choix de la langue). */
export function traductions(page: Page): Record<Langue, string> {
  return Object.fromEntries(langues.map((l) => [l, lien(page, l)])) as Record<Langue, string>;
}

/** Début de l'adresse des fiches espèces dans chaque langue (/fr/espece/quercus-robur). */
const prefixesEspece: Record<Langue, string> = { fr: "/fr/espece", en: "/en/species" };

/** Adresse de la fiche d'une espèce (adresse calculée par src/lib/especes/adresse.ts). */
export function lienEspece(adresse: string, langue: Langue): string {
  return `${prefixesEspece[langue]}/${adresse}`;
}

/** Adresses d'une même fiche dans toutes les langues. */
export function traductionsEspece(adresse: string): Record<Langue, string> {
  return Object.fromEntries(langues.map((l) => [l, lienEspece(adresse, l)])) as Record<Langue, string>;
}
