// Textes de l'interface, en français et en anglais. Le français fait référence : TypeScript
// refuse la construction s'il manque un texte en anglais (ou s'il y en a un en trop).
import type { Langue } from "./langues";

const fr = {
  general: {
    allerAuContenu: "Aller au contenu",
    logo: "Nomen Nature, accueil",
  },
  enTete: {
    navigation: "Navigation principale",
    explorer: "Explorer",
    identifier: "Identifier",
    menacees: "Espèces menacées",
    aPropos: "À propos",
    // Lien vers l'autre langue : il commence par le code affiché (FR, EN), exigence WCAG 2.5.3.
    autreLangue: "FR, English version",
    ouvrirMenu: "Ouvrir le menu",
    fermerMenu: "Fermer le menu",
    menu: "Menu",
  },
  menu: {
    carte: "Explorer la carte",
    autourDeMoi: "Autour de moi",
    identifier: "Identifier une plante",
    menacees: "Espèces menacées",
    recherche: "Rechercher",
    langue: "Langue",
  },
  annexes: {
    titre: "Pages annexes",
    aPropos: "À propos",
    sources: "Sources et crédits",
    confidentialite: "Confidentialité",
    mentionsLegales: "Mentions légales",
  },
  piedDePage: {
    mention: "Nomen Nature · gratuit et sans publicité · données GBIF, Wikipédia, UICN, Pl@ntNet",
    mentionCourte: "Gratuit et sans publicité",
  },
  accueil: {
    titre: "Nomen Nature",
    description: "Redonner un nom au vivant : explorer la faune, la flore et les champignons du monde entier.",
    enConstruction: "En construction",
  },
};

type Textes = { [K in keyof typeof fr]: { [L in keyof (typeof fr)[K]]: string } };

const en: Textes = {
  general: {
    allerAuContenu: "Skip to content",
    logo: "Nomen Nature, home",
  },
  enTete: {
    navigation: "Main navigation",
    explorer: "Explore",
    identifier: "Identify",
    menacees: "Threatened species",
    aPropos: "About",
    autreLangue: "EN, version française",
    ouvrirMenu: "Open menu",
    fermerMenu: "Close menu",
    menu: "Menu",
  },
  menu: {
    carte: "Explore the map",
    autourDeMoi: "Near me",
    identifier: "Identify a plant",
    menacees: "Threatened species",
    recherche: "Search",
    langue: "Language",
  },
  annexes: {
    titre: "Secondary pages",
    aPropos: "About",
    sources: "Sources and credits",
    confidentialite: "Privacy",
    mentionsLegales: "Legal notice",
  },
  piedDePage: {
    mention: "Nomen Nature · free and ad-free · data from GBIF, Wikipedia, IUCN, Pl@ntNet",
    mentionCourte: "Free and ad-free",
  },
  accueil: {
    titre: "Nomen Nature",
    description: "Giving living things their names back: explore the fauna, flora and fungi of the whole world.",
    enConstruction: "Under construction",
  },
};

const textes: Record<Langue, Textes> = { fr, en };

export function t(langue: Langue): Textes {
  return textes[langue];
}
