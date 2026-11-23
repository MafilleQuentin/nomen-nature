// Installe le paquet de données dans le site, avant sa construction : public/donnees/
// (copié tel quel par Astro, servi sous /donnees/… ; ignoré par git).
//
// Par défaut, le paquet de la dernière release GitHub « donnees-AAAA-MM » (le déploiement le
// fait ainsi) ; avec --local, le paquet construit sur ce poste par npm run donnees:import.
//
// Utilisation : npm run donnees:installer [-- --local]
import { cpSync, createWriteStream, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as FluxWeb } from "node:stream/web";
import { AGENT, entrees, ouvrir, sourceLocale } from "./zip.ts";

const DEPOT = "MafilleQuentin/nomen-nature";
const DESTINATION = "public/donnees";
const DONNEES = "tools/donnees/data";

interface Release {
  tag_name: string;
  created_at: string;
  assets: { name: string; browser_download_url: string }[];
}

async function derniereRelease(): Promise<{ tag: string; url: string }> {
  const entetes: Record<string, string> = { "User-Agent": AGENT, Accept: "application/vnd.github+json" };
  if (process.env["GITHUB_TOKEN"]) entetes["Authorization"] = `Bearer ${process.env["GITHUB_TOKEN"]}`;
  const reponse = await fetch(`https://api.github.com/repos/${DEPOT}/releases?per_page=50`, { headers: entetes });
  if (!reponse.ok) throw new Error(`GitHub a répondu ${reponse.status} à la liste des releases.`);
  const release = ((await reponse.json()) as Release[])
    .filter((r) => r.tag_name.startsWith("donnees-"))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const paquet = release?.assets.find((a) => a.name.endsWith(".zip"));
  if (!release || !paquet) throw new Error("Aucune release de données (« donnees-AAAA-MM ») avec un paquet .zip.");
  return { tag: release.tag_name, url: paquet.browser_download_url };
}

/** Extrait toute une archive dans un dossier (avec le lecteur zip.ts, sans dépendance). */
export async function extraireTout(archive: string, dossier: string): Promise<number> {
  const source = await sourceLocale(archive);
  let n = 0;
  for (const entree of await entrees(source)) {
    if (entree.nom.endsWith("/")) continue;
    if (entree.nom.split("/").includes("..")) throw new Error(`Chemin refusé dans l'archive : ${entree.nom}`);
    const chemin = join(dossier, entree.nom);
    mkdirSync(dirname(chemin), { recursive: true });
    await pipeline(await ouvrir(source, entree), createWriteStream(chemin));
    n++;
  }
  return n;
}

if (import.meta.main) {
  rmSync(DESTINATION, { recursive: true, force: true });
  if (process.argv.includes("--local")) {
    const paquet = join(DONNEES, "paquet");
    if (!existsSync(paquet)) throw new Error(`${paquet} absent : lancer d'abord npm run donnees:import.`);
    cpSync(paquet, DESTINATION, { recursive: true });
    console.log(`Paquet local copié dans ${DESTINATION}`);
  } else {
    const { tag, url } = await derniereRelease();
    const archive = join(DONNEES, `${tag}.zip`);
    if (!existsSync(archive)) {
      mkdirSync(DONNEES, { recursive: true });
      const reponse = await fetch(url, { headers: { "User-Agent": AGENT }, redirect: "follow" });
      if (!reponse.ok || !reponse.body) throw new Error(`Téléchargement du paquet refusé (${reponse.status}).`);
      await pipeline(Readable.fromWeb(reponse.body as FluxWeb), createWriteStream(archive));
    }
    console.log(`${tag} : ${await extraireTout(archive, DESTINATION)} fichiers installés dans ${DESTINATION}`);
  }
}
