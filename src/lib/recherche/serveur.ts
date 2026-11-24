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
import { chercherEspeces, type Trouvailles } from "./especes.ts";
import type { Manifeste, Resultat, Source } from "./moteur.ts";

const DOSSIER = "/donnees/recherche";
const MAX_EN_MEMOIRE = 48;
let manifeste: Manifeste | undefined;
// Les lectures en cours y sont aussi : deux demandes simultanées du même fichier n'en font qu'une.
const fichiers = new Map<string, Promise<string[][]>>();

async function lireLignes(chemin: string, origine: URL): Promise<string[][]> {
  const reponse = await lireFichierDuSite(chemin, origine);
  return reponse.ok ? (await reponse.text()).split("\n").filter(Boolean).map((l) => l.split("\t")) : [];
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
