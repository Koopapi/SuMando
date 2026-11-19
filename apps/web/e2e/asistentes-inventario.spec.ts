// Criterios de la spec 015 en inventario: asistentes «Contar un área», «Entrada», «Salida», «Traspaso» y «Recibir
// traspaso», con dato raro, retomar en otra sesión y cambio a la vista completa sin perder nada.
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { OWNER, login, ownerApiAt, seedBusiness, seedOwner } from "./helpers";
import { BASE } from "./warm";

async function world() {
  await seedOwner();
  const pastatti = await seedBusiness("Pastatti", ["Sendero"], "violeta");
  const pirrus = await seedBusiness("Pirrus", ["Centro"], "rojo");
  const call = await ownerApiAt(pastatti.branches[0].id);
  const { product: queso } = await call("/api/products", { name: "Queso manchego", baseUnit: "g" });
  const { presentation: pieza } = await call(`/api/products/${queso.id}/presentations`, { name: "Pieza", factor: "1000" });
  await call(`/api/products/${queso.id}`, { countPresentationId: pieza.id }, "PATCH");
  const { product: leche } = await call("/api/products", { name: "Leche", baseUnit: "ml" });
  const { warehouse: bodega } = await call("/api/warehouses", { name: "Bodega Sendero", scope: "branch" });
  await call(`/api/products/${queso.id}/levels`, { warehouseId: bodega.id, presentationId: pieza.id, min: "2", max: "4" }, "PUT");
  const { candidates } = await call("/api/areas");
  const { area } = await call("/api/areas", { name: "Cocina", responsibleId: candidates[0].id });
  await call(`/api/areas/${area.id}/products`, { warehouseId: bodega.id, productIds: [queso.id, leche.id] }, "PUT");
  await call("/api/inventory/movements", { kind: "entry", warehouseId: bodega.id, lines: [{ productId: queso.id, quantity: "3000" }, { productId: leche.id, quantity: "2000" }] });
  const inPirrus = await ownerApiAt(pirrus.branches[0].id);
  const { product: quesoPirrus } = await inPirrus("/api/products", { name: "Queso Manchego", baseUnit: "g" });
  await inPirrus("/api/warehouses", { name: "Bodega Pirrus", scope: "branch" });
  return { pastatti, pirrus, bodega: bodega.id as string, quesoPirrus: quesoPirrus.id as string };
}

const progress = (page: Page) => page.getByTestId("wizard-progress");
const next = (page: Page) => page.getByRole("button", { name: "Siguiente" });
const workAt = (page: Page, branchId: string) => page.request.put(`${BASE}/api/session/branch`, { data: { branchId } });
const draftSaved = (page: Page, kind: string) => page.waitForResponse((r) => r.url().includes(`/api/wizards/${kind}/draft`) && r.request().method() === "PUT" && r.ok());
const stock = async (page: Page, warehouseId: string, product: string) => {
  const body = await (await page.request.get(`${BASE}/api/inventory/stock?warehouseId=${warehouseId}`)).json();
  return (body.rows as { name: string; quantity: string }[]).find((r) => r.name === product)?.quantity;
};

/** Spec 014: el producto se busca escribiendo (ComboField). */
async function pick(page: Page, product: string, quantity: string) {
  await page.getByRole("combobox", { name: "Producto" }).last().fill(product);
  await page.getByRole("option", { name: product }).click();
  await page.getByLabel("Cantidad").last().fill(quantity);
}

