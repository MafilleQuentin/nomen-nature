// Variables du Worker (wrangler.jsonc et secrets Cloudflare), lues par
// `import { env } from "cloudflare:workers"`. À compléter quand on en ajoute.
declare module "cloudflare:workers" {
  export interface Env {
    /** « local », « test » ou, plus tard, « production ». */
    ENVIRONNEMENT?: string;
    /** Clé de connexion Sentry (secret Cloudflare, absente en local). */
    SENTRY_DSN?: string;
    /** Fichiers du site (dist/), lus par le serveur sans requête extérieure (wrangler.jsonc). */
    ASSETS?: { fetch(requete: Request | URL | string): Promise<Response> };
    /** Version déployée (identifiant qui change à chaque mise en ligne), clé du cache des fiches. */
    VERSION?: { id: string; tag?: string; timestamp?: string };
  }
  export const env: Env;
}
