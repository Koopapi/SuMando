// Criterios de la spec 014: pulido visual (menú por áreas y cuenta, filtros en selectores, grupos plegables con
// memoria, renglones compactos, encabezados bajos y logo del negocio), en escritorio y a ancho de teléfono.
import { crc32, deflateSync } from "node:zlib";
import type { Page } from "@playwright/test";
import { xlsx } from "../tests/support/xlsx";
import { expect, test } from "./fixtures";
import { OWNER, login, openAccountMenu, ownerApiAt, seedBusiness, seedEmployee, seedOwner } from "./helpers";
import { BASE } from "./warm";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Un PNG real de 40 × 20 en un color, para subirlo como logo. */
function logoPng(): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, "latin1");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "latin1"), data])) >>> 0, 0);
    return Buffer.concat([head, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(40, 0);
  ihdr.writeUInt32BE(20, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  const raw = Buffer.concat(Array.from({ length: 20 }, () => Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: 40 }, () => [200, 40, 40]).flat())])));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

async function world(page: Page) {
  await seedOwner();
  const pastatti = await seedBusiness("Pastatti", ["Sendero"], "violeta");
  const branchId = pastatti.branches[0].id;
  const call = await ownerApiAt(branchId);
  const { warehouse } = await call("/api/warehouses", { name: "Bodega", scope: "branch" });
  // 60 productos en tres áreas, con mínimo y existencia: la lista arranca con los grupos cerrados (más de 50).
  const areas = ["Barra fría", "Bebidas", "Cocina"];
  const rows = Array.from({ length: 60 }, (_, i) => [areas[i % 3], `Producto ${String(i + 1).padStart(2, "0")}`, i % 2 ? 1 : 10, "PIEZA", null, null, 5]);
  const file = xlsx([{ name: "Inventario por áreas", rows: [["ÁREA", "ARTÍCULO", "CANT", "UNIDAD", "CONVERSIÓN", "PRESENTACIÓN FINAL", "MÍNIMO"], ...rows] }]);
  await login(page, OWNER.email, OWNER.password);
  await page.request.put(`${BASE}/api/session/branch`, { data: { branchId } });
  const res = await page.request.post(`${BASE}/api/inventory/import`, { multipart: { file: { name: "inv.xlsx", mimeType: XLSX, buffer: file }, warehouseId: warehouse.id, confirm: "1" } });
  expect(res.ok()).toBe(true);
  await call("/api/requisitions", { warehouseId: warehouse.id, lines: [{ productId: (await call("/api/products")).products[0].id, quantity: "1" }] });
  await seedEmployee(branchId);
  return { branchId, warehouseId: warehouse.id as string, call };
}

const headerHeight = (page: Page) => page.getByTestId("page-title").evaluate((el) => el.getBoundingClientRect().height);
const firstRowVisible = async (page: Page, height: number) => {
  const row = page.locator("[data-row], [data-group] button").first();
  const box = await row.boundingBox({ timeout: 5000 });
  expect(box).not.toBeNull();
  expect(box!.y + Math.min(box!.height, 30)).toBeLessThanOrEqual(height);
};

