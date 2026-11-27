// Page introuvable : vrai code HTTP 404, dans la langue de l'adresse ou, à défaut, du navigateur.
import { expect, test } from "@playwright/test";

const cas = [
  { chemin: "/fr/rien-ici", accepte: "en-GB", langue: "fr", titre: "Ce sentier ne mène nulle part" },
  { chemin: "/en/nothing-here", accepte: "fr-FR", langue: "en", titre: "This trail leads nowhere" },
  { chemin: "/page-inconnue", accepte: "en-US,en;q=0.9", langue: "en", titre: "This trail leads nowhere" },
  { chemin: "/page-inconnue", accepte: "", langue: "fr", titre: "Ce sentier ne mène nulle part" },
  { chemin: "/fr/dossier/sous-dossier/page", accepte: "", langue: "fr", titre: "Ce sentier ne mène nulle part" },
];

// Requêtes HTTP brutes : on maîtrise exactement l'en-tête Accept-Language envoyé
// (le navigateur de test impose le sien, d'après sa « locale »).
for (const { chemin, accepte, langue, titre } of cas) {
  test(`${chemin} (navigateur « ${accepte || "aucun"} ») → 404 en ${langue}`, async ({ request }) => {
    const reponse = await request.get(chemin, { headers: accepte ? { "Accept-Language": accepte } : {} });
    expect(reponse.status()).toBe(404);
    const html = await reponse.text();
    expect(html).toContain(`<html lang="${langue}"`);
    expect(html).toMatch(new RegExp(`<h1[^>]*>${titre}</h1>`));
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(reponse.headers()["set-cookie"]).toBeUndefined();
  });
}

test("la 404 propose la recherche et le retour à la carte", async ({ page }) => {
  await page.goto("/fr/rien-ici");
  const recherche = page.getByRole("search").filter({ visible: true });
  await expect(recherche).toHaveCount(1);
  await expect(recherche).toHaveAttribute("action", "/fr/recherche");
  // Champ de recherche (« combobox » une fois l'îlot de suggestions chargé).
  await expect(recherche.getByLabel("Chercher une espèce")).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Retour à la carte" })).toHaveAttribute("href", "/fr");
});

test("la 404 n'a qu'un seul appel à l'action principal visible", async ({ page }) => {
  await page.goto("/en/nothing-here");
  await expect(page.locator(".bouton--principal").filter({ visible: true })).toHaveCount(1);
});
