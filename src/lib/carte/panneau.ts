// Panneau des espèces de la carte (lot 6, QUE-30 ; Figma « Continent — Europe ») : chiffres, pays
// du continent, onglets Toutes / Menacées / Par groupe et premières espèces de la liste choisie.
// Tout est dans l'adresse (?pays=ch&onglet=menacees&groupe=oiseaux), pour marcher sans JavaScript.
// Fonctions pures, testées dans tests/unit/panneau.test.ts ; les fichiers sont lus par serveur.ts.
import type { Langue } from "../../i18n/langues.ts";
import { t } from "../../i18n/textes.ts";
import { nomAffiche } from "../especes/affichage.ts";
import { lienEspece } from "../liens.ts";
import type { LigneResultat, Puce } from "../recherche/resultats.ts";

export const ONGLETS = ["toutes", "menacees", "groupes"] as const;
export type Onglet = (typeof ONGLETS)[number];

/** Pays montrés d'emblée dans les puces ; les autres derrière « + N ». */
export const PUCES_PAYS = 6;
/** Espèces montrées dans le panneau. */
export const LIGNES_PANNEAU = 6;

export interface Choix {
  /** Code ISO du pays choisi, en minuscules (« ch »), ou vide pour le continent. */
  pays: string;
  onglet: Onglet;
  /** Groupe de l'onglet « Par groupe » (« oiseaux »), ou vide pour le plus fourni. */
  groupe: string;
  /** Tous les pays dans les puces (après « + N »). */
  tousLesPays: boolean;
}

/** Résumé d'une région (listes/…/resume.json). */
export interface Resume {
  especes: number;
  menacees: number;
  groupes: Record<string, { especes: number; menacees: number }>;
}

/** Fichier d'une liste (listes/…/<nom>.json). */
export interface FichierListe {
  colonnes: string[];
  lignes: (string | number)[][];
}

const groupesDe = (langue: Langue) => t(langue).groupes as Record<string, string>;

/** Choix lus dans l'adresse ; un pays qui n'est pas dans `paysPossibles` est ignoré. */
export function lireChoix(parametres: URLSearchParams, paysPossibles: string[]): Choix {
  const pays = (parametres.get("pays") ?? "").toLowerCase();
  const onglet = parametres.get("onglet") ?? "";
  const groupe = parametres.get("groupe") ?? "";
  return {
    pays: paysPossibles.includes(pays) ? pays : "",
    onglet: (ONGLETS as readonly string[]).includes(onglet) ? (onglet as Onglet) : "toutes",
    groupe: Object.hasOwn(groupesDe("fr"), groupe) ? groupe : "",
    tousLesPays: parametres.get("tous") === "1",
  };
}

/** Adresse de la page du continent avec ces choix (les choix par défaut sont omis). */
export function adressePanneau(base: string, choix: Partial<Choix>): string {
  const parametres = new URLSearchParams();
  if (choix.pays) parametres.set("pays", choix.pays);
  if (choix.onglet && choix.onglet !== "toutes") parametres.set("onglet", choix.onglet);
  if (choix.onglet === "groupes" && choix.groupe) parametres.set("groupe", choix.groupe);
  if (choix.tousLesPays) parametres.set("tous", "1");
  const texte = parametres.toString();
  return texte ? `${base}?${texte}` : base;
}

/** Nom d'un pays dans la langue du site (« Suisse »). */
export function nomDuPays(code: string, langue: Langue): string {
  try {
    return new Intl.DisplayNames([langue], { type: "region" }).of(code.toUpperCase()) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

/** Puces des pays : les plus riches en espèces d'abord ; « + N » mène à tous les pays. */
export function pucesPays(pays: { code: string; especes: number }[], choix: Choix, base: string, langue: Langue): Puce[] {
  const tries = [...pays].sort((a, b) => b.especes - a.especes || a.code.localeCompare(b.code));
  let montres = choix.tousLesPays ? tries : tries.slice(0, PUCES_PAYS);
  // Le pays choisi reste visible, même s'il n'est pas parmi les plus riches.
  if (choix.pays && !montres.some((p) => p.code === choix.pays)) montres = [...montres, ...tries.filter((p) => p.code === choix.pays)];
  const puces: Puce[] = montres.map((p) => ({
    libelle: nomDuPays(p.code, langue),
    lien: adressePanneau(base, { ...choix, pays: p.code === choix.pays ? "" : p.code, groupe: "" }),
    actif: p.code === choix.pays,
  }));
  const reste = tries.length - montres.length;
  if (reste > 0) puces.push({ libelle: `+ ${reste}`, lien: adressePanneau(base, { ...choix, tousLesPays: true }), actif: false });
  return puces;
}

/** Onglets Toutes / Menacées / Par groupe (le pays choisi est gardé). */
export function onglets(choix: Choix, base: string, langue: Langue): Puce[] {
  const textes = t(langue).panneau;
  const libelles: Record<Onglet, string> = { toutes: textes.toutes, menacees: textes.menacees, groupes: textes.parGroupe };
  return ONGLETS.map((onglet) => ({ libelle: libelles[onglet], lien: adressePanneau(base, { ...choix, onglet, groupe: "" }), actif: choix.onglet === onglet }));
}

/** Groupe affiché dans l'onglet « Par groupe » : celui choisi, sinon le plus fourni. */
export function groupeAffiche(resume: Resume, choix: Choix): string {
  if (choix.groupe && resume.groupes[choix.groupe]) return choix.groupe;
  return Object.entries(resume.groupes).sort(([, a], [, b]) => b.especes - a.especes)[0]?.[0] ?? "";
}

/** Puces des groupes (onglet « Par groupe ») : du plus fourni au moins fourni, avec leur nombre. */
export function pucesGroupes(resume: Resume, choix: Choix, base: string, langue: Langue): Puce[] {
  const actif = groupeAffiche(resume, choix);
  const nombre = new Intl.NumberFormat(langue === "fr" ? "fr-FR" : "en-US");
  return Object.entries(resume.groupes)
    .sort(([, a], [, b]) => b.especes - a.especes)
    .map(([groupe, { especes }]) => ({
      libelle: `${groupesDe(langue)[groupe] ?? groupe} · ${nombre.format(especes)}`,
      lien: adressePanneau(base, { ...choix, onglet: "groupes", groupe }),
      actif: groupe === actif,
    }));
}

/** Premières lignes d'une liste, prêtes à afficher (nom dans la langue du site, groupe, statut). */
export function lignesPanneau(fichier: FichierListe, langue: Langue, nombre = LIGNES_PANNEAU): LigneResultat[] {
  const i = (nom: string) => fichier.colonnes.indexOf(nom);
  const texte = (ligne: (string | number)[], nom: string) => String(ligne[i(nom)] ?? "");
  return fichier.lignes
    .filter((l) => texte(l, "adresse"))
    .slice(0, nombre)
    .map((l) => {
      const fiche = { nom: texte(l, "nom"), nomFr: texte(l, "nom_fr"), nomEn: texte(l, "nom_en") };
      return {
        nom: nomAffiche(fiche, langue),
        latin: fiche.nom,
        meta: groupesDe(langue)[texte(l, "groupe")] ?? "",
        uicn: texte(l, "uicn") || "NE",
        lien: lienEspece(texte(l, "adresse"), langue),
      };
    });
}
