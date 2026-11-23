// Téléchargements SQL de GBIF (lot 3) : valider une requête, la soumettre, attendre la fin du
// calcul, télécharger le résultat. Documentation : https://techdocs.gbif.org/en/data-use/api-sql-downloads
//
// Identifiants GBIF lus dans `.env` (GBIF_UTILISATEUR, GBIF_MOT_DE_PASSE) ou dans les variables
// d'environnement (secrets GitHub). Ils ne sont jamais affichés.
//
// Utilisation (Node 22.18+ exécute directement le TypeScript) :
//   node tools/donnees/gbif-sql.ts valider     <fichier.sql>
//   node tools/donnees/gbif-sql.ts demander    <fichier.sql>
//   node tools/donnees/gbif-sql.ts etat        [clé]      (sans clé : les derniers téléchargements du compte)
//   node tools/donnees/gbif-sql.ts telecharger <clé>
//   node tools/donnees/gbif-sql.ts obtenir     <fichier.sql>  (réutilise un résultat récent, sinon demande et attend)
import { createWriteStream, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as FluxWeb } from "node:stream/web";
import { AGENT } from "./zip.ts";

const API = "https://api.gbif.org/v1/occurrence/download";
export const DOSSIER = "tools/donnees/data/gbif";

export interface Telechargement {
  cle: string;
  statut: string; // PREPARING, RUNNING, SUCCEEDED, FAILED, KILLED, CANCELLED…
  creation: string;
  lignes: number;
  doi: string;
  licence: string;
  sql: string;
}

function utilisateur(): { nom: string; autorisation: string } {
  if (existsSync(".env")) process.loadEnvFile(".env");
  const nom = process.env["GBIF_UTILISATEUR"];
  const motDePasse = process.env["GBIF_MOT_DE_PASSE"];
  if (!nom || !motDePasse) {
    throw new Error("GBIF_UTILISATEUR et GBIF_MOT_DE_PASSE manquent (fichier .env ou variables d'environnement).");
  }
  return { nom, autorisation: "Basic " + Buffer.from(`${nom}:${motDePasse}`).toString("base64") };
}

