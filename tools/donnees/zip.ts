// Lecture d'un seul fichier dans une archive zip, locale ou distante, sans tout décompresser
// ni tout télécharger : on lit le répertoire central (à la fin du zip), puis seulement les
// octets du fichier voulu. À distance, grâce aux requêtes HTTP partielles (« Range ») : c'est
// ce qui permet de prendre la table des noms courants (~35 Mo) dans l'archive mensuelle du
// Catalogue of Life (1,4 Go). Gère le zip64 (archives de plus de 4 Go). Sans dépendance.
import { createReadStream } from "node:fs";
import { open, stat } from "node:fs/promises";
import { Readable } from "node:stream";
import type { ReadableStream as FluxWeb } from "node:stream/web";
import { createInflateRaw } from "node:zlib";

export const AGENT = "NomenNature/0.6 (+https://nomenature.org; import mensuel)";

/** D'où viennent les octets : un fichier local ou une adresse qui accepte « Range ». */
export interface Source {
  taille: number;
  lire(debut: number, fin: number): Promise<Buffer>; // fin incluse
  flux(debut: number, fin: number): Promise<Readable>;
}

export async function sourceLocale(chemin: string): Promise<Source> {
  const { size } = await stat(chemin);
  return {
    taille: size,
    async lire(debut, fin) {
      const fichier = await open(chemin, "r");
      try {
        const tampon = Buffer.alloc(fin - debut + 1);
        await fichier.read(tampon, 0, tampon.length, debut);
        return tampon;
      } finally {
        await fichier.close();
      }
    },
    async flux(debut, fin) {
      return createReadStream(chemin, { start: debut, end: fin });
    },
  };
}

export async function sourceDistante(url: string): Promise<Source> {
  const tete = await fetch(url, { method: "HEAD", headers: { "User-Agent": AGENT }, redirect: "follow" });
  const taille = Number(tete.headers.get("content-length"));
  if (!tete.ok || !taille) throw new Error(`Taille inconnue pour ${url} (${tete.status})`);
  const partie = async (debut: number, fin: number) => {
    const reponse = await fetch(url, {
      headers: { "User-Agent": AGENT, Range: `bytes=${debut}-${fin}` },
      redirect: "follow",
    });
    if (reponse.status !== 206 || !reponse.body) throw new Error(`Requête partielle refusée (${reponse.status}) : ${url}`);
    return reponse;
  };
  return {
    taille,
    async lire(debut, fin) {
      return Buffer.from(await (await partie(debut, fin)).arrayBuffer());
    },
    async flux(debut, fin) {
      return Readable.fromWeb((await partie(debut, fin)).body as FluxWeb);
    },
  };
}

export interface Entree {
  nom: string;
  methode: number; // 0 : stocké, 8 : deflate
  tailleCompressee: number;
  tailleDecompressee: number;
  positionEnTete: number;
}

const MAX32 = 0xffffffff;

/** Liste les fichiers de l'archive (répertoire central). */
export async function entrees(source: Source): Promise<Entree[]> {
  // Fin de répertoire central : 22 octets + commentaire (64 Ko au plus).
  const tailleFin = Math.min(source.taille, 22 + 65535 + 20);
  const fin = await source.lire(source.taille - tailleFin, source.taille - 1);
  const i = fin.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (i < 0) throw new Error("Fin de répertoire central introuvable : ce n'est pas un zip.");
  let taille = fin.readUInt32LE(i + 12);
  let position = fin.readUInt32LE(i + 16);
  if (taille === MAX32 || position === MAX32) {
    // zip64 : le localisateur (20 octets) précède la fin de répertoire classique.
    const localisateur = fin.subarray(i - 20, i);
    if (localisateur.readUInt32LE(0) !== 0x07064b50) throw new Error("Localisateur zip64 introuvable.");
    const fin64 = await source.lire(Number(localisateur.readBigUInt64LE(8)), Number(localisateur.readBigUInt64LE(8)) + 55);
    taille = Number(fin64.readBigUInt64LE(40));
    position = Number(fin64.readBigUInt64LE(48));
  }
  const repertoire = await source.lire(position, position + taille - 1);
  const liste: Entree[] = [];
  for (let p = 0; p + 46 <= repertoire.length && repertoire.readUInt32LE(p) === 0x02014b50; ) {
    const n = repertoire.readUInt16LE(p + 28);
    const m = repertoire.readUInt16LE(p + 30);
    const k = repertoire.readUInt16LE(p + 32);
    const entree: Entree = {
      nom: repertoire.toString("utf8", p + 46, p + 46 + n),
      methode: repertoire.readUInt16LE(p + 10),
      tailleCompressee: repertoire.readUInt32LE(p + 20),
      tailleDecompressee: repertoire.readUInt32LE(p + 24),
      positionEnTete: repertoire.readUInt32LE(p + 42),
    };
    // Champs zip64 (identifiant 0x0001), dans cet ordre, pour ceux qui valent 0xFFFFFFFF.
    for (let e = p + 46 + n; e + 4 <= p + 46 + n + m; ) {
      const id = repertoire.readUInt16LE(e);
      const longueur = repertoire.readUInt16LE(e + 2);
      if (id === 0x0001) {
        let v = e + 4;
        const suivant = () => Number(repertoire.readBigUInt64LE((v += 8) - 8));
        if (entree.tailleDecompressee === MAX32) entree.tailleDecompressee = suivant();
        if (entree.tailleCompressee === MAX32) entree.tailleCompressee = suivant();
        if (entree.positionEnTete === MAX32) entree.positionEnTete = suivant();
      }
      e += 4 + longueur;
    }
    liste.push(entree);
    p += 46 + n + m + k;
  }
  return liste;
}

/** Flux décompressé d'un fichier de l'archive. */
export async function ouvrir(source: Source, entree: Entree): Promise<Readable> {
  const enTete = await source.lire(entree.positionEnTete, entree.positionEnTete + 29);
  if (enTete.readUInt32LE(0) !== 0x04034b50) throw new Error(`En-tête local invalide pour ${entree.nom}.`);
  const debut = entree.positionEnTete + 30 + enTete.readUInt16LE(26) + enTete.readUInt16LE(28);
  if (entree.tailleCompressee === 0) return Readable.from([]);
  const brut = await source.flux(debut, debut + entree.tailleCompressee - 1);
  if (entree.methode === 0) return brut;
  if (entree.methode === 8) return brut.pipe(createInflateRaw());
  throw new Error(`Méthode de compression ${entree.methode} non gérée (${entree.nom}).`);
}

/** Trouve un fichier par son nom (ou un motif) et l'ouvre. */
export async function ouvrirParNom(source: Source, nom: string | RegExp): Promise<{ entree: Entree; flux: Readable }> {
  const entree = (await entrees(source)).find((e) => (typeof nom === "string" ? e.nom === nom : nom.test(e.nom)));
  if (!entree) throw new Error(`${String(nom)} absent de l'archive.`);
  return { entree, flux: await ouvrir(source, entree) };
}
