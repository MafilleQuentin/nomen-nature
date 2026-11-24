// Photo iNaturalist (sous licence libre), relayée par notre serveur (QUE-24) :
// /photos/inaturalist/211669479/medium.jpeg
import type { APIRoute } from "astro";
import { EXTENSIONS, sourceInaturalist, TAILLES_INATURALIST, type TailleInaturalist } from "../../../../lib/especes/photos";
import { introuvable, relayer } from "../../../../lib/especes/relais";

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const id = Number(params["id"]);
  const [taille = "", extension = ""] = (params["taille"] ?? "").split(".");
  if (!Number.isSafeInteger(id) || id <= 0 || !(taille in TAILLES_INATURALIST) || !EXTENSIONS.has(extension)) return introuvable();
  return relayer(request, sourceInaturalist(id, taille as TailleInaturalist, extension));
};
