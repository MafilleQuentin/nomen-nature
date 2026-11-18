// Erreur volontaire, pour vérifier que Sentry reçoit bien les erreurs du serveur.
// Elle n'existe que sur le site de test (test.nomenature.org) : ailleurs, page introuvable.
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

export const GET: APIRoute = () => {
  if (env.ENVIRONNEMENT !== "test") {
    return new Response(null, { status: 404 });
  }
  throw new Error("Erreur volontaire du site de test (QUE-17)");
};
