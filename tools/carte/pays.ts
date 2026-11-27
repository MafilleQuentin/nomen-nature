// Pays de la carte interactive (lot 6, QUE-29, décision du 25.11.2026) : frontières de Natural
// Earth (domaine public) projetées en Equal Earth, simplifiées, écrites en chemins SVG compacts
// dans src/data/carte/ (versionnés, lus à la construction du site) :
// - monde.json : Natural Earth 1:110 m, les terres de chaque continent en un chemin (un lien par
//   continent sur la carte du monde) ;
// - continents/<code>.json : Natural Earth 1:50 m, les pays visibles dans la vue du continent,
//   découpés au cadre, avec le point de l'étiquette, le rang de Natural Earth, le cadre du pays et
//   celui de son plus grand morceau (carte de situation des pages pays, lot 7) ;
// - pays.json : continent de chaque pays (champ CONTINENT de Natural Earth) et point de son
//   étiquette en degrés (surtitre « Pays · 46.80°N 8.23°E » des pages pays, lot 7).
//
// Chaque morceau de terre appartient au continent de son pays (champ CONTINENT), sauf s'il est
// loin de lui : la Guyane va à l'Amérique du Sud, la Réunion à l'Afrique, la Sibérie à l'Asie
// (zones de src/lib/carte/continents.ts).
//
// Données d'entrée (non versionnées, voir tools/carte/README.md) :
// - tools/maquettes/data/ne_110m_admin_0_countries.geojson ;
// - tools/carte/data/ne_50m/ne_50m_admin_0_countries.zip (naturalearthdata.com).
//
// Utilisation : node tools/carte/pays.ts
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buffer } from "node:stream/consumers";
import { CODES_CONTINENTS, CONTINENTS, CONTINENTS_NATURAL_EARTH, dansLeCadre, type Cadre, type CodeContinent } from "../../src/lib/carte/continents.ts";
import { HAUTEUR, LARGEUR, projeter } from "../../src/lib/carte/projection.ts";
import { ouvrirParNom, sourceLocale } from "../donnees/zip.ts";
import { boite, chemin, decouper, seCroisent, simplifierAnneau, type Anneau, type Point, type Rectangle } from "./geometrie.ts";
import { lireAttributs, lirePolygones, type Anneau as AnneauGeo } from "./shapefile.ts";

const ENTREE_110M = "tools/maquettes/data/ne_110m_admin_0_countries.geojson";
const ENTREE_50M = "tools/carte/data/ne_50m/ne_50m_admin_0_countries.zip";
const SORTIE = "src/data/carte";

/**
 * Proportions de la carte d'un continent (largeur / hauteur) : celles du continent, ramenées entre
 * celles de la maquette (625 × 490) et une bande deux fois plus large que haute (Antarctique).
 */
export const PROPORTIONS_CONTINENT: [number, number] = [625 / 490, 2];
/** Tolérances de simplification, en unités du plan : monde (~1 px), continent (selon sa taille). */
const TOLERANCE_MONDE = 0.5;
const PIXELS_CONTINENT = 625; // largeur affichée de la carte d'un continent
const TOLERANCE_PIXELS = 0.35; // précision gardée, en pixels à l'échelle 1 (le zoom grossit au-delà)
/** Plus petite île gardée sur la carte du monde (côté de sa boîte, en unités). */
const ILE_MIN_MONDE = 0.8;

/** Pays sans code ISO dans Natural Earth, rattachés au pays de GBIF. */
const CODES_MANQUANTS: Record<string, string> = { Somaliland: "SO", "N. Cyprus": "CY", "Siachen Glacier": "IN" };

interface Pays {
  code: string;
  continent: CodeContinent | undefined;
  polygones: AnneauGeo[][];
  etiquette: [number, number];
  rang: number;
}

/** Continent d'un morceau de terre : celui du pays s'il est dans sa zone, sinon la zone qui le contient. */
export function continentDuMorceau(centre: [number, number], continentDuPays: CodeContinent | undefined): CodeContinent | undefined {
  if (continentDuPays && dansLeCadre(centre, CONTINENTS[continentDuPays].zone)) return continentDuPays;
  return CODES_CONTINENTS.find((c) => dansLeCadre(centre, CONTINENTS[c].zone)) ?? continentDuPays;
}

