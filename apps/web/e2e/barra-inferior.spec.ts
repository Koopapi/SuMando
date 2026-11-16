// Criterios de la spec 002 (ajuste del 12 de noviembre de 2026): navegación en teléfono con barra inferior.
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { OWNER, expectNoHorizontalOverflow, login, logout, seedAdmin, seedBusiness, seedCatalog, seedOwner } from "./helpers";

const bar = (page: Page) => page.getByRole("navigation", { name: "Navegación" });

test("barra inferior en el teléfono", async ({ page }) => {
  await seedOwner();
  const business = await seedBusiness("Pastatti", ["Sendero"]);
  await seedCatalog(business.branches[0].id);
  await seedAdmin("Encargado de prueba", "encargado@mando.test", [business.branches[0].id], "encargado-123");
  await page.setViewportSize({ width: 360, height: 640 });
  await login(page, OWNER.email, OWNER.password);
  await page.goto("/");

  await test.step("RF-16 bajo 1024 px la navegación es una barra fija abajo, sin botón de menú arriba", async () => {
    await expect(bar(page)).toBeVisible();
    await expect(page.getByRole("button", { name: "Abrir el menú" })).toHaveCount(0);
    const box = (await bar(page).boundingBox())!;
    expect(box.y + box.height).toBeCloseTo(640, 0);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    expect((await bar(page).boundingBox())!.y).toBeCloseTo(box.y, 0);
    await expectNoHorizontalOverflow(page);
  });

  await test.step("RF-45 la barra tiene Inicio, Productos, Almacenes, Proveedores y «Más», con icono y nombre", async () => {
    await expect(bar(page).getByRole("link")).toHaveText(["Inicio", "Productos", "Almacenes", "Proveedores"]);
    await expect(bar(page).getByRole("button", { name: "Más" })).toBeVisible();
    for (const item of await bar(page).locator("a, button").all()) await expect(item.locator("svg")).toHaveCount(1);
  });

  await test.step("RF-47 la barra marca la pantalla actual", async () => {
    await expect(bar(page).getByRole("link", { name: "Inicio" })).toHaveAttribute("aria-current", "page");
    await bar(page).getByRole("link", { name: "Productos" }).click();
    await expect(page).toHaveURL(/\/productos$/);
    await expect(bar(page).getByRole("link", { name: "Productos" })).toHaveAttribute("aria-current", "page");
    await expect(bar(page).getByRole("link", { name: "Inicio" })).not.toHaveAttribute("aria-current", "page");
  });

  await test.step("RF-48 la barra no tapa el final de la pantalla", async () => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const barTop = (await bar(page).boundingBox())!.y;
    const mainBottom = await page.getByRole("main").evaluate((m) => m.getBoundingClientRect().bottom);
    expect(mainBottom).toBeLessThanOrEqual(barTop + 0.5);
  });

  await test.step("RF-46 «Más» abre el resto de la navegación (con Negocios y Personas para el dueño) y Cerrar sesión", async () => {
    await bar(page).getByRole("button", { name: "Más" }).click();
    const sheet = page.getByRole("dialog", { name: "Más" });
    // Spec 004 suma Recetas e Insumos a «Más»; la 005, Inventario; la 007, Requisiciones; la 008, Personal; la 009, Nómina; la 010, Checklists; la 011, Corte de caja.
    await expect(sheet.getByRole("link")).toHaveText(["Inventario", "Requisiciones", "Personal", "Nómina", "Checklists", "Corte de caja", "Recetas", "Insumos", "Negocios", "Personas", "Cambiar contraseña"]);
    await expect(sheet.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
    await sheet.getByRole("link", { name: "Personas" }).click();
    await expect(page).toHaveURL(/\/personas$/);
    await expect(sheet).toBeHidden();
  });

  await test.step("RF-47 en una pantalla de «Más», la barra marca «Más»", async () => {
    await expect(bar(page).getByRole("button", { name: "Más" })).toHaveAttribute("aria-current", "page");
    await expect(bar(page).getByRole("link", { name: "Productos" })).not.toHaveAttribute("aria-current", "page");
  });

  await test.step("RF-46 un administrador ve en «Más» solo lo que tiene permitido", async () => {
    await logout(page);
    await login(page, "encargado@mando.test", "encargado-123");
    await page.goto("/");
    await bar(page).getByRole("button", { name: "Más" }).click();
    const sheet = page.getByRole("dialog", { name: "Más" });
    await expect(sheet.getByRole("link")).toHaveText(["Inventario", "Requisiciones", "Personal", "Nómina", "Checklists", "Corte de caja", "Recetas", "Insumos", "Cambiar contraseña"]);
    await expect(sheet.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
  });

  await test.step("RF-17 desde 1024 px no hay barra inferior, solo el menú lateral", async () => {
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 1024, height: 800 });
    await expect(bar(page)).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Más" })).toBeHidden();
    expect((await bar(page).boundingBox())!.x).toBeLessThan(300);
  });
});
