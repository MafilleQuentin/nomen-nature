// Page de résultats (lot 5, QUE-28) : filtres lus dans l'adresse, puces, lignes et titre.
import { describe, expect, it } from "vitest";
import type { EspeceTrouvee } from "../../src/lib/recherche/especes.ts";
import { MONDE } from "../../src/lib/recherche/lieux.ts";
import type { ResumeEspece } from "../../src/lib/recherche/moteur.ts";
import {
  adresseRecherche,
  filtrer,
  ligneResultat,
  lireFiltres,
  pucesGroupes,
  pucesStatut,
  texteObservations,
  titreResultats,
} from "../../src/lib/recherche/resultats.ts";

const espece = (resume: Partial<ResumeEspece>): EspeceTrouvee => ({
  rang: 0,
  fiche: {
    id: "X",
    adresse: "genus-species",
    nom: "Genus species",
    nomFr: "",
    nomEn: "",
    uicn: "LC",
    groupe: "arbres",
    observations: 0,
    genre: "Genus",
    famille: "",
    ...resume,
  },
  resultat: {
    taxon: "X",
    scientifique: "Genus species",
    rang: "species",
    genre: "Genus",
    famille: "",
    nomTrouve: "",
    langue: "fr",
    score: 50,
    raisons: [],
  },
});

const verruqueux = espece({
  id: "A",
  adresse: "betula-pendula",
  nom: "Betula pendula",
  nomFr: "bouleau verruqueux",
  nomEn: "silver birch",
  observations: 312000,
});
const pic = espece({
  id: "B",
  adresse: "dendrocopos-major",
  nom: "Dendrocopos major",
  nomFr: "pic épeiche",
  groupe: "oiseaux",
});
const menace = espece({
  id: "C",
  adresse: "betula-murrayana",
  nom: "Betula murrayana",
  uicn: "EN",
});
const especes = [verruqueux, pic, menace];
const BASE = "/fr/recherche";

describe("filtres de la page de résultats", () => {
  it("lit le groupe et le statut dans l'adresse, et ignore un groupe inconnu", () => {
    expect(lireFiltres(new URLSearchParams("q=x&groupe=arbres&statut=menacees"))).toEqual({ groupe: "arbres", menacees: true, lieu: MONDE });
    expect(lireFiltres(new URLSearchParams("groupe=toString&statut=oui"))).toEqual({ groupe: "", menacees: false, lieu: MONDE });
  });

  it("écrit l'adresse sans les filtres vides", () => {
    expect(adresseRecherche(BASE, "chêne bleu")).toBe("/fr/recherche?q=ch%C3%AAne+bleu");
    expect(adresseRecherche(BASE, "boulot", { groupe: "arbres", menacees: true, lieu: MONDE })).toBe("/fr/recherche?q=boulot&groupe=arbres&statut=menacees");
  });

  it("garde les espèces du groupe choisi et les menacées (CR, EN, VU)", () => {
    expect(filtrer(especes, { groupe: "arbres", menacees: false, lieu: MONDE }).map((e) => e.fiche.id)).toEqual(["A", "C"]);
    expect(filtrer(especes, { groupe: "", menacees: true, lieu: MONDE }).map((e) => e.fiche.id)).toEqual(["C"]);
    expect(filtrer(especes, { groupe: "oiseaux", menacees: true, lieu: MONDE })).toEqual([]);
  });

  it("propose « Tous » et les groupes présents, du plus fourni au moins fourni, en gardant le statut", () => {
    const puces = pucesGroupes(especes, { groupe: "arbres", menacees: true, lieu: MONDE }, BASE, "boulot", "fr");
    expect(puces.map((p) => [p.libelle, p.actif])).toEqual([
      ["Tous", false],
      ["Arbres", true],
      ["Oiseaux", false],
    ]);
    expect(puces[2]?.lien).toBe("/fr/recherche?q=boulot&groupe=oiseaux&statut=menacees");
    expect(puces[0]?.lien).toBe("/fr/recherche?q=boulot&statut=menacees");
  });

  it("garde le groupe choisi même s'il n'a plus d'espèce", () => {
    const puces = pucesGroupes([pic], { groupe: "arbres", menacees: false, lieu: MONDE }, BASE, "x", "fr");
    expect(puces.map((p) => p.libelle)).toEqual(["Tous", "Oiseaux", "Arbres"]);
  });

  it("propose « Toutes » et « Menacées seulement », en gardant le groupe", () => {
    const [toutes, menacees] = pucesStatut({ groupe: "arbres", menacees: false, lieu: MONDE }, "/en/search", "birch", "en");
    expect(toutes).toEqual({
      libelle: "All",
      lien: "/en/search?q=birch&groupe=arbres",
      actif: true,
    });
    expect(menacees).toEqual({
      libelle: "Threatened only",
      lien: "/en/search?q=birch&groupe=arbres&statut=menacees",
      actif: false,
    });
  });
});

describe("lignes et titre", () => {
  it("prépare la ligne d'une espèce dans la langue du site", () => {
    expect(ligneResultat(verruqueux, "fr")).toEqual({
      nom: "Bouleau verruqueux",
      latin: "Betula pendula",
      meta: "Arbres · 312 000 observations",
      uicn: "LC",
      lien: "/fr/espece/betula-pendula",
    });
    expect(ligneResultat(verruqueux, "en").meta).toBe("Trees · 312,000 observations");
    // Sans nom courant : le nom latin ; sans observations : le groupe seul.
    expect(ligneResultat(menace, "fr")).toMatchObject({
      nom: "Betula murrayana",
      meta: "Arbres",
    });
  });

  it("accorde les observations et le titre", () => {
    expect(texteObservations(1, "fr")).toBe("1 observation");
    expect(texteObservations(0, "fr")).toBe("");
    expect(titreResultats(5, "bouleau", "fr")).toBe("5 espèces pour « bouleau »");
    expect(titreResultats(1, "birch", "en")).toBe("1 species for “birch”");
    expect(titreResultats(0, "bouleau", "fr")).toBe("Aucune espèce pour « bouleau » avec ces filtres");
  });
});
