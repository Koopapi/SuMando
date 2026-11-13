// Criterios de la spec 007: requisiciones (armar, solicitar, aprobar, comprar, recibir y cerrar), en escritorio.
import postgres from "postgres";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { OWNER, login, logout, ownerApiAt, seedAdmin, seedBusiness, seedOwner } from "./helpers";
import { BASE, DB } from "./warm";

const ADMIN = { email: "admin.sendero@mando.test", password: "admin-sendero-1" };

async function world() {
  await seedOwner();
  const pastatti = await seedBusiness("Pastatti", ["Sendero"], "violeta");
  const branchId = pastatti.branches[0].id;
  await seedAdmin("Administrador de Sendero", ADMIN.email, [branchId], ADMIN.password);
  const call = await ownerApiAt(branchId);
  const { supplier: heineken } = await call("/api/suppliers", { name: "Heineken" });
  const { supplier: sams } = await call("/api/suppliers", { name: "Sams" });
  const { product: cerveza } = await call("/api/products", { name: "Cerveza", baseUnit: "pz", supplierId: heineken.id });
  const { presentation: carton } = await call(`/api/products/${cerveza.id}/presentations`, { name: "Cartón", factor: "24" });
  await call(`/api/products/${cerveza.id}`, { purchasePresentationId: carton.id }, "PATCH");
  await call("/api/products", { name: "Leche", baseUnit: "ml", supplierId: sams.id });
  const { warehouse } = await call("/api/warehouses", { name: "Bodega", scope: "branch" });
  await call(`/api/products/${cerveza.id}/levels`, { warehouseId: warehouse.id, presentationId: carton.id, min: "3", max: "6" }, "PUT");
  await call("/api/inventory/movements", { kind: "entry", warehouseId: warehouse.id, lines: [{ productId: cerveza.id, quantity: "30" }] });
  return { branchId, warehouseId: warehouse.id as string, pastattiId: pastatti.id };
}

const group = (page: Page, name: string) => page.getByRole("region", { name, exact: true });

test("requisiciones: desde mínimos, aprobada con cambio, comprada, recibida en parte y cerrada", async ({ page }) => {
  const w = await world();
  await page.setViewportSize({ width: 1360, height: 950 });
  let url = "";

  await test.step("RF-48 RF-14 RF-15 el administrador arma desde lo que está bajo el mínimo", async () => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.getByRole("navigation").getByRole("link", { name: "Requisiciones" }).first().click();
    await page.getByRole("link", { name: "Nueva requisición" }).click();
    await page.getByRole("button", { name: "Agregar", exact: true }).click();
    await expect(page.getByText("Se agregó 1 producto.")).toBeVisible();
    const first = page.getByRole("group", { name: "Producto 1" });
    await expect(first.getByLabel("Producto", { exact: true })).toHaveValue(/.+/);
    await expect(first.getByLabel("Cantidad")).toHaveValue("5");
    await page.getByRole("button", { name: "Agregar producto" }).click();
    const second = page.getByRole("group", { name: "Producto 2" });
    await second.getByLabel("Producto", { exact: true }).selectOption({ label: "Leche" });
    await second.getByLabel("Cantidad").fill("2000");
  });

  await test.step("RF-22 al enviarla queda solicitada", async () => {
    await page.getByRole("button", { name: "Enviar", exact: true }).click();
    await expect(page.getByRole("heading", { name: "REQ-1" })).toBeVisible();
    await expect(page.getByText("Solicitada", { exact: true })).toBeVisible();
    url = page.url();
    await logout(page);
  });

  await test.step("RF-24 RF-25 el dueño ajusta una cantidad y la aprueba", async () => {
    await login(page, OWNER.email, OWNER.password);
    await page.request.put(`${BASE}/api/session/branch`, { data: { branchId: w.branchId } });
    await page.goto(url);
    await page.getByRole("link", { name: "Editar" }).click();
    await page.getByRole("group", { name: "Producto 1" }).getByLabel("Cantidad").fill("4");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await page.getByRole("button", { name: "Aprobar" }).click();
    await expect(page.getByText("Aprobada", { exact: true })).toBeVisible();
    await expect(page.getByTestId("req-history")).toContainText("Editada");
  });

  await test.step("RF-27 RF-29 RF-30 se anota quién compra y se marca comprado con total", async () => {
    const hk = group(page, "Heineken");
    await hk.getByLabel("Quién compra en Heineken").fill("Encargado de compras");
    await hk.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByTestId("req-history")).toContainText("Comprador anotado");
    await group(page, "Heineken").getByRole("button", { name: "Marcar comprado" }).click();
    await page.getByLabel("Total pagado ($)").fill("1,200");
    await page.getByRole("dialog").getByRole("button", { name: "Marcar comprado" }).click();
    await expect(group(page, "Heineken")).toContainText("Comprado");
    await expect(group(page, "Heineken")).toContainText("$1,200.00");
  });

  await test.step("RF-34 RF-35 RF-38 se recibe en parte y lo demás queda pendiente", async () => {
    await group(page, "Heineken").getByRole("button", { name: "Recibir" }).click();
    await page.getByLabel("Llegó de Cerveza").fill("3");
    await page.getByRole("button", { name: "Guardar recepción" }).click();
    await expect(group(page, "Heineken")).toContainText("Recibido en parte");
    await expect(group(page, "Heineken").getByTestId("req-line")).toContainText("1 Cartón");
  });

  await test.step("RF-39 lo pendiente se cierra con motivo", async () => {
    await group(page, "Heineken").getByRole("button", { name: "Cerrar lo pendiente" }).click();
    await page.getByLabel("Motivo").fill("No había más en existencia");
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(group(page, "Heineken")).toContainText("Cerrado: No había más en existencia");
  });

  await test.step("RF-40 al recibir todo lo demás la requisición queda cerrada", async () => {
    await group(page, "Sams").getByRole("button", { name: "Marcar comprado" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Marcar comprado" }).click();
    await group(page, "Sams").getByRole("button", { name: "Recibir" }).click();
    await page.getByRole("button", { name: "Guardar recepción" }).click();
    await expect(page.getByText("Cerrada", { exact: true })).toBeVisible();
  });

  await test.step("RF-35 RF-42 la entrada está en existencias y la requisición en la lista", async () => {
    await page.goto(`/inventario?almacen=${w.warehouseId}`);
    await expect(page.getByRole("row").filter({ hasText: "Cerveza" })).toContainText("102 pz");
    await page.goto("/requisiciones?estado=closed");
    await expect(page.getByRole("link", { name: /REQ-1/ })).toContainText("$1,200.00");
  });

  await test.step("RF-47 el inicio muestra las compras", async () => {
    await page.goto("/");
    await expect(page.getByRole("main").getByRole("link", { name: /Requisiciones/ })).toContainText("0 por aprobar");
  });
});

