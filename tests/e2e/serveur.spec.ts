// Comportements du serveur hors site de test (construction normale, ENVIRONNEMENT « local »).
import { expect, test } from "@playwright/test";

test("l'erreur volontaire n'existe que sur le site de test", async ({ request }) => {
  const reponse = await request.get("/essai-erreur");
  expect(reponse.status()).toBe(404);
});

test("robots.txt ouvre le site aux moteurs de recherche", async ({ request }) => {
  const reponse = await request.get("/robots.txt");
  expect(reponse.status()).toBe(200);
  expect(await reponse.text()).toBe("User-agent: *\nAllow: /\n");
});

test("les pages publiques ne sont pas marquées « noindex »", async ({ request }) => {
  for (const chemin of ["/fr", "/en"]) {
    expect(await (await request.get(chemin)).text(), chemin).not.toContain('content="noindex"');
  }
});
