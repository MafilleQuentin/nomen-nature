// Fond de la carte de répartition (lot 4, QUE-25) : les terres de Natural Earth 1:110 m
// (domaine public) projetées en Equal Earth, simplifiées, dans un SVG commun à toutes les fiches
// (src/assets/carte/terres.svg, mis en cache par le navigateur).
//
// Donnée d'entrée : tools/maquettes/data/ne_110m_land.geojson (téléchargé pour les maquettes,
// non versionné : https://www.naturalearthdata.com/downloads/110m-physical-vectors/).
// Couleurs du design system en clair (un SVG chargé comme image ne lit pas les variables CSS) :
// terres --color-bg-land, côtes --color-map-coast.
//
// Utilisation : node tools/carte/fond.ts
import { readFileSync, writeFileSync } from "node:fs";
import { HAUTEUR, LARGEUR, projeter } from "../../src/lib/carte/projection.ts";

const ENTREE = "tools/maquettes/data/ne_110m_land.geojson";
const SORTIE = "src/assets/carte/terres.svg";
const ECART_MIN = 0.8; // en unités de la carte (1000 de large) : en dessous, le point est sauté

type Anneau = [number, number][];
interface Geometrie {
  type: "Polygon" | "MultiPolygon";
  coordinates: Anneau[] | Anneau[][];
}

const terres = JSON.parse(readFileSync(ENTREE, "utf8")) as { features: { geometry: Geometrie }[] };
const nombre = (n: number) => String(Math.round(n * 10) / 10);
let points = 0;
const chemins: string[] = [];
for (const { geometry } of terres.features) {
  const polygones = (geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates) as Anneau[][];
  for (const polygone of polygones) {
    for (const anneau of polygone) {
      const projetes = anneau.map(([lon, lat]) => projeter(lon, lat));
      const gardes: [number, number][] = [];
      for (const p of projetes) {
        const dernier = gardes.at(-1);
        if (!dernier || Math.hypot(p[0] - dernier[0], p[1] - dernier[1]) >= ECART_MIN) gardes.push(p);
      }
      if (gardes.length < 3) continue;
      points += gardes.length;
      chemins.push(`M${gardes.map(([x, y]) => `${nombre(x)} ${nombre(y)}`).join("L")}Z`);
    }
  }
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGEUR} ${HAUTEUR}" width="${LARGEUR}" height="${HAUTEUR}"><path fill="#1a4434" stroke="#c9dcc9" stroke-width="0.6" stroke-linejoin="round" d="${chemins.join("")}"/></svg>\n`;
writeFileSync(SORTIE, svg);
console.log(`${SORTIE} : ${chemins.length} contours, ${points} points, ${Math.round(svg.length / 1024)} Ko`);
