// Criterios de la spec 005: inventarios (existencias, movimientos, traspasos, áreas y conteo), en escritorio.
import postgres from "postgres";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { OWNER, login, ownerApiAt, seedBusiness, seedOwner } from "./helpers";
import { BASE, DB } from "./warm";

async function world() {
  await seedOwner();
  const pastatti = await seedBusiness("Pastatti", ["Sendero"], "violeta");
  const pirrus = await seedBusiness("Pirrus", ["Centro"], "rojo");
  const call = await ownerApiAt(pastatti.branches[0].id);
  const { product: queso } = await call("/api/products", { name: "Queso manchego", baseUnit: "g" });
  const { presentation: pieza } = await call(`/api/products/${queso.id}/presentations`, { name: "Pieza", factor: "1000" });
  await call(`/api/products/${queso.id}`, { countPresentationId: pieza.id }, "PATCH");
  await call("/api/products", { name: "Leche", baseUnit: "ml" });
  const { warehouse: bodega } = await call("/api/warehouses", { name: "Bodega Sendero", scope: "branch" });
  await call("/api/warehouses", { name: "Central", scope: "business" });
  await call(`/api/products/${queso.id}/levels`, { warehouseId: bodega.id, min: "3", presentationId: pieza.id }, "PUT");
  const { candidates } = await call("/api/areas");
  await call("/api/areas", { name: "Lácteos", responsibleId: candidates[0].id });
  const inPirrus = await ownerApiAt(pirrus.branches[0].id);
  await inPirrus("/api/products", { name: "Queso Manchego", baseUnit: "g" });
  await inPirrus("/api/warehouses", { name: "Bodega Pirrus", scope: "branch" });
  return { pastatti, pirrus, bodega: bodega.id as string };
}

const stockRow = (page: Page, product: string) => page.getByRole("row").filter({ hasText: product });
const workAt = (page: Page, branchId: string) => page.request.put(`${BASE}/api/session/branch`, { data: { branchId } });

