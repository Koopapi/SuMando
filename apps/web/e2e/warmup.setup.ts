// Visita todas las rutas una vez antes de los proyectos de dispositivo (caché del servidor caliente).
import { test } from "./fixtures";
import { ROUTES } from "./warm";

test("calentar rutas", async ({ page }) => {
  for (const r of ROUTES) {
    await page.goto(r);
    await page.waitForLoadState("networkidle");
  }
});
