// Normalisation des noms et clés phonétiques, partagées par l'import mensuel (index de
// recherche) et par le navigateur (texte tapé) : les deux doivent calculer exactement la même
// clé. Traduction fidèle de tools/essai-recherche/phonetique.py (lot 1, QUE-7), vérifiée sur
// les noms réels du Catalogue of Life XR.
//
// But : retrouver un nom mal orthographié par son « son ». « boulot » et « bouleau » donnent la
// même clé française, « bUlo ». Une clé par langue de nom :
// - français : prononciation (eau → o, lettres finales muettes, nasales, ch, qu, ph…) ;
// - anglais : règles simplifiées dans l'esprit de Metaphone ; chaque groupe de voyelles devient
//   « a » (retirer les voyelles confondait trop de mots courts : boulot, bluet, belut) ;
// - latin scientifique : très régulier (ae → e, y → i, ph → f, lettres doublées).
// Les majuscules d'une clé sont des sons, pas des lettres : A = an/en, O = on, I = in/un,
// U = ou, E = eu, X = ch, N = gn.

export type LangueNom = "fr" | "en" | "la";

const LIGATURES: [string, string][] = [
  ["œ", "oe"],
  ["Œ", "oe"],
  ["æ", "ae"],
  ["Æ", "ae"],
  ["ß", "ss"],
];
const SEPARATEURS = /[\s\-‐‑–—'’`´.,;:/()[\]"«»×]+/g;

/** Minuscules, sans accents ni ligatures, ponctuation et traits d'union → espaces. */
export function normaliser(texte: string): string {
  for (const [ligature, remplacement] of LIGATURES) texte = texte.replaceAll(ligature, remplacement);
  texte = texte.normalize("NFKD").replace(/\p{Mn}/gu, "");
  texte = texte.toLowerCase().replace(SEPARATEURS, " ");
  texte = texte.replace(/[^a-z0-9 ]/g, "");
  return texte.split(" ").filter(Boolean).join(" ");
}

function sansDoubles(mot: string): string {
  return mot.replace(/(.)\1+/g, "$1");
}

type Regle = [RegExp, string | ((correspondance: string) => string)];

function appliquer(mot: string, regles: Regle[]): string {
  for (const [motif, remplacement] of regles) {
    mot = typeof remplacement === "string" ? mot.replace(motif, remplacement) : mot.replace(motif, remplacement);
  }
  return mot;
}

// --- Français -------------------------------------------------------------------

const V = "aeiouyAEIOU";
const REGLES_FR: Regle[] = [
  [/eaux?$/g, "o"],
  [/eau/g, "o"],
  [/aux$/g, "o"],
  [/au/g, "o"],
  [/oeu|eu/g, "E"],
  [/oe/g, "e"],
  [/sch/g, "X"],
  [/ch/g, "X"],
  [/ph/g, "f"],
  [/qu/g, "k"],
  [/q/g, "k"],
  [/ck/g, "k"],
  [/gu(?=[eiy])/g, "g"],
  [/ge(?=[aou])/g, "j"],
  [/g(?=[eiy])/g, "j"],
  [/gn/g, "N"],
  [/c(?=[eiy])/g, "s"],
  [/c/g, "k"],
  [/ç/g, "s"],
  [/ou/g, "U"],
  [/oi/g, "wa"],
  [new RegExp(`(?:ain|ein|aim|eim|in|im|yn|ym|un|um)(?![${V}nm])`, "g"), "I"],
  [new RegExp(`(?:an|am|en|em)(?![${V}nm])`, "g"), "A"],
  [new RegExp(`(?:on|om)(?![${V}nm])`, "g"), "O"],
  [/ai|ei|ay|ey/g, "e"],
  [/(?:er|et|ez)$/g, "e"],
  [/y/g, "i"],
  [/h/g, ""],
  [/w/g, "v"],
  // s entre voyelles orales (mésange → z), pas après une nasale (pinson → s).
  [/(?<=[aeiouyEU])s(?=[aeiouyEUAOI])/g, "z"],
  [/x(?!$)/g, "ks"],
];
const FINALES_MUETTES_FR = /(?:e|[stdxzp])+$/;

function motFr(mot: string): string {
  if (mot.length <= 2) return mot;
  mot = appliquer(mot, REGLES_FR);
  if (mot.length > 2) mot = mot.replace(FINALES_MUETTES_FR, "") || mot;
  return sansDoubles(mot);
}

export function cleFr(texte: string): string {
  // Avant normaliser(), qui retirerait la cédille.
  texte = texte.replaceAll("ç", "s").replaceAll("Ç", "s");
  return normaliser(texte).split(" ").filter(Boolean).map(motFr).join(" ");
}

// --- Anglais --------------------------------------------------------------------

const REGLES_EN: Regle[] = [
  [/^kn|^gn|^pn|^wr/g, (m) => m[1] ?? ""],
  [/tch/g, "X"],
  [/sch/g, "sk"],
  [/ch|sh/g, "X"],
  [/ph/g, "f"],
  [/th/g, "0"],
  [/ck/g, "k"],
  [/q/g, "k"],
  [/c(?=[eiy])/g, "s"],
  [/c/g, "k"],
  [/dg(?=[eiy])/g, "j"],
  [/g(?=[eiy])/g, "j"],
  [/gh(?![aeiou])/g, ""],
  [/x/g, "ks"],
  [/z/g, "s"],
  [/wh/g, "w"],
  [/(?<=[aeiou])[wy](?![aeiou])/g, ""],
];

function motEn(mot: string): string {
  if (mot.length <= 2) return mot;
  mot = appliquer(mot, REGLES_EN);
  if (mot.length > 2) mot = mot.replace(/e$/, ""); // e final muet (oke, pedunculate)
  mot = mot.slice(0, 1) + mot.slice(1).replaceAll("h", ""); // h muet sauf en première lettre
  mot = mot.replace(/[aeiouy]+/g, "a"); // chaque groupe de voyelles devient « a » : on garde sa place
  return sansDoubles(mot);
}

export function cleEn(texte: string): string {
  return normaliser(texte).split(" ").filter(Boolean).map(motEn).join(" ");
}

// --- Latin ----------------------------------------------------------------------

const REGLES_LA: Regle[] = [
  [/ae|oe/g, "e"],
  [/y/g, "i"],
  [/ph/g, "f"],
  [/th/g, "t"],
  [/rh/g, "r"],
  [/ch/g, "k"],
  [/c/g, "k"],
  [/q/g, "k"],
  [/z/g, "s"],
  [/j/g, "i"],
  [/w/g, "v"],
  [/h/g, ""],
];

function motLa(mot: string): string {
  return sansDoubles(appliquer(mot, REGLES_LA));
}

export function cleLa(texte: string): string {
  return normaliser(texte).split(" ").filter(Boolean).map(motLa).join(" ");
}

const CLES: Record<LangueNom, (texte: string) => string> = { fr: cleFr, en: cleEn, la: cleLa };

/** Clé phonétique d'un texte, selon la langue du nom. */
export function cle(texte: string, langue: LangueNom): string {
  return CLES[langue](texte);
}
