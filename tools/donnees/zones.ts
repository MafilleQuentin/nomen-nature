// Pays et continents de chaque espèce pour le filtre « Où » de la recherche (lot 5, QUE-28,
// décision du 24.11.2026) : un fichier par groupe de genres, avec le même numéro que les fiches
// (src/lib/especes/adresse.ts), lu par le serveur seulement quand le filtre est choisi.
// Format (src/lib/recherche/lieux.ts) : { "<id>": "AT BE CH|EUROPE ASIA", … }.
// Une espèce compte dans un pays ou un continent à partir de 5 observations, comme les listes ;
// le pays « ZZ » (inconnu) est ignoré.
//
// Entrées : data/complements-recherche.tsv (adresse de chaque espèce, écrit par fiches.ts),
// data/gbif/pays.tsv et data/gbif/continents.tsv (gbif.ts).
//
// Utilisation seule : node tools/donnees/zones.ts [dossier de sortie]
import { createReadStream, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fichierDeLAdresse } from "../../src/lib/especes/adresse.ts";
import { lignesTsv } from "./col.ts";
import { FICHIER_COMPLEMENTS } from "./fiches.ts";
import { SEUIL_OBSERVATIONS } from "./listes.ts";

interface ZonesEspece {
  pays: string[];
  continents: string[];
}

export async function construireZones(donnees: string, sortie: string) {
  // 1. Numéro du fichier de chaque espèce, d'après son adresse.
  const numeros = new Map<string, number>();
  for await (const c of lignesTsv(createReadStream(join(donnees, FICHIER_COMPLEMENTS)))) {
    const id = c["id"] ?? "";
    const adresse = c["adresse"] ?? "";
    if (id && adresse) numeros.set(id, fichierDeLAdresse(adresse));
  }

  // 2. Pays et continents (au moins 5 observations).
  const zones = new Map<string, ZonesEspece>();
  const zonesDe = (id: string) => {
    let z = zones.get(id);
    if (!z) zones.set(id, (z = { pays: [], continents: [] }));
    return z;
  };
  let couples = 0;
  for (const [fichier, colonne, cle] of [
    ["pays.tsv", "pays", "pays"],
    ["continents.tsv", "continent", "continents"],
  ] as const) {
    for await (const l of lignesTsv(createReadStream(join(donnees, "gbif", fichier)))) {
      const id = l["id"] ?? "";
      const code = (l[colonne] ?? "").toUpperCase();
      if (!code || code === "ZZ" || !numeros.has(id) || Number(l["observations"] ?? 0) < SEUIL_OBSERVATIONS) continue;
      zonesDe(id)[cle].push(code);
      couples++;
    }
  }

  // 3. Un fichier par numéro.
  const parFichier = new Map<number, Record<string, string>>();
  for (const [id, z] of zones) {
    const n = numeros.get(id) ?? 0;
    let contenu = parFichier.get(n);
    if (!contenu) parFichier.set(n, (contenu = {}));
    contenu[id] = `${z.pays.sort().join(" ")}|${z.continents.sort().join(" ")}`;
  }
  rmSync(sortie, { recursive: true, force: true });
  mkdirSync(sortie, { recursive: true });
  let octets = 0;
  let plusGros = 0;
  for (const [n, contenu] of parFichier) {
    const texte = JSON.stringify(contenu);
    writeFileSync(join(sortie, `${n}.json`), texte);
    octets += texte.length;
    plusGros = Math.max(plusGros, texte.length);
  }
  return { especes: zones.size, couples, fichiers: parFichier.size, mo: Math.round(octets / 1e5) / 10, plus_gros_fichier_ko: Math.round(plusGros / 1024) };
}

if (import.meta.main) {
  console.log(await construireZones("tools/donnees/data", process.argv[2] ?? "tools/donnees/data/paquet/zones"));
}
