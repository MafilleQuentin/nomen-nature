// Tests unitaires (Vitest) : fonctions pures, sans navigateur ni serveur.
// Les tests dans un vrai navigateur sont dans tests/e2e (Playwright).
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
  },
});