/** Centre (moyenne des points) d'un anneau en degrés. */
function centreGeo(anneau: AnneauGeo): [number, number] {
  let [x, y] = [0, 0];
  for (const [lon, lat] of anneau) {
    x += lon;
    y += lat;
  }
  return [x / anneau.length, y / anneau.length];
}

const projeterAnneau = (anneau: AnneauGeo): Anneau => anneau.map(([lon, lat]) => projeter(lon, lat));

/** Vue d'un continent dans le plan, élargie aux proportions de la carte. */
export function vueDuContinent([ouest, sud, est, nord]: Cadre, [minimum, maximum] = PROPORTIONS_CONTINENT): Rectangle {
  const bord: Point[] = [];
  for (let i = 0; i <= 20; i++) {
    const lon = ouest + ((est - ouest) * i) / 20;
    const lat = sud + ((nord - sud) * i) / 20;
    bord.push(projeter(lon, sud), projeter(lon, nord), projeter(ouest, lat), projeter(est, lat));
  }
  let [x, y, largeur, hauteur] = boite(bord);
  const proportion = Math.min(maximum, Math.max(minimum, largeur / hauteur));
  if (largeur / hauteur < proportion) {
    const nouvelle = hauteur * proportion;
    x -= (nouvelle - largeur) / 2;
    largeur = nouvelle;
  } else {
    const nouvelle = largeur / proportion;
    y -= (nouvelle - hauteur) / 2;
    hauteur = nouvelle;
  }
  const arrondi = (n: number) => Math.round(n * 10) / 10;
  return [arrondi(x), arrondi(y), arrondi(largeur), arrondi(hauteur)];
}

function lire110m(): Pays[] {
  const geo = JSON.parse(readFileSync(ENTREE_110M, "utf8")) as {
    features: { properties: Record<string, string | number>; geometry: { type: string; coordinates: AnneauGeo[] | AnneauGeo[][] } }[];
  };
  return geo.features.map(({ properties: p, geometry: g }) => ({
    code: String(p["ISO_A2_EH"]) === "-99" ? (CODES_MANQUANTS[String(p["NAME"])] ?? "") : String(p["ISO_A2_EH"]),
    continent: CONTINENTS_NATURAL_EARTH[String(p["CONTINENT"])],
    polygones: (g.type === "Polygon" ? [g.coordinates] : g.coordinates) as AnneauGeo[][],
    etiquette: [Number(p["LABEL_X"]), Number(p["LABEL_Y"])],
    rang: Number(p["MIN_LABEL"]),
  }));
}

async function lire50m(): Promise<Pays[]> {
  const source = await sourceLocale(ENTREE_50M);
  const formes = lirePolygones(await buffer((await ouvrirParNom(source, /\.shp$/)).flux));
  const attributs = lireAttributs(await buffer((await ouvrirParNom(source, /\.dbf$/)).flux));
  // Un enregistrement shapefile mélange extérieurs et trous : chaque anneau est un « polygone ».
  return attributs.map((p, i) => ({
    code: p["ISO_A2_EH"] === "-99" ? (CODES_MANQUANTS[p["NAME"] ?? ""] ?? "") : (p["ISO_A2_EH"] ?? ""),
    continent: CONTINENTS_NATURAL_EARTH[p["CONTINENT"] ?? ""],
    polygones: (formes[i] ?? []).map((anneau) => [anneau]),
    etiquette: [Number(p["LABEL_X"]), Number(p["LABEL_Y"])],
    rang: Number(p["MIN_LABEL"]),
  }));
}

/** Carte du monde : les terres de chaque continent en un chemin. */
function monde(pays: Pays[]) {
  const parContinent = new Map<CodeContinent | "", Anneau[]>();
  for (const p of pays) {
    for (const polygone of p.polygones) {
      const exterieur = polygone[0];
      if (!exterieur) continue;
      const continent = continentDuMorceau(centreGeo(exterieur), p.continent) ?? "";
      for (const anneau of polygone) {
        const simple = simplifierAnneau(projeterAnneau(anneau), TOLERANCE_MONDE);
        if (!simple) continue;
        const [, , l, h] = boite(simple);
        if (Math.max(l, h) < ILE_MIN_MONDE) continue;
        parContinent.set(continent, [...(parContinent.get(continent) ?? []), simple]);
      }
    }
  }
  return {
    largeur: LARGEUR,
    hauteur: HAUTEUR,
    continents: Object.fromEntries(
      CODES_CONTINENTS.map((c) => [
        c,
        { chemin: chemin(parContinent.get(c) ?? []), etiquette: projeter(...CONTINENTS[c].centre).map((n) => Math.round(n * 10) / 10) },
      ]),
    ),
    autres: chemin(parContinent.get("") ?? []),
  };
}

