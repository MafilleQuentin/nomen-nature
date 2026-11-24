// Projection Equal Earth (Šavrič, Patterson et Jenny, 2018) : les surfaces sont respectées,
// choisie le 17.11.2026 pour toutes les cartes du site. Mêmes formules que le générateur des
// maquettes (tools/maquettes/carte_monde.py) et que d3-geo (geoEqualEarth).
//
// Le plan de la carte va de 0 à LARGEUR (ouest → est) et de 0 à HAUTEUR (nord → sud).

const A1 = 1.340264;
const A2 = -0.081106;
const A3 = 0.000893;
const A4 = 0.003796;
const M = Math.sqrt(3) / 2;

/** Demi-largeur et demi-hauteur du monde dans la projection, en unités du rayon terrestre. */
const XMAX = (2 * Math.sqrt(3) * Math.PI) / (3 * A1);
const TH90 = Math.asin(M);
const YMAX = TH90 * (A1 + A2 * TH90 ** 2 + TH90 ** 6 * (A3 + A4 * TH90 ** 2));

/** Taille du plan de la carte (le monde entier). */
export const LARGEUR = 1000;
export const HAUTEUR = Math.round((LARGEUR * YMAX) / XMAX);
const ECHELLE = LARGEUR / (2 * XMAX);

/** Position sur la carte d'un point (longitude, latitude en degrés). */
export function projeter(longitude: number, latitude: number): [number, number] {
  const lambda = (longitude * Math.PI) / 180;
  const phi = (latitude * Math.PI) / 180;
  const theta = Math.asin(M * Math.sin(phi));
  const t2 = theta * theta;
  const t6 = t2 * t2 * t2;
  const x = (2 * Math.sqrt(3) * lambda * Math.cos(theta)) / (3 * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)));
  const y = theta * (A1 + A2 * t2 + t6 * (A3 + A4 * t2));
  return [LARGEUR / 2 + x * ECHELLE, HAUTEUR / 2 - y * ECHELLE];
}
