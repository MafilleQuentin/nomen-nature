// Carte interactive (lot 6, QUE-29) : carte du monde sur l'accueil, pages des continents, zoom.
import { expect, test } from "@playwright/test";

test.describe("sans JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("la carte du monde mène à chaque continent", async ({ page }) => {
    await page.goto("/fr");
    const carte = page.getByRole("group", { name: "Carte du monde : choisis un continent" });
    for (const [nom, adresse] of [
      ["Europe", "/fr/continent/europe"],
      ["Afrique", "/fr/continent/afrique"],
      ["Amérique du Nord", "/fr/continent/amerique-du-nord"],
      ["Antarctique", "/fr/continent/antarctique"],
    ] as const) {
      await expect(carte.getByRole("link", { name: nom, exact: true })).toHaveAttribute("href", adresse);
    }
    // Au clavier : le centre de la zone de l'Europe tombe en mer (pas de clic possible là).
    await carte.getByRole("link", { name: "Europe", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/fr\/continent\/europe$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Europe");
  });

  test("la page d'un continent : fil d'Ariane, carte, pays nommés, sans boutons de zoom", async ({ page }, testInfo) => {
    await page.goto("/fr/continent/europe");
    // Le fil d'Ariane n'est que sur ordinateur (maquette téléphone : pas de fil).
    if (testInfo.project.name === "ordinateur") {
      const fil = page.getByRole("navigation", { name: "Fil d'Ariane" });
      await expect(fil.getByRole("link", { name: "Monde" })).toHaveAttribute("href", "/fr");
    }
    await expect(page.getByText("Continent · 52°N 15°E")).toBeVisible();
    await expect(page.getByRole("group", { name: "Carte : Europe et ses pays" })).toBeVisible();
    await expect(page.locator("text.etiquette", { hasText: "FRANCE" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Zoomer", exact: true })).toBeHidden();
  });

  test("panneau du continent : chiffres, pays, onglets et espèces (données d'exemple)", async ({ page }) => {
    await page.goto("/fr/continent/europe");
    const panneau = page.getByRole("region", { name: "Europe" });
    await expect(panneau.getByText("Espèces observées")).toBeVisible();
    await expect(panneau.getByRole("list", { name: "Espèces les mieux documentées" }).getByRole("link")).toHaveCount(5);
    await panneau.getByRole("navigation", { name: "Liste des espèces" }).getByRole("link", { name: "Menacées" }).click();
    await expect(page).toHaveURL(/\?onglet=menacees$/);
    await expect(page.getByRole("list", { name: "Espèces menacées" }).getByRole("link").first()).toContainText("CR");
  });

  test("choisir un pays sur la carte mène à sa page (lot 7) ; l'ancienne adresse y est redirigée", async ({ page }) => {
    await page.goto("/fr/continent/europe?onglet=menacees");
    // Au clavier : le lien de la Suisse sur la carte.
    await page.getByRole("link", { name: "Suisse : voir ses espèces" }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/fr\/pays\/suisse$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Suisse");
    await page.goto("/fr/continent/europe?pays=ch&onglet=menacees");
    await expect(page).toHaveURL(/\/fr\/pays\/suisse$/);
  });

  test("un continent inconnu répond 404", async ({ page }) => {
    const reponse = await page.goto("/fr/continent/atlantide");
    expect(reponse?.status()).toBe(404);
  });

  test("en anglais, avec les adresses traduites", async ({ page }) => {
    await page.goto("/en/continent/north-america");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("North America");
    await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveAttribute("href", /\/fr\/continent\/amerique-du-nord$/);
  });
});

test("zoom au clavier et aux boutons, étiquettes à taille fixe", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "ordinateur", "Sur téléphone, on zoome en pinçant (pas de boutons).");
  await page.goto("/fr/continent/europe");
  const contenu = page.locator(".carte__contenu");
  const france = page.locator("text.etiquette", { hasText: "FRANCE" });
  const hauteurAvant = (await france.boundingBox())?.height ?? 0;
  await page.getByRole("button", { name: "Zoomer", exact: true }).click();
  await expect(contenu).toHaveAttribute("transform", /scale\(2\)/);
  const hauteurApres = (await france.boundingBox())?.height ?? 0;
  expect(Math.abs(hauteurApres - hauteurAvant)).toBeLessThan(2);
  await page.keyboard.press("-");
  await expect(contenu).toHaveAttribute("transform", /scale\(1\)/);
});

test("courbes de niveau sur la carte du monde et d'un continent, sous les noms et sans gêner les clics", async ({ page }) => {
  await page.goto("/fr");
  const courbesMonde = page.locator(".carte .courbes path.courbe");
  expect(await courbesMonde.count()).toBeGreaterThan(8);
  await expect(page.locator(".carte .courbes")).toHaveCSS("pointer-events", "none");
  await page.goto("/fr/continent/europe");
  expect(await page.locator(".carte .courbes path.courbe").count()).toBeGreaterThan(4);
  await expect(page.getByText("Les courbes serrées montrent où la vie est la plus riche", { exact: false })).toBeVisible();
});