test("inventario: área, entradas, salidas, traspasos, conteo, historial y cancelación", async ({ page }) => {
  const w = await world();
  await page.setViewportSize({ width: 1360, height: 950 });
  await login(page, OWNER.email, OWNER.password);
  await workAt(page, w.pastatti.branches[0].id);

  await test.step("RF-67 Inventario está en el menú lateral y en el inicio", async () => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Existencias" })).toBeVisible();
    await page.getByRole("navigation").getByRole("link", { name: "Inventario" }).first().click();
    await expect(page.getByRole("heading", { name: "Inventario", exact: true })).toBeVisible();
  });

  await test.step("RF-40 se arma la lista del área en su almacén", async () => {
    await page.goto("/almacenes");
    await page.getByRole("link", { name: "Lista de conteo de Lácteos" }).click();
    await page.getByLabel("Almacén donde se cuenta").selectOption({ label: "Bodega Sendero" });
    await page.getByLabel("Agregar a la lista").selectOption({ label: "Queso manchego" });
    await page.getByLabel("Agregar a la lista").selectOption({ label: "Leche" });
    await page.getByRole("button", { name: "Subir Leche" }).click();
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Lista guardada.")).toBeVisible();
    await expect(page.getByTestId("area-product").first()).toContainText("Leche");
  });

  await test.step("RF-7 RF-11 una entrada en piezas suma a la existencia", async () => {
    await page.goto(`/inventario?almacen=${w.bodega}`);
    await page.getByRole("link", { name: "Entrada" }).click();
    const first = page.getByRole("group", { name: "Producto 1" });
    await first.getByLabel("Producto", { exact: true }).selectOption({ label: "Queso manchego" });
    await first.getByLabel("Cantidad").fill("2");
    await expect(first.getByLabel("En")).toHaveValue(/.+/);
    await page.getByRole("button", { name: "Agregar producto" }).click();
    const second = page.getByRole("group", { name: "Producto 2" });
    await second.getByLabel("Producto", { exact: true }).selectOption({ label: "Leche" });
    await second.getByLabel("Cantidad").fill("1000");
    await page.getByLabel("Folio o factura").fill("F-100");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("heading", { name: "Entrada", exact: true })).toBeVisible();
    await expect(page.getByTestId("movement-line").filter({ hasText: "Queso manchego" })).toContainText("+2 Pieza");
  });

  await test.step("RF-14 una salida por merma resta con su motivo", async () => {
    await page.goto(`/inventario/salida?almacen=${w.bodega}`);
    await page.getByLabel("Motivo").selectOption({ label: "Merma" });
    const first = page.getByRole("group", { name: "Producto 1" });
    await first.getByLabel("Producto", { exact: true }).selectOption({ label: "Leche" });
    await first.getByLabel("Cantidad").fill("200");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Merma")).toBeVisible();
    await expect(page.getByTestId("movement-line")).toContainText("800 ml");
  });

  await test.step("RF-55 RF-56 RF-57 existencias con mínimo, bajo mínimo y filtro", async () => {
    await page.goto(`/inventario?almacen=${w.bodega}`);
    await expect(stockRow(page, "Queso manchego")).toContainText("2 Pieza");
    await expect(stockRow(page, "Queso manchego")).toContainText("Bajo mínimo");
    await expect(stockRow(page, "Queso manchego")).toContainText("Lácteos");
    await page.getByRole("button", { name: "Bajo mínimo", exact: true }).click();
    await expect(stockRow(page, "Leche")).toHaveCount(0);
    await page.getByRole("button", { name: "Bajo mínimo", exact: true }).click();
  });

  await test.step("RF-20 RF-21 una salida mayor deja la existencia en negativo, marcada", async () => {
    await page.goto(`/inventario/salida?almacen=${w.bodega}`);
    const first = page.getByRole("group", { name: "Producto 1" });
    await first.getByLabel("Producto", { exact: true }).selectOption({ label: "Queso manchego" });
    await first.getByLabel("Cantidad").fill("3");
    await page.getByLabel("Motivo").selectOption({ label: "Cortesía" });
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByTestId("movement-line")).toContainText("-1 Pieza");
    await page.goto(`/inventario?almacen=${w.bodega}`);
    await expect(stockRow(page, "Queso manchego")).toContainText("Negativo");
    await expect(stockRow(page, "Queso manchego")).toContainText("-1 Pieza");
  });

  await test.step("RF-22 un traspaso interno entra al momento en el otro almacén", async () => {
    await page.goto(`/inventario/traspaso?almacen=${w.bodega}`);
    await page.getByLabel("Hacia").selectOption({ label: "Pastatti · Central" });
    const first = page.getByRole("group", { name: "Producto 1" });
    await first.getByLabel("Producto", { exact: true }).selectOption({ label: "Leche" });
    await first.getByLabel("Cantidad").fill("300");
    await page.getByRole("button", { name: "Traspaso" }).click();
    await expect(page.getByText("Hecho", { exact: true })).toBeVisible();
    await page.goto("/inventario");
    await page.getByLabel("Almacén").selectOption({ label: "Central (del negocio)" });
    await expect(stockRow(page, "Leche")).toContainText("300 ml");
  });

  await test.step("RF-26 RF-27 RF-28 un traspaso a otro negocio queda en camino", async () => {
    await page.goto(`/inventario/traspaso?almacen=${w.bodega}`);
    await page.getByLabel("Hacia").selectOption({ label: "Pirrus · Bodega Pirrus" });
    const first = page.getByRole("group", { name: "Producto 1" });
    await first.getByLabel("Producto", { exact: true }).selectOption({ label: "Leche" });
    await first.getByLabel("Cantidad").fill("100");
    await page.getByRole("button", { name: "Traspaso" }).click();
    await expect(page.getByText("En camino", { exact: true })).toBeVisible();
  });

  await test.step("RF-29 RF-32 en Pirrus no se recibe sin elegir un producto con la misma unidad", async () => {
    await workAt(page, w.pirrus.branches[0].id);
    await page.goto("/inventario/traspasos");
    await page.getByRole("region", { name: "Por recibir" }).getByRole("link").first().click();
    const line = page.getByRole("group", { name: /Leche/ });
    await expect(line.getByLabel("Entra en")).toHaveValue("");
    await expect(line.getByLabel("Entra en").locator("option")).toHaveCount(1);
    await page.getByRole("button", { name: "Confirmar recepción" }).click();
    await expect(page.getByText("Elige en qué producto de tu catálogo entra «Leche».")).toBeVisible();
  });

  await test.step("RF-36 quien envió cancela el traspaso en camino y la leche vuelve", async () => {
    await workAt(page, w.pastatti.branches[0].id);
    await page.goto("/inventario/traspasos");
    await page.getByRole("region", { name: "Enviados en camino" }).getByRole("link").first().click();
    await page.getByRole("button", { name: "Cancelar traspaso" }).click();
    await page.getByLabel("Motivo").fill("Pirrus no maneja esa leche");
    await page.getByRole("button", { name: "Cancelar con este motivo" }).click();
    await expect(page.getByText("Cancelado", { exact: true })).toBeVisible();
    await page.goto(`/inventario?almacen=${w.bodega}`);
    await expect(stockRow(page, "Leche")).toContainText("500 ml");
  });
});

