// Criterios de la spec 001: instalación como aplicación y página sin conexión (entrega 6).
import { expect, test } from "./fixtures";
import { seedOwner } from "./helpers";

test("instalación y sin conexión", async ({ page, context, browserName }) => {
  await seedOwner();

  await test.step("RF-39 el manifiesto declara nombre, icono y pantalla completa", async () => {
    await page.goto("/login");
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(href).toContain("manifest");
    const manifest = await (await page.request.get(href!)).json();
    expect(manifest).toMatchObject({ name: "SuMando", short_name: "SuMando", display: "standalone", start_url: "/", lang: "es" });
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    for (const icon of manifest.icons) {
      const res = await page.request.get(icon.src);
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"]).toContain("image/png");
    }
    // Spec 002 RF-7: un color por modo (lo detalla e2e/identidad.spec.ts).
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(2);
  });

  await test.step("RF-40 sin conexión, la aplicación muestra su propio aviso con opción de reintentar", async () => {
    test.skip(browserName === "webkit", "El service worker se prueba en Chromium");
    await page.goto("/login");
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await context.setOffline(true);
    await page.goto("/negocios").catch(() => undefined);
    await expect(page.getByRole("heading", { name: "Sin conexión" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Reintentar" })).toBeVisible();
    await context.setOffline(false);
    await page.getByRole("link", { name: "Reintentar" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
