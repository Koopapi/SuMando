// Criterios de la spec 013: datos de compra con máximo, comprador habitual por proveedor, requisición desde mínimos con
// buscador y existencias, aprobada y dividida por comprador, con su lista lista para WhatsApp. En escritorio.
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { OWNER, login, logout, ownerApiAt, seedAdmin, seedBusiness, seedOwner } from "./helpers";
import { BASE } from "./warm";

const ADMIN = { email: "admin.compras@mando.test", password: "admin-compras-1" };

async function world() {
  await seedOwner();
  const pastatti = await seedBusiness("Pastatti", ["Sendero"], "violeta");
  const branchId = pastatti.branches[0].id;
  await seedAdmin("Administrador de compras", ADMIN.email, [branchId], ADMIN.password);
  const call = await ownerApiAt(branchId);
  const { supplier: sams } = await call("/api/suppliers", { name: "Sams" });
  const { supplier: plasticos } = await call("/api/suppliers", { name: "Plásticos" });
  const { product: harina } = await call("/api/products", { name: "Harina", baseUnit: "g", supplierId: sams.id });
  const { presentation: bulto } = await call(`/api/products/${harina.id}/presentations`, { name: "Bulto", factor: "20000" });
  await call(`/api/products/${harina.id}`, { purchasePresentationId: bulto.id }, "PATCH");
  const { product: vasos } = await call("/api/products", { name: "Vasos de 16 onzas", baseUnit: "pz", supplierId: plasticos.id });
  const { warehouse } = await call("/api/warehouses", { name: "Bodega", scope: "branch" });
  await call(`/api/products/${harina.id}/levels`, { warehouseId: warehouse.id, presentationId: bulto.id, min: "2" }, "PUT");
  await call("/api/inventory/movements", { kind: "entry", warehouseId: warehouse.id, lines: [{ productId: harina.id, quantity: "20000" }, { productId: vasos.id, quantity: "40" }] });
  const { position } = await call("/api/positions", { name: "Comprador" });
  await call("/api/employees", { name: "Ana Compras", positionId: position.id, hiredOn: "2026-11-01", phone: "55 1234 5678" });
  await call("/api/employees", { name: "Beto Mandados", positionId: position.id, hiredOn: "2026-11-01" });
  return { branchId };
}

const buyer = (page: Page, name: string) => page.getByTestId("req-buyer").filter({ has: page.getByRole("heading", { name, exact: true }) });

test("requisiciones en el día a día: datos de compra, compradores y lista por WhatsApp", async ({ page }) => {
  const w = await world();
  await page.setViewportSize({ width: 1360, height: 950 });
  let url = "";

  await test.step("RF-33 RF-18 RF-19 RF-22 el dueño completa máximos y mínimos en Datos de compra", async () => {
    await login(page, OWNER.email, OWNER.password);
    await page.request.put(`${BASE}/api/session/branch`, { data: { branchId: w.branchId } });
    await page.goto("/inventario");
    await page.getByRole("link", { name: "Datos de compra" }).click();
    await expect(page.getByRole("heading", { name: "Datos de compra" })).toBeVisible();
    await page.getByLabel("Datos", { exact: true }).selectOption({ label: "Sin máximo" });
    await page.getByLabel("Máximo de Harina").fill("5");
    await page.getByLabel("Mínimo de Vasos de 16 onzas").fill("100");
    await page.getByLabel("Máximo de Vasos de 16 onzas").fill("300");
    await page.getByRole("button", { name: "Guardar 2 cambios" }).click();
    await expect(page.getByText("Se guardaron 2 productos.")).toBeVisible();
    // Con el filtro «Sin máximo» encendido, lo que ya tiene máximo sale de la lista.
    await expect(page.getByLabel("Máximo de Harina")).toHaveCount(0);
    await page.getByRole("button", { name: "Quitar el filtro Sin máximo" }).click();
    await expect(page.getByLabel("Máximo de Harina")).toHaveValue("5");
  });

  await test.step("RF-1 RF-3 a cada proveedor se le asigna su comprador", async () => {
    await page.goto("/proveedores");
    await page.getByLabel("Comprador de Sams en Sendero").selectOption({ label: "Ana Compras" });
    await expect(page.getByLabel("Comprador de Sams en Sendero")).toHaveValue(/.+/);
    await page.getByLabel("Comprador de Plásticos en Sendero").selectOption({ label: "Beto Mandados" });
    await expect(page.getByLabel("Comprador de Plásticos en Sendero")).toHaveValue(/.+/);
    await logout(page);
  });

  await test.step("RF-29 RF-30 RF-31 RF-32 el administrador arma desde mínimos y busca un producto", async () => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto("/requisiciones/nueva");
    await page.getByRole("button", { name: "Agregar", exact: true }).click();
    await expect(page.getByText("Se agregaron 2 productos.")).toBeVisible();
    await expect(page.getByRole("region", { name: "Sams" })).toContainText("Hay 1 Bulto · mínimo 2 · máximo 5");
    await expect(page.getByRole("region", { name: "Plásticos" })).toContainText("Hay 40 pz · mínimo 100 · máximo 300");
    await page.getByRole("button", { name: "Agregar producto" }).click();
    const combo = page.getByRole("group", { name: "Producto 3" }).getByRole("combobox", { name: "Producto" });
    await combo.fill("harin");
    await page.getByRole("option", { name: /Harina/ }).click();
    await expect(combo).toHaveValue("Harina");
    await page.getByRole("group", { name: "Producto 3" }).getByLabel("Cantidad").fill("1");
  });

  await test.step("RF-10 al enviarla se ve quién comprará cada proveedor", async () => {
    await page.getByRole("button", { name: "Enviar", exact: true }).click();
    await expect(page.getByText("Solicitada", { exact: true })).toBeVisible();
    await expect(page.getByText("Lo compra Ana Compras")).toBeVisible();
    url = page.url();
    await logout(page);
  });

  await test.step("RF-4 RF-8 RF-9 aprobada, se divide por comprador", async () => {
    await login(page, OWNER.email, OWNER.password);
    await page.request.put(`${BASE}/api/session/branch`, { data: { branchId: w.branchId } });
    await page.goto(url);
    await page.getByRole("button", { name: "Aprobar" }).click();
    await expect(buyer(page, "Ana Compras")).toContainText("1 proveedor");
    await expect(buyer(page, "Beto Mandados")).toContainText("1 por comprar");
  });

  await test.step("RF-11 RF-12 RF-13 RF-14 cada comprador tiene su lista para WhatsApp", async () => {
    const ana = buyer(page, "Ana Compras").getByRole("link", { name: "Enviar por WhatsApp a Ana Compras" });
    const href = (await ana.getAttribute("href")) ?? "";
    expect(href.startsWith("https://wa.me/525512345678?text=")).toBe(true);
    const text = decodeURIComponent(href.split("text=")[1]);
    expect(text).toContain("*Sams*");
    expect(text).toContain("• Harina: 5 Bulto");
    await expect(buyer(page, "Beto Mandados")).toContainText("no tiene teléfono");
    await expect(buyer(page, "Beto Mandados").getByRole("button", { name: "Copiar mensaje" })).toBeVisible();
  });
});
