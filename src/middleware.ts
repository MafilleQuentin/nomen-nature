// Intergiciel (middleware) d'Astro : une erreur pendant le rendu d'une page est transmise
// à Sentry, puis Astro affiche sa page d'erreur. Sans cela, Astro attraperait l'erreur
// lui-même et Sentry ne la verrait jamais. Hors du Worker (construction, tests), Sentry
// n'est pas initialisé et captureException ne fait rien.
import * as Sentry from "@sentry/cloudflare";
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (_contexte, suite) => {
  try {
    return await suite();
  } catch (erreur) {
    Sentry.captureException(erreur);
    throw erreur;
  }
});
