// Listes d'espèces par pays et par continent (lot 3, QUE-21), selon la note Données et les
// décisions du 23.11.2026 :
// - une espèce entre dans la liste d'un pays (ou d'un continent) à partir de 5 observations ;
// - un fichier par région et par groupe courant : les 500 espèces les mieux classées (score
//   « bien documentée », puis observations dans la région), plus toutes les espèces menacées
//   (CR, EN, VU) de la région, pour que le filtre « menacées » n'en oublie aucune ;
// - un résumé par région : nombre d'espèces et d'espèces menacées par groupe ;
// - le pays « ZZ » (inconnu, souvent en haute mer) n'a pas de liste.
//
// Sorties (dans le paquet) : listes/pays/<CODE>/<groupe>.json et resume.json,
// listes/continents/<continent>/…, et listes/regions.json (toutes les régions et leurs chiffres).
//
// Utilisation seule : node tools/donnees/listes.ts <dossier COL> <dossier de sortie>
import { createReadStream, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { lignesTsv } from "./col.ts";
import { GROUPES } from "./groupes.ts";

export const SEUIL_OBSERVATIONS = 5;
export const MAX_PAR_LISTE = 500;
export const MENACEES = new Set(["CR", "EN", "VU"]);

export interface Candidate {
  id: string;
  score: number;
  observations: number; // dans la région
  uicn: string;
}

const ordre = (a: Candidate, b: Candidate) => b.score - a.score || b.observations - a.observations || (a.id < b.id ? -1 : 1);

/** Les `max` mieux classées, plus toutes les menacées, dans l'ordre (score, puis observations). */
export function selectionner(candidates: Candidate[], max = MAX_PAR_LISTE): Candidate[] {
  const triees = [...candidates].sort(ordre);
  return triees.filter((c, rang) => rang < max || MENACEES.has(c.uicn));
}

interface Espece {
  groupe: string;
  uicn: string;
  score: number;
  nomFr: string;
  photo: string;
}

const COLONNES = ["id", "nom", "nom_fr", "nom_en", "uicn", "score", "observations", "photo"];

export async function construireListes(dossierCol: string, donnees: string, sortie: string) {
  // 1. Les espèces : groupe, statut, score, noms, photo.
  const especes = new Map<string, Espece>();
  for await (const e of lignesTsv(createReadStream(join(donnees, "especes.tsv")))) {
    especes.set(e["id"] ?? "", {
      groupe: e["groupe"] ?? "",
      uicn: e["uicn"] ?? "NE",
      score: Number(e["score"] ?? 0),
      nomFr: e["nom_fr"] ?? "",
      photo: e["photo"] ?? "",
    });
  }
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
      liste.push({ id: c["id"] ?? "", score: e.score, observations, uicn: e.uicn });
      parGroupe.set(e.groupe, liste);
      parRegion.set(region, parGroupe);
    }

    for (const [region, parGroupe] of parRegion) {
      const dossier = join(sortie, type, region);
      mkdirSync(dossier, { recursive: true });
      const resumeGroupes: Record<string, { especes: number; menacees: number }> = {};
      for (const groupe of GROUPES) {
        const candidates = parGroupe.get(groupe) ?? [];
        if (!candidates.length) continue;
        const choisies = selectionner(candidates);
        const menacees = candidates.filter((c) => MENACEES.has(c.uicn)).length;
        resumeGroupes[groupe] = { especes: candidates.length, menacees };
        const contenu = {
          region,
          groupe,
          especes: candidates.length,
          menacees,
          colonnes: COLONNES,
          lignes: choisies.map((c) => {
            const e = especes.get(c.id);
            return [c.id, nomsLatins.get(c.id) ?? "", e?.nomFr ?? "", nomsAnglais.get(c.id) ?? "", c.uicn, c.score, c.observations, e?.photo ?? ""];
          }),
        };
        writeFileSync(join(dossier, `${groupe}.json`), JSON.stringify(contenu));
        fichiers++;
      }
      const resume = { region, type, ...totaux.get(region), groupes: resumeGroupes };
      writeFileSync(join(dossier, "resume.json"), JSON.stringify(resume));
      fichiers++;
      regions[`${type}/${region}`] = { especes: totaux.get(region)?.especes ?? 0, menacees: totaux.get(region)?.menacees ?? 0 };
    }
  }
  writeFileSync(join(sortie, "regions.json"), JSON.stringify(regions));
  fichiers++;
  const pays = Object.keys(regions).filter((r) => r.startsWith("pays/")).length;
  return { pays, continents: Object.keys(regions).length - pays, fichiers };
}

if (import.meta.main) {
  const [dossierCol, sortie] = process.argv.slice(2);
  if (!dossierCol || !sortie) {
    console.error("Utilisation : node tools/donnees/listes.ts <dossier COL> <dossier de sortie>");
    process.exit(1);
  }
  console.log(await construireListes(dossierCol, "tools/donnees/data", sortie));
}
