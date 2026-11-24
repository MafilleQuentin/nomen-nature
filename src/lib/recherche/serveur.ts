// Recherche lue par notre serveur (lot 5, QUE-27, décision du 24.11.2026) : le serveur lit la
// table et les fichiers de l'index (/donnees/recherche/, binding ASSETS), lance le moteur, puis
// classe les espèces trouvées avec le résumé que l'index porte pour chacune (adresse, nom
// principal, statut, groupe) (especes.ts). Le navigateur ne reçoit que les résultats.
//
// La table de l'index et les derniers fichiers lus restent en mémoire tant que le Worker tourne.
// Les fichiers d'une recherche sont lus en même temps (moteur.ts).
import { adresseEspece } from "../especes/adresse.ts";
import { cheminDuFichier, ficheParIdentifiant, fichesDuGenre } from "../especes/fiche.ts";
import { lireFichier, lireFichierDuSite } from "../especes/serveur.ts";
import { fichierDeLAdresse } from "../especes/adresse.ts";
import { chercherEspeces, type EspeceTrouvee, type Trouvailles } from "./especes.ts";
import { zonesDe, type Zones } from "./lieux.ts";
import type { Manifeste, Resultat, Source } from "./moteur.ts";

const DOSSIER = "/donnees/recherche";
const MAX_EN_MEMOIRE = 48;
let manifeste: Manifeste | undefined;
// Les lectures en cours y sont aussi : deux demandes simultanées du même fichier n'en font qu'une.
const fichiers = new Map<string, Promise<string[][]>>();

async function lireLignes(chemin: string, origine: URL): Promise<string[][]> {
  const reponse = await lireFichierDuSite(chemin, origine);
  return reponse.ok
    ? (await reponse.text())
        .split("\n")
        .filter(Boolean)
        .map((l) => l.split("\t"))
    : [];
}

async function sourceDuSite(origine: URL): Promise<Source | undefined> {
  if (!manifeste) {
    const reponse = await lireFichierDuSite(`${DOSSIER}/manifeste.json`, origine);
    if (!reponse.ok) return undefined;
    manifeste = (await reponse.json()) as Manifeste;
  }
  const table = manifeste;
  return {
    manifeste: table,
    lire(dico, numero) {
      const chemin = `${DOSSIER}/${dico}/${String(numero).padStart(4, "0")}${table.extension}`;
      const connu = fichiers.get(chemin);
      if (connu) return connu;
      const lecture = lireLignes(chemin, origine);
      fichiers.set(chemin, lecture);
      // Une lecture ratée (réseau) n'est pas gardée : la prochaine recherche réessaiera.
      lecture.catch(() => fichiers.delete(chemin));
      if (fichiers.size > MAX_EN_MEMOIRE) fichiers.delete(fichiers.keys().next().value ?? "");
      return lecture;
    },
  };
}

/** Espèces trouvées pour un texte (au plus `limite`), ou undefined si l'index est absent. */
export async function chercherSurLeSite(texte: string, langueSite: "fr" | "en", origine: URL, limite = 8): Promise<Trouvailles | undefined> {
  const source = await sourceDuSite(origine);
  if (!source) return undefined;
  const ficheDe = async (resultat: Resultat) => {
    const fichier = await lireFichier(cheminDuFichier(adresseEspece(resultat.scientifique)), origine);
    return fichier ? ficheParIdentifiant(fichier, resultat.taxon) : undefined;
  };
  const especesDuGenre = async (genre: Resultat) => {
    const fichier = await lireFichier(cheminDuFichier(adresseEspece(`${genre.scientifique} x`)), origine);
    return fichier ? fichesDuGenre(fichier, genre.scientifique) : [];
  };
  return chercherEspeces(source, texte, langueSite, ficheDe, limite, 60, especesDuGenre);
}

// Pays et continents des espèces (filtre « Où », QUE-28) : /donnees/zones/<n>.json, même numéro
// que le fichier de fiches. Lus seulement quand le filtre est choisi, tous en même temps.
const zonesEnMemoire = new Map<number, Promise<Record<string, string>>>();

function lireZones(numero: number, origine: URL): Promise<Record<string, string>> {
  const connu = zonesEnMemoire.get(numero);
  if (connu) return connu;
  const lecture = lireFichierDuSite(`/donnees/zones/${numero}.json`, origine).then((r) => (r.ok ? (r.json() as Promise<Record<string, string>>) : {}));
  zonesEnMemoire.set(numero, lecture);
  lecture.catch(() => zonesEnMemoire.delete(numero));
  if (zonesEnMemoire.size > MAX_EN_MEMOIRE) zonesEnMemoire.delete(zonesEnMemoire.keys().next().value ?? -1);
  return lecture;
}

/** Zones de chaque espèce trouvée (par identifiant). */
export async function zonesDesEspeces(especes: EspeceTrouvee[], origine: URL): Promise<Map<string, Zones>> {
  const numeros = [...new Set(especes.map((e) => fichierDeLAdresse(e.fiche.adresse)))];
  const fichiers = new Map(await Promise.all(numeros.map(async (n) => [n, await lireZones(n, origine)] as const)));
  return new Map(especes.map((e) => [e.fiche.id, zonesDe(fichiers.get(fichierDeLAdresse(e.fiche.adresse))?.[e.fiche.id])]));
}
