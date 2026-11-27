// Pays des pages pays (lot 7, QUE-32) : adresses (/fr/pays/suisse, /en/country/switzerland),
// continent, coordonnées et cadre de la carte de situation. Les pays sont ceux des listes du mois
// (listes/regions.json, codes ISO de GBIF) ; leur nom vient de l'Intl du serveur, comme sur la
// carte des continents. Fonctions pures, testées dans tests/unit/pays.test.ts.
import infos from "../../data/carte/pays.json";
import type { Langue } from "../../i18n/langues.ts";
import { CODES_CONTINENTS, type CodeContinent } from "./continents.ts";
import { carteDuContinent, type PaysCarte } from "./donnees.ts";
import { nomDuPays } from "./panneau.ts";

/**
 * Continent des pays et territoires des listes de GBIF qui n'en ont pas dans Natural Earth 1:50 m :
 * sans forme à eux (rattachés à un autre pays, ou trop petits ; pas de carte de situation ni de
 * coordonnées), ou îles de « Seven seas » (Maurice, Seychelles…). D'après GBIF : les Caraïbes en
 * Amérique du Nord.
 */
export const TERRITOIRES: Record<string, CodeContinent> = {
  ai: "NORTH_AMERICA",
  as: "OCEANIA",
  aw: "NORTH_AMERICA",
  bl: "NORTH_AMERICA",
  bq: "NORTH_AMERICA",
  bv: "ANTARCTICA",
  cc: "ASIA",
  ck: "OCEANIA",
  cx: "ASIA",
  gd: "NORTH_AMERICA",
  gf: "SOUTH_AMERICA",
  gi: "EUROPE",
  gp: "NORTH_AMERICA",
  gs: "ANTARCTICA",
  hm: "ANTARCTICA",
  io: "ASIA",
  kn: "NORTH_AMERICA",
  mc: "EUROPE",
  mf: "NORTH_AMERICA",
  mh: "OCEANIA",
  mo: "ASIA",
  mq: "NORTH_AMERICA",
  mu: "AFRICA",
  ms: "NORTH_AMERICA",
  mv: "ASIA",
  nf: "OCEANIA",
  nr: "OCEANIA",
  nu: "OCEANIA",
  pf: "OCEANIA",
  pn: "OCEANIA",
  re: "AFRICA",
  sc: "AFRICA",
  sh: "AFRICA",
  sj: "EUROPE",
  sx: "NORTH_AMERICA",
  tf: "ANTARCTICA",
  tk: "OCEANIA",
  to: "OCEANIA",
  tv: "OCEANIA",
  um: "OCEANIA",
  va: "EUROPE",
  vg: "NORTH_AMERICA",
  wf: "OCEANIA",
  ws: "OCEANIA",
  yt: "AFRICA",
};

const INFOS = infos as unknown as Record<string, { continent: string; centre: [number, number] }>;

/** Proportions de la carte de situation (maquette : 460 × 300). */
export const PROPORTIONS_SITUATION = 460 / 300;

/** Le code est-il un pays connu (nom donné par l'Intl, continent connu) ? « xz » (eaux internationales) ne l'est pas. */
export function estPays(code: string): boolean {
  return Boolean(continentDuPays(code)) && nomDuPays(code, "fr") !== code.toUpperCase();
}

/** Continent d'un pays (code ISO en minuscules), ou undefined. */
export function continentDuPays(code: string): CodeContinent | undefined {
  const continent = INFOS[code.toUpperCase()]?.continent || TERRITOIRES[code];
  return (CODES_CONTINENTS as readonly string[]).includes(continent ?? "") ? (continent as CodeContinent) : undefined;
}

/** Point de l'étiquette du pays en degrés [longitude, latitude], ou undefined (territoires). */
export function centreDuPays(code: string): [number, number] | undefined {
  return INFOS[code.toUpperCase()]?.centre;
}

/** Surtitre de position, avec deux décimales comme la maquette : « 46.72°N 7.46°E ». */
export function coordonneesPays([longitude, latitude]: [number, number]): string {
  const n = (x: number) => Math.abs(x).toFixed(2);
  return `${n(latitude)}°${latitude >= 0 ? "N" : "S"} ${n(longitude)}°${longitude >= 0 ? "E" : "W"}`;
}

