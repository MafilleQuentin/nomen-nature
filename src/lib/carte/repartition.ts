// Points de la carte de répartition d'une espèce (lot 4, QUE-25), décidée le 24.11.2026 :
// les deux tuiles vectorielles de GBIF qui couvrent le monde (EPSG:4326, niveau 0 : ouest et
// est), en hexagones (64 par tuile, environ 2,8°), avec notre identifiant du Catalogue of Life.
// Chaque hexagone devient un point en Equal Earth ; plus il compte d'observations, plus le point
// est gros.
import { lireTuile, type CoucheTuile } from "./mvt.ts";
import { projeter } from "./projection.ts";

const LISTE_COL_XR = "7ddf754f-d193-4cc9-b351-99906754a03b"; // Catalogue of Life XR sur GBIF

export interface PointCarte {
  x: number;
  y: number;
  /** Rayon du point, de 2,5 à 6 unités de carte (sur 1000 de large). */
  r: number;
}

/** Adresse d'une tuile GBIF (x = 0 : hémisphère ouest, 1 : est). */
export function adresseTuile(id: string, x: 0 | 1): string {
  const parametres = new URLSearchParams({ srs: "EPSG:4326", taxonKey: id, checklistKey: LISTE_COL_XR, bin: "hex", hexPerTile: "64" });
  return `https://api.gbif.org/v2/map/occurrence/density/0/${x}/0.mvt?${parametres}`;
}

/** Rayon d'un point selon le nombre d'observations de l'hexagone (échelle logarithmique). */
export function rayon(total: number): number {
  return Math.round((2.5 + Math.min(3.5, Math.log10(Math.max(1, total)) * 0.7)) * 10) / 10;
}

/**
 * Points d'une tuile : les hexagones dont le centre est dans la tuile (GBIF en ajoute autour,
 * qui sont aussi dans la tuile voisine), convertis en longitude et latitude puis projetés.
 */
export function pointsDeLaTuile(couches: CoucheTuile[], x: 0 | 1): PointCarte[] {
  const points: PointCarte[] = [];
  for (const couche of couches) {
    for (const objet of couche.objets) {
      if (objet.x < 0 || objet.x >= couche.etendue || objet.y < 0 || objet.y >= couche.etendue) continue;
      const longitude = -180 + 180 * x + (180 * objet.x) / couche.etendue;
      const latitude = 90 - (180 * objet.y) / couche.etendue;
      const [px, py] = projeter(longitude, latitude);
      points.push({ x: Math.round(px * 10) / 10, y: Math.round(py * 10) / 10, r: rayon(Number(objet.proprietes["total"] ?? 1)) });
    }
  }
  return points;
}

/**
 * Points de répartition d'une espèce, ou undefined si GBIF n'a pas répondu. `lire` va chercher
 * une tuile (avec le cache) et renvoie ses octets, ou undefined.
 */
export async function pointsDeRepartition(id: string, lire: (adresse: string) => Promise<Uint8Array | undefined>): Promise<PointCarte[] | undefined> {
  const tuiles = await Promise.all(([0, 1] as const).map(async (x) => ({ x, octets: await lire(adresseTuile(id, x)) })));
  if (tuiles.some((t) => !t.octets)) return undefined;
  try {
    // Les plus gros points d'abord, pour que les petits restent visibles par-dessus.
    return tuiles.flatMap((t) => pointsDeLaTuile(lireTuile(t.octets ?? new Uint8Array()), t.x)).sort((a, b) => b.r - a.r);
  } catch {
    return undefined;
  }
}
