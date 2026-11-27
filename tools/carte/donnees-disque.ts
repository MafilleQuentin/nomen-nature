// Cadre de la carte d'un continent lu sur le disque (src/data/carte/continents/<code>.json), pour
// les outils qui tournent hors d'Astro (import.meta.glob n'existe que dans le site).
import { readFileSync } from "node:fs";
import type { CodeContinent } from "../../src/lib/carte/continents.ts";
import type { CarteDuContinent } from "../../src/lib/carte/donnees.ts";

export function carteDuContinentSurDisque(code: CodeContinent): CarteDuContinent {
  return JSON.parse(readFileSync(`src/data/carte/continents/${code.toLowerCase()}.json`, "utf8")) as CarteDuContinent;
}
