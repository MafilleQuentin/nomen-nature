// Adresse d'une fiche espèce et fichier de données qui la contient (lot 4, QUE-22), partagés
// entre l'import mensuel (tools/donnees/fiches.ts) et le serveur du site : les deux doivent
// faire exactement le même calcul.
//
// - Adresse : le nom latin en minuscules, sans accents, mots séparés par des tirets
//   (« Quercus robur » → quercus-robur). En cas d'homonyme (même nom latin dans deux règnes),
//   l'espèce la plus observée garde l'adresse simple, les autres reçoivent leur identifiant
//   du Catalogue of Life à la fin (quercus-robur-4r5yn).
// - Fichier : les fiches sont regroupées par genre dans NOMBRE_FICHIERS fichiers
//   (/donnees/fiches/<n>.json). Le numéro se calcule à partir du premier mot de l'adresse,
//   le genre : une seule lecture donne la fiche et les autres espèces du genre.

/** Nombre de fichiers de fiches (décision du 23.11.2026 : environ 3 000, limite Cloudflare de 20 000 fichiers). */
export const NOMBRE_FICHIERS = 3000;

/** Adresse d'une espèce d'après son nom latin : « Quercus robur » → « quercus-robur ». */
export function adresseEspece(nomLatin: string): string {
  return nomLatin
    .normalize("NFD")
    .replace(/\p{M}/gu, "") // accents détachés par NFD (marques diacritiques)
    .replace(/[×✕]/g, "x")
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Adresse avec l'identifiant, pour départager des homonymes : quercus-robur-4r5yn. */
export function adresseAvecIdentifiant(nomLatin: string, id: string): string {
  return `${adresseEspece(nomLatin)}-${id.toLowerCase()}`;
}

/** Une adresse de fiche bien formée (minuscules, chiffres, tirets ; au moins deux mots). */
export function estAdresseEspece(adresse: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)+$/.test(adresse) && adresse.length <= 200;
}

/** Numéro du fichier qui contient une adresse : empreinte FNV-1a de son premier mot (le genre). */
export function fichierDeLAdresse(adresse: string): number {
  const genre = adresse.split("-")[0] ?? "";
  let empreinte = 0x811c9dc5;
  for (let i = 0; i < genre.length; i++) {
    empreinte ^= genre.charCodeAt(i);
    empreinte = Math.imul(empreinte, 0x01000193) >>> 0;
  }
  return empreinte % NOMBRE_FICHIERS;
}
