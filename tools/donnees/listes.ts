// Listes d'espèces par pays et par continent (lot 3, QUE-21), selon la note Données et les
// décisions du 23.11.2026 :
// - une espèce entre dans la liste d'un pays (ou d'un continent) à partir de 5 observations ;
// - un fichier par région et par groupe courant : les 500 espèces les mieux classées (score
//   « bien documentée », puis observations dans la région), plus les espèces menacées (CR, EN,
//   VU) de la région, 300 au plus (les plus graves, puis les plus observées : lot 7, QUE-33 ; sans
//   limite, la liste des arbres du monde pesait 1,2 Mo, trop pour le serveur) ;
// - un résumé par région : nombre d'espèces et d'espèces menacées par groupe ;
// - le pays « ZZ » (inconnu, souvent en haute mer) n'a pas de liste ;
// - pour le panneau de la carte (lot 6, QUE-30) : chaque ligne porte l'adresse de la fiche et le
//   groupe ; deux listes de plus par région, « toutes » (les 100 mieux classées, tous groupes) et
//   « menacees » (CR, puis EN, puis VU, les plus observées d'abord ; 300 au plus) ;
// - pour les listes d'un groupe (lot 7, QUE-33, décision du 27.11.2026) : les mêmes listes pour le
//   monde entier, d'après les observations de chaque espèce dans le monde (même seuil).
//
// Sorties (dans le paquet) : listes/pays/<CODE>/<groupe>.json, toutes.json, menacees.json et resume.json,
// listes/continents/<continent>/…, listes/monde/…, et listes/regions.json (toutes les régions et
// leurs chiffres, « monde » compris).
//
// Utilisation seule : node tools/donnees/listes.ts <dossier COL> <dossier de sortie>
import { createReadStream, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { lignesTsv } from "./col.ts";
import { FICHIER_COMPLEMENTS } from "./fiches.ts";
import { GROUPES } from "./groupes.ts";

export const SEUIL_OBSERVATIONS = 5;
export const MAX_PAR_LISTE = 500;
export const MENACEES = new Set(["CR", "EN", "VU"]);
/** Listes « toutes » et « menacees » de chaque région (panneau de la carte). */
export const MAX_TOUTES = 100;
export const MAX_MENACEES = 300;
const GRAVITE: Record<string, number> = { CR: 0, EN: 1, VU: 2 };

export interface Candidate {
  id: string;
  groupe?: string;
  score: number;
  observations: number; // dans la région
  uicn: string;
}

const ordre = (a: Candidate, b: Candidate) => b.score - a.score || b.observations - a.observations || (a.id < b.id ? -1 : 1);

/** Menacées d'une région : CR, puis EN, puis VU ; les plus observées d'abord ; `max` au plus. */
export function menaceesDAbord(candidates: Candidate[], max = MAX_MENACEES): Candidate[] {
  return candidates
    .filter((c) => MENACEES.has(c.uicn))
    .sort((a, b) => (GRAVITE[a.uicn] ?? 9) - (GRAVITE[b.uicn] ?? 9) || b.observations - a.observations || (a.id < b.id ? -1 : 1))
    .slice(0, max);
}

/** Les `max` mieux classées, plus les `maxMenacees` premières menacées, dans l'ordre (score, puis observations). */
export function selectionner(candidates: Candidate[], max = MAX_PAR_LISTE, maxMenacees = MAX_MENACEES): Candidate[] {
  const menacees = new Set(menaceesDAbord(candidates, maxMenacees));
  return [...candidates].sort(ordre).filter((c, rang) => rang < max || menacees.has(c));
}

interface Espece {
  groupe: string;
  uicn: string;
  score: number;
  /** Observations dans le monde. */
  observations: number;
  nomFr: string;
  photo: string;
}

export const COLONNES = ["id", "nom", "nom_fr", "nom_en", "uicn", "score", "observations", "photo", "adresse", "groupe"];

export async function construireListes(dossierCol: string, donnees: string, sortie: string) {
  // 1. Les espèces : groupe, statut, score, noms, photo.
  const especes = new Map<string, Espece>();
  for await (const e of lignesTsv(createReadStream(join(donnees, "especes.tsv")))) {
    especes.set(e["id"] ?? "", {
      groupe: e["groupe"] ?? "",
      uicn: e["uicn"] ?? "NE",
      score: Number(e["score"] ?? 0),
      observations: Number(e["observations"] ?? 0),
      nomFr: e["nom_fr"] ?? "",
      photo: e["photo"] ?? "",
    });
  }
  // Adresse de la fiche de chaque espèce (écrite par fiches.ts, étape précédente de l'import).
  const adresses = new Map<string, string>();
  for await (const c of lignesTsv(createReadStream(join(donnees, FICHIER_COMPLEMENTS)))) adresses.set(c["id"] ?? "", c["adresse"] ?? "");
  const nomsLatins = new Map<string, string>();
  for await (const t of lignesTsv(createReadStream(join(dossierCol, "taxons.tsv")))) {
    if (t["rang"] === "species" && especes.has(t["id"] ?? "")) nomsLatins.set(t["id"] ?? "", t["nom"] ?? "");
  }
  const nomsAnglais = new Map<string, string>();
  for await (const n of lignesTsv(createReadStream(join(dossierCol, "noms.tsv")))) {
    const id = n["taxon_id"] ?? "";
    if (n["langue"] === "en" && n["type"] === "courant" && especes.has(id) && !nomsAnglais.has(id)) nomsAnglais.set(id, n["nom"] ?? "");
  }

  rmSync(sortie, { recursive: true, force: true });
  const regions: Record<string, Record<string, unknown>> = {};
  let fichiers = 0;

  const ligne = (c: Candidate) => {
    const e = especes.get(c.id);
    return [
      c.id,
      nomsLatins.get(c.id) ?? "",
      e?.nomFr ?? "",
      nomsAnglais.get(c.id) ?? "",
      c.uicn,
      c.score,
      c.observations,
      e?.photo ?? "",
      adresses.get(c.id) ?? "",
      c.groupe ?? "",
    ];
  };

  /** Écrit les listes d'une région : une par groupe, « toutes », « menacees » et le résumé. */
  const ecrireRegion = (dossier: string, region: string, type: string, parGroupe: Map<string, Candidate[]>, total: { especes: number; menacees: number }) => {
    mkdirSync(dossier, { recursive: true });
    const resumeGroupes: Record<string, { especes: number; menacees: number }> = {};
    for (const groupe of GROUPES) {
      const candidates = parGroupe.get(groupe) ?? [];
      if (!candidates.length) continue;
      const choisies = selectionner(candidates);
      const menacees = candidates.filter((c) => MENACEES.has(c.uicn)).length;
      resumeGroupes[groupe] = { especes: candidates.length, menacees };
      const contenu = { region, groupe, especes: candidates.length, menacees, colonnes: COLONNES, lignes: choisies.map(ligne) };
      writeFileSync(join(dossier, `${groupe}.json`), JSON.stringify(contenu));
      fichiers++;
    }
    // Panneau de la carte : toutes les espèces (les mieux classées) et les menacées, tous groupes.
    const tous = [...parGroupe.values()].flat();
    for (const [nom, lignes] of [
      ["toutes", [...tous].sort(ordre).slice(0, MAX_TOUTES)],
      ["menacees", menaceesDAbord(tous)],
    ] as const) {
      writeFileSync(join(dossier, `${nom}.json`), JSON.stringify({ region, groupe: "", ...total, colonnes: COLONNES, lignes: lignes.map(ligne) }));
      fichiers++;
    }
    writeFileSync(join(dossier, "resume.json"), JSON.stringify({ region, type, ...total, groupes: resumeGroupes }));
    fichiers++;
  };

  // 2. Pour chaque type de région (pays, continents) : regrouper, sélectionner, écrire.
  for (const [type, fichier, colonne] of [
    ["pays", "pays.tsv", "pays"],
    ["continents", "continents.tsv", "continent"],
  ] as const) {
    const parRegion = new Map<string, Map<string, Candidate[]>>();
    const totaux = new Map<string, { especes: number; menacees: number }>();
    for await (const c of lignesTsv(createReadStream(join(donnees, "gbif", fichier)))) {
      const region = (c[colonne] ?? "").toLowerCase();
      const observations = Number(c["observations"] ?? 0);
      const e = especes.get(c["id"] ?? "");
      if (!region || region === "zz" || !e || observations < SEUIL_OBSERVATIONS) continue;
      const total = totaux.get(region) ?? { especes: 0, menacees: 0 };
      total.especes++;
      if (MENACEES.has(e.uicn)) total.menacees++;
      totaux.set(region, total);
      if (!e.groupe) continue; // hors des 13 groupes : trouvable par la recherche seulement
      const parGroupe = parRegion.get(region) ?? new Map<string, Candidate[]>();
      const liste = parGroupe.get(e.groupe) ?? [];
      liste.push({ id: c["id"] ?? "", groupe: e.groupe, score: e.score, observations, uicn: e.uicn });
      parGroupe.set(e.groupe, liste);
      parRegion.set(region, parGroupe);
    }

    for (const [region, parGroupe] of parRegion) {
      const total = totaux.get(region) ?? { especes: 0, menacees: 0 };
      ecrireRegion(join(sortie, type, region), region, type, parGroupe, total);
      regions[`${type}/${region}`] = { especes: total.especes, menacees: total.menacees };
    }
  }

  // 3. Le monde entier (listes d'un groupe, lot 7) : observations de chaque espèce dans le monde.
  const monde = new Map<string, Candidate[]>();
  const totalMonde = { especes: 0, menacees: 0 };
  for (const [id, e] of especes) {
    if (e.observations < SEUIL_OBSERVATIONS) continue;
    totalMonde.especes++;
    if (MENACEES.has(e.uicn)) totalMonde.menacees++;
    if (!e.groupe) continue;
    const liste = monde.get(e.groupe) ?? [];
    liste.push({ id, groupe: e.groupe, score: e.score, observations: e.observations, uicn: e.uicn });
    monde.set(e.groupe, liste);
  }
  ecrireRegion(join(sortie, "monde"), "monde", "monde", monde, totalMonde);
  regions["monde"] = totalMonde;
  writeFileSync(join(sortie, "regions.json"), JSON.stringify(regions));
  fichiers++;
  const pays = Object.keys(regions).filter((r) => r.startsWith("pays/")).length;
  const continents = Object.keys(regions).filter((r) => r.startsWith("continents/")).length;
  return { pays, continents, monde: totalMonde, fichiers };
}

if (import.meta.main) {
  const [dossierCol, sortie] = process.argv.slice(2);
  if (!dossierCol || !sortie) {
    console.error("Utilisation : node tools/donnees/listes.ts <dossier COL> <dossier de sortie>");
    process.exit(1);
  }
  console.log(await construireListes(dossierCol, "tools/donnees/data", sortie));
}
