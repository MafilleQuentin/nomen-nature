// Recherche (lot 5, QUE-27) : API des suggestions et liste de suggestions de la barre, sur les
// données d'exemple (petit index : chêne pédonculé, agriles). La barre est sur la page 404 tant
// que l'accueil (lot 7) n'existe pas.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

test("l'API renvoie les espèces prêtes à afficher", async ({ request }) => {
  const reponse = await request.get("/api/recherche?q=chene%20ped&langue=fr");
  expect(reponse.status()).toBe(200);
  const { suggestions } = (await reponse.json()) as { suggestions: { nom: string; lien: string; statut: string }[] };
  expect(suggestions[0]).toMatchObject({ nom: "Chêne pédonculé", lien: "/fr/espece/quercus-robur", statut: "LC" });
  const anglais = (await (await request.get("/api/recherche?q=pedunculate%20oak&langue=en")).json()) as { suggestions: { nom: string; lien: string }[] };
  expect(anglais.suggestions[0]).toMatchObject({ nom: "English oak", lien: "/en/species/quercus-robur" });
});

test("l'API ne cherche pas un texte trop court", async ({ request }) => {
  const reponse = await request.get("/api/recherche?q=ch&langue=fr");
  expect(((await reponse.json()) as { suggestions: unknown[] }).suggestions).toEqual([]);
});

/** La barre visible (ordinateur ou téléphone), une fois l'îlot de suggestions chargé. */
async function barre(page: Page) {
  await page.goto("/fr/page-inconnue");
  const champ = page.getByRole("combobox", { name: "Chercher une espèce" }).filter({ visible: true });
  await expect(champ).toHaveCount(1);
  return champ;
}

test("suggestions au clavier : flèche bas puis Entrée ouvre la fiche", async ({ page }) => {
  const champ = await barre(page);
  await champ.fill("chene ped");
  const option = page.getByRole("option", { name: /Chêne pédonculé/ });
  await expect(option).toBeVisible();
  await expect(champ).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText(/suggestions? :/)).toBeAttached();
  await champ.press("ArrowDown");
  await expect(option).toHaveAttribute("aria-selected", "true");
  await expect(champ).toHaveAttribute("aria-activedescendant", (await option.getAttribute("id")) ?? "");
  await champ.press("Enter");
  await expect(page).toHaveURL(/\/fr\/espece\/quercus-robur$/);
});

test("suggestions : Échap ferme la liste", async ({ page }) => {
  const champ = await barre(page);
  await champ.fill("agrile");
  await expect(page.getByRole("option", { name: /Agrile bleuâtre/ })).toBeVisible();
  await champ.press("Escape");
  await expect(champ).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("option", { name: /Agrile bleuâtre/ })).toBeHidden();
});

test("suggestions ouvertes : aucune violation axe", async ({ page }) => {
  const champ = await barre(page);
  await champ.fill("chene ped");
  await expect(page.getByRole("option", { name: /Chêne pédonculé/ })).toBeVisible();
  const resultat = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const resume = resultat.violations.map((v) => `${v.id} : ${v.help}\n  ${v.nodes.map((n) => n.target.join(" ")).join("\n  ")}`);
  expect(resume, resume.join("\n\n")).toEqual([]);
});
