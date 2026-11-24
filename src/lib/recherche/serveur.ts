// Recherche lue par notre serveur (lot 5, QUE-27, décision du 24.11.2026) : le serveur lit la
// table et les fichiers de l'index (/donnees/recherche/, binding ASSETS), lance le moteur, puis
// complète chaque espèce trouvée avec sa fiche (adresse, nom principal, statut, groupe, photo)
// et la classe (especes.ts). Le navigateur ne reçoit que les résultats.
//
// La table de l'index et les derniers fichiers lus restent en mémoire tant que le Worker tourne.
import { adresseEspece } from "../especes/adresse.ts";
import { cheminDuFichier, ficheParIdentifiant, fichesDuGenre } from "../especes/fiche.ts";
import { lireFichier, lireFichierDuSite } from "../especes/serveur.ts";
import { chercherEspeces, type Trouvailles } from "./especes.ts";
import type { Manifeste, Resultat, Source } from "./moteur.ts";

const DOSSIER = "/donnees/recherche";
const MAX_EN_MEMOIRE = 48;
let manifeste: Manifeste | undefined;
const fichiers = new Map<string, string[][]>();

async function sourceDuSite(origine: URL): Promise<Source | undefined> {
  if (!manifeste) {
    const reponse = await lireFichierDuSite(`${DOSSIER}/manifeste.json`, origine);
    if (!reponse.ok) return undefined;
    manifeste = (await reponse.json()) as Manifeste;
  }
  const table = manifeste;
  return {
    manifeste: table,
    async lire(dico, numero) {
      const chemin = `${DOSSIER}/${dico}/${String(numero).padStart(4, "0")}${table.extension}`;
      const connu = fichiers.get(chemin);
      if (connu) return connu;
      const reponse = await lireFichierDuSite(chemin, origine);
      const lignes = reponse.ok ? (await reponse.text()).split("\n").filter(Boolean).map((l) => l.split("\t")) : [];
      fichiers.set(chemin, lignes);
      if (fichiers.size > MAX_EN_MEMOIRE) fichiers.delete(fichiers.keys().next().value ?? "");
      return lignes;
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
