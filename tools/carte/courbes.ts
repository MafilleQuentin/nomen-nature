// Courbes de niveau de la carte (lot 6, QUE-31, décision du 25.11.2026) : elles montrent la
// richesse du vivant, le nombre d'espèces observées autour de chaque point (décision du 17.11.2026).
//
// Méthode :
// 1. grille d'un degré (360 × 180) : espèces distinctes observées par case (GBIF, cases.tsv,
//    téléchargement SQL de l'import mensuel) ;
// 2. échelle logarithmique (passer de 10 à 100 espèces compte autant que de 100 à 1 000) ;
// 3. seules les cases de terre sont gardées (masque de Natural Earth, tools/carte/masque.ts) ; les
//    autres (mers, et cases de terre sans observation) prennent la valeur de leurs voisines, de
//    proche en proche : sinon les courbes s'empileraient sur les côtes, là où l'on passe de
//    milliers d'espèces à presque rien (les observations en mer sont rares) ;
// 4. lissage gaussien (les cases d'un degré donneraient des marches d'escalier) ;
// 5. courbes de niveau avec d3-contour (marching squares), à intervalles réguliers sur l'échelle
//    logarithmique, de 10 espèces au maximum de la grille lissée (environ 15 000 en Europe de
//    l'Ouest en novembre 2026) ; une courbe sur quatre est « maîtresse » (plus visible), comme sur
//    une carte topographique. Les courbes montrent aussi l'effort d'observation (l'Europe et
//    l'Amérique du Nord sont bien plus observées que la Sibérie) ;
// 6. projection Equal Earth, simplification, et découpe au cadre de chaque continent.
//
// Sortie : carte/courbes.json dans le paquet de données, lu par le serveur pour la carte du monde
// et les pages des continents (src/lib/carte/courbes.ts) :
//   { niveaux: [nombre d'espèces…], niveauxContinents: { EUROPE: […] },
//     monde: [{ maitresse, chemin }…], continents: { EUROPE: [{ maitresse, chemin }…] } }
//
// Utilisation seule : node tools/carte/courbes.ts [cases.tsv] [sortie.json]
import { createReadStream, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { contours } from "d3-contour";
import { CODES_CONTINENTS, CONTINENTS, type CodeContinent } from "../../src/lib/carte/continents.ts";
import { carteDuContinentSurDisque } from "./donnees-disque.ts";
import { lireMasque, SORTIE as MASQUE } from "./masque.ts";
import { projeter } from "../../src/lib/carte/projection.ts";
import { lignesTsv } from "../donnees/col.ts";
import { boite, chemin, decouper, seCroisent, simplifierAnneau, type Anneau, type Rectangle } from "./geometrie.ts";

export const LARGEUR_GRILLE = 360;
export const HAUTEUR_GRILLE = 180;
/** Écart-type du lissage, en cases d'un degré. */
const LISSAGE = 1.2;
/** Nombre de courbes entre la plus basse (10 espèces) et la plus haute ; une sur quatre est maîtresse. */
const NOMBRE_COURBES = 16;
/** Nombre de courbes sur la carte d'un continent (niveaux propres au continent). */
const NOMBRE_CONTINENT = 12;
const MAITRESSE = 4;
/** Tolérances de simplification (unités du plan, 1 000 pour le monde). */
const TOLERANCE_MONDE = 0.6;
const PIXELS_CONTINENT = 625;
const TOLERANCE_PIXELS = 0.6;
/** Plus petit anneau gardé (côté de sa boîte, en unités du plan). */
const ANNEAU_MIN = 1.5;

/** Grille des espèces par case : valeurs[ligne * 360 + colonne], ligne 0 = 89°N à 90°N. */
export async function lireGrille(fichier: string): Promise<Float64Array> {
  const valeurs = new Float64Array(LARGEUR_GRILLE * HAUTEUR_GRILLE);
  for await (const c of lignesTsv(createReadStream(fichier))) {
    const lat = Number(c["lat"]);
    const lon = Number(c["lon"]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const ligne = Math.min(HAUTEUR_GRILLE - 1, Math.max(0, 89 - lat));
    const colonne = Math.min(LARGEUR_GRILLE - 1, Math.max(0, lon + 180));
    valeurs[ligne * LARGEUR_GRILLE + colonne] = Number(c["especes"]) || 0;
  }
  return valeurs;
}

/** Lissage gaussien séparable ; la longitude fait le tour du monde, la latitude s'arrête aux pôles. */
export function lisser(valeurs: Float64Array, largeur: number, hauteur: number, ecartType: number): Float64Array {
  const rayon = Math.ceil(ecartType * 3);
  const noyau = Array.from({ length: 2 * rayon + 1 }, (_, i) => Math.exp(-((i - rayon) ** 2) / (2 * ecartType ** 2)));
  const somme = noyau.reduce((a, b) => a + b, 0);
  const poids = noyau.map((p) => p / somme);
  const horizontal = new Float64Array(valeurs.length);
  for (let y = 0; y < hauteur; y++) {
    for (let x = 0; x < largeur; x++) {
      let total = 0;
      for (let k = -rayon; k <= rayon; k++) total += (poids[k + rayon] ?? 0) * (valeurs[y * largeur + ((x + k + largeur) % largeur)] ?? 0);
      horizontal[y * largeur + x] = total;
    }
  }
  const sortie = new Float64Array(valeurs.length);
  for (let y = 0; y < hauteur; y++) {
    for (let x = 0; x < largeur; x++) {
      let total = 0;
      let poidsUtiles = 0;
      for (let k = -rayon; k <= rayon; k++) {
        const yy = y + k;
        if (yy < 0 || yy >= hauteur) continue;
        total += (poids[k + rayon] ?? 0) * (horizontal[yy * largeur + x] ?? 0);
        poidsUtiles += poids[k + rayon] ?? 0;
      }
      sortie[y * largeur + x] = poidsUtiles > 0 ? total / poidsUtiles : 0;
    }
  }
  return sortie;
}

/** Remplit les cases vides (0) avec la moyenne de leurs voisines déjà remplies, de proche en proche. */
export function remplir(valeurs: Float64Array, largeur: number, hauteur: number): Float64Array {
  const sortie = Float64Array.from(valeurs);
  let vides = sortie.reduce((n, v) => n + (v > 0 ? 0 : 1), 0);
  while (vides > 0) {
    const suivante = Float64Array.from(sortie);
    let remplies = 0;
    for (let y = 0; y < hauteur; y++) {
      for (let x = 0; x < largeur; x++) {
        if ((sortie[y * largeur + x] ?? 0) > 0) continue;
        let total = 0;
        let n = 0;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const yy = y + dy;
          if (yy < 0 || yy >= hauteur) continue;
          const v = sortie[yy * largeur + ((x + dx + largeur) % largeur)] ?? 0;
          if (v > 0) {
            total += v;
            n++;
          }
        }
        if (n > 0) {
          suivante[y * largeur + x] = total / n;
          remplies++;
        }
      }
    }
    sortie.set(suivante);
    if (remplies === 0) break;
    vides -= remplies;
  }
  return sortie;
}

/** Niveaux des courbes, réguliers en logarithme de `minimum` espèces jusqu'au maximum (exclu). */
export function niveaux(maximumLog: number, minimum = 10, nombre = NOMBRE_COURBES): number[] {
  const bas = Math.log10(minimum + 1);
  const pas = (maximumLog - bas) / nombre;
  return Array.from({ length: nombre }, (_, i) => bas + i * pas);
}

interface Courbe {
  maitresse: boolean;
  anneaux: Anneau[];
}

/** Grille prête pour les courbes : logarithme, terres seules, cases vides remplies, lissage. */
export function preparerGrille(grille: Float64Array, terres?: Uint8Array): Float64Array {
  const log = grille.map((v, i) => (v > 0 && (!terres || terres[i]) ? Math.log10(v + 1) : 0));
  return lisser(remplir(log, LARGEUR_GRILLE, HAUTEUR_GRILLE), LARGEUR_GRILLE, HAUTEUR_GRILLE, LISSAGE);
}

/** Courbes d'une grille préparée aux niveaux donnés, projetées en Equal Earth (plan de la carte). */
export function tracer(lisse: Float64Array, seuils: number[]): Courbe[] {
  const formes = contours().size([LARGEUR_GRILLE, HAUTEUR_GRILLE]).thresholds(seuils)(Array.from(lisse));
  return formes.map((forme, i) => ({
    maitresse: i % MAITRESSE === MAITRESSE - 1,
    // Coordonnées de la grille → degrés : x = longitude + 180, y = 90 − latitude.
    anneaux: forme.coordinates
      .flat()
      .map((anneau) => anneau.map(([x = 0, y = 0]) => projeter(Math.max(-180, Math.min(180, x - 180)), Math.max(-90, Math.min(90, 90 - y))))),
  }));
}

const enEspeces = (seuils: number[]) => seuils.map((s) => Math.round(10 ** s - 1));

/** Courbes du monde : niveaux réguliers de 10 espèces au maximum de la grille. */
export function calculerCourbes(grille: Float64Array, terres?: Uint8Array): { niveaux: number[]; courbes: Courbe[] } {
  const lisse = preparerGrille(grille, terres);
  const seuils = niveaux(Math.max(...lisse));
  return { niveaux: enEspeces(seuils), courbes: tracer(lisse, seuils) };
}

/**
 * Niveaux d'un continent : réguliers en logarithme entre les cases de terre observées les moins
 * riches (5 % du bas) et les plus riches de sa vue. Chaque continent a ainsi ses courbes, même
 * l'Europe, observée partout et dont les écarts se perdraient dans les niveaux du monde.
 */
export function niveauxDuContinent(
  lisse: Float64Array,
  grille: Float64Array,
  terres: Uint8Array | undefined,
  [ouest, sud, est, nord]: [number, number, number, number],
): number[] {
  const valeurs: number[] = [];
  for (let lat = Math.ceil(sud); lat < nord; lat++) {
    for (let lon = Math.ceil(ouest); lon < est; lon++) {
      const i = (89 - lat) * LARGEUR_GRILLE + lon + 180;
      if ((grille[i] ?? 0) > 0 && (!terres || terres[i])) valeurs.push(lisse[i] ?? 0);
    }
  }
  if (valeurs.length === 0) return [];
  valeurs.sort((a, b) => a - b);
  const bas = valeurs[Math.floor(valeurs.length * 0.05)] ?? 0;
  const haut = valeurs.at(-1) ?? bas;
  const nombre = NOMBRE_CONTINENT;
  return Array.from({ length: nombre }, (_, i) => bas + ((haut - bas) * (i + 0.5)) / nombre);
}

function ecrire(courbes: Courbe[], tolerance: number, cadre?: Rectangle) {
  return courbes
    .map(({ maitresse, anneaux }) => {
      const gardes: Anneau[] = [];
      for (const anneau of anneaux) {
        if (cadre && !seCroisent(boite(anneau), cadre)) continue;
        const coupe = cadre ? decouper(anneau, cadre) : anneau;
        const simple = coupe && simplifierAnneau(coupe, tolerance);
        if (simple && Math.max(boite(simple)[2], boite(simple)[3]) >= ANNEAU_MIN * (cadre ? cadre[2] / 1000 : 1)) gardes.push(simple);
      }
      return { maitresse, chemin: chemin(gardes) };
    })
    .filter((c) => c.chemin);
}

export async function construireCourbes(fichierCases: string, sortie: string) {
  const grille = await lireGrille(fichierCases);
  const terres = lireMasque(readFileSync(MASQUE, "utf8"));
  const lisse = preparerGrille(grille, terres);
  const seuils = niveaux(Math.max(...lisse));
  const courbes = tracer(lisse, seuils);
  const niveauxContinents: Record<string, number[]> = {};
  const continents = Object.fromEntries(
    CODES_CONTINENTS.map((code: CodeContinent) => {
      const [x, y, l, h] = carteDuContinentSurDisque(code).vue;
      // Un peu au-delà du cadre : le bord de la découpe ne se voit pas, même en glissant un peu.
      const cadre: Rectangle = [x - l * 0.05, y - h * 0.05, l * 1.1, h * 1.1];
      const seuilsContinent = niveauxDuContinent(lisse, grille, terres, CONTINENTS[code].vue);
      niveauxContinents[code] = enEspeces(seuilsContinent);
      return [code, ecrire(tracer(lisse, seuilsContinent), (l / PIXELS_CONTINENT) * TOLERANCE_PIXELS, cadre)];
    }),
  );
  const contenu = { niveaux: enEspeces(seuils), niveauxContinents, monde: ecrire(courbes, TOLERANCE_MONDE), continents };
  mkdirSync(dirname(sortie), { recursive: true });
  const texte = JSON.stringify(contenu);
  writeFileSync(sortie, texte);
  return { niveaux: enEspeces(seuils), niveauxContinents, ko: Math.round(texte.length / 1024) };
}

if (import.meta.main) {
  const [cases = "tools/donnees/data/gbif/cases.tsv", sortie = "public/donnees/carte/courbes.json"] = process.argv.slice(2);
  console.log(await construireCourbes(cases, sortie));
}
