// @ts-check
import cloudflare from "@astrojs/cloudflare";
import svelte from "@astrojs/svelte";
import { defineConfig, fontProviders } from "astro/config";

// Configuration d'Astro pour Nomen Nature.
// - Pages statiques par défaut ; les pages qui en ont besoin seront rendues à la demande
//   par le Worker Cloudflare (fiches espèces, lot 4).
// - Svelte pour les îlots interactifs (carte, recherche, photo).
// - Pas de sessions : elles reposeraient sur un cookie, et le site n'en pose aucun
//   (checklist qualité). Cela évite aussi la base Cloudflare KV qui les stockerait.
// - Images traitées à la construction (« compile ») plutôt que par Cloudflare Images,
//   qui peut devenir payant ; le cas des photos d'espèces sera tranché au lot 4.
// - Polices : téléchargées depuis Fontsource à la construction, puis servies par notre
//   site (aucun appel à Google Fonts ni à un tiers pendant la visite). Licence OFL.
//   Seules les graisses utilisées par le design system ; latin et latin étendu.
// - Bilingue : chaque page existe sous /fr/… et /en/…, avec des adresses traduites
//   (/fr/a-propos ↔ /en/about, table dans src/lib/liens.ts). Pas de routage i18n d'Astro :
//   il ne gère pas les adresses traduites, et sa détection de la langue du navigateur
//   ignore « en-GB » quand seul « en » est déclaré. La racine redirige elle-même vers la
//   langue du navigateur (src/pages/index.ts).
// - Adresses sans barre finale (/fr/a-propos) : pages construites en fichiers .html,
//   que Cloudflare sert sans extension.
/** @type {[string, ...string[]]} */
const sousEnsembles = ["latin", "latin-ext"];

export default defineConfig({
  site: "https://nomenature.org",
  trailingSlash: "never",
  build: { format: "file" },
  session: false,
  adapter: cloudflare({ imageService: "compile" }),
  integrations: [svelte()],
  fonts: [
    {
      name: "Space Grotesk",
      cssVariable: "--font-titre",
      provider: fontProviders.fontsource(),
      weights: [700],
      styles: ["normal"],
      subsets: sousEnsembles,
      fallbacks: ["system-ui", "sans-serif"],
    },
    {
      name: "IBM Plex Sans",
      cssVariable: "--font-texte",
      provider: fontProviders.fontsource(),
      weights: [400, 600],
      styles: ["normal", "italic"],
      subsets: sousEnsembles,
      fallbacks: ["system-ui", "sans-serif"],
    },
    {
      name: "IBM Plex Mono",
      cssVariable: "--font-mono",
      provider: fontProviders.fontsource(),
      weights: [400, 600],
      styles: ["normal"],
      subsets: sousEnsembles,
      fallbacks: ["ui-monospace", "monospace"],
    },
  ],
});
