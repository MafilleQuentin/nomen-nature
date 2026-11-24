// Relais des photos (lot 4, QUE-24) : notre serveur va chercher l'image chez Wikimedia ou
// iNaturalist et la renvoie au navigateur, qui ne contacte que nomenature.org (décision du
// 23.11.2026). Seules des adresses construites par nous sont relayées (jamais une adresse
// fournie par le visiteur) ; l'image est gardée un an dans le cache de Cloudflare.
import { AGENT } from "./serveur.ts";

const UN_AN = 365 * 24 * 3600;
const TAILLE_MAX = 8 * 1024 * 1024;

function introuvable(): Response {
  return new Response("Photo introuvable", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}

async function telecharger(adresse: string): Promise<Response | undefined> {
  try {
    const reponse = await fetch(adresse, { headers: { "User-Agent": AGENT, Accept: "image/webp,image/jpeg,image/png" }, signal: AbortSignal.timeout(8000) });
    const type = reponse.headers.get("Content-Type") ?? "";
    const taille = Number(reponse.headers.get("Content-Length") ?? 0);
    if (!reponse.ok || !type.startsWith("image/") || taille > TAILLE_MAX) return undefined;
    return reponse;
  } catch {
    return undefined;
  }
}

/** Relaie `source` (ou `repli` si elle échoue) pour la requête du visiteur, avec le cache. */
export async function relayer(requete: Request, source: string, repli?: string): Promise<Response> {
  const cache = typeof caches !== "undefined" && "default" in caches ? (caches as unknown as { default: Cache }).default : undefined;
  const cle = new Request(new URL(requete.url).toString(), { method: "GET" });
  const connue = await cache?.match(cle);
  if (connue) return connue;
  const reponse = (await telecharger(source)) ?? (repli ? await telecharger(repli) : undefined);
  if (!reponse?.body) return introuvable();
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
