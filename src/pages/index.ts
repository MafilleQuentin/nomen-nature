// Racine du site : envoie vers l'accueil dans la langue préférée du navigateur
// (en-tête Accept-Language), sans cookie ni géolocalisation. Français par défaut,
// notamment pour les moteurs de recherche. Seule page rendue à la demande par le Worker.
import type { APIRoute } from "astro";
import { langueDuNavigateur } from "../i18n/langues";
import { lien } from "../lib/liens";

export const prerender = false;

export const GET: APIRoute = ({ request }) => {
  const langue = langueDuNavigateur(request.headers.get("Accept-Language"));
  return new Response(null, {
    status: 302,
    headers: {
      Location: lien("accueil", langue),
      // La réponse dépend de la langue du navigateur : un cache ne doit pas la partager.
      Vary: "Accept-Language",
      "Cache-Control": "private, no-cache",
    },
  });
};
