// Listes d'un groupe et page des espèces menacées (lot 7, QUE-33) : choix, adresses et puces.
import { describe, expect, it } from "vitest";
import {
  adresseGroupe,
  adresseListe,
  cleRegion,
  dossierDuLieu,
  groupeDeLAdresse,
  lireChoixListe,
  pucesGroupesMenacees,
  pucesLieuListe,
  pucesStatutListe,
  totalDeLaListe,
  type ChoixListe,
} from "../../src/lib/listes/liste.ts";
import { MONDE, type Lieu } from "../../src/lib/recherche/lieux.ts";

const SUISSE: Lieu = { type: "pays", code: "CH" };
const EUROPE: Lieu = { type: "continent", code: "EUROPE" };
const BASE = "/fr/groupe/oiseaux";
const choix = (c: Partial<ChoixListe> = {}): ChoixListe => ({ lieu: SUISSE, groupe: "oiseaux", menacees: false, tri: "observees", nombre: 8, ...c });

describe("adresses des groupes", () => {
  it("traduit l'adresse de chaque groupe, et retrouve le groupe", () => {
    expect(adresseGroupe("oiseaux", "fr")).toBe("oiseaux");
    expect(adresseGroupe("oiseaux", "en")).toBe("birds");
    expect(adresseGroupe("araignees", "fr")).toBe("araignees");
    expect(groupeDeLAdresse("fougeres", "fr")).toBe("fougeres");
    expect(groupeDeLAdresse("fungi", "en")).toBe("champignons");
    expect(groupeDeLAdresse("birds", "fr")).toBeUndefined();
  });

  it("range chaque lieu dans son dossier", () => {
    expect(dossierDuLieu(SUISSE)).toBe("/donnees/listes/pays/ch");
    expect(dossierDuLieu(EUROPE)).toBe("/donnees/listes/continents/europe");
    expect(dossierDuLieu(MONDE)).toBe("/donnees/listes/monde");
    expect([SUISSE, EUROPE, MONDE].map(cleRegion)).toEqual(["pays/ch", "continents/europe", "monde"]);
  });
});

describe("choix de la liste", () => {
  it("propose le lieu du visiteur, sauf si l'adresse en donne un (« monde » compris)", () => {
    expect(lireChoixListe(new URLSearchParams(""), "groupe", "oiseaux", SUISSE)).toEqual(choix());
    expect(lireChoixListe(new URLSearchParams("lieu=monde"), "groupe", "oiseaux", SUISSE).lieu).toEqual(MONDE);
    expect(lireChoixListe(new URLSearchParams("lieu=europe&statut=menacees&tri=menacees&n=32"), "groupe", "oiseaux", SUISSE)).toEqual(
      choix({ lieu: EUROPE, menacees: true, tri: "menacees", nombre: 32 }),
    );
  });

  it("la page des menacées : toujours les menacées, un groupe au choix, les plus menacées d'abord", () => {
    const c = lireChoixListe(new URLSearchParams("groupe=dragons&statut=toutes"), "menacees", "", MONDE);
    expect(c).toEqual({ lieu: MONDE, groupe: "", menacees: true, tri: "menacees", nombre: 8 });
    expect(lireChoixListe(new URLSearchParams("groupe=arbres"), "menacees", "", MONDE).groupe).toBe("arbres");
  });

  it("écrit l'adresse sans les choix par défaut ni le lieu proposé", () => {
    expect(adresseListe(BASE, "groupe", choix(), SUISSE)).toBe(BASE);
    expect(adresseListe(BASE, "groupe", choix({ lieu: MONDE, menacees: true, tri: "menacees", nombre: 32 }), SUISSE)).toBe(
      `${BASE}?lieu=monde&statut=menacees&tri=menacees&n=32`,
    );
    expect(adresseListe("/fr/especes-menacees", "menacees", choix({ lieu: EUROPE, groupe: "arbres", menacees: true, tri: "menacees" }), MONDE)).toBe(
      "/fr/especes-menacees?lieu=EUROPE&groupe=arbres",
    );
  });
});

describe("puces", () => {
  it("lieu : le pays et le continent du visiteur, puis le monde ; un lieu partagé s'ajoute", () => {
    const puces = pucesLieuListe("groupe", choix(), [SUISSE, EUROPE], BASE, SUISSE, "fr");
    expect(puces.map((p) => [p.libelle, p.actif, p.lien])).toEqual([
      ["Suisse", true, BASE],
      ["Europe", false, `${BASE}?lieu=EUROPE`],
      ["Monde", false, `${BASE}?lieu=monde`],
    ]);
    const partage = pucesLieuListe("groupe", choix({ lieu: { type: "pays", code: "JP" } }), [SUISSE, EUROPE], BASE, SUISSE, "fr");
    expect(partage.map((p) => p.libelle)).toEqual(["Suisse", "Europe", "Monde", "Japon"]);
  });

  it("statut : changer garde le lieu et revient aux premières cartes", () => {
    const [toutes, menacees] = pucesStatutListe(choix({ lieu: EUROPE, nombre: 32 }), BASE, SUISSE, "en");
    expect(toutes).toEqual({ libelle: "All", lien: `${BASE}?lieu=EUROPE`, actif: true });
    expect(menacees?.lien).toBe(`${BASE}?lieu=EUROPE&statut=menacees`);
  });

  const resume = {
    especes: 100,
    menacees: 12,
    groupes: { oiseaux: { especes: 40, menacees: 5 }, insectes: { especes: 60, menacees: 0 }, mammiferes: { especes: 9, menacees: 7 } },
  };

  it("groupes des menacées : ceux qui en ont, dans l'ordre du site", () => {
    const puces = pucesGroupesMenacees(resume, choix({ groupe: "", menacees: true, tri: "menacees", lieu: MONDE }), "/fr/especes-menacees", MONDE, "fr");
    expect(puces.map((p) => [p.libelle, p.actif])).toEqual([
      ["Tous les groupes", true],
      ["Mammifères", false],
      ["Oiseaux", false],
    ]);
  });

  it("compte les espèces de la liste dans le lieu", () => {
    expect(totalDeLaListe(resume, choix())).toBe(40);
    expect(totalDeLaListe(resume, choix({ menacees: true }))).toBe(5);
    expect(totalDeLaListe(resume, choix({ groupe: "", menacees: true }))).toBe(12);
  });
});
