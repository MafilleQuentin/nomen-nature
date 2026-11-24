// Photos des fiches espèces (lot 4, QUE-24), décidées le 24.11.2026 (journal des décisions) :
// - Wikimedia Commons d'abord (photo de Wikidata), en vignettes WebP aux tailles standard de
//   Wikimedia ; sinon iNaturalist (photo par défaut du taxon), en JPEG, seulement sous licence
//   libre (CC0, CC BY, CC BY-SA, CC BY-NC, CC BY-NC-SA ; ni « tous droits réservés » ni « ND »,
//   car la fiche recadre la photo) ;
// - les images passent par notre serveur (/photos/…) : le navigateur du visiteur ne contacte ni
//   Wikimedia ni iNaturalist ;
// - auteur, licence et lien vers la page d'origine sont affichés avec chaque photo.
//
// Fonctions pures (adresses, licences, textes), testées dans tests/unit/photos.test.ts.
import { createHash } from "node:crypto";

/** Largeurs des vignettes Commons (tailles standard de Wikimedia, les seules toujours servies). */
export const LARGEURS_COMMONS = [330, 500, 960] as const;
/** Tailles des photos iNaturalist et leur largeur maximale. */
export const TAILLES_INATURALIST = { medium: 500, large: 1024 } as const;
export type TailleInaturalist = keyof typeof TAILLES_INATURALIST;

export interface Photo {
  source: "commons" | "inaturalist";
  /** Adresse de la photo chez nous, dans sa taille moyenne. */
  src: string;
  /** Les différentes tailles, pour l'attribut srcset. */
  srcset: string;
  /** Tailles réservées aux grands écrans (ordinateur), si la source en a une trop lourde pour un téléphone. */
  srcsetOrdinateur?: string;
  /** Tailles pour une carte d'espèce (302 px au plus). */
  srcsetCarte: string;
  largeur: number;
  hauteur: number;
  auteur: string;
  licence: string;
  lienLicence: string;
  /** Page de la photo chez sa source (crédit complet). */
  page: string;
}

/** Nom de fichier Commons tel qu'il apparaît dans les adresses (espaces → tirets bas). */
export function nomCommons(fichier: string): string {
  return fichier.trim().replace(/ /g, "_");
}

/** Vignette WebP d'un fichier Commons chez Wikimedia (chemin calculé par l'empreinte MD5 du nom). */
export function vignetteCommons(fichier: string, largeur: number): string {
  const nom = nomCommons(fichier);
  const md5 = createHash("md5").update(nom).digest("hex");
  const encode = encodeURIComponent(nom);
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${md5[0]}/${md5.slice(0, 2)}/${encode}/${largeur}px-${encode}.webp`;
}

/** Adresse de la photo Commons chez nous : /photos/commons/500/Paprastasis_azuolas.JPG */
export function relaisCommons(fichier: string, largeur: number): string {
  return `/photos/commons/${largeur}/${encodeURIComponent(nomCommons(fichier))}`;
}

/** Adresse de la photo iNaturalist chez nous : /photos/inaturalist/211669479/medium.jpeg */
export function relaisInaturalist(id: number, taille: TailleInaturalist, extension: string): string {
  return `/photos/inaturalist/${id}/${taille}.${extension}`;
}

/** Photo iNaturalist chez iNaturalist (seau public « inaturalist-open-data », photos sous licence libre). */
export function sourceInaturalist(id: number, taille: TailleInaturalist, extension: string): string {
  return `https://inaturalist-open-data.s3.amazonaws.com/photos/${id}/${taille}.${extension}`;
}

/** Extensions d'image acceptées par le relais. */
export const EXTENSIONS = new Set(["jpg", "jpeg", "png"]);

/** Une largeur de vignette Commons acceptée par le relais. */
export function estLargeurCommons(n: number): n is (typeof LARGEURS_COMMONS)[number] {
  return (LARGEURS_COMMONS as readonly number[]).includes(n);
}

const LICENCES_INATURALIST: Record<string, { nom: string; lien: string }> = {
  cc0: { nom: "CC0", lien: "https://creativecommons.org/publicdomain/zero/1.0/" },
  "cc-by": { nom: "CC BY 4.0", lien: "https://creativecommons.org/licenses/by/4.0/" },
  "cc-by-sa": { nom: "CC BY-SA 4.0", lien: "https://creativecommons.org/licenses/by-sa/4.0/" },
  "cc-by-nc": { nom: "CC BY-NC 4.0", lien: "https://creativecommons.org/licenses/by-nc/4.0/" },
  "cc-by-nc-sa": { nom: "CC BY-NC-SA 4.0", lien: "https://creativecommons.org/licenses/by-nc-sa/4.0/" },
};

/** Licence d'une photo iNaturalist si elle est acceptée (voir plus haut), sinon undefined. */
export function licenceInaturalist(code: string | null | undefined): { nom: string; lien: string } | undefined {
  return code ? LICENCES_INATURALIST[code.toLowerCase()] : undefined;
}

/** Texte brut d'un champ HTML de Commons (auteur) : balises retirées, entités décodées, raccourci. */
export function texteBrut(html: string, max = 80): string {
  const texte = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return texte.length > max ? `${texte.slice(0, max - 1).trimEnd()}…` : texte;
}

/** srcset des vignettes Commons, jusqu'à la largeur de l'original (et jusqu'à `max`). */
export function srcsetCommons(fichier: string, largeurOriginale: number, max = 960): string {
  const largeurs = LARGEURS_COMMONS.filter((l, i) => i === 0 || (l <= largeurOriginale && l <= max));
  return largeurs.map((l) => `${relaisCommons(fichier, l)} ${l}w`).join(", ");
}
