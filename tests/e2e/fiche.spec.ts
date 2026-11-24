// Fiche espèce (lot 4, QUE-22), sur les données d'exemple (tests/fixtures/donnees, installées par
// `npm run donnees:installer -- --exemple`) ou sur le paquet complet en local. Le résumé
// Wikipédia n'est pas vérifié : il dépend du réseau, et la fiche s'affiche sans lui.
import { expect, test } from "@playwright/test";

test("fiche du chêne pédonculé en français", async ({ page }) => {
  const reponse = await page.goto("/fr/espece/quercus-robur");
  expect(reponse?.status()).toBe(200);
  await expect(page).toHaveTitle("Chêne pédonculé — Nomen Nature");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Chêne pédonculé");
  await expect(page.getByText("Quercus robur", { exact: true })).toBeVisible();
  await expect(page.getByText("LC · Préoccupation mineure").first()).toBeVisible();
  await expect(page.getByText("EN · English oak")).toBeVisible();
  await expect(page.getByText("Cette espèce peut vivre jusqu'à 929 ans.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Où le trouver ?" })).toBeVisible();
  await expect(page.getByText("Europe", { exact: true })).toBeVisible();
  const proches = page.getByRole("region", { name: "Espèces proches" }).getByRole("link");
  await expect(proches).toHaveCount(4);
  await expect(proches.first()).toHaveAttribute("href", /^\/fr\/espece\/quercus-/);
});

test("fiche du chêne pédonculé en anglais, avec les liens vers l'autre langue", async ({ page }) => {
  await page.goto("/en/species/quercus-robur");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("English oak");
  await expect(page.getByText("FR · Chêne pédonculé")).toBeVisible();
  await expect(page.getByText("This species can live up to 929 years.")).toBeVisible();
  await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveAttribute("href", "https://nomenature.org/fr/espece/quercus-robur");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://nomenature.org/en/species/quercus-robur");
});

test("une espèce sans nom courant a son nom latin en titre", async ({ page }) => {
  await page.goto("/fr/espece/agrilus-obscuricollis");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Agrilus obscuricollis");
  await expect(page.getByText("NE · Non évaluée").first()).toBeVisible();
  await expect(page).toHaveTitle("Agrilus obscuricollis — Nomen Nature");
});

test("une espèce inconnue donne la page introuvable, code 404", async ({ request, page }) => {
  expect((await request.get("/fr/espece/quercus-inexistant")).status()).toBe(404);
  expect((await request.get("/en/species/pas-une-espece")).status()).toBe(404);
  await page.goto("/fr/espece/quercus-inexistant");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ce sentier ne mène nulle part");
});

test("une adresse avec des majuscules redirige vers l'adresse en minuscules", async ({ request }) => {
  const reponse = await request.get("/fr/espece/Quercus-Robur", { maxRedirects: 0 });
  expect(reponse.status()).toBe(301);
  expect(reponse.headers()["location"]).toBe("/fr/espece/quercus-robur");
});
