// Intergiciel (middleware) d'Astro :
// - une erreur pendant le rendu d'une page est transmise à Sentry, puis Astro affiche sa page
//   d'erreur. Sans cela, Astro attraperait l'erreur lui-même et Sentry ne la verrait jamais. Hors
//   du Worker (construction, tests), Sentry n'est pas initialisé et captureException ne fait rien ;
// - les fiches espèces complètes sont gardées un jour dans le cache de Cloudflare (QUE-26,
//   src/lib/cache.ts) : une fiche déjà vue est renvoyée sans rien recalculer ni rappeler
//   Wikipédia, Commons ou GBIF. L'en-tête X-Cache-Fiche dit si elle venait du cache.
import * as Sentry from "@sentry/cloudflare";
import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";
import { cleDeCache, DUREE_CACHE_PAGE, DUREE_NAVIGATEUR, EN_TETE_CACHE, estPageEnCache } from "./lib/cache";

function cacheCloudflare(): Cache | undefined {
  return typeof caches !== "undefined" && "default" in caches ? (caches as unknown as { default: Cache }).default : undefined;
}

export const onRequest = defineMiddleware(async (contexte, suite) => {
  try {
    const { request, url } = contexte;
    const cache = request.method === "GET" && estPageEnCache(url.pathname) ? cacheCloudflare() : undefined;
    if (!cache) return await suite();

    const cle = cleDeCache(url, env?.VERSION?.id ?? "local");
    const connue = await cache.match(cle);
    if (connue) {
      const reponse = new Response(connue.body, connue);
      reponse.headers.set("Cache-Control", `public, max-age=${DUREE_NAVIGATEUR}`);
      reponse.headers.set("X-Cache-Fiche", "HIT");
      return reponse;
    }

    const reponse = await suite();
    const entetes = new Headers(reponse.headers);
    const peutCacher = reponse.status === 200 && entetes.has(EN_TETE_CACHE);
    entetes.delete(EN_TETE_CACHE);
    entetes.set("X-Cache-Fiche", "MISS");
    if (!peutCacher) return new Response(reponse.body, { status: reponse.status, statusText: reponse.statusText, headers: entetes });

    const html = await reponse.text();
    const gardee = new Headers(entetes);
    gardee.set("Cache-Control", `public, max-age=${DUREE_CACHE_PAGE}`);
    await cache.put(cle, new Response(html, { status: 200, headers: gardee }));
    return new Response(html, { status: 200, headers: entetes });
  } catch (erreur) {
    Sentry.captureException(erreur);
    throw erreur;
  }
});