test("asistentes de inventario: contar un área, entrada con retomar y vista completa, y salida", async ({ page, browser }) => {
  test.setTimeout(150_000);
  const w = await world();
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, OWNER.email, OWNER.password);
  await workAt(page, w.pastatti.branches[0].id);

  await test.step("RF-1 RF-2 RF-3 RF-23 RF-33 «Contar un área» empieza por el área, con indicación y ejemplo", async () => {
    await page.goto("/inventario/conteo");
    await expect(progress(page)).toHaveText("Paso 1 de 3");
    await expect(page.getByRole("heading", { name: "Almacén y área" })).toBeVisible();
    await expect(page.getByTestId("wizard-hint")).toContainText("Ej.: Cocina");
    await expect(page.getByLabel("Área")).toHaveValue(/.+/);
    await expect(next(page)).toBeInViewport();
    await next(page).click();
    await expect(progress(page)).toHaveText("Paso 2 de 3");
  });

  await test.step("RF-13 RF-33 se cuenta producto por producto y un conteo 30 % fuera de lo esperado pide confirmar", async () => {
    const product = page.getByTestId("count-product");
    await expect(product).toContainText("Producto 1 de 2");
    await expect(product).toContainText("Queso manchego");
    await expect(product).toContainText("Esperado: 3 Pieza");
    await page.getByLabel("Cuánto hay de Queso manchego").fill("9");
    await expect(product.locator('[data-unusual="pending"]')).toContainText("Lo esperado: 3 Pieza.");
    await next(page).click();
    await expect(page.getByText("Confirma los conteos marcados como fuera de lo normal.")).toBeVisible();
    await page.getByRole("button", { name: /^Sí, es correcto/ }).click();
    await next(page).click();
    await expect(product).toContainText("Producto 2 de 2");
    await page.getByRole("button", { name: "Igual en Leche" }).click();
    await expect(page.getByLabel("Cuánto hay de Leche")).toHaveValue("2000");
    await next(page).click();
    await expect(progress(page)).toHaveText("Paso 3 de 3");
  });

  await test.step("RF-7 RF-33 el resumen muestra las diferencias y se aplica", async () => {
    const summary = page.locator('[data-summary="count"]');
    await expect(summary).toContainText("1 diferencia con lo esperado");
    await expect(summary).toContainText("Queso manchego: esperado 3 Pieza, contado 9 Pieza");
    await expect(summary.locator('[data-unusual="confirmed"]')).toBeVisible();
    await page.getByRole("button", { name: "Aplicar conteo" }).click();
    await expect(page.getByTestId("wizard-done")).toContainText("Se aplicó el conteo de Cocina.");
    expect(await stock(page, w.bodega, "Queso manchego")).toBe("9");
  });

  await test.step("RF-13 RF-34 una entrada de más del triple del máximo pide confirmar", async () => {
    await page.goto("/inventario/entrada");
    await expect(progress(page)).toHaveText("Paso 1 de 4");
    await expect(page.getByLabel("Almacén")).toHaveValue(w.bodega);
    await next(page).click();
    await expect(page.getByRole("heading", { name: "Proveedor" })).toBeVisible();
    await page.getByLabel("Folio o factura").fill("F-123");
    await next(page).click();
    await expect(page.getByRole("heading", { name: "Productos y cantidades" })).toBeVisible();
    await pick(page, "Queso manchego", "20");
    await expect(page.locator('[data-unusual="pending"]')).toContainText("hasta el triple del máximo (4 Pieza)");
    const saved = draftSaved(page, "inv-entry");
    await page.getByRole("button", { name: /^Sí, es correcto/ }).click();
    await saved;
  });

  await test.step("RF-17 RF-18 RF-19 lo capturado se retoma en otra sesión", async () => {
    const other = await browser.newContext({ baseURL: BASE });
    const second = await other.newPage();
    await second.setViewportSize({ width: 390, height: 844 });
    await login(second, OWNER.email, OWNER.password);
    await workAt(second, w.pastatti.branches[0].id);
    await second.goto("/inventario/entrada");
    await expect(second.getByTestId("resume-prompt")).toContainText("Productos y cantidades");
    await second.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(second.getByText("Queso manchego · 20 Pieza")).toBeVisible();
    await other.close();
  });

  await test.step("RF-24 RF-27 «Vista completa» y «Paso a paso» conservan lo capturado", async () => {
    await page.getByRole("button", { name: "Vista completa" }).click();
    await expect(page).toHaveURL(/vista=completa/);
    await expect(page.getByRole("button", { name: "Guardar" })).toBeVisible();
    await expect(page.getByText("Queso manchego · 20 Pieza")).toBeVisible();
    await expect(page.getByLabel("Folio o factura")).toHaveValue("F-123");
    await page.getByRole("button", { name: "Paso a paso" }).click();
    await expect(page.getByRole("heading", { name: "Productos y cantidades" })).toBeVisible();
    await expect(page.getByText("Queso manchego · 20 Pieza")).toBeVisible();
  });

  await test.step("RF-7 RF-9 RF-34 el resumen registra la entrada y ofrece ver el movimiento", async () => {
    // Lo confirmado como fuera de lo normal se conserva al ir y volver de la vista completa.
    await expect(page.locator('[data-unusual="confirmed"]')).toBeVisible();
    await next(page).click();
    await expect(progress(page)).toHaveText("Paso 4 de 4");
    await expect(page.locator('[data-summary="supplier"]')).toContainText("Sin proveedor · F-123");
    await page.getByRole("button", { name: "Registrar entrada" }).click();
    await expect(page.getByTestId("wizard-done")).toContainText("Se registró la entrada.");
    await page.getByRole("link", { name: "Ver el movimiento" }).click();
    await expect(page).toHaveURL(/\/inventario\/movimientos\//);
    expect(await stock(page, w.bodega, "Queso manchego")).toBe("29");
  });

  await test.step("RF-5 RF-13 RF-35 la salida pide nota con «Otro» y avisa al sacar más de la mitad", async () => {
    await page.goto("/inventario/salida");
    await next(page).click();
    await page.getByLabel("Motivo").selectOption("other");
    await next(page).click();
    await expect(page.getByText("Escribe una nota: con «Otro» es obligatoria.")).toBeVisible();
    await page.getByLabel(/^Nota/).fill("Se usó en una degustación");
    await next(page).click();
    await pick(page, "Leche", "1500");
    await expect(page.locator('[data-unusual="pending"]')).toContainText("hasta la mitad de la existencia (2,000 ml)");
    await page.getByRole("button", { name: /^Sí, es correcto/ }).click();
    await next(page).click();
    await expect(page.locator('[data-summary="reason"]')).toContainText("Otro · Se usó en una degustación");
    await page.getByRole("button", { name: "Registrar salida" }).click();
    await expect(page.getByTestId("wizard-done")).toContainText("Se registró la salida.");
    expect(await stock(page, w.bodega, "Leche")).toBe("500");
  });
});

