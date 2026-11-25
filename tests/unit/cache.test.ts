// Cache des fiches et image d'aperçu des partages (lot 4, QUE-26).
import { describe, expect, it } from "vitest";
import { cleDeCache, estPageEnCache } from "../../src/lib/cache.ts";
import { apercuCommons, vignetteCommons } from "../../src/lib/especes/photos.ts";

describe("cache des pages", () => {
  it("concerne les fiches espèces et les pages des continents", () => {
    expect(estPageEnCache("/fr/espece/quercus-robur")).toBe(true);
    expect(estPageEnCache("/fr/continent/amerique-du-nord")).toBe(true);
    expect(estPageEnCache("/en/continent/europe")).toBe(true);
    expect(estPageEnCache("/fr/recherche")).toBe(false);
    expect(estPageEnCache("/en/species/morus-alba-4x7qz")).toBe(true);
    expect(estPageEnCache("/fr")).toBe(false);
    expect(estPageEnCache("/fr/espece/quercus-robur/autre")).toBe(false);
    expect(estPageEnCache("/photos/commons/500/A.jpg")).toBe(false);
  });

  it("garde une clé par adresse et par déploiement, sans les paramètres", () => {
    const url = new URL("https://nomenature.org/fr/espece/quercus-robur?utm_source=x");
    expect(cleDeCache(url, "abc-123")).toBe("https://nomenature.org/fr/espece/quercus-robur?version=abc-123");
    expect(cleDeCache(url, "abc-124")).not.toBe(cleDeCache(url, "abc-123"));
  });

  it("garde les choix du panneau de la carte dans la clé, dans un ordre fixe", () => {
    const url = new URL("https://nomenature.org/fr/continent/europe?onglet=menacees&utm=x&pays=CH");
    expect(cleDeCache(url, "v1")).toBe("https://nomenature.org/fr/continent/europe?pays=ch&onglet=menacees&version=v1");
  });
});

describe("image d'aperçu des partages", () => {
  it("demande la vignette dans le format de l'original (pas de WebP)", () => {
    expect(vignetteCommons("Paprastasis azuolas.JPG", 500, "original")).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Paprastasis_azuolas.JPG/500px-Paprastasis_azuolas.JPG",
    );
    expect(apercuCommons("Paprastasis azuolas.JPG", 522)).toBe("/photos/commons/500/Paprastasis_azuolas.JPG?format=original");
    expect(apercuCommons("Grand.png", 4000)).toBe("/photos/commons/960/Grand.png?format=original");
    expect(apercuCommons("Planche.tif", 4000)).toBe("");
  });
});
