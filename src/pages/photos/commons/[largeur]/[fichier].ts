// Vignette WebP d'une photo Wikimedia Commons, relayée par notre serveur (QUE-24) :
// /photos/commons/500/Paprastasis_azuolas.JPG ; ?format=original pour l'image d'aperçu
// des partages, dans le format de l'original (QUE-26).
import type { APIRoute } from "astro";
import { estLargeurCommons, nomCommons, vignetteCommons } from "../../../../lib/especes/photos";
import { introuvable, relayer } from "../../../../lib/especes/relais";

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const largeur = Number(params["largeur"]);
  const fichier = params["fichier"] ?? "";
  // Un nom de fichier Commons : pas de barre oblique, une extension d'image.
  if (!estLargeurCommons(largeur) || !/^[^/]{1,240}\.(jpe?g|png|tiff?|webp|gif)$/i.test(fichier)) return introuvable();
  // ?format=original : vignette dans le format de l'original (image d'aperçu des partages).
  const format = new URL(request.url).searchParams.get("format") === "original" ? "original" : "webp";
  // Repli : l'original, si la photo est plus petite que la vignette demandée.
  const original = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(nomCommons(fichier))}`;
  return relayer(request, vignetteCommons(fichier, largeur, format), original);
};