test("asistentes de inventario: traspaso a otro negocio y recibirlo", async ({ page }) => {
  test.setTimeout(120_000);
  const w = await world();
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, OWNER.email, OWNER.password);
  await workAt(page, w.pastatti.branches[0].id);

  await test.step("RF-36 origen, destino de otro negocio (queda en camino), productos y resumen", async () => {
    await page.goto("/inventario/traspaso");
    await expect(page.getByRole("heading", { name: "Origen" })).toBeVisible();
    await next(page).click();
    await expect(page.getByRole("heading", { name: "Destino" })).toBeVisible();
    await next(page).click();
    await expect(page.getByText("Elige el almacén de destino.", { exact: true })).toBeVisible();
    await page.getByLabel("Hacia").selectOption({ label: "Pirrus · Bodega Pirrus" });
    await expect(page.getByText("Va a otro negocio: quedará en camino hasta que lo reciban.")).toBeVisible();
    await next(page).click();
    await pick(page, "Queso manchego", "2");
    await next(page).click();
    await expect(page.locator('[data-summary="to"]')).toContainText("Pirrus · Bodega Pirrus");
    await expect(page.locator('[data-summary="products"]')).toContainText("2 Pieza · Queso manchego");
    await page.getByRole("button", { name: "Enviar traspaso" }).click();
    await expect(page.getByTestId("wizard-done")).toContainText("Se envió el traspaso.");
    expect(await stock(page, w.bodega, "Queso manchego")).toBe("1");
  });

  await test.step("RF-25 RF-37 quien recibe abre el asistente, que propone lo enviado (2,000 g)", async () => {
    await workAt(page, w.pirrus.branches[0].id);
    await page.goto("/inventario/traspasos");
    await page.getByRole("region", { name: "Por recibir" }).getByRole("link").first().click();
    await page.getByRole("link", { name: "Recibir", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Cantidades recibidas" })).toBeVisible();
    const line = page.getByTestId("receive-transfer-line");
    await expect(line.getByLabel(/Llegó/)).toHaveValue("2000");
    await expect(line.getByLabel("Entra en")).toHaveValue(w.quesoPirrus);
    await line.getByLabel(/Llegó/).fill("1800");
    await next(page).click();
    await expect(page.locator('[data-summary="quantities"]')).toContainText("Queso manchego: llegó 1,800 g → Queso Manchego (enviado 2,000 g)");
    await page.getByRole("button", { name: "Confirmar recepción" }).click();
    await expect(page.getByTestId("wizard-done")).toContainText("Se recibió el traspaso.");
    await page.getByRole("link", { name: "Ver el traspaso" }).click();
    await expect(page.getByText("Llegó con diferencia")).toBeVisible();
  });
});
