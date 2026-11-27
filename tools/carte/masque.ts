// Masque des terres à un degré (lot 6, QUE-31) : pour chaque case de la grille des courbes de
// niveau (360 × 180), « terre » si l'un de ses 9 points d'échantillon tombe sur les terres de
// Natural Earth 1:110 m (domaine public). Les courbes ne gardent que les cases de terre (les
// observations en mer, peu nombreuses, empileraient les courbes le long des côtes).
//
// Sortie versionnée (l'import mensuel n'a pas Natural Earth) : src/data/carte/terres-un-degre.txt,
// 180 lignes (de 90°N à 90°S) de 90 chiffres hexadécimaux (4 cases chacun, de 180°W à 180°E).
//
// Utilisation : node tools/carte/masque.ts
import { readFileSync, writeFileSync } from "node:fs";

const ENTREE = "tools/maquettes/data/ne_110m_land.geojson";
export const SORTIE = "src/data/carte/terres-un-degre.txt";

type Anneau = [number, number][];

/** Le point est-il dans l'anneau (règle pair-impair) ? */
function dansAnneau([x, y]: [number, number], anneau: Anneau): boolean {
  let dedans = false;
  for (let i = 0, j = anneau.length - 1; i < anneau.length; j = i++) {
    const [xi = 0, yi = 0] = anneau[i] ?? [];
    const [xj = 0, yj = 0] = anneau[j] ?? [];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}

/** Lit le masque : terres[ligne * 360 + colonne], ligne 0 = 89°N à 90°N, colonne 0 = 180°W. */
export function lireMasque(texte: string): Uint8Array {
  const masque = new Uint8Array(360 * 180);
  texte
    .trim()
    .split("\n")
    .forEach((ligne, y) => {
      for (let i = 0; i < 90; i++) {
        const bits = parseInt(ligne[i] ?? "0", 16);
        for (let b = 0; b < 4; b++) masque[y * 360 + i * 4 + b] = (bits >> (3 - b)) & 1;
      }
    });
  return masque;
}

if (import.meta.main) {
  const terres = JSON.parse(readFileSync(ENTREE, "utf8")) as { features: { geometry: { type: string; coordinates: Anneau[] | Anneau[][] } }[] };
  const polygones = terres.features.flatMap(({ geometry: g }) => (g.type === "Polygon" ? [g.coordinates as Anneau[]] : (g.coordinates as Anneau[][])));
  const boites = polygones.map((p) => {
    const xs = (p[0] ?? []).map(([x]) => x);
    const ys = (p[0] ?? []).map(([, y]) => y);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  });
  const surTerre = (point: [number, number]) =>
    polygones.some((p, i) => {
      const [x0 = 0, y0 = 0, x1 = 0, y1 = 0] = boites[i] ?? [];
      if (point[0] < x0 || point[0] > x1 || point[1] < y0 || point[1] > y1) return false;
      const [exterieur, ...trous] = p;
      return Boolean(exterieur && dansAnneau(point, exterieur) && !trous.some((t) => dansAnneau(point, t)));
    });
  const lignes: string[] = [];
  let nombre = 0;
  for (let y = 0; y < 180; y++) {
    const lat = 89 - y;
    let ligne = "";
    for (let i = 0; i < 90; i++) {
      let bits = 0;
      for (let b = 0; b < 4; b++) {
        const lon = -180 + i * 4 + b;
        const terre = [0.1, 0.5, 0.9].some((dy) => [0.1, 0.5, 0.9].some((dx) => surTerre([lon + dx, lat + dy])));
        if (terre) {
          bits |= 1 << (3 - b);
          nombre++;
        }
      }
      ligne += bits.toString(16);
    }
    lignes.push(ligne);
  }
  writeFileSync(SORTIE, lignes.join("\n") + "\n");
  console.log(`${SORTIE} : ${nombre} cases de terre sur ${360 * 180}`);
}
