// Contenu complet d'une fiche espèce (lot 4), chargé par la page avant le rendu (QUE-26) : la
// page sait ainsi, avant d'envoyer quoi que ce soit, si la fiche est complète (résumé, photos et
// carte bien arrivés) et donc si elle peut être gardée en cache, et si elle est « courte ».
//
// Tous les appels partent en même temps : Wikipédia (résumé), Commons (photos de la fiche et
// des espèces proches), iNaturalist (si pas de photo Commons), GBIF (carte ; dernière
// observation et page GBIF si la fiche risque d'être courte).
import type { Langue } from "../../i18n/langues.ts";
import { pointsDeRepartition, type PointCarte } from "../carte/repartition.ts";
import { manques, type Manque } from "./affichage.ts";
import type { CarteEspece, Fiche } from "./fiche.ts";
import type { Photo } from "./photos.ts";
import {
  derniereObservation,
  lienGbif,
  octetsEnCache,
  photoInaturalist,
  photosCommons,
  resumeWikipedia,
  type Resume,
} from "./serveur.ts";

export interface ContenuFiche {
  fiche: Fiche;
  proches: CarteEspece[];
  resume: Resume | undefined;
  /** Photo de la fiche (Commons, sinon iNaturalist). */
  photo: Photo | undefined;
  /** Photos Commons des espèces proches, par nom de fichier. */
  photosProches: Map<string, Photo>;
  /** Points de la carte, ou undefined si GBIF n'a pas répondu. */
  points: PointCarte[] | undefined;
  ceQuiManque: Manque[];
  courte: boolean;
  annee: number | undefined;
  pageGbif: string;
  /** Tout ce qui devait arriver est arrivé : la page peut être gardée en cache. */
  complet: boolean;
}

export async function chargerContenu(trouvee: { fiche: Fiche; proches: CarteEspece[] }, langue: Langue): Promise<ContenuFiche> {
  const { fiche, proches } = trouvee;
  const autreLangue: Langue = langue === "fr" ? "en" : "fr";
  // Résumé : l'article dans la langue de la page, sinon dans l'autre langue.
  const titres: Record<Langue, string> = { fr: fiche.wikipediaFr, en: fiche.wikipediaEn };
  const avecArticle = Boolean(titres.fr || titres.en);
  const appelResume = (async () => (await resumeWikipedia(titres[langue], langue)) ?? (await resumeWikipedia(titres[autreLangue], autreLangue)))();
  const appelCommons = photosCommons([fiche.photo, ...proches.map((p) => p.photo)]);
  const appelInaturalist = fiche.photo ? Promise.resolve(undefined) : photoInaturalist(fiche.nom);
  // Fiche courte : décidée d'après nos données (un article existe-t-il ?) et la photo trouvée, pas
  // d'après la réponse de Wikipédia, pour qu'une lenteur ne change pas la page. GBIF est appelé en
  // même temps quand la fiche risque d'être courte.
  const peutEtreCourte = manques(fiche, langue, avecArticle).length > 0;
  const appelGbif: Promise<[number | undefined, string]> = peutEtreCourte
    ? Promise.all([derniereObservation(fiche.id), lienGbif(fiche.nom, fiche.regne)])
    : Promise.resolve([undefined, ""]);
  const appelCarte = pointsDeRepartition(fiche.id, (adresse) => octetsEnCache(adresse));

  const [resume, [annee, pageGbif], commons, inaturalist, points] = await Promise.all([appelResume, appelGbif, appelCommons, appelInaturalist, appelCarte]);
  const photo = commons.get(fiche.photo) ?? inaturalist;
  const ceQuiManque = manques({ ...fiche, photo: fiche.photo || (photo ? "inaturalist" : "") }, langue, avecArticle);
  const complet = !(avecArticle && !resume) && !(fiche.photo && !photo) && points !== undefined;
  return {
    fiche,
    proches,
    resume,
    photo,
    photosProches: commons,
    points,
    ceQuiManque,
    courte: ceQuiManque.length > 0,
    annee,
    pageGbif,
    complet,
  };
}
