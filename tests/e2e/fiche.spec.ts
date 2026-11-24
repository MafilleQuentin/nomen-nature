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

test("fiche courte : nom latin en titre, ce qui manque, lien vers GBIF (QUE-23)", async ({ page }) => {
  await page.goto("/fr/espece/agrilus-obscuricollis");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Agrilus obscuricollis");
  await expect(page).toHaveTitle("Agrilus obscuricollis — Nomen Nature");
  await expect(page.getByText("NE · Non évaluée").first()).toBeVisible();
  await expect(page.getByText("Pas encore de nom français")).toBeVisible();
  await expect(page.getByText("Fiche courte")).toBeVisible();
  // La photo vient d'iNaturalist quand il en a une (réseau) : seul le début de la phrase est sûr.
  await expect(page.getByText(/encore peu documentée dans les bases ouvertes : pas de nom français(, pas de description| ni de description)/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Voir l'espèce sur GBIF/ })).toHaveAttribute("href", /^https:\/\/www\.gbif\.org\/species\//);
  await expect(page.getByText("aire connue")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Du même genre ou de la même famille" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Où le trouver ?" })).toHaveCount(0);
});

test("fiche courte en anglais : seul le nom anglais manque", async ({ page }) => {
  await page.goto("/en/species/agrilus-cyanescens");
  await expect(page.getByText("No English name yet")).toBeVisible();
  await expect(page.getByText("FR · Agrile bleuâtre")).toBeVisible();
  await expect(page.getByText("This species is still poorly documented in open databases: no English name.")).toBeVisible();
});

test("une fiche complète n'a pas l'encadré « Fiche courte »", async ({ page }) => {
  await page.goto("/fr/espece/quercus-robur");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Chêne pédonculé");
  await expect(page.getByText("Fiche courte")).toHaveCount(0);
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

test("le relais de photos refuse ce qui n'est pas une photo connue (QUE-24)", async ({ request }) => {
  for (const chemin of [
    "/photos/commons/123/Quercus_robur.jpg",
    "/photos/commons/500/..%2F..%2Fetc.txt",
    "/photos/inaturalist/abc/medium.jpeg",
    "/photos/inaturalist/12/original.jpeg",
    "/photos/inaturalist/12/medium.exe",
  ]) {
    expect((await request.get(chemin)).status(), chemin).toBe(404);
  }
});

// Ce test interroge Commons (auteur et licence) : il dépend du réseau.
test("la photo du chêne est servie par notre serveur, avec son crédit (QUE-24)", async ({ page }) => {
  await page.goto("/fr/espece/quercus-robur");
  const photo = page.getByRole("img", { name: "Chêne pédonculé (Quercus robur)" });
  await expect(photo).toHaveAttribute("src", /^\/photos\/commons\/500\//);
  const credit = page.locator("figcaption");
  await expect(credit).toContainText("Photo :");
  await expect(credit.getByRole("link", { name: "Wikimedia Commons" })).toHaveAttribute("href", /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
});