/** Texte d'adresse : minuscules sans accents, mots séparés par des tirets (« Côte d’Ivoire » → « cote-d-ivoire »). */
export function enAdresse(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Adresse d'un pays dans une langue (« suisse », « switzerland »). */
export function adressePays(code: string, langue: Langue): string {
  return enAdresse(nomDuPays(code, langue));
}

/** Code du pays d'une adresse parmi les pays donnés, ou undefined. */
export function paysDeLAdresse(adresse: string, langue: Langue, codes: Iterable<string>): string | undefined {
  for (const code of codes) if (estPays(code) && adressePays(code, langue) === adresse) return code;
  return undefined;
}

export interface Situation {
  vue: [number, number, number, number];
  /**
   * Le pays et ses voisins visibles dans la vue. Pour les voisins, `etiquette` est mise au milieu
   * de leur partie visible si leur point est hors de la vue, et `rang` vaut moins leur surface
   * visible : les grands voisins sont nommés d'abord.
   */
  pays: (PaysCarte & { choisi: boolean })[];
  /** Point ambre : l'étiquette du pays dans le plan. */
  point: [number, number];
}

/**
 * Cadre de la carte de situation : le plus grand morceau du pays au milieu, entouré de ses
 * voisins (trois fois sa taille au moins, et au moins 4 % de la largeur du continent pour les
 * tout petits pays), aux proportions de la maquette.
 */
export function vueDeSituation(
  [x, y, largeur, hauteur]: [number, number, number, number],
  largeurContinent: number,
  proportion = PROPORTIONS_SITUATION,
): [number, number, number, number] {
  let l = Math.max(largeur * 3, largeurContinent * 0.04);
  let h = Math.max(hauteur * 3, l / proportion);
  l = Math.max(l, h * proportion);
  h = l / proportion;
  const arrondi = (n: number) => Math.round(n * 10) / 10;
  return [arrondi(x + largeur / 2 - l / 2), arrondi(y + hauteur / 2 - h / 2), arrondi(l), arrondi(h)];
}

type Boite = [number, number, number, number];

/** Partie commune de deux boîtes, ou undefined si elles ne se croisent pas. */
function intersection([ax, ay, al, ah]: Boite, [bx, by, bl, bh]: Boite): Boite | undefined {
  const x = Math.max(ax, bx);
  const y = Math.max(ay, by);
  const l = Math.min(ax + al, bx + bl) - x;
  const h = Math.min(ay + ah, by + bh) - y;
  return l > 0 && h > 0 ? [x, y, l, h] : undefined;
}

const dansLaVue = ([px, py]: [number, number], [x, y, l, h]: Boite) => px > x + l * 0.1 && px < x + l * 0.9 && py > y + h * 0.1 && py < y + h * 0.9;

/** Carte de situation d'un pays, tirée de la carte de son continent ; undefined s'il n'y figure pas. */
export function situationDuPays(code: string): Situation | undefined {
  const continent = continentDuPays(code);
  if (!continent) return undefined;
  const carte = carteDuContinent(continent);
  const lui = carte.pays.filter((p) => p.code.toLowerCase() === code);
  const principal = lui.find((p) => p.principal)?.principal;
  const etiquette = lui[0]?.etiquette;
  if (!principal || !etiquette) return undefined;
  const vue = vueDeSituation(principal, carte.vue[2]);
  const pays = carte.pays.flatMap((p): Situation["pays"] => {
    const visible = p.cadre && intersection(p.cadre, vue);
    if (!visible) return [];
    const choisi = p.code.toLowerCase() === code;
    if (choisi) return [{ ...p, choisi }];
    const milieu: [number, number] = [visible[0] + visible[2] / 2, visible[1] + visible[3] / 2];
    return [{ ...p, choisi, etiquette: dansLaVue(p.etiquette, vue) ? p.etiquette : milieu, rang: -(visible[2] * visible[3]) }];
  });
  return { vue, pays, point: etiquette };
}
