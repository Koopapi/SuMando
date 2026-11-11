// Esqueleto (spec 001, T4): la versión compilada responde y se ve en escritorio y en teléfono.
import { expect, test } from "./fixtures";

test("la página de inicio responde", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Mando" })).toBeVisible();
});
