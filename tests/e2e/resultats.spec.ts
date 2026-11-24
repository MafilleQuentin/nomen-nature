// Page de résultats de la recherche (lot 5, QUE-28), sur les données d'exemple (petit index :
// chêne pédonculé, deux agriles). Rendue par le serveur : tout doit marcher sans JavaScript.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function sansViolationAxe(page: Page) {
  const resultat = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const resume = resultat.violations.map((v) => `${v.id} : ${v.help}\n  ${v.nodes.map((n) => n.target.join(" ")).join("\n  ")}`);
  expect(resume, resume.join("\n\n")).toEqual([]);
}

test.describe("sans JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("le formulaire de la barre mène aux résultats, liens vers les fiches", async ({ page }) => {
    await page.goto("/fr/page-inconnue");
    const champ = page.getByRole("searchbox", { name: "Chercher une espèce" }).filter({ visible: true });
    await champ.fill("agrilus");
    await champ.press("Enter");
    await expect(page).toHaveURL(/\/fr\/recherche\?q=agrilus$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("2 espèces pour « agrilus »");
    const liste = page.getByRole("list", { name: "Espèces trouvées" });
    await expect(liste.getByRole("link")).toHaveCount(2);
    await expect(liste.getByRole("link").first()).toContainText("Agrile bleuâtre");
    await expect(liste.getByRole("link").first()).toContainText("Insectes · 5 366 observations");
    // Le texte cherché est remis dans les deux barres (grande et compacte, une seule visible).
    const champs = page.locator('input[name="q"]');
    await expect(champs).toHaveCount(2);
    for (const champ of await champs.all()) await expect(champ).toHaveValue("agrilus");
  });

  test("les filtres sont des liens : statut, puis retour à toutes les espèces", async ({ page }) => {
    await page.goto("/fr/recherche?q=agrilus");
    const filtres = page.getByRole("navigation", { name: "Filtres" });
    await expect(filtres.getByRole("link", { name: "Tous" })).toHaveAttribute("aria-current", "true");
    await expect(filtres.getByRole("link", { name: "Insectes" })).toBeVisible();
    await filtres.getByRole("link", { name: "Menacées seulement" }).click();
    await expect(page).toHaveURL(/statut=menacees/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Aucune espèce pour « agrilus » avec ces filtres");
    await page.getByRole("link", { name: "Retirer les filtres" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("2 espèces pour « agrilus »");
  });

  test("un groupe choisi garde le statut, et l'inverse", async ({ page }) => {
    await page.goto("/fr/recherche?q=agrilus&groupe=insectes");
    const filtres = page.getByRole("navigation", { name: "Filtres" });
    await expect(filtres.getByRole("link", { name: "Insectes" })).toHaveAttribute("aria-current", "true");
    await expect(filtres.getByRole("link", { name: "Menacées seulement" })).toHaveAttribute("href", "/fr/recherche?q=agrilus&groupe=insectes&statut=menacees");
  });

  test("aucune espèce : message et bouton « Explorer par groupe »", async ({ page }) => {
    await page.goto("/fr/recherche?q=xqzwvk");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Aucune espèce trouvée");
    await expect(page.getByText("Rien pour « xqzwvk ».")).toBeVisible();
    await expect(page.getByRole("link", { name: "Explorer par groupe" })).toHaveAttribute("href", "/fr");
  });

  test("texte trop court : conseil, sans recherche", async ({ page }) => {
    await page.goto("/fr/recherche?q=ch");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Chercher une espèce");
    await expect(page.getByText("Écris au moins 3 lettres")).toBeVisible();
  });

  test("en anglais, avec le changement de langue qui garde la recherche", async ({ page }) => {
    await page.goto("/en/search?q=pedunculate%20oak");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("1 species for “pedunculate oak”");
    await expect(page.getByRole("link", { name: /English oak/ })).toHaveAttribute("href", "/en/species/quercus-robur");
    await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveAttribute("href", /\/fr\/recherche\?q=pedunculate\+oak$/);
  });
});

test("la page n'est jamais indexée et reste 5 minutes dans le navigateur", async ({ page }) => {
  const reponse = await page.goto("/fr/recherche?q=chene");
  expect(reponse?.status()).toBe(200);
  expect(reponse?.headers()["cache-control"]).toBe("public, max-age=300");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
});

test("résultats et filtres : aucune violation axe", async ({ page }) => {
  await page.goto("/fr/recherche?q=agrilus");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await sansViolationAxe(page);
});

test("aucune espèce : aucune violation axe", async ({ page }) => {
  await page.goto("/fr/recherche?q=xqzwvk");
  await sansViolationAxe(page);
});
