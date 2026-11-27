// Qualité de la recherche (lot 5, QUE-27) : les 40 recherches de test du lot 1
// (tools/essai-recherche/evaluer.py), traduites telles quelles, plus des recherches imprévues
// ajoutées au lot 5. Un cas est réussi si une bonne réponse sort dans les 5 premiers résultats.
// « genre:Betula » accepte le genre Betula ou n'importe laquelle de ses espèces.
//
// Lancé sur l'index construit (paquet de données) : par l'import mensuel, qui échoue si le score
// passe sous le seuil, et à la main après une modification du moteur.
//
// Utilisation : node tools/donnees/evaluer-recherche.ts [dossier de l'index] [--details]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { adresseEspece } from "../../src/lib/especes/adresse.ts";
import { cheminDuFichier, ficheParIdentifiant, fichesDuGenre, type FichierFiches } from "../../src/lib/especes/fiche.ts";
import { chercherEspeces } from "../../src/lib/recherche/especes.ts";
import { rechercher, type Manifeste, type Resultat, type Source } from "../../src/lib/recherche/moteur.ts";

/** (texte tapé, catégorie, bonnes réponses) */
export const CAS_LOT_1: [string, string, string[]][] = [
  // Français : nom exact, sans accents, fautes de son
  ["chêne pédonculé", "fr exact", ["Quercus robur"]],
  ["chene pedoncule", "fr sans accents", ["Quercus robur"]],
  ["bouleau", "fr exact (genre)", ["genre:Betula"]],
  ["boulot", "fr faute de son", ["genre:Betula"]],
  ["bouleau verruqueux", "fr exact", ["Betula pendula"]],
  ["bouleau verukeux", "fr faute de son", ["Betula pendula"]],
  ["renard roux", "fr exact", ["Vulpes vulpes"]],
  ["renar", "fr faute de son", ["genre:Vulpes"]],
  ["écureuil roux", "fr exact", ["Sciurus vulgaris"]],
  ["ecureuil", "fr sans accents", ["Sciuridae", "genre:Sciurus"]],
  ["mésange charbonnière", "fr exact", ["Parus major"]],
  ["mezange charboniere", "fr faute de son", ["Parus major"]],
  ["rouge gorge", "fr sans trait d'union", ["Erithacus rubecula"]],
  ["herisson", "fr sans accents", ["genre:Erinaceus", "Erinaceidae"]],
  ["coquelico", "fr faute de son", ["Papaver rhoeas"]],
  ["muget", "fr faute de son", ["Convallaria majalis"]],
  ["pissenlit", "fr exact (genre)", ["genre:Taraxacum"]],
  ["amanite tue mouche", "fr sans trait d'union", ["Amanita muscaria"]],
  ["cèpe de bordeaux", "fr exact", ["Boletus edulis"]],
  ["lynx", "fr exact", ["genre:Lynx"]],
  ["loup gris", "fr exact", ["Canis lupus"]],
  ["abeille domestique", "fr exact", ["Apis mellifera"]],
  ["coccinelle a sept points", "fr sans accents", ["Coccinella septempunctata"]],
  // Anglais
  ["red fox", "en exact", ["Vulpes vulpes"]],
  ["silver birch", "en exact", ["Betula pendula"]],
  ["birtch", "en faute de son", ["genre:Betula"]],
  ["pedunculate oak", "en exact", ["Quercus robur"]],
  ["honey bee", "en exact", ["Apis mellifera", "genre:Apis"]],
  ["hedgehog", "en exact", ["genre:Erinaceus", "Erinaceidae"]],
  ["fly agaric", "en exact", ["Amanita muscaria"]],
  // Latin
  ["Quercus robur", "latin exact", ["Quercus robur"]],
  ["Querkus robur", "latin faute de son", ["Quercus robur"]],
  ["Vulpes vulpes", "latin exact", ["Vulpes vulpes"]],
  ["Quercus pedunculata", "latin synonyme", ["Quercus robur"]],
  ["Betula pendula", "latin exact", ["Betula pendula"]],
  // Début de mot (autocomplétion)
  ["Quercus rob", "autocomplétion", ["Quercus robur"]],
  ["mesange ch", "autocomplétion", ["Parus major"]],
  ["ecureuil r", "autocomplétion", ["Sciurus vulgaris"]],
  ["pissen", "autocomplétion", ["genre:Taraxacum"]],
  ["Vulpes v", "autocomplétion", ["Vulpes vulpes"]],
];

/** Recherches imprévues, ajoutées au lot 5 (non comptées dans le seuil du lot 1). */
export const CAS_IMPREVUS: [string, string, string[]][] = [
  ["hetre", "fr sans accents (genre)", ["genre:Fagus"]],
  ["chevreuil", "fr exact", ["Capreolus capreolus"]],
  ["pinson", "fr exact (genre)", ["genre:Fringilla"]],
  ["cerf elaphe", "fr sans accents", ["Cervus elaphus"]],
  ["tournesol", "fr exact", ["Helianthus annuus"]],
  ["orque", "fr exact", ["Orcinus orca"]],
  ["girafe", "fr exact (genre)", ["genre:Giraffa"]],
  ["fougere aigle", "fr sans accents", ["Pteridium aquilinum"]],
  ["agrile bleuatre", "fr sans accents", ["Agrilus cyanescens"]],
  ["european robin", "en exact", ["Erithacus rubecula"]],
  ["sunflower", "en exact", ["Helianthus annuus"]],
  ["Agrilus cyanescens", "latin exact", ["Agrilus cyanescens"]],
  ["Fringilla coelebs", "latin exact", ["Fringilla coelebs"]],
  ["chevreu", "autocomplétion", ["Capreolus capreolus"]],
  ["tournes", "autocomplétion", ["Helianthus annuus"]],
];

