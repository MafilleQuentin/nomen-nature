// Pages des pays (lot 7, QUE-32), avec les données d'exemple (Suisse et France).
import { expect, test } from "@playwright/test";

test.describe("sans JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("la page de la Suisse : position, chiffres, carte de situation et espèces menacées d'abord", async ({ page }, testInfo) => {
    const reponse = await page.goto("/fr/pays/suisse");
    expect(reponse?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Suisse");
    await expect(page.getByText(/^Pays · \d+\.\d\d°N \d+\.\d\d°E$/)).toBeVisible();
    const fil = page.getByRole("navigation", { name: "Fil d'Ariane" });
    await expect(fil.getByRole("link", { name: "Europe" })).toHaveAttribute("href", "/fr/continent/europe");
    // Sur téléphone, le fil commence au continent (maquette).
    await expect(fil.getByRole("link", { name: "Monde" })).toBeVisible({ visible: testInfo.project.name === "ordinateur" });
    await expect(page.getByText("Espèces observées")).toBeVisible();
    await expect(page.getByRole("img", { name: "Carte de situation : Suisse et ses voisins" })).toBeVisible();
    await expect(page.locator(".situation text", { hasText: "FRANCE" })).toBeAttached();
    const especes = page.getByRole("list", { name: "Espèces" }).getByRole("link");
    await expect(especes).toHaveCount(8);
    await expect(especes.first()).toContainText("CR");
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  });

  test("groupes, tri et « Afficher plus » sont des liens", async ({ page }) => {
    await page.goto("/fr/pays/suisse");
    await page.getByRole("list", { name: "Groupes" }).getByRole("link", { name: "Oiseaux" }).click();
    await expect(page).toHaveURL(/\/fr\/pays\/suisse\?groupe=oiseaux$/);
    await expect(page.getByRole("list", { name: "Groupes" }).getByRole("link", { name: "Oiseaux" })).toHaveAttribute("aria-current", "true");
    await expect(page.getByRole("list", { name: "Espèces" }).getByRole("link").first()).toContainText("Oiseaux");
    // Le menu de tri marche sans JavaScript (<details>).
    await page.getByText("Tri : menacées d'abord").click();
    await page.getByRole("link", { name: "les plus observées" }).click();
    await expect(page).toHaveURL(/\?groupe=oiseaux&tri=observees$/);
    // Les données d'exemple n'ont que 5 espèces par liste : tous les groupes en donnent 8, puis la suite.
    await page.getByRole("list", { name: "Groupes" }).getByRole("link", { name: "Tous les groupes" }).click();
    await expect(page).toHaveURL(/\/fr\/pays\/suisse\?tri=observees$/);
    await expect(page.getByText(/^8 espèces sur 28\s195 observées$/)).toBeVisible();
    await page.getByRole("link", { name: /^Afficher \d+ espèces? de plus$/ }).click();
    await expect(page).toHaveURL(/\?tri=observees&n=32#especes$/);
    expect(await page.getByRole("list", { name: "Espèces" }).getByRole("link").count()).toBeGreaterThan(8);
    await expect(page.getByRole("link", { name: /^Afficher/ })).toHaveCount(0);
    // Une page avec des choix n'est pas indexée.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  });

  test("en anglais, avec l'adresse traduite", async ({ page }) => {
    await page.goto("/en/country/switzerland");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Switzerland");
    await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveAttribute("href", /\/fr\/pays\/suisse$/);
    await expect(page.getByRole("img", { name: "Location map: Switzerland and its neighbours" })).toBeVisible();
  });

  test("un pays inconnu répond 404", async ({ page }) => {
    expect((await page.goto("/fr/pays/atlantide"))?.status()).toBe(404);
    // Le nom français d'un pays n'est pas une adresse anglaise.
    expect((await page.goto("/en/country/suisse"))?.status()).toBe(404);
  });
});
