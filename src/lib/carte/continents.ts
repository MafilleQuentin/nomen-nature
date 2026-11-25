// Continents de la carte interactive (lot 6, QUE-29) : codes de GBIF (les mêmes que les listes et
// le filtre « Où »), adresses des pages, cadres et point de l'étiquette. Partagé par l'outil qui
// prépare la carte (tools/carte/pays.ts) et par les pages.
import type { Langue } from "../../i18n/langues.ts";

export const CODES_CONTINENTS = ["EUROPE", "AFRICA", "ASIA", "NORTH_AMERICA", "SOUTH_AMERICA", "OCEANIA", "ANTARCTICA"] as const;
export type CodeContinent = (typeof CODES_CONTINENTS)[number];

/** Rectangle en degrés : [ouest, sud, est, nord]. */
export type Cadre = [number, number, number, number];

export interface Continent {
  code: CodeContinent;
  /** Adresse de la page (/fr/continent/europe, /en/continent/europe). */
  adresse: Record<Langue, string>;
  /** Zone où un morceau de terre appartient au continent (pour les territoires lointains). */
  zone: Cadre;
  /** Zone montrée sur la page du continent. */
  vue: Cadre;
  /** Point de l'étiquette sur la carte du monde et du surtitre de la page : [longitude, latitude]. */
  centre: [number, number];
}

export const CONTINENTS: Record<CodeContinent, Continent> = {
  EUROPE: { code: "EUROPE", adresse: { fr: "europe", en: "europe" }, zone: [-25, 34, 45, 72], vue: [-12, 34, 42, 71], centre: [15, 52] },
  AFRICA: { code: "AFRICA", adresse: { fr: "afrique", en: "africa" }, zone: [-26, -36, 60, 38], vue: [-20, -36, 53, 38], centre: [20, 5] },
  ASIA: { code: "ASIA", adresse: { fr: "asie", en: "asia" }, zone: [25, -12, 180, 82], vue: [25, -11, 150, 78], centre: [90, 50] },
  NORTH_AMERICA: {
    code: "NORTH_AMERICA",
    adresse: { fr: "amerique-du-nord", en: "north-america" },
    zone: [-170, 5, -10, 84],
    vue: [-170, 7, -15, 84],
    centre: [-100, 45],
  },
  SOUTH_AMERICA: {
    code: "SOUTH_AMERICA",
    adresse: { fr: "amerique-du-sud", en: "south-america" },
    zone: [-92, -56, -30, 14],
    vue: [-83, -56, -33, 13],
    centre: [-60, -15],
  },
  OCEANIA: { code: "OCEANIA", adresse: { fr: "oceanie", en: "oceania" }, zone: [110, -50, 180, 0], vue: [110, -48, 180, 0], centre: [135, -25] },
  ANTARCTICA: {
    code: "ANTARCTICA",
    adresse: { fr: "antarctique", en: "antarctica" },
    zone: [-180, -90, 180, -60],
    vue: [-180, -90, 180, -60],
    centre: [0, -82],
  },
};

/** Continents de Natural Earth (champ CONTINENT) → codes de GBIF. */
export const CONTINENTS_NATURAL_EARTH: Record<string, CodeContinent> = {
  Europe: "EUROPE",
  Africa: "AFRICA",
  Asia: "ASIA",
  "North America": "NORTH_AMERICA",
  "South America": "SOUTH_AMERICA",
  Oceania: "OCEANIA",
  Antarctica: "ANTARCTICA",
};

export const dansLeCadre = ([longitude, latitude]: [number, number], [ouest, sud, est, nord]: Cadre) =>
  longitude >= ouest && longitude <= est && latitude >= sud && latitude <= nord;

/** Continent d'une adresse de page (« amerique-du-nord » en français), ou undefined. */
export function continentDeLAdresse(adresse: string, langue: Langue): Continent | undefined {
  return Object.values(CONTINENTS).find((c) => c.adresse[langue] === adresse);
}

/** Surtitre de position : « 52°N 15°E ». */
export function coordonnees([longitude, latitude]: [number, number]): string {
  const lat = `${Math.abs(latitude)}°${latitude >= 0 ? "N" : "S"}`;
  const lon = `${Math.abs(longitude)}°${longitude >= 0 ? "E" : "W"}`;
  return `${lat} ${lon}`;
}
