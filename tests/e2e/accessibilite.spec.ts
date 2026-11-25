// Audit d'accessibilité automatique (axe-core) : aucune violation WCAG 2.2 A et AA tolérée.
// Chaque page est contrôlée sur ordinateur et sur téléphone (voir playwright.config.ts).
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const pages = [
  { nom: "accueil (fr)", chemin: "/fr" },
  { nom: "accueil (en)", chemin: "/en" },
  { nom: "design system", chemin: "/design-system" },
  { nom: "introuvable (fr)", chemin: "/fr/page-inconnue" },
  { nom: "introuvable (en)", chemin: "/en/unknown-page" },
  { nom: "fiche espèce (fr)", chemin: "/fr/espece/quercus-robur" },
  { nom: "fiche espèce (en)", chemin: "/en/species/quercus-robur" },
  { nom: "fiche courte (fr)", chemin: "/fr/espece/agrilus-obscuricollis" },
  { nom: "fiche courte (en)", chemin: "/en/species/agrilus-cyanescens" },
  { nom: "continent (fr)", chemin: "/fr/continent/europe" },
  { nom: "continent (en)", chemin: "/en/continent/north-america" },
];

async function auditer(page: Page) {
  const resultat = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  // Message lisible en cas d'échec : règle, gravité et éléments fautifs.
  const resume = resultat.violations.map(
    (v) => `${v.id} (${v.impact}) : ${v.help}\n  ${v.nodes.map((n) => n.target.join(" ")).join("\n  ")}`,
  );
  expect(resume, resume.join("\n\n")).toEqual([]);
}

for (const { nom, chemin } of pages) {
  test(`page ${nom} : aucune violation axe`, async ({ page }) => {
    await page.goto(chemin);
    await auditer(page);
  });
}

test("menu sur téléphone ouvert : aucune violation axe", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "telephone", "Le menu plein écran n'existe que sur téléphone.");
  for (const [chemin, ouvrir] of [["/fr", "Ouvrir le menu"], ["/en", "Open menu"]] as const) {
    await page.goto(chemin);
    await page.getByRole("button", { name: ouvrir }).click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
    await auditer(page);
  }
});

test("menu sur téléphone : Échap ferme et rend le focus au bouton", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "telephone", "Le menu plein écran n'existe que sur téléphone.");
  await page.goto("/fr");
  const bouton = page.getByRole("button", { name: "Ouvrir le menu" });
  await bouton.click();
  await expect(bouton).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeHidden();
  await expect(bouton).toBeFocused();
  await expect(bouton).toHaveAttribute("aria-expanded", "false");
});

test("le lien d'évitement est le premier élément atteint au clavier", async ({ page }) => {
  await page.goto("/fr");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Aller au contenu" })).toBeFocused();
});
