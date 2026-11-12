// Spec 002: nombre SuMando, logo y modo claro y oscuro según el equipo (entrega 1).
import { expect, test } from "./fixtures";
import { OWNER, login, seedOwner } from "./helpers";

const WRONG = /(?<!Su)Mando\b|\bSumando\b|\bSUMANDO\b/;
const PAGE_BG = { light: "rgb(245, 246, 250)", dark: "rgb(14, 17, 32)" };
const INK = { light: "rgb(21, 26, 46)", dark: "rgb(231, 233, 244)" };

const bodyColors = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const s = getComputedStyle(document.body);
    return { bg: s.backgroundColor, ink: s.color };
  });

test("nombre, logo y modo", async ({ page }) => {
  await seedOwner();

  await test.step("RF-1 la entrada, sin conexión y no encontrada muestran SuMando con su logo y en el título", async () => {
    for (const url of ["/login", "/offline", "/no-existe"]) {
      await page.goto(url);
      await expect(page.getByTestId("brand").getByLabel("SuMando")).toBeVisible();
      await expect(page).toHaveTitle(/SuMando/);
    }
  });

  await test.step("RF-3 ninguna pantalla escribe el nombre de otra forma", async () => {
    for (const url of ["/login", "/offline", "/no-existe"]) {
      await page.goto(url);
      expect(await page.locator("body").innerText()).not.toMatch(WRONG);
      expect(await page.title()).not.toMatch(WRONG);
    }
  });

  await test.step("RF-2 el teléfono instala SuMando con el icono de la perilla", async () => {
    await page.goto("/login");
    const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
    expect((await page.request.get(apple!)).status()).toBe(200);
    const manifest = await (await page.request.get((await page.locator('link[rel="manifest"]').getAttribute("href"))!)).json();
    expect(manifest.name).toBe("SuMando");
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
  });

  await test.step("RF-5 sin preferencia o en modo claro la app se ve clara", async () => {
    await page.emulateMedia({ colorScheme: "no-preference" });
    await page.goto("/login");
    expect(await bodyColors(page)).toEqual({ bg: PAGE_BG.light, ink: INK.light });
    await page.emulateMedia({ colorScheme: "light" });
    expect(await bodyColors(page)).toEqual({ bg: PAGE_BG.light, ink: INK.light });
  });

  await test.step("RF-4 en modo oscuro todas las pantallas se ven oscuras", async () => {
    await page.emulateMedia({ colorScheme: "dark" });
    for (const url of ["/login", "/offline", "/no-existe"]) {
      await page.goto(url);
      expect(await bodyColors(page)).toEqual({ bg: PAGE_BG.dark, ink: INK.dark });
    }
    await login(page, OWNER.email, OWNER.password);
    await expect(page.locator("header").getByLabel("SuMando")).toBeVisible();
    expect(await bodyColors(page)).toEqual({ bg: PAGE_BG.dark, ink: INK.dark });
  });

  await test.step("RF-6 cambiar el modo con la app abierta no recarga ni borra lo capturado", async () => {
    await page.context().clearCookies();
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/login");
    await page.evaluate(() => ((window as unknown as { sinRecargar: boolean }).sinRecargar = true));
    await page.getByLabel("Correo").fill("alguien@ejemplo.mx");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(() => bodyColors(page)).toEqual({ bg: PAGE_BG.dark, ink: INK.dark });
    await expect(page.getByLabel("Correo")).toHaveValue("alguien@ejemplo.mx");
    expect(await page.evaluate(() => (window as unknown as { sinRecargar?: boolean }).sinRecargar)).toBe(true);
  });

  await test.step("RF-7 la barra del navegador toma el color de cada modo", async () => {
    const metas = await page.locator('meta[name="theme-color"]').evaluateAll((els) => els.map((e) => [e.getAttribute("media"), e.getAttribute("content")]));
    expect(metas).toEqual([
      ["(prefers-color-scheme: light)", "#F5F6FA"],
      ["(prefers-color-scheme: dark)", "#0E1120"],
    ]);
  });
});
