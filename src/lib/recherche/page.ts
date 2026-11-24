// Contenu de la page de résultats (lot 5, QUE-28), calculé par la page avant le rendu : le code
// de réponse (503 si l'index manque) doit être fixé avant que la page parte vers le navigateur.
import type { Langue } from "../../i18n/langues.ts";
import { lien } from "../liens.ts";
import {
  adresseRecherche,
  filtrer,
  ligneResultat,
  lireFiltres,
  MAX_RESULTATS,
  pucesGroupes,
  pucesStatut,
  titreResultats,
  type LigneResultat,
  type Puce,
} from "./resultats.ts";
import { chercherSurLeSite } from "./serveur.ts";
import { texteValide } from "./suggestions.ts";

export type ContenuResultats =
  | { etat: "vide"; texte: string }
  | { etat: "indisponible"; texte: string }
  | { etat: "aucune"; texte: string }
  | {
      etat: "resultats";
      texte: string;
      /** Texte corrigé (« bouleaux »), avec le lien vers sa recherche, ou vide. */
      correction: string;
      lienCorrection: string;
      titre: string;
      lignes: LigneResultat[];
      groupes: Puce[];
      statut: Puce[];
      /** Lien sans filtres, si des filtres sont choisis. */
      lienSansFiltres: string;
    };

export async function chargerResultats(url: URL, langue: Langue): Promise<ContenuResultats> {
  const texte = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (!texteValide(texte)) return { etat: "vide", texte };
  const trouvees = await chercherSurLeSite(texte, langue, url, MAX_RESULTATS);
  if (!trouvees) return { etat: "indisponible", texte };
  if (trouvees.especes.length === 0) return { etat: "aucune", texte };

  const base = lien("recherche", langue);
  const filtres = lireFiltres(url.searchParams);
  const gardees = filtrer(trouvees.especes, filtres);
  return {
    etat: "resultats",
    texte,
    correction: trouvees.correction,
    lienCorrection: trouvees.correction ? adresseRecherche(base, trouvees.correction) : "",
    titre: titreResultats(gardees.length, trouvees.correction || texte, langue),
    lignes: gardees.map((e) => ligneResultat(e, langue)),
    groupes: pucesGroupes(trouvees.especes, filtres, base, texte, langue),
    statut: pucesStatut(filtres, base, texte, langue),
    lienSansFiltres: filtres.groupe || filtres.menacees ? adresseRecherche(base, texte) : "",
  };
}
