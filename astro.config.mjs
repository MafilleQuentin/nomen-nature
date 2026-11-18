// @ts-check
import cloudflare from "@astrojs/cloudflare";
import svelte from "@astrojs/svelte";
import { defineConfig } from "astro/config";

// Configuration d'Astro pour Nomen Nature.
// - Pages statiques par défaut ; les pages qui en ont besoin seront rendues à la demande
//   par le Worker Cloudflare (fiches espèces, lot 4).
// - Svelte pour les îlots interactifs (carte, recherche, photo).
// - Pas de sessions : elles reposeraient sur un cookie, et le site n'en pose aucun
//   (checklist qualité). Cela évite aussi la base Cloudflare KV qui les stockerait.
// - Images traitées à la construction (« compile ») plutôt que par Cloudflare Images,
//   qui peut devenir payant ; le cas des photos d'espèces sera tranché au lot 4.
export default defineConfig({
  site: "https://nomenature.org",
  session: false,
  adapter: cloudflare({ imageService: "compile" }),
  integrations: [svelte()],
});
