// Cache des pages rendues par le serveur (lot 4, QUE-26). Les fiches espèces sont gardées un jour
// dans le cache de Cloudflare (centre de données le plus proche du visiteur), avec une clé qui
// contient l'identifiant du déploiement : chaque mise en ligne (code ou données du mois) repart
// d'un cache neuf. Seules les fiches complètes (résumé, photos et carte bien arrivés) sont
// gardées : une fiche incomplète (GBIF saturé, par exemple) sera refaite à la visite suivante.
// Depuis le lot 6 (QUE-30), les pages des continents aussi, une entrée par onglet ; depuis le lot 7
// (QUE-32), les pages des pays, une entrée par groupe, tri et nombre de cartes.

/** En-tête posé par la page quand elle peut être gardée en cache (retiré avant l'envoi). */
export const EN_TETE_CACHE = "X-Nomen-Peut-Cacher";

/** Pages concernées : les fiches espèces, l'accueil (carte du monde), les pages des continents et des pays. */
export function estPageEnCache(chemin: string): boolean {
  return (
    /^\/(fr|en)$/.test(chemin) ||
    /^\/(fr\/espece|en\/species)\/[a-z0-9-]+$/.test(chemin) ||
    /^\/(fr|en)\/continent\/[a-z-]+$/.test(chemin) ||
    /^\/(fr\/pays|en\/country)\/[a-z0-9-]+$/.test(chemin)
  );
}

/** Paramètres de l'adresse qui changent la page (panneau de la carte, page d'un pays) ; les autres sont ignorés. */
const PARAMETRES_GARDES = ["pays", "onglet", "groupe", "tous", "tri", "n"];

/** Clé du cache : l'adresse avec ses seuls paramètres utiles (dans un ordre fixe), plus la version déployée. */
export function cleDeCache(url: URL, version: string): string {
  const gardes = PARAMETRES_GARDES.flatMap((nom) => {
    const valeur = url.searchParams.get(nom);
    return valeur ? [`${nom}=${encodeURIComponent(valeur.toLowerCase())}`] : [];
  });
  return `${url.origin}${url.pathname}?${[...gardes, `version=${encodeURIComponent(version)}`].join("&")}`;
}

export const DUREE_CACHE_PAGE = 24 * 3600;
export const DUREE_NAVIGATEUR = 300;
