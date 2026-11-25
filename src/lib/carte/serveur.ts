// Lecture des listes pour le panneau de la carte (lot 6, QUE-30) : /donnees/listes/… (binding
// ASSETS), fichiers gardés en mémoire tant que le Worker tourne. La page est rendue par le serveur
// avant d'être envoyée : le code de réponse et le cache se décident ici.
import type { Langue } from "../../i18n/langues.ts";
import { t } from "../../i18n/textes.ts";
import { lireFichierDuSite } from "../especes/serveur.ts";
import { lienContinent } from "../liens.ts";
import type { LigneResultat, Puce } from "../recherche/resultats.ts";
import { CONTINENTS, coordonnees, type CodeContinent } from "./continents.ts";
import { paysDuContinent } from "./donnees.ts";
import {
  adressePanneau,
  groupeAffiche,
  lignesPanneau,
  lireChoix,
  nomDuPays,
  onglets,
  pucesGroupes,
  pucesPays,
  type Choix,
  type FichierListe,
  type Resume,
} from "./panneau.ts";

const MAX_EN_MEMOIRE = 64;
const memoire = new Map<string, Promise<unknown>>();

function lireJson<T>(chemin: string, origine: URL): Promise<T | undefined> {
  const connu = memoire.get(chemin) as Promise<T | undefined> | undefined;
  if (connu) return connu;
  const lecture = lireFichierDuSite(chemin, origine).then((r) => (r.ok ? (r.json() as Promise<T>) : undefined));
  memoire.set(chemin, lecture);
  lecture.then((v) => v === undefined && memoire.delete(chemin)).catch(() => memoire.delete(chemin));
  if (memoire.size > MAX_EN_MEMOIRE) memoire.delete(memoire.keys().next().value ?? "");
  return lecture;
}

export interface ContenuPanneau {
  choix: Choix;
  surtitre: string;
  titre: string;
  chiffres: { valeur: number; libelle: string; accent?: boolean }[];
  pays: Puce[];
  /** Lien de chaque pays de la carte (code ISO en minuscules) : son panneau, ou le continent s'il est choisi. */
  liensPays: Record<string, string>;
  onglets: Puce[];
  groupes: Puce[];
  /** Nom de la liste affichée, pour les lecteurs d'écran (« Espèces menacées »). */
  nomListe: string;
  lignes: LigneResultat[];
  /** Retour au continent quand un pays est choisi. */
  retour?: { libelle: string; lien: string };
}

/** Contenu du panneau, ou undefined si les listes ne sont pas installées (paquet absent). */
export async function chargerPanneau(url: URL, langue: Langue, code: CodeContinent): Promise<ContenuPanneau | undefined> {
  const textes = t(langue);
  const continent = CONTINENTS[code];
  const base = lienContinent(continent.adresse, langue);
  const regions = await lireJson<Record<string, { especes: number; menacees: number }>>("/donnees/listes/regions.json", url);
  if (!regions) return undefined;
  const pays = paysDuContinent(code)
    .map((c) => ({ code: c, especes: regions[`pays/${c}`]?.especes ?? 0 }))
    .filter((p) => p.especes > 0);
  const choix = lireChoix(
    url.searchParams,
    pays.map((p) => p.code),
  );
  const dossier = choix.pays ? `/donnees/listes/pays/${choix.pays}` : `/donnees/listes/continents/${code.toLowerCase()}`;
  const resume = await lireJson<Resume>(`${dossier}/resume.json`, url);
  if (!resume) return undefined;

  const groupe = choix.onglet === "groupes" ? groupeAffiche(resume, choix) : "";
  const nomFichier = choix.onglet === "groupes" ? groupe : choix.onglet;
  const liste = nomFichier ? await lireJson<FichierListe>(`${dossier}/${nomFichier}.json`, url) : undefined;
  const nomContinent = textes.continents[code];
  const nombreGroupes = Object.keys(resume.groupes).length;
  const nomListe =
    choix.onglet === "menacees"
      ? textes.panneau.listeMenacees
      : choix.onglet === "groupes"
        ? ((textes.groupes as Record<string, string>)[groupe] ?? "")
        : textes.panneau.listeToutes;

  return {
    choix,
    surtitre: choix.pays ? `${textes.panneau.pays} · ${nomContinent}` : `${textes.carte.continent} · ${coordonnees(continent.centre)}`,
    titre: choix.pays ? nomDuPays(choix.pays, langue) : nomContinent,
    chiffres: [
      { valeur: resume.especes, libelle: textes.panneau.especesObservees },
      { valeur: resume.menacees, libelle: textes.panneau.menaceesChiffre, accent: true },
      choix.pays ? { valeur: nombreGroupes, libelle: textes.panneau.groupesChiffre } : { valeur: pays.length, libelle: textes.panneau.paysChiffre },
    ],
    pays: pucesPays(pays, choix, base, langue),
    liensPays: Object.fromEntries(
      pays.map((p) => [p.code, adressePanneau(base, { ...choix, pays: p.code === choix.pays ? "" : p.code, groupe: "", tousLesPays: false })]),
    ),
    onglets: onglets(choix, base, langue),
    groupes: choix.onglet === "groupes" ? pucesGroupes(resume, choix, base, langue) : [],
    nomListe,
    lignes: liste ? lignesPanneau(liste, langue) : [],
    ...(choix.pays ? { retour: { libelle: nomContinent, lien: base } } : {}),
  };
}