/** Carte d'un continent : les pays visibles dans sa vue, découpés, avec leurs étiquettes. */
function continent(code: CodeContinent, pays: Pays[]) {
  // L'Antarctique est une bande très plate en Equal Earth : une vue plus large que haute.
  const vue = vueDuContinent(CONTINENTS[code].vue, code === "ANTARCTICA" ? [3.5, 3.5] : undefined);
  const [vx, vy, vl, vh] = vue;
  const marge: Rectangle = [vx - vl * 0.05, vy - vh * 0.05, vl * 1.1, vh * 1.1];
  const tolerance = (vl / PIXELS_CONTINENT) * TOLERANCE_PIXELS;
  const sortie = [];
  for (const p of pays) {
    let membre = false;
    const anneaux: Anneau[] = [];
    let principal: Rectangle | undefined;
    for (const polygone of p.polygones) {
      const exterieur = polygone[0];
      if (!exterieur) continue;
      const dedans = continentDuMorceau(centreGeo(exterieur), p.continent) === code;
      if (dedans) membre = true;
      for (const [rangAnneau, anneau] of polygone.entries()) {
        const projete = projeterAnneau(anneau);
        if (!seCroisent(boite(projete), marge)) continue;
        const decoupe = decouper(projete, marge);
        const simple = decoupe && simplifierAnneau(decoupe, tolerance);
        if (!simple || Math.max(boite(simple)[2], boite(simple)[3]) < tolerance * 2) continue;
        anneaux.push(simple);
        // Plus grand morceau du pays sur ce continent (sa boîte) : cadre de la carte de situation.
        const cadre = boite(decoupe ?? simple);
        if (dedans && rangAnneau === 0 && (!principal || cadre[2] * cadre[3] > principal[2] * principal[3])) principal = cadre;
      }
    }
    if (anneaux.length === 0) continue;
    const arrondi = (n: number) => Math.round(n * 10) / 10;
    const etiquette = projeter(...p.etiquette).map(arrondi) as Point;
    sortie.push({
      code: p.code,
      membre: membre || p.continent === code,
      chemin: chemin(anneaux),
      etiquette,
      rang: p.rang,
      cadre: boite(anneaux.flat()).map(arrondi),
      ...(principal ? { principal: principal.map(arrondi) } : {}),
    });
  }
  return { code, vue, pays: sortie };
}

if (import.meta.main) {
  rmSync(join(SORTIE, "continents"), { recursive: true, force: true });
  mkdirSync(join(SORTIE, "continents"), { recursive: true });
  const carteMonde = monde(lire110m());
  writeFileSync(join(SORTIE, "monde.json"), JSON.stringify(carteMonde));
  console.log(`monde.json : ${Math.round(JSON.stringify(carteMonde).length / 1024)} Ko`);
  const pays50 = await lire50m();
  // Continent et point d'étiquette de chaque pays (le premier enregistrement d'un code l'emporte).
  // Les îles de « Seven seas (open ocean) » (Maurice, Seychelles…) n'ont pas de continent ici :
  // src/lib/carte/pays.ts leur en donne un (TERRITOIRES).
  const infos: Record<string, { continent: CodeContinent | ""; centre: [number, number] }> = {};
  for (const p of pays50) {
    if (!p.code || infos[p.code]) continue;
    infos[p.code] = { continent: p.continent ?? "", centre: [Math.round(p.etiquette[0] * 100) / 100, Math.round(p.etiquette[1] * 100) / 100] };
  }
  writeFileSync(join(SORTIE, "pays.json"), JSON.stringify(infos));
  console.log(`pays.json : ${Object.keys(infos).length} pays`);
  for (const code of CODES_CONTINENTS) {
    const carte = continent(code, pays50);
    const texte = JSON.stringify(carte);
    writeFileSync(join(SORTIE, "continents", `${code.toLowerCase()}.json`), texte);
    console.log(`continents/${code.toLowerCase()}.json : ${carte.pays.length} pays, ${Math.round(texte.length / 1024)} Ko`);
  }
}