test("requisiciones: volumen de 300 renglones", async ({ page }) => {
  const w = await world();
  const sql = postgres(DB, { max: 1, onnotice: () => {} });
  try {
    const products = Array.from({ length: 300 }, (_, i) => {
      const name = `Insumo ${String(i + 1).padStart(3, "0")}`;
      return { business_id: w.pastattiId, name, name_key: name.toLowerCase(), base_unit: "g" };
    });
    const ids = (await sql<{ id: string }[]>`insert into products ${sql(products)} returning id`).map((r) => r.id);
    await sql`insert into stock_levels ${sql(ids.map((product_id) => ({ business_id: w.pastattiId, product_id, warehouse_id: w.warehouseId, min_base: "1000", max_base: "5000" })))}`;
  } finally {
    await sql.end();
  }
  await login(page, OWNER.email, OWNER.password);
  await page.request.put(`${BASE}/api/session/branch`, { data: { branchId: w.branchId } });

  await test.step("se arma desde los mínimos y se recibe en menos de 2 segundos cada paso", async () => {
    let start = Date.now();
    const sug = await (await page.request.post(`${BASE}/api/requisitions/suggest`, { data: { warehouseId: w.warehouseId, source: "minimums" } })).json();
    expect(sug.lines).toHaveLength(301);
    expect(Date.now() - start).toBeLessThan(2000);
    const created = await (await page.request.post(`${BASE}/api/requisitions`, { data: { warehouseId: w.warehouseId, lines: sug.lines } })).json();
    const detail = (await (await page.request.get(`${BASE}/api/requisitions/${created.requisition.id}`)).json()).requisition;
    const g = detail.groups.find((x: { supplierName: string | null }) => x.supplierName === null);
    await page.request.patch(`${BASE}/api/requisitions/${created.requisition.id}/groups/${g.id}`, { data: { purchased: true } });
    start = Date.now();
    const res = await page.request.post(`${BASE}/api/requisitions/${created.requisition.id}/receive`, { data: { groupId: g.id, lines: g.lineIds.map((lineId: string) => ({ lineId, quantity: "5000" })) } });
    expect(res.status()).toBe(200);
    expect(Date.now() - start).toBeLessThan(2000);
  });
});
