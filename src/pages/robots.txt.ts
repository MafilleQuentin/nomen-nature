// robots.txt : le site de test (construit avec --mode essai) interdit tout aux moteurs de
// recherche ; le vrai site leur ouvre tout. Le plan du site s'ajoutera ici (lot 10).
import type { APIRoute } from "astro";

const essai = import.meta.env.MODE === "essai";

export const GET: APIRoute = () =>
  new Response(essai ? "User-agent: *\nDisallow: /\n" : "User-agent: *\nAllow: /\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