/** Requête SQL sur une seule ligne (GBIF refuse les retours à la ligne et les commentaires). */
export function lireRequete(fichier: string): string {
  return readFileSync(fichier, "utf8")
    .split("\n")
    .filter((ligne) => !ligne.trim().startsWith("--"))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

async function appeler(url: string, options: RequestInit = {}): Promise<Response> {
  const reponse = await fetch(url, {
    ...options,
    headers: { "User-Agent": AGENT, "Content-Type": "application/json", ...options.headers },
  });
  if (!reponse.ok) {
    throw new Error(`GBIF a répondu ${reponse.status} ${reponse.statusText} : ${(await reponse.text()).slice(0, 500)}`);
  }
  return reponse;
}

const corps = (sql: string) => JSON.stringify({ sendNotification: false, format: "SQL_TSV_ZIP", sql });

interface InfosGbif {
  key: string;
  status: string;
  created: string;
  totalRecords?: number;
  doi?: string;
  license?: string;
  request?: { sql?: string };
}

function lire(d: InfosGbif): Telechargement {
  return {
    cle: d.key,
    statut: d.status,
    creation: d.created,
    lignes: d.totalRecords ?? 0,
    doi: d.doi ?? "",
    licence: d.license ?? "",
    sql: d.request?.sql ?? "",
  };
}

export async function valider(sql: string): Promise<void> {
  await appeler(`${API}/request/validate`, { method: "POST", headers: { Authorization: utilisateur().autorisation }, body: corps(sql) });
}

export async function demander(sql: string): Promise<string> {
  const reponse = await appeler(`${API}/request`, {
    method: "POST",
    headers: { Authorization: utilisateur().autorisation },
    body: corps(sql),
  });
  return (await reponse.text()).trim();
}

export async function infos(cle: string): Promise<Telechargement> {
  return lire((await (await appeler(`${API}/${cle}`)).json()) as InfosGbif);
}

/** Les derniers téléchargements du compte, du plus récent au plus ancien. */
export async function recents(limite = 50): Promise<Telechargement[]> {
  const { nom, autorisation } = utilisateur();
  const reponse = await appeler(`${API}/user/${encodeURIComponent(nom)}?limit=${limite}`, { headers: { Authorization: autorisation } });
  return ((await reponse.json()) as { results: InfosGbif[] }).results.map(lire);
}

const TERMINES = new Set(["SUCCEEDED", "FAILED", "KILLED", "CANCELLED", "FILE_ERASED"]);

/** Attend la fin du calcul chez GBIF (~20 minutes pour nos requêtes). */
export async function attendre(cle: string, intervalleSecondes = 60, delaiMaxMinutes = 180): Promise<Telechargement> {
  const limite = Date.now() + delaiMaxMinutes * 60_000;
  for (;;) {
    const t = await infos(cle);
    if (TERMINES.has(t.statut)) return t;
    if (Date.now() > limite) throw new Error(`Téléchargement ${cle} toujours « ${t.statut} » après ${delaiMaxMinutes} minutes.`);
    console.log(`  ${cle} : ${t.statut}…`);
    await new Promise((ok) => setTimeout(ok, intervalleSecondes * 1000));
  }
}

export async function telecharger(cle: string, destination: string): Promise<void> {
  const reponse = await appeler(`${API}/request/${cle}.zip`, { redirect: "follow" });
  if (!reponse.body) throw new Error("Réponse vide.");
  mkdirSync(join(destination, ".."), { recursive: true });
  await pipeline(Readable.fromWeb(reponse.body as FluxWeb), createWriteStream(destination));
}

export interface Options {
  /** Réutiliser un résultat identique de moins de N jours (0 : toujours redemander). */
  reutiliserJours?: number;
  /** En dessous, le résultat est jugé anormal (filtre qui ne trouve plus rien) et refusé. */
  lignesMin?: number;
  dossier?: string;
}

/**
 * Obtient le résultat d'une requête : réutilise un téléchargement récent et identique du compte,
 * sinon le demande et attend. Refuse un résultat presque vide : c'est le signe qu'une valeur a
 * changé chez GBIF (cas vécu le 23.11.2026 : « PRESENT » devenu « DETECTED »).
 */
export async function obtenir(fichierSql: string, options: Options = {}): Promise<Telechargement & { fichier: string }> {
  const { reutiliserJours = 25, lignesMin = 1, dossier = DOSSIER } = options;
  const nom = basename(fichierSql, ".sql");
  const sql = lireRequete(fichierSql);
  const depuis = Date.now() - reutiliserJours * 86_400_000;
  const identiques = (await recents()).filter((r) => r.sql === sql && Date.parse(r.creation) >= depuis);
  let t = identiques.find((r) => r.statut === "SUCCEEDED" && r.lignes >= lignesMin);
  const enCours = identiques.find((r) => !TERMINES.has(r.statut));
  if (t) {
    console.log(`${nom} : réutilise ${t.cle} du ${t.creation.slice(0, 10)} (${t.lignes} lignes)`);
  } else if (enCours) {
    // Même requête déjà en calcul chez GBIF (import relancé, essai en parallèle) : on l'attend.
    console.log(`${nom} : attend ${enCours.cle}, déjà en cours chez GBIF`);
    t = await attendre(enCours.cle);
    if (t.statut !== "SUCCEEDED") throw new Error(`${nom} : GBIF a terminé avec le statut ${t.statut}.`);
  } else {
    await valider(sql);
    const cle = await demander(sql);
    console.log(`${nom} : demandé à GBIF, clé ${cle}`);
    t = await attendre(cle);
    if (t.statut !== "SUCCEEDED") throw new Error(`${nom} : GBIF a terminé avec le statut ${t.statut}.`);
  }
  if (t.lignes < lignesMin) {
    throw new Error(`${nom} : ${t.lignes} lignes seulement (minimum attendu : ${lignesMin}). Une valeur a-t-elle changé chez GBIF ? Voir requetes/diagnostic-colonnes.sql.`);
  }
  const fichier = join(dossier, `${nom}-${t.cle}.zip`);
  if (!existsSync(fichier) || statSync(fichier).size === 0) await telecharger(t.cle, fichier);
  return { ...t, fichier };
}

if (import.meta.main) {
  const [commande, argument = ""] = process.argv.slice(2);
  const actions: Record<string, () => Promise<void>> = {
    valider: async () => {
      await valider(lireRequete(argument));
      console.log(`Requête valide : ${argument}`);
    },
    demander: async () => console.log(`Clé : ${await demander(lireRequete(argument))}`),
    etat: async () => {
      for (const t of argument ? [await infos(argument)] : await recents(10)) {
        console.log(`${t.cle} : ${t.statut}, ${t.lignes} lignes, ${t.creation.slice(0, 16)}, DOI ${t.doi} — ${t.sql.slice(0, 50)}…`);
      }
    },
    telecharger: async () => {
      const fichier = join(DOSSIER, `${argument}.zip`);
      await telecharger(argument, fichier);
      console.log(`Téléchargé : ${fichier}`);
    },
    obtenir: async () => console.log(await obtenir(argument)),
  };
  const action = commande ? actions[commande] : undefined;
  if (!action) {
    console.error("Commandes : valider <fichier.sql> | demander <fichier.sql> | etat [clé] | telecharger <clé> | obtenir <fichier.sql>");
    process.exit(1);
  }
  try {
    await action();
  } catch (erreur) {
    console.error((erreur as Error).message);
    process.exit(1);
  }
}
