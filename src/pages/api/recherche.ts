// API des suggestions (lot 5, QUE-27) : /api/recherche?q=boulot&langue=fr → les 8 espèces les
// mieux classées, prêtes à afficher. Réponses gardées un jour dans le cache de Cloudflare (clé par
// déploiement, comme les fiches) et une heure dans le navigateur.
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { estLangue } from "../../i18n/langues";
import { cleDeCache, DUREE_CACHE_PAGE } from "../../lib/cache";
import { chercherSurLeSite } from "../../lib/recherche/serveur";
import { suggestion, texteValide } from "../../lib/recherche/suggestions";

export const prerender = false;

const json = (corps: unknown, statut = 200, duree = 3600) =>
  new Response(JSON.stringify(corps), {
    status: statut,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": `public, max-age=${duree}` },
  });

export const GET: APIRoute = async ({ url }) => {
  const texte = (url.searchParams.get("q") ?? "").trim();
  const langueDemandee = url.searchParams.get("langue") ?? "fr";
  const langue = estLangue(langueDemandee) ? langueDemandee : "fr";
  if (!texteValide(texte)) return json({ q: texte, suggestions: [] }, 200, 86400);

  const cache = typeof caches !== "undefined" && "default" in caches ? (caches as unknown as { default: Cache }).default : undefined;
  const cle = cleDeCache(new URL(`/api/recherche/${langue}/${encodeURIComponent(texte.toLowerCase())}`, url), env?.VERSION?.id ?? "local");
  const connue = await cache?.match(cle);
  if (connue) return json(await connue.json());

  const trouvees = await chercherSurLeSite(texte, langue, url, 8);
  if (!trouvees) return json({ q: texte, suggestions: [], erreur: "index indisponible" }, 503, 60);
  const corps = { q: texte, correction: trouvees.correction, suggestions: trouvees.especes.map((e) => suggestion(e, langue)) };
  await cache?.put(cle, json(corps, 200, DUREE_CACHE_PAGE));
  return json(corps);
};
