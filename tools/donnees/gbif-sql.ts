// Téléchargements SQL de GBIF (lot 3) : valider une requête, la soumettre, suivre son état,
// télécharger le résultat. Documentation : https://techdocs.gbif.org/en/data-use/api-sql-downloads
//
// Identifiants GBIF lus dans `.env` (GBIF_UTILISATEUR, GBIF_MOT_DE_PASSE) ou dans les variables
// d'environnement (secrets GitHub). Ils ne sont jamais affichés.
//
// Utilisation (Node 22.18+ exécute directement le TypeScript) :
//   node tools/donnees/gbif-sql.ts valider    tools/donnees/requetes/especes.sql
//   node tools/donnees/gbif-sql.ts demander   tools/donnees/requetes/especes.sql
//   node tools/donnees/gbif-sql.ts etat       [clé]          (sans clé : toutes les demandes)
//   node tools/donnees/gbif-sql.ts telecharger <clé>
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const API = "https://api.gbif.org/v1/occurrence/download";
const DOSSIER = "tools/donnees/data";
const JOURNAL = join(DOSSIER, "demandes-gbif.json");
// Le site s'identifie, sans donnée personnelle (bonne pratique demandée par GBIF).
const AGENT = "NomenNature/0.6 (+https://nomenature.org; import mensuel)";

interface Demande {
  nom: string;
  cle: string;
  date: string;
}

function identifiants(): string {
  if (existsSync(".env")) process.loadEnvFile(".env");
  const utilisateur = process.env["GBIF_UTILISATEUR"];
  const motDePasse = process.env["GBIF_MOT_DE_PASSE"];
  if (!utilisateur || !motDePasse) {
    throw new Error("GBIF_UTILISATEUR et GBIF_MOT_DE_PASSE manquent (fichier .env ou variables d'environnement).");
  }
  return "Basic " + Buffer.from(`${utilisateur}:${motDePasse}`).toString("base64");
}

/** Requête SQL sur une seule ligne (GBIF refuse les retours à la ligne et les commentaires). */
function lireRequete(fichier: string): string {
  return readFileSync(fichier, "utf8")
    .split("\n")
    .filter((ligne) => !ligne.trim().startsWith("--"))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function corps(sql: string): string {
  return JSON.stringify({ sendNotification: false, format: "SQL_TSV_ZIP", sql });
}

function demandes(): Demande[] {
  return existsSync(JOURNAL) ? (JSON.parse(readFileSync(JOURNAL, "utf8")) as Demande[]) : [];
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

async function valider(fichier: string): Promise<void> {
  const reponse = await appeler(`${API}/request/validate`, {
    method: "POST",
    headers: { Authorization: identifiants() },
    body: corps(lireRequete(fichier)),
  });
  console.log(`Requête valide : ${basename(fichier)}`);
  console.log((await reponse.text()).slice(0, 800));
}

async function demander(fichier: string): Promise<void> {
  const reponse = await appeler(`${API}/request`, {
    method: "POST",
    headers: { Authorization: identifiants() },
    body: corps(lireRequete(fichier)),
  });
  const cle = (await reponse.text()).trim();
  mkdirSync(DOSSIER, { recursive: true });
  const liste = demandes();
  liste.push({ nom: basename(fichier, ".sql"), cle, date: new Date().toISOString() });
  writeFileSync(JOURNAL, JSON.stringify(liste, null, 2) + "\n");
  console.log(`Demande envoyée : ${basename(fichier)} → clé ${cle}`);
}

async function etat(cle?: string): Promise<void> {
  const cles = cle ? [{ nom: "", cle }] : demandes();
  for (const demande of cles) {
    const infos = (await (await appeler(`${API}/${demande.cle}`)).json()) as {
      status: string;
      size?: number;
      totalRecords?: number;
      doi?: string;
    };
    const taille = infos.size ? `${(infos.size / 1e6).toFixed(1)} Mo` : "?";
    console.log(`${demande.nom || demande.cle} (${demande.cle}) : ${infos.status}, ${taille}, DOI ${infos.doi ?? "?"}`);
  }
}

async function telecharger(cle: string): Promise<void> {
  const demande = demandes().find((d) => d.cle === cle);
  const destination = join(DOSSIER, `${demande?.nom ?? cle}.zip`);
  const reponse = await appeler(`${API}/request/${cle}.zip`, { redirect: "follow" });
  if (!reponse.body) throw new Error("Réponse vide.");
  mkdirSync(DOSSIER, { recursive: true });
  await pipeline(Readable.fromWeb(reponse.body as import("node:stream/web").ReadableStream), createWriteStream(destination));
  console.log(`Téléchargé : ${destination}`);
}

const [commande, argument] = process.argv.slice(2);
const actions: Record<string, () => Promise<void>> = {
  valider: () => valider(argument ?? ""),
  demander: () => demander(argument ?? ""),
  etat: () => etat(argument),
  telecharger: () => telecharger(argument ?? ""),
};
const action = commande ? actions[commande] : undefined;
if (!action) {
  console.error("Commandes : valider <fichier.sql> | demander <fichier.sql> | etat [clé] | telecharger <clé>");
  process.exit(1);
}
try {
  await action();
} catch (erreur) {
  console.error((erreur as Error).message);
  process.exit(1);
}
