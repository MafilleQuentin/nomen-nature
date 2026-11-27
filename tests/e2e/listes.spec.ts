// Listes d'un groupe et page des espèces menacées (lot 7, QUE-33), avec les données d'exemple
// (monde, Europe, France et Suisse, 5 espèces par liste).
import { expect, test } from "@playwright/test";

test.describe("sans JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("la liste des oiseaux de Suisse : filtres Où et Statut en liens", async ({ page }) => {
    const reponse = await page.goto("/fr/groupe/oiseaux?lieu=CH");
    expect(reponse?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Oiseaux");
    await expect(page.getByRole("navigation", { name: "Fil d'Ariane" }).getByRole("link", { name: "Explorer" })).toHaveAttribute("href", "/fr");
    const ou = page.getByRole("list", { name: "Où" });
    await expect(ou.getByRole("link", { name: "Suisse" })).toHaveAttribute("aria-current", "true");
    await expect(page.getByRole("list", { name: "Espèces" }).getByRole("link").first()).toContainText("Oiseaux");
    await page.getByRole("list", { name: "Statut" }).getByRole("link", { name: "Menacées" }).click();
    await expect(page).toHaveURL(/\?lieu=CH&statut=menacees$|\?statut=menacees$/);
    for (const carte of await page.getByRole("list", { name: "Espèces" }).getByRole("link").all()) await expect(carte).toContainText(/CR|EN|VU/);
    await ou.getByRole("link", { name: "Monde" }).click();
    await expect(page).toHaveURL(/lieu=monde/);
    await expect(page.getByRole("list", { name: "Où" }).getByRole("link", { name: "Monde" })).toHaveAttribute("aria-current", "true");
    // Une page avec des choix n'est pas indexée.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  });

  test("en anglais, avec l'adresse traduite ; un groupe inconnu répond 404", async ({ page }) => {
    await page.goto("/en/group/birds?lieu=monde");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Birds");
    await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveAttribute("href", /\/fr\/groupe\/oiseaux$/);
    expect((await page.goto("/fr/groupe/dragons"))?.status()).toBe(404);
    expect((await page.goto("/en/group/oiseaux"))?.status()).toBe(404);
  });

  test("la page des espèces menacées : les plus menacées d'abord, un groupe au choix", async ({ page }) => {
    await page.goto("/fr/especes-menacees?lieu=monde");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Espèces menacées");
    const especes = page.getByRole("list", { name: "Espèces" }).getByRole("link");
    await expect(especes.first()).toContainText("CR");
    await page.getByRole("list", { name: "Groupe" }).getByRole("link", { name: "Oiseaux" }).click();
    await expect(page).toHaveURL(/\?lieu=monde&groupe=oiseaux$/);
    for (const carte of await especes.all()) await expect(carte).toContainText("Oiseaux");
  });

  test("le menu et le panneau d'un continent mènent aux espèces menacées", async ({ page }, testInfo) => {
    await page.goto("/fr/continent/europe");
    await expect(page.getByRole("link", { name: /^Voir les .+ espèces menacées$/ })).toHaveAttribute("href", "/fr/especes-menacees?lieu=EUROPE");
    if (testInfo.project.name === "ordinateur") {
      await page.getByRole("banner").getByRole("link", { name: "Espèces menacées" }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Espèces menacées");
    }
  });
});
