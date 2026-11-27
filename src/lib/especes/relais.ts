// Relais des photos (lot 4, QUE-24) : notre serveur va chercher l'image chez Wikimedia ou
// iNaturalist et la renvoie au navigateur, qui ne contacte que nomenature.org (décision du
// 23.11.2026). Seules des adresses construites par nous sont relayées (jamais une adresse
// fournie par le visiteur) ; l'image est gardée un an dans le cache de Cloudflare.
import { AGENT } from "./serveur.ts";

const UN_AN = 365 * 24 * 3600;
const TAILLE_MAX = 8 * 1024 * 1024;
/**
 * Taille maximale de l'original servi en repli (lot 7) : le repli sert les photos plus petites que
 * la vignette demandée (Wikimedia n'agrandit pas), donc légères ; jamais une photo de plusieurs Mo
 * envoyée à un téléphone parce que Wikimedia a refusé une vignette sur le moment.
 */
const TAILLE_MAX_REPLI = 512 * 1024;

function introuvable(): Response {
  return new Response("Photo introuvable", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}

/** Source occupée ou en panne (trop de demandes, erreur du serveur) : à redemander plus tard, sans cache. */
function indisponible(): Response {
  return new Response("Photo indisponible pour le moment", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "60" } });
}

/** L'image, ou le code de l'échec (0 : pas de réponse, ou réponse qui n'est pas une image acceptable). */
async function telecharger(adresse: string, tailleMax = TAILLE_MAX): Promise<Response | number> {
  try {
    const reponse = await fetch(adresse, { headers: { "User-Agent": AGENT, Accept: "image/webp,image/jpeg,image/png" }, signal: AbortSignal.timeout(8000) });
    if (!reponse.ok) return reponse.status;
    const type = reponse.headers.get("Content-Type") ?? "";
    const taille = Number(reponse.headers.get("Content-Length") ?? 0);
    if (!type.startsWith("image/")) return 0;
    // Trop lourde (413), ou taille inconnue pour un repli qui doit rester léger (refusé aussi).
    if (taille > tailleMax) return 413;
    if (tailleMax === TAILLE_MAX_REPLI && !taille) return 411;
    return reponse;
  } catch {
    return 0;
  }
}

/** Échec passager (trop de demandes, panne, délai dépassé) : il ne faut ni replier ni garder la réponse. */
const passager = (code: number) => code === 0 || code === 429 || code >= 500;

/**
 * Relaie `source` pour la requête du visiteur, avec le cache. `repli` (l'original) n'est demandé que
 * si la vignette n'existe pas (photo plus petite que la vignette), et seulement s'il est léger.
 * `tailleMax` : au-delà, la vignette est jugée anormale (vu en CI : une vignette WebP de 500 px à
 * 305 Ko au lieu de 58 Ko) et refusée sans être gardée (503) : elle sera redemandée plus tard.
 */
export async function relayer(requete: Request, source: string, repli?: string, tailleMax = TAILLE_MAX): Promise<Response> {
  const cache = typeof caches !== "undefined" && "default" in caches ? (caches as unknown as { default: Cache }).default : undefined;
  const cle = new Request(new URL(requete.url).toString(), { method: "GET" });
  const connue = await cache?.match(cle);
  if (connue) return connue;
  let reponse = await telecharger(source, tailleMax);
  if (reponse === 413) return indisponible(); // vignette anormalement lourde : ni repli, ni cache
  if (typeof reponse === "number" && !passager(reponse) && repli) reponse = await telecharger(repli, TAILLE_MAX_REPLI);
  if (typeof reponse === "number") return passager(reponse) ? indisponible() : introuvable();
  if (!reponse.body) return introuvable();
  const resultat = new Response(reponse.body, {
    headers: {
      "Content-Type": reponse.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": `public, max-age=${UN_AN}, immutable`,
      "X-Content-Type-Options": "nosniff",
    },
  });
  await cache?.put(cle, resultat.clone());
  return resultat;
}

export { introuvable };
