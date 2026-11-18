// Adresses des pages de la V1, en un seul endroit.
// Elles seront préfixées par la langue (/fr/, /en/) avec QUE-14 ; la plupart des pages
// n'existent pas encore et arriveront avec leur lot.

export const liens = {
  accueil: "/",
  carte: "/",
  autourDeMoi: "/autour-de-moi",
  identifier: "/identifier",
  menacees: "/especes-menacees",
  recherche: "/recherche",
  aPropos: "/a-propos",
  sources: "/sources-et-credits",
  confidentialite: "/confidentialite",
  mentionsLegales: "/mentions-legales",
} as const;