test("inventario: recepción con diferencia y conteo con borrador", async ({ page }) => {
  const w = await world();
  const call = await ownerApiAt(w.pirrus.branches[0].id);
  const { product: lechePirrus } = await call("/api/products", { name: "Leche entera", baseUnit: "ml" });
  await page.setViewportSize({ width: 1360, height: 950 });
  await login(page, OWNER.email, OWNER.password);
  await workAt(page, w.pastatti.branches[0].id);
  const inPastatti = await ownerApiAt(w.pastatti.branches[0].id);
  const { products } = await inPastatti("/api/inventory/products");
  const id = (name: string) => products.find((p: { name: string; id: string }) => p.name === name).id as string;
  const pirrusWh = (await call("/api/inventory/stock")).warehouses[0].id as string;
  await inPastatti("/api/inventory/movements", { kind: "entry", warehouseId: w.bodega, lines: [{ productId: id("Queso manchego"), quantity: "5000" }, { productId: id("Leche"), quantity: "1000" }] });
  await inPastatti("/api/inventory/transfers", { fromWarehouseId: w.bodega, toWarehouseId: pirrusWh, lines: [{ productId: id("Queso manchego"), quantity: "2000" }, { productId: id("Leche"), quantity: "500" }] });

  await test.step("RF-30 RF-31 RF-33 RF-34 RF-35 se recibe en el producto propuesto y en el elegido, con diferencia", async () => {
    await workAt(page, w.pirrus.branches[0].id);
    await page.goto("/inventario/traspasos");
    await page.getByRole("region", { name: "Por recibir" }).getByRole("link").first().click();
    const queso = page.getByRole("group", { name: /Queso manchego/ });
    await expect(queso.getByLabel("Entra en")).not.toHaveValue("");
    await queso.getByLabel(/Llegó/).fill("1800");
    await page.getByRole("group", { name: /Leche/ }).getByLabel("Entra en").selectOption({ value: lechePirrus.id });
    await page.getByRole("button", { name: "Confirmar recepción" }).click();
    await expect(page.getByText(/^Recibido por /)).toBeVisible();
    await expect(page.getByText("Llegó con diferencia")).toBeVisible();
    await expect(page.getByTestId("transfer-line").filter({ hasText: "Queso manchego" })).toContainText("-200");
  });

  await test.step("RF-35 quien envió también ve la diferencia", async () => {
    await workAt(page, w.pastatti.branches[0].id);
    await page.goto("/inventario/traspasos");
    await page.getByRole("region", { name: "Recientes" }).getByRole("link").first().click();
    await expect(page.getByText("Llegó con diferencia")).toBeVisible();
  });

  await test.step("RF-44 RF-45 RF-46 RF-48 se cuenta con «Igual» y lo capturado sobrevive a recargar", async () => {
    await page.goto("/inventario/conteo");
    await page.getByRole("link", { name: /^Lácteos/ }).click();
    await page.getByLabel("Almacén donde se cuenta").selectOption({ label: "Bodega Sendero" });
    await page.getByLabel("Agregar a la lista").selectOption({ label: "Queso manchego" });
    await page.getByLabel("Agregar a la lista").selectOption({ label: "Leche" });
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Lista guardada.")).toBeVisible();
    await page.goto("/inventario/conteo");
    await page.getByRole("link", { name: /^Lácteos/ }).click();
    await expect(page.getByTestId("count-line").filter({ hasText: "Queso manchego" })).toContainText("Esperado: 3 Pieza");
    await page.getByRole("button", { name: "Igual en Queso manchego" }).click();
    await expect(page.getByLabel("Contado de Queso manchego")).toHaveValue("3");
    await page.getByLabel("Contado de Leche").fill("450");
    await page.reload();
    await expect(page.getByLabel("Contado de Leche")).toHaveValue("450");
    await expect(page.getByLabel("Contado de Queso manchego")).toHaveValue("3");
  });

  await test.step("RF-47 RF-49 al aplicar la existencia queda en lo contado", async () => {
    await page.getByRole("button", { name: "Aplicar conteo" }).click();
    await expect(page.getByText("Conteo aplicado.")).toBeVisible();
    await expect(page.getByText(/Contada el .* por Dueño de prueba/)).toBeVisible();
    await page.goto(`/inventario?almacen=${w.bodega}`);
    await expect(stockRow(page, "Leche")).toContainText("450 ml");
  });

  await test.step("RF-61 el historial del producto muestra el conteo y la existencia que dejó", async () => {
    await stockRow(page, "Leche").getByRole("link", { name: "Leche" }).click();
    const first = page.getByTestId("history-entry").first();
    await expect(first).toContainText("Conteo");
    await expect(first).toContainText("-50");
    await expect(first).toContainText("450");
  });

  await test.step("RF-64 una entrada se cancela con motivo y queda marcada", async () => {
    await page.goto("/inventario/movimientos?tipo=entry");
    await page.getByRole("link", { name: /Entrada/ }).first().click();
    await page.getByRole("button", { name: "Cancelar movimiento" }).click();
    await page.getByLabel("Motivo").fill("Entrada capturada dos veces");
    await page.getByRole("button", { name: "Cancelar con este motivo" }).click();
    await expect(page.getByText(/Cancelado por Dueño de prueba/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancelar movimiento" })).toHaveCount(0);
  });
});

test("inventario: volumen de 1,000 productos y 50,000 movimientos", async ({ page }) => {
  test.setTimeout(180_000);
  await seedOwner();
  const pastatti = await seedBusiness("Pastatti", ["Sendero"], "violeta");
  const call = await ownerApiAt(pastatti.branches[0].id);
  const { warehouse } = await call("/api/warehouses", { name: "Bodega", scope: "branch" });
  const { candidates } = await call("/api/areas");
  const { area } = await call("/api/areas", { name: "Todo", responsibleId: candidates[0].id });
  const sql = postgres(DB, { max: 1, onnotice: () => {} });
  let productIds: string[] = [];
  try {
    const [{ id: ownerId }] = await sql<{ id: string }[]>`select id from users limit 1`;
    const products = Array.from({ length: 1000 }, (_, i) => {
      const name = `Producto ${String(i + 1).padStart(4, "0")}`;
      return { business_id: pastatti.id, name, name_key: name.toLowerCase(), base_unit: "g" };
    });
    productIds = (await sql<{ id: string }[]>`insert into products ${sql(products)} returning id`).map((r) => r.id);
    await sql`insert into stock ${sql(productIds.map((product_id) => ({ business_id: pastatti.id, warehouse_id: warehouse.id, product_id, quantity_base: "50" })))}`;
    const at = new Date();
    for (let batch = 0; batch < 10; batch++) {
      const moves = Array.from({ length: 5000 }, () => ({ business_id: pastatti.id, branch_id: pastatti.branches[0].id, warehouse_id: warehouse.id, kind: "entry", created_by: ownerId, created_at: at }));
      const ids = (await sql<{ id: string }[]>`insert into inventory_movements ${sql(moves)} returning id`).map((r) => r.id);
      const lines = ids.map((movement_id, i) => ({ movement_id, product_id: productIds[(batch * 5000 + i) % 1000], delta_base: "1", balance_after: "50", position: 0 }));
      await sql`insert into inventory_movement_lines ${sql(lines)}`;
    }
  } finally {
    await sql.end();
  }
  await call(`/api/areas/${area.id}/products`, { warehouseId: warehouse.id, productIds: productIds.slice(0, 200) }, "PUT");
  await page.setViewportSize({ width: 1360, height: 950 });
  await login(page, OWNER.email, OWNER.password);
  await page.request.put(`${BASE}/api/session/branch`, { data: { branchId: pastatti.branches[0].id } });

  await test.step("las existencias de un almacén abren en menos de 2 segundos", async () => {
    await page.goto(`/inventario?almacen=${warehouse.id}`);
    const start = Date.now();
    await page.goto(`/inventario?almacen=${warehouse.id}`);
    await expect(page.getByTestId("table-count")).toHaveText("Mostrando 1000 de 1000");
    expect(Date.now() - start).toBeLessThan(2000);
  });

  await test.step("la búsqueda filtra en menos de 300 ms", async () => {
    const elapsed = await page.evaluate(async () => {
      const input = document.querySelector<HTMLInputElement>('input[type="search"]')!;
      const count = document.querySelector('[data-testid="table-count"]')!;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      const t0 = performance.now();
      setter.call(input, "producto 0999");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      while (count.textContent !== "Mostrando 1 de 1000") await new Promise((r) => requestAnimationFrame(r));
      return performance.now() - t0;
    });
    expect(elapsed).toBeLessThan(300);
  });

  await test.step("un conteo de 200 productos se aplica en menos de 2 segundos", async () => {
    const sheet = await (await page.request.get(`${BASE}/api/inventory/counts/${area.id}`)).json();
    expect(sheet.lines).toHaveLength(200);
    const lines = sheet.lines.map((l: { productId: string; seen: string }) => ({ productId: l.productId, quantity: "40", seen: l.seen }));
    const start = Date.now();
    const res = await page.request.post(`${BASE}/api/inventory/counts`, { data: { areaId: area.id, lines } });
    const elapsed = Date.now() - start;
    expect(res.status()).toBe(201);
    expect(elapsed).toBeLessThan(2000);
  });

  await test.step("la lista de movimientos y el historial abren con 50,000 movimientos", async () => {
    const start = Date.now();
    await page.goto("/inventario/movimientos");
    await expect(page.getByRole("link", { name: "Más antiguos" })).toBeVisible();
    await page.goto(`/inventario/historial?almacen=${warehouse.id}&producto=${productIds[0]}`);
    await expect(page.getByTestId("history-entry").first()).toBeVisible();
    expect(Date.now() - start).toBeLessThan(4000);
  });
});
