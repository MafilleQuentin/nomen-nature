// Point d'entrée du Worker Cloudflare : le serveur généré par Astro, enveloppé par Sentry
// pour remonter les erreurs du serveur. Rien de Sentry n'est envoyé au navigateur du
// visiteur (pas de script, pas d'appel à sentry.io depuis la page).
//
// Vie privée : ni utilisateur (adresse IP), ni cookies, ni en-têtes, ni corps de requête,
// ni paramètres d'adresse dans les rapports (option dataCollection de Sentry 11) ;
// pas de mesure de performance (tracesSampleRate à 0). Sans clé SENTRY_DSN (en local),
// Sentry ne fait rien.
import handler from "@astrojs/cloudflare/entrypoints/server";
import * as Sentry from "@sentry/cloudflare";
import type { Env } from "cloudflare:workers";

export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    environment: env.ENVIRONNEMENT ?? "local",
    tracesSampleRate: 0,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
  }),
  handler,
);
