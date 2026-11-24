// Carte de répartition (lot 4, QUE-25) : lecture des tuiles vectorielles de GBIF (sur une tuile
// fabriquée ici, sans données extérieures), projection Equal Earth, points de la carte.
import { describe, expect, it } from "vitest";
import { lireTuile } from "../../src/lib/carte/mvt.ts";
import { HAUTEUR, LARGEUR, projeter } from "../../src/lib/carte/projection.ts";
import { adresseTuile, pointsDeLaTuile, pointsDeRepartition, rayon } from "../../src/lib/carte/repartition.ts";

// --- Petit encodeur protobuf, juste pour fabriquer une tuile de test ---
const varint = (n: number): number[] => {
  const octets: number[] = [];
  while (n >= 0x80) {
    octets.push((n % 0x80) | 0x80);
    n = Math.floor(n / 0x80);
  }
  octets.push(n);
  return octets;
};
const cle = (champ: number, type: number) => varint(champ * 8 + type);
const longueur = (champ: number, contenu: number[]) => [...cle(champ, 2), ...varint(contenu.length), ...contenu];
const texte = (champ: number, s: string) => longueur(champ, [...new TextEncoder().encode(s)]);
const zigzag = (n: number) => (n >= 0 ? n * 2 : -n * 2 - 1);
const commande = (id: number, nombre: number) => id + nombre * 8;

/** Objet « point » (MoveTo) ou « hexagone » (MoveTo, LineTo, ClosePath) avec la propriété total. */
function objet(sommets: [number, number][], indexValeur: number, polygone = false): number[] {
  const geometrie: number[] = [commande(1, 1)];
  let x = 0;
  let y = 0;
  sommets.forEach(([sx, sy], i) => {
    if (i === 1) geometrie.push(commande(2, sommets.length - 1));
    geometrie.push(zigzag(sx - x), zigzag(sy - y));
    x = sx;
    y = sy;
  });
  if (polygone) geometrie.push(commande(7, 1));
  const etiquettes = [0, indexValeur].flatMap(varint);
  return longueur(2, [...longueur(2, etiquettes), ...cle(3, 0), ...varint(polygone ? 3 : 1), ...longueur(4, geometrie.flatMap(varint))]);
}

function tuile(): Uint8Array {
  const couche = [
    ...cle(15, 0), ...varint(2),
    ...texte(1, "occurrence"),
    ...objet([[1024, 2048]], 0),
    ...objet([[3000, 100], [3100, 100], [3100, 200], [3000, 200]], 1, true),
    ...objet([[4200, 50]], 0), // hors de la tuile (marge ajoutée par GBIF)
    ...texte(3, "total"),
    ...longueur(4, [...cle(4, 0), ...varint(5)]),
    ...longueur(4, [...cle(4, 0), ...varint(1000)]),
    ...cle(5, 0), ...varint(4096),
  ];
  return new Uint8Array(longueur(3, couche));
}

describe("lecture des tuiles vectorielles", () => {
  it("lit les couches, les propriétés et le centre des objets", () => {
    const [couche] = lireTuile(tuile());
    expect(couche?.nom).toBe("occurrence");
    expect(couche?.etendue).toBe(4096);
    expect(couche?.objets).toEqual([
      { x: 1024, y: 2048, proprietes: { total: 5 } },
      { x: 3050, y: 150, proprietes: { total: 1000 } },
      { x: 4200, y: 50, proprietes: { total: 5 } },
    ]);
  });

  it("refuse une tuile tronquée", () => {
    expect(() => lireTuile(tuile().subarray(0, 20))).toThrow();
  });

  it("une tuile vide (GBIF répond 204) n'a aucune couche", () => {
    expect(lireTuile(new Uint8Array())).toEqual([]);
  });
});

describe("projection Equal Earth", () => {
  it("place l'équateur, les bords et les pôles", () => {
    expect(LARGEUR).toBe(1000);
    expect(HAUTEUR).toBe(487);
    expect(projeter(0, 0)).toEqual([500, 243.5]);
    expect(projeter(180, 0)[0]).toBeCloseTo(1000, 6);
    expect(projeter(-180, 0)[0]).toBeCloseTo(0, 6);
    expect(projeter(0, 90)[1]).toBeCloseTo(0.14, 2);
    expect(projeter(0, -90)[1]).toBeCloseTo(486.86, 2);
  });
});

describe("points de la carte", () => {
  it("convertit les objets de la tuile en points projetés, sans la marge", () => {
    const points = pointsDeLaTuile(lireTuile(tuile()), 1);
    expect(points).toHaveLength(2);
    // (1024, 2048) dans la tuile est : longitude 45, latitude 0.
    const [x, y] = projeter(45, 0);
    expect(points[0]).toEqual({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, r: rayon(5) });
  });

  it("grossit les points avec le nombre d'observations, sans dépasser 6", () => {
    expect(rayon(1)).toBe(2.5);
    expect(rayon(1000)).toBe(4.6);
    expect(rayon(10 ** 9)).toBe(6);
  });

  it("demande les deux hémisphères à GBIF, avec notre identifiant du Catalogue of Life", async () => {
    expect(adresseTuile("4R5YN", 1)).toBe(
      "https://api.gbif.org/v2/map/occurrence/density/0/1/0.mvt?srs=EPSG%3A4326&taxonKey=4R5YN&checklistKey=7ddf754f-d193-4cc9-b351-99906754a03b&bin=hex&hexPerTile=64",
    );
    const demandees: string[] = [];
    const points = await pointsDeRepartition("4R5YN", async (adresse) => {
      demandees.push(adresse);
      return tuile();
    });
    expect(demandees).toHaveLength(2);
    expect(points).toHaveLength(4);
    expect(points?.[0]?.r).toBe(rayon(1000));
    expect(await pointsDeRepartition("4R5YN", async () => undefined)).toBeUndefined();
  });
});
