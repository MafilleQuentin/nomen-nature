// Géométrie de la carte interactive (lot 6, QUE-29), dans le plan de la projection Equal Earth
// (src/lib/carte/projection.ts) : simplification des tracés (Douglas-Peucker), découpe d'un
// anneau par un rectangle (Sutherland-Hodgman) et écriture compacte d'un chemin SVG. Testé dans
// tests/unit/carte-interactive.test.ts.

export type Point = [number, number];
export type Anneau = Point[];
/** Rectangle dans le plan : [x, y, largeur, hauteur]. */
export type Rectangle = [number, number, number, number];

/** Précision des chemins écrits : un dixième d'unité du plan (1 000 unités pour le monde). */
export const PRECISION = 10;

function distanceAuSegment([x, y]: Point, [x1, y1]: Point, [x2, y2]: Point): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const longueur2 = dx * dx + dy * dy;
  if (longueur2 === 0) return Math.hypot(x - x1, y - y1);
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / longueur2));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

/** Simplifie une ligne (Douglas-Peucker) : retire les points à moins de `tolerance` du tracé. */
export function simplifier(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points;
  const garder = new Uint8Array(points.length);
  garder[0] = 1;
  garder[points.length - 1] = 1;
  const pile: [number, number][] = [[0, points.length - 1]];
  while (pile.length > 0) {
    const [debut, fin] = pile.pop() as [number, number];
    let pire = -1;
    let ecart = tolerance;
    for (let i = debut + 1; i < fin; i++) {
      const d = distanceAuSegment(points[i] as Point, points[debut] as Point, points[fin] as Point);
      if (d > ecart) {
        ecart = d;
        pire = i;
      }
    }
    if (pire > 0) {
      garder[pire] = 1;
      pile.push([debut, pire], [pire, fin]);
    }
  }
  return points.filter((_, i) => garder[i]);
}

/** Simplifie un anneau fermé ; undefined s'il devient trop petit (moins de 3 points distincts). */
export function simplifierAnneau(anneau: Anneau, tolerance: number): Anneau | undefined {
  const ferme = anneau.length > 1 && anneau[0]?.[0] === anneau.at(-1)?.[0] && anneau[0]?.[1] === anneau.at(-1)?.[1];
  const ligne = ferme ? anneau : [...anneau, anneau[0] as Point];
  const simple = simplifier(ligne, tolerance).slice(0, -1);
  return simple.length >= 3 ? simple : undefined;
}

/** Boîte englobante d'un anneau : [x, y, largeur, hauteur]. */
export function boite(anneau: Anneau): Rectangle {
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of anneau) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return [minX, minY, maxX - minX, maxY - minY];
}

export const seCroisent = ([ax, ay, al, ah]: Rectangle, [bx, by, bl, bh]: Rectangle) => ax <= bx + bl && bx <= ax + al && ay <= by + bh && by <= ay + ah;

/** Découpe un anneau par un rectangle (Sutherland-Hodgman) ; undefined s'il n'en reste rien. */
export function decouper(anneau: Anneau, [x, y, largeur, hauteur]: Rectangle): Anneau | undefined {
  const bords: [(p: Point) => boolean, (a: Point, b: Point) => Point][] = [
    [(p) => p[0] >= x, (a, b) => intersection(a, b, 0, x)],
    [(p) => p[0] <= x + largeur, (a, b) => intersection(a, b, 0, x + largeur)],
    [(p) => p[1] >= y, (a, b) => intersection(a, b, 1, y)],
    [(p) => p[1] <= y + hauteur, (a, b) => intersection(a, b, 1, y + hauteur)],
  ];
  let points = anneau;
  for (const [dedans, couper] of bords) {
    if (points.length === 0) break;
    const sortie: Point[] = [];
    for (let i = 0; i < points.length; i++) {
      const courant = points[i] as Point;
      const precedent = points[(i + points.length - 1) % points.length] as Point;
      if (dedans(courant)) {
        if (!dedans(precedent)) sortie.push(couper(precedent, courant));
        sortie.push(courant);
      } else if (dedans(precedent)) {
        sortie.push(couper(precedent, courant));
      }
    }
    points = sortie;
  }
  return points.length >= 3 ? points : undefined;
}

function intersection(a: Point, b: Point, axe: 0 | 1, valeur: number): Point {
  const t = (valeur - a[axe]) / (b[axe] - a[axe]);
  return axe === 0 ? [valeur, a[1] + t * (b[1] - a[1])] : [a[0] + t * (b[0] - a[0]), valeur];
}

/**
 * Chemin SVG compact d'anneaux fermés : coordonnées entières en dixièmes d'unité, déplacements
 * relatifs (« M123 45l3-2 4 1z »). Le chemin se dessine avec une échelle de 1/PRECISION.
 */
export function chemin(anneaux: Anneau[]): string {
  const morceaux: string[] = [];
  for (const anneau of anneaux) {
    let precedent: Point | undefined;
    const pas: string[] = [];
    for (const [x, y] of anneau) {
      const point: Point = [Math.round(x * PRECISION), Math.round(y * PRECISION)];
      if (!precedent) {
        morceaux.push(`M${point[0]} ${point[1]}`);
      } else {
        const dx = point[0] - precedent[0];
        const dy = point[1] - precedent[1];
        if (dx === 0 && dy === 0) continue;
        pas.push(`${dx}${dy < 0 ? "" : " "}${dy}`);
      }
      precedent = point;
    }
    if (pas.length >= 2) morceaux.push(`l${pas.join(" ").replace(/ -/g, "-")}z`);
    else morceaux.pop();
  }
  return morceaux.join("");
}
