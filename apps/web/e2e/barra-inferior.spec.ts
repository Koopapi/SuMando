// Criterios de la spec 002 (ajuste del 12 de noviembre de 2026): navegación en teléfono con barra inferior.
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { OWNER, expectNoHorizontalOverflow, login, logout, openAccountMenu, seedAdmin, seedBusiness, seedCatalog, seedOwner } from "./helpers";

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

  // La spec 014 (RF-6) cambia la barra a lo del día a día.
  await test.step("RF-45 la barra tiene Inicio, Inventario, Requisiciones, Checklists y «Más», con icono y nombre", async () => {
    await expect(bar(page).getByRole("link")).toHaveText(["Inicio", "Inventario", "Requisiciones", "Checklists"]);
    await expect(bar(page).getByRole("button", { name: "Más" })).toBeVisible();
    for (const item of await bar(page).locator("a, button").all()) await expect(item.locator("svg")).toHaveCount(1);
  });

  await test.step("RF-47 la barra marca la pantalla actual", async () => {
    await expect(bar(page).getByRole("link", { name: "Inicio" })).toHaveAttribute("aria-current", "page");
    await bar(page).getByRole("link", { name: "Inventario" }).click();
    await expect(page).toHaveURL(/\/inventario$/);
    await expect(bar(page).getByRole("link", { name: "Inventario" })).toHaveAttribute("aria-current", "page");
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
    // Spec 014 (RF-7): lo que no está en la barra, por categorías, y la cuenta al pie.
    await expect(sheet.getByRole("heading")).toHaveText(["General", "Operación del día", "Compras e inventario", "Cocina", "Equipo", "Administración"]);
    await expect(sheet.getByRole("link")).toHaveText(["Tablero", "Corte de caja", "Productos", "Proveedores", "Almacenes y áreas", "Recetas", "Insumos", "Personal", "Nómina", "Negocios", "Personas"]);
    await openAccountMenu(page);
    await expect(sheet.getByRole("link", { name: "Cambiar contraseña" })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
    await sheet.getByRole("link", { name: "Personas" }).click();
    await expect(page).toHaveURL(/\/personas$/);
    await expect(sheet).toBeHidden();
  });

  await test.step("RF-47 en una pantalla de «Más», la barra marca «Más»", async () => {
    await expect(bar(page).getByRole("button", { name: "Más" })).toHaveAttribute("aria-current", "page");
    await expect(bar(page).getByRole("link", { name: "Inventario" })).not.toHaveAttribute("aria-current", "page");
  });

  await test.step("RF-46 un administrador ve en «Más» solo lo que tiene permitido", async () => {
    await logout(page);
    await login(page, "encargado@mando.test", "encargado-123");
    await page.goto("/");
    await bar(page).getByRole("button", { name: "Más" }).click();
    const sheet = page.getByRole("dialog", { name: "Más" });
    await expect(sheet.getByRole("link")).toHaveText(["Tablero", "Corte de caja", "Productos", "Proveedores", "Almacenes y áreas", "Recetas", "Insumos", "Personal", "Nómina"]);
    await expect(sheet.getByRole("heading", { name: "Administración" })).toHaveCount(0);
    await openAccountMenu(page);
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
