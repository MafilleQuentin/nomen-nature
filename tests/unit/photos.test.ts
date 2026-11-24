// Photos des fiches (lot 4, QUE-24) : adresses des vignettes Commons et du relais, licences
// iNaturalist acceptées, nettoyage du champ « auteur » de Commons.
import { describe, expect, it } from "vitest";
import {
  estLargeurCommons,
  licenceInaturalist,
  nomCommons,
  relaisCommons,
  relaisInaturalist,
  sourceInaturalist,
  srcsetCommons,
  texteBrut,
  vignetteCommons,
} from "../../src/lib/especes/photos.ts";

describe("photos Wikimedia Commons", () => {
  it("calcule l'adresse de la vignette WebP (chemin par l'empreinte MD5)", () => {
    expect(vignetteCommons("Paprastasis azuolas.JPG", 500)).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Paprastasis_azuolas.JPG/500px-Paprastasis_azuolas.JPG.webp",
    );
    expect(nomCommons(" Quercus robur.jpg ")).toBe("Quercus_robur.jpg");
  });

  it("relaie par notre serveur, aux tailles standard de Wikimedia seulement", () => {
    expect(relaisCommons("Fulda Buchfinkweibchen (2012).JPG", 330)).toBe("/photos/commons/330/Fulda_Buchfinkweibchen_(2012).JPG");
    expect(estLargeurCommons(500)).toBe(true);
    expect(estLargeurCommons(400)).toBe(false);
  });

  it("ne propose pas de vignette plus large que l'original", () => {
    expect(srcsetCommons("A.jpg", 522)).toBe("/photos/commons/330/A.jpg 330w, /photos/commons/500/A.jpg 500w");
    expect(srcsetCommons("A.jpg", 4000)).toContain("960w");
    expect(srcsetCommons("A.jpg", 4000, 500)).not.toContain("960w");
    expect(srcsetCommons("A.jpg", 200)).toBe("/photos/commons/330/A.jpg 330w");
  });

  it("nettoie le champ auteur (HTML) et le raccourcit", () => {
    expect(texteBrut('<a href="//commons.wikimedia.org/wiki/User:X">Jean&nbsp;Dupont</a> &amp; <span>Marie</span>')).toBe("Jean Dupont & Marie");
    expect(texteBrut("a".repeat(100), 20)).toBe(`${"a".repeat(19)}…`);
  });
});

describe("photos iNaturalist", () => {
  it("accepte les licences libres, refuse « tous droits réservés » et « ND »", () => {
    expect(licenceInaturalist("cc-by-nc")?.nom).toBe("CC BY-NC 4.0");
    expect(licenceInaturalist("CC0")?.lien).toBe("https://creativecommons.org/publicdomain/zero/1.0/");
    expect(licenceInaturalist(null)).toBeUndefined();
    expect(licenceInaturalist("cc-by-nd")).toBeUndefined();
    expect(licenceInaturalist("cc-by-nc-nd")).toBeUndefined();
  });

  it("relaie les photos du seau public d'iNaturalist", () => {
    expect(relaisInaturalist(211669479, "medium", "jpeg")).toBe("/photos/inaturalist/211669479/medium.jpeg");
    expect(sourceInaturalist(211669479, "large", "jpg")).toBe("https://inaturalist-open-data.s3.amazonaws.com/photos/211669479/large.jpg");
  });
});