/** Seuil de l'import mensuel : le lot 1 faisait 39/40. */
export const SEUIL = 38;

const sansSousGenre = (nom: string) => nom.replace(/\s*\([^)]*\)/g, "").trim();

export function bonneReponse(r: Pick<Resultat, "scientifique" | "genre">, attendus: string[]): boolean {
  const nom = sansSousGenre(r.scientifique);
  return attendus.some((attendu) => {
    if (attendu.startsWith("genre:")) {
      const genre = attendu.slice(6);
      return nom === genre || sansSousGenre(r.genre) === genre;
    }
    return nom === attendu;
  });
}

/** Source qui lit l'index sur le disque (gardé en mémoire). */
export function sourceDisque(dossier: string): Source {
  const manifeste = JSON.parse(readFileSync(join(dossier, "manifeste.json"), "utf8")) as Manifeste;
  const memoire = new Map<string, string[][]>();
  return {
    manifeste,
    async lire(dico, numero) {
      const chemin = join(dossier, dico, `${String(numero).padStart(4, "0")}${manifeste.extension}`);
      let lignes = memoire.get(chemin);
      if (!lignes) {
        lignes = readFileSync(chemin, "utf8").split("\n").filter(Boolean).map((l) => l.split("\t"));
        memoire.set(chemin, lignes);
      }
      return lignes;
    },
  };
}

/** Fiches lues sur le disque (dossier du paquet), pour classer les espèces comme le serveur. */
export function fichesDisque(dossier: string) {
  const memoire = new Map<string, FichierFiches | undefined>();
  const lire = (nomLatin: string) => {
    const chemin = join(dossier, cheminDuFichier(adresseEspece(nomLatin)).replace("/donnees/fiches/", ""));
    if (!memoire.has(chemin)) {
      try {
        memoire.set(chemin, JSON.parse(readFileSync(chemin, "utf8")) as FichierFiches);
      } catch {
        memoire.set(chemin, undefined);
      }
    }
    return memoire.get(chemin);
  };
  return {
    ficheDe: async (r: Resultat) => {
      const fichier = lire(r.scientifique);
      return fichier ? ficheParIdentifiant(fichier, r.taxon) : undefined;
    },
    especesDuGenre: async (genre: Resultat) => {
      const fichier = lire(`${genre.scientifique} x`);
      return fichier ? fichesDuGenre(fichier, genre.scientifique) : [];
    },
  };
}

/**
 * Évalue le moteur seul (comme le lot 1), ou, avec `fiches`, les espèces proposées par le site
 * (correction « Tu voulais dire », classement par observations).
 */
export async function evaluer(source: Source, cas: [string, string, string[]][], details = false, fiches?: ReturnType<typeof fichesDisque>) {
  let reussis = 0;
  let premiers = 0;
  const echecs: string[] = [];
  for (const [texte, categorie, attendus] of cas) {
    const resultats: Resultat[] = fiches
      ? (await chercherEspeces(source, texte, "fr", fiches.ficheDe, 5, 60, fiches.especesDuGenre)).especes.map((e) => e.resultat)
      : await rechercher(source, texte, "fr", 5);
    const rang = resultats.findIndex((r) => bonneReponse(r, attendus)) + 1;
    if (rang) reussis++;
    if (rang === 1) premiers++;
    const ligne = `${rang ? "✅" : "❌"} « ${texte} » (${categorie}) : ${rang || "—"} — ${resultats.map((r) => `${r.scientifique} « ${r.nomTrouve} »`).slice(0, 3).join(" · ")}`;
    if (!rang) echecs.push(ligne);
    if (details || !rang) console.log(ligne);
  }
  return { reussis, total: cas.length, premiers, echecs };
}

if (import.meta.main) {
  const dossier = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "public/donnees/recherche";
  const details = process.argv.includes("--details");
  const source = sourceDisque(dossier);
  const lot1 = await evaluer(source, CAS_LOT_1, details);
  console.log(`\nJeu du lot 1 : ${lot1.reussis}/${lot1.total} dans les 5 premiers, ${lot1.premiers} en premier (seuil : ${SEUIL}).`);
  const imprevus = await evaluer(source, CAS_IMPREVUS, details);
  console.log(`Recherches imprévues : ${imprevus.reussis}/${imprevus.total} dans les 5 premiers, ${imprevus.premiers} en premier.`);
  const dossierFiches = join(dossier, "..", "fiches");
  const fiches = fichesDisque(dossierFiches);
  const especes = await evaluer(source, [...CAS_LOT_1, ...CAS_IMPREVUS], details, fiches);
  console.log(`Espèces proposées par le site (suggestions, page de résultats) : ${especes.reussis}/${especes.total} dans les 5 premières, ${especes.premiers} en première.`);
  if (lot1.reussis < SEUIL) {
    console.error(`La qualité de la recherche a baissé : ${lot1.reussis}/${lot1.total}, sous le seuil de ${SEUIL}.`);
    process.exit(1);
  }
}