test("pulido visual: menú, filtros, grupos, captura, encabezados y logo", async ({ page }) => {
  test.setTimeout(180_000);
  const w = await world(page);
  await page.setViewportSize({ width: 1366, height: 768 });

  await test.step("RF-1 RF-2 RF-3 RF-5 el menú va por áreas de trabajo y marca la pantalla interna", async () => {
    await page.goto("/inventario/datos-de-compra");
    const nav = page.getByRole("navigation", { name: "Navegación" });
    await expect(nav.getByRole("heading")).toHaveText(["Operación del día", "Compras e inventario", "Cocina", "Equipo", "Administración"]);
    await expect(nav.getByRole("link", { name: "Inventario" })).toHaveAttribute("aria-current", "page");
  });

  await test.step("RF-4 contraseña y salida en el menú de la cuenta", async () => {
    const nav = page.getByRole("navigation", { name: "Navegación" });
    await expect(nav.getByRole("link", { name: "Cambiar contraseña" })).toHaveCount(0);
    await openAccountMenu(page);
    await expect(nav.getByRole("link", { name: "Cambiar contraseña" })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
  });

  await test.step("RF-16 RF-15 RF-19 con más de 50 renglones los grupos empiezan cerrados, se abren y se recuerdan", async () => {
    await page.goto(`/inventario?almacen=${w.warehouseId}`);
    const bebidas = page.getByRole("button", { name: "Bebidas 20 renglones" });
    await expect(bebidas).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("[data-row]")).toHaveCount(0);
    await bebidas.click();
    await expect(page.locator("[data-row]")).toHaveCount(20);
    await page.locator("[data-row]").first().getByRole("link").first().click();
    await page.waitForURL(/\/inventario\/historial/);
    await page.goBack();
    await expect(page.getByRole("button", { name: "Bebidas 20 renglones" })).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("button", { name: "Abrir todos" }).click();
    await expect(page.locator("[data-row]")).toHaveCount(60);
  });

  await test.step("RF-8 RF-9 RF-10 RF-11 RF-17 filtros en selectores con etiquetas quitables", async () => {
    await page.getByRole("button", { name: "Cerrar todos" }).click();
    await page.getByLabel("Área", { exact: true }).selectOption({ label: "Cocina" });
    await page.getByLabel("Estado", { exact: true }).selectOption({ label: "Bajo mínimo" });
    await expect(page.getByTestId("table-count")).toHaveText("Mostrando 10 de 60");
    await expect(page.locator("[data-row]")).toHaveCount(10);
    await page.getByRole("button", { name: "Quitar el filtro Bajo mínimo" }).click();
    await expect(page.getByTestId("table-count")).toHaveText("Mostrando 20 de 60");
    await page.getByRole("button", { name: "Limpiar", exact: true }).click();
    await expect(page.getByTestId("table-count")).toHaveText("Mostrando 60 de 60");
  });

  await test.step("RF-23 RF-24 encabezado bajo y primer renglón a la vista en escritorio", async () => {
    for (const url of [`/inventario?almacen=${w.warehouseId}`, "/productos", "/requisiciones", "/inventario/datos-de-compra", "/personal"]) {
      await page.goto(url);
      expect(await headerHeight(page)).toBeLessThanOrEqual(120);
      await firstRowVisible(page, 768);
    }
  });

  await test.step("RF-25 RF-27 RF-29 el dueño sube el logo y se ve en el menú y al elegir sucursal", async () => {
    await page.goto("/negocios");
    await page.getByLabel("Subir logo Pastatti").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: logoPng() });
    await expect(page.getByRole("button", { name: "Quitar logo Pastatti" })).toBeVisible();
    await expect(page.locator("aside [data-business-logo] img")).toHaveCount(1);
    await page.goto("/elegir-sucursal");
    await expect(page.locator("main [data-business-logo]")).toHaveCount(1);
  });

  await test.step("RF-30 sin logo se ve la inicial sobre el color", async () => {
    await page.goto("/negocios");
    await page.getByRole("button", { name: "Quitar logo Pastatti" }).click();
    await expect(page.locator("aside [data-business-initial]")).toHaveText("P");
  });

  await test.step("RF-6 RF-23 RF-20 RF-21 RF-22 en el teléfono: barra diaria, encabezado bajo y 6 renglones de requisición a la vista", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    // Un nombre real largo (como los del inventario de Pirrus) se recorta en la franja y no ensancha la pantalla.
    const last = (await w.call("/api/products")).products.find((p: { name: string }) => p.name === "Producto 60");
    await w.call(`/api/products/${last.id}`, { name: "Producto 60 CLEMENTE JACQUES VINAGRE BLANCO 2 PZAS DE 3.8 L CADA UNA" }, "PATCH");
    await page.goto("/requisiciones/nueva?vista=completa");
    await expect(page.getByRole("navigation", { name: "Navegación" }).getByRole("link")).toHaveText(["Inicio", "Inventario", "Requisiciones", "Checklists"]);
    expect(await headerHeight(page)).toBeLessThanOrEqual(160);
    await page.getByRole("button", { name: "Agregar", exact: true }).click();
    await expect(page.getByText(/Se agregaron/)).toBeVisible();
    const strips = page.locator("[data-capture-row=closed]");
    expect(await strips.count()).toBeGreaterThanOrEqual(6);
    // Seis franjas seguidas caben en el alto de la pantalla (sin desplazar entre la primera y la sexta).
    const first = (await strips.nth(0).boundingBox())!;
    const sixth = (await strips.nth(5).boundingBox())!;
    expect(sixth.y + sixth.height - first.y).toBeLessThanOrEqual(844 - 64 - 120);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const long = strips.filter({ hasText: "CLEMENTE JACQUES" });
    await long.scrollIntoViewIfNeeded();
    const trash = (await long.getByRole("button").last().boundingBox())!;
    expect(trash.x + trash.width).toBeLessThanOrEqual(390);
    await page.evaluate(() => window.scrollTo(0, 0));
    await strips.nth(0).getByRole("button", { name: /^Editar Producto 1/ }).click();
    await expect(page.locator("[data-capture-row=open]")).toHaveCount(1);
    await strips.nth(1).getByRole("button", { name: /^Editar/ }).click();
    await expect(page.locator("[data-capture-row=open]")).toHaveCount(1);
  });
});
