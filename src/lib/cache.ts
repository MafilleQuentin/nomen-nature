// Cache des pages rendues par le serveur (lot 4, QUE-26). Les fiches espèces sont gardées un jour
// dans le cache de Cloudflare (centre de données le plus proche du visiteur), avec une clé qui
// contient l'identifiant du déploiement : chaque mise en ligne (code ou données du mois) repart
// d'un cache neuf. Seules les fiches complètes (résumé, photos et carte bien arrivés) sont
// gardées : une fiche incomplète (GBIF saturé, par exemple) sera refaite à la visite suivante.

/** En-tête posé par la page quand elle peut être gardée en cache (retiré avant l'envoi). */
export const EN_TETE_CACHE = "X-Nomen-Peut-Cacher";

/** Pages concernées : les fiches espèces, en français et en anglais. */
export function estPageEnCache(chemin: string): boolean {
  return /^\/(fr\/espece|en\/species)\/[a-z0-9-]+$/.test(chemin);
}

/** Clé du cache : l'adresse sans paramètres, plus la version déployée. */
export function cleDeCache(url: URL, version: string): string {
  return `${url.origin}${url.pathname}?version=${encodeURIComponent(version)}`;
}

export const DUREE_CACHE_PAGE = 24 * 3600;
export const DUREE_NAVIGATEUR = 300;
