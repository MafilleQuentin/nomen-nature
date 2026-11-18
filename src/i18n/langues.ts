// Langues du site. La première est la langue par défaut (moteurs de recherche, navigateurs
// sans préférence). Pour ajouter une langue : l'ajouter ici, dans astro.config.mjs (i18n),
// dans textes.ts et dans la table des adresses (src/lib/liens.ts).
export const langues = ["fr", "en"] as const;
export type Langue = (typeof langues)[number];
export const langueParDefaut: Langue = "fr";

export function estLangue(valeur: string | undefined): valeur is Langue {
  return (langues as readonly (string | undefined)[]).includes(valeur);
}

/**
 * Langue du site la mieux adaptée à l'en-tête Accept-Language du navigateur
 * (« de-DE,de;q=0.9,en;q=0.7 » → en). Seule la langue compte, pas la région :
 * « en-GB » comme « en-US » donnent en. Sans correspondance : la langue par défaut.
 */
export function langueDuNavigateur(entete: string | null): Langue {
  const preferences = (entete ?? "")
    .split(",")
    .map((morceau, rang) => {
      const [etiquette = "", ...parametres] = morceau.trim().split(";");
      const q = parametres.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const poids = q ? Number.parseFloat(q.slice(2)) : 1;
      return { langue: etiquette.split("-")[0]?.toLowerCase(), poids: Number.isNaN(poids) ? 0 : poids, rang };
    })
    .filter((p) => p.poids > 0)
    .sort((a, b) => b.poids - a.poids || a.rang - b.rang);
  return preferences.map((p) => p.langue).find(estLangue) ?? langueParDefaut;
}

/** Langue indiquée par le début d'une adresse (/en/about → en), s'il y en a une. */
export function langueDeLAdresse(chemin: string): Langue | undefined {
  const premier = chemin.split("/")[1]?.toLowerCase();
  return estLangue(premier) ? premier : undefined;
}

/** Nom de chaque langue dans cette langue, et son code court affiché. */
export const nomsLangues: Record<Langue, { nom: string; code: string }> = {
  fr: { nom: "Français", code: "FR" },
  en: { nom: "English", code: "EN" },
};
