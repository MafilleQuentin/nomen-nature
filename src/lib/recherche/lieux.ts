// Filtre « Où » de la page de résultats (lot 5, QUE-28, décision du 24.11.2026) : Monde, pays du
// visiteur, son continent. Le pays et le continent du visiteur viennent de Cloudflare (requête en
// cours) et ne sont jamais enregistrés. Les pays et continents de chaque espèce (à partir de
// 5 observations, comme les listes) sont dans /donnees/zones/<n>.json, un fichier par groupe de
// genres comme les fiches (même numéro), écrit par tools/donnees/zones.ts :
//   { "4R5YN": "AT BE CH DE …|EUROPE ASIA", … }
// Fonctions pures, testées dans tests/unit/lieux.test.ts.

/** Continents de GBIF, dans l'ordre d'affichage. */
export const CONTINENTS = ["EUROPE", "AFRICA", "ASIA", "NORTH_AMERICA", "SOUTH_AMERICA", "OCEANIA", "ANTARCTICA"] as const;
export type Continent = (typeof CONTINENTS)[number];

/** Codes de continent de Cloudflare (request.cf.continent) → continents de GBIF. */
const CONTINENTS_CLOUDFLARE: Record<string, Continent> = {
  EU: "EUROPE",
  AF: "AFRICA",
  AS: "ASIA",
  NA: "NORTH_AMERICA",
  SA: "SOUTH_AMERICA",
  OC: "OCEANIA",
  AN: "ANTARCTICA",
};

export type Lieu = { type: "monde" } | { type: "pays"; code: string } | { type: "continent"; code: Continent };

export const MONDE: Lieu = { type: "monde" };

/** Un vrai pays (code ISO à deux lettres), pas « XX » (inconnu) ni « T1 » (Tor) de Cloudflare. */
export const estPays = (code: string) => /^[A-Z]{2}$/.test(code) && code !== "XX" && code !== "ZZ";

export const estContinent = (code: string): code is Continent => (CONTINENTS as readonly string[]).includes(code);

/** Lieu demandé dans l'adresse (?lieu=CH ou ?lieu=EUROPE) ; Monde par défaut. */
export function lireLieu(valeur: string | null): Lieu {
  const code = (valeur ?? "").toUpperCase();
  if (estContinent(code)) return { type: "continent", code };
  if (estPays(code)) return { type: "pays", code };
  return MONDE;
}

/** Valeur du paramètre « lieu » ; vide pour Monde. */
export const valeurLieu = (lieu: Lieu) => (lieu.type === "monde" ? "" : lieu.code);

/** Pays et continent du visiteur d'après Cloudflare (absents hors de Cloudflare). */
export function lieuxDuVisiteur(cf: { country?: unknown; continent?: unknown } | undefined): Lieu[] {
  const lieux: Lieu[] = [];
  const pays = typeof cf?.country === "string" ? cf.country.toUpperCase() : "";
  if (estPays(pays)) lieux.push({ type: "pays", code: pays });
  const continent = typeof cf?.continent === "string" ? CONTINENTS_CLOUDFLARE[cf.continent.toUpperCase()] : undefined;
  if (continent) lieux.push({ type: "continent", code: continent });
  return lieux;
}

export interface Zones {
  pays: Set<string>;
  continents: Set<string>;
}

/** Zones d'une espèce lues dans son fichier (« AT BE CH|EUROPE »). */
export function zonesDe(valeur: string | undefined): Zones {
  const [pays = "", continents = ""] = (valeur ?? "").split("|");
  return { pays: new Set(pays.split(" ").filter(Boolean)), continents: new Set(continents.split(" ").filter(Boolean)) };
}

/** L'espèce a-t-elle été observée dans ce lieu (au moins 5 observations) ? */
export function estObserveeA(zones: Zones, lieu: Lieu): boolean {
  if (lieu.type === "monde") return true;
  return lieu.type === "pays" ? zones.pays.has(lieu.code) : zones.continents.has(lieu.code);
}

export const memeLieu = (a: Lieu, b: Lieu) => valeurLieu(a) === valeurLieu(b);
