// Site bilingue : redirection de la racine selon la langue du navigateur, passage d'une
// langue à l'autre, balises de langue alternative (hreflang).
import { expect, test } from "@playwright/test";

test.describe("racine : langue proposée d'après le navigateur, sans cookie", () => {
  const cas = [
    { accepte: "en-US,en;q=0.9", attendu: "/en" },
    { accepte: "en-GB", attendu: "/en" },
    { accepte: "fr-FR,fr;q=0.9,en;q=0.8", attendu: "/fr" },
    { accepte: "de-DE,de;q=0.9,en;q=0.7", attendu: "/en" },
    { accepte: "de-DE", attendu: "/fr" },
    { accepte: "en;q=0.5,fr;q=0.8", attendu: "/fr" },
    { accepte: "fr;q=0,en", attendu: "/en" },
    { accepte: "", attendu: "/fr" },
  ];
  for (const { accepte, attendu } of cas) {
    test(`Accept-Language « ${accepte || "(aucun)"} » → ${attendu}`, async ({ request }) => {
      const reponse = await request.get("/", {
        maxRedirects: 0,
        headers: accepte ? { "Accept-Language": accepte } : {},
      });
      expect(reponse.status()).toBe(302);
      expect(reponse.headers()["location"]).toBe(attendu);
      expect(reponse.headers()["vary"]).toContain("Accept-Language");
      expect(reponse.headers()["set-cookie"]).toBeUndefined();
    });
  }
});

test("les accueils sont servis sans redirection ni barre finale", async ({ request }) => {
  for (const chemin of ["/fr", "/en"]) {
    const reponse = await request.get(chemin, { maxRedirects: 0 });
    expect(reponse.status(), chemin).toBe(200);
  }
});

for (const { langue, autre, cheminAutre } of [
  { langue: "fr", autre: "en", cheminAutre: "/en" },
  { langue: "en", autre: "fr", cheminAutre: "/fr" },
] as const) {
  test(`/${langue} : langue de la page et balises hreflang`, async ({ page }) => {
    await page.goto(`/${langue}`);
    await expect(page.locator("html")).toHaveAttribute("lang", langue);
    const alternatives = page.locator('link[rel="alternate"][hreflang]');
    await expect(alternatives).toHaveCount(3);
    await expect(page.locator(`link[hreflang="${autre}"]`)).toHaveAttribute("href", `https://nomenature.org${cheminAutre}`);
    await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute("href", "https://nomenature.org/");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://nomenature.org/${langue}`);
  });

  test(`/${langue} : le pied de page mène à l'autre langue`, async ({ page }) => {
    await page.goto(`/${langue}`);
    await page.locator(`footer a[lang="${autre}"]`).click();
    await expect(page).toHaveURL(cheminAutre);
    await expect(page.locator("html")).toHaveAttribute("lang", autre);
  });
}

test("menu sur téléphone : choix de la langue", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "telephone", "Le menu plein écran n'existe que sur téléphone.");
  await page.goto("/fr");
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu.getByRole("link", { name: "Français" })).toHaveAttribute("aria-current", "true");
  await menu.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL("/en");
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
});

test("en-tête sur ordinateur : le lien de langue mène à l'autre langue", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "ordinateur", "Le code de langue n'est affiché que sur ordinateur.");
  await page.goto("/fr");
  const lienLangue = page.getByRole("banner").getByRole("link", { name: "FR, English version" });
  await expect(lienLangue).toBeVisible();
  await lienLangue.click();
  await expect(page).toHaveURL("/en");
  await expect(page.getByRole("banner").getByRole("link", { name: "EN, version française" })).toBeVisible();
});
