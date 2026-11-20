// Criterios de la spec 015 en requisiciones: asistente «Nueva requisición» con indicación, ejemplo, dato raro,
// resumen, guardar y retomar en otra sesión, y cambio a la vista completa sin perder nada.
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { OWNER, alertBox, login, ownerApiAt, seedAdmin, seedBusiness, seedOwner, measureWizards } from "./helpers";
import { BASE } from "./warm";

const ADMIN = { email: "admin.asistente@mando.test", password: "admin-asistente-1" };

async function world() {
  await seedOwner();
  const pastatti = await seedBusiness("Pastatti", ["Sendero"], "violeta");
  const branchId = pastatti.branches[0].id;
  await seedAdmin("Encargado nuevo", ADMIN.email, [branchId], ADMIN.password);
  const call = await ownerApiAt(branchId);
  const { supplier: heineken } = await call("/api/suppliers", { name: "Heineken" });
  const { product: cerveza } = await call("/api/products", { name: "Cerveza", baseUnit: "pz", supplierId: heineken.id });
  const { presentation: carton } = await call(`/api/products/${cerveza.id}/presentations`, { name: "Cartón", factor: "24" });
  await call(`/api/products/${cerveza.id}`, { purchasePresentationId: carton.id }, "PATCH");
  const { warehouse } = await call("/api/warehouses", { name: "Bodega", scope: "branch" });
  await call(`/api/products/${cerveza.id}/levels`, { warehouseId: warehouse.id, presentationId: carton.id, min: "3", max: "6" }, "PUT");
  await call("/api/inventory/movements", { kind: "entry", warehouseId: warehouse.id, lines: [{ productId: cerveza.id, quantity: "24" }] });
  return { branchId };
}

const progress = (page: Page) => page.getByTestId("wizard-progress");
const next = (page: Page) => page.getByRole("button", { name: "Siguiente" });
const draftSaved = (page: Page) => page.waitForResponse((r) => r.url().includes("/api/wizards/req-new/draft") && r.request().method() === "PUT" && r.ok());
const requisitions = async (page: Page) => (await (await page.request.get(`${BASE}/api/requisitions`)).json()).requisitions as unknown[];

test("asistente de nueva requisición: pasos, dato raro, retomar, vista completa y resumen", async ({ page, browser }) => {
  test.setTimeout(120_000);
  await world();
  await page.setViewportSize({ width: 390, height: 844 });
  const fit = await measureWizards(page);
  await login(page, ADMIN.email, ADMIN.password);

  await test.step("RF-1 RF-2 RF-3 RF-23 RF-28 abre el asistente con su paso, indicación y ejemplo", async () => {
    await page.goto("/requisiciones/nueva");
    await expect(progress(page)).toHaveText("Paso 1 de 5");
    await expect(page.getByRole("heading", { name: "Almacén" })).toBeVisible();
    await expect(page.getByTestId("wizard-hint")).toContainText("Elige el almacén donde se va a recibir lo que se compre.");
    await expect(page.getByTestId("wizard-hint")).toContainText("Ej.: Bodega");
    // Botones a la vista sin desplazar, a ancho de teléfono.
    await expect(next(page)).toBeInViewport();
    await next(page).click();
    await expect(progress(page)).toHaveText("Paso 2 de 5");
  });

  await test.step("RF-29 RF-5 agrega lo que está bajo el mínimo, agrupado por proveedor con existencia, mínimo y máximo", async () => {
    await next(page).click();
    await expect(progress(page)).toHaveText("Paso 3 de 5");
    await expect(page.getByText("Se agregó 1 producto.")).toBeVisible();
    const heineken = page.getByRole("region", { name: "Heineken", exact: true });
    await expect(heineken).toContainText("Cerveza · 5 Cartón");
    await expect(heineken).toContainText("mínimo 3");
    await expect(heineken).toContainText("máximo 6");
  });

  await test.step("RF-12 RF-13 pedir más del doble del máximo pide confirmar antes de seguir", async () => {
    await page.getByRole("button", { name: /^Editar Producto 1/ }).click();
    await page.getByRole("group", { name: "Producto 1" }).getByLabel("Cantidad").fill("20");
    await expect(page.getByText("La cantidad de Cerveza se ve fuera de lo normal.")).toBeVisible();
    await expect(page.getByText("Lo esperado: hasta el doble del máximo (6 Cartón).")).toBeVisible();
    await next(page).click();
    await expect(page.getByText("Confirma las cantidades marcadas como fuera de lo normal.")).toBeVisible();
    await expect(progress(page)).toHaveText("Paso 3 de 5");
    const saved = draftSaved(page);
    await page.getByRole("button", { name: "Sí, es correcto La cantidad de Cerveza" }).click();
    await expect(page.getByText("Fuera de lo normal, confirmado")).toBeVisible();
    await saved;
  });

  const otherContext = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
  const other = await otherContext.newPage();
  await test.step("RF-18 RF-19 desde otro dispositivo se ofrece continuar donde se quedó", async () => {
    await login(other, ADMIN.email, ADMIN.password);
    await other.goto("/requisiciones/nueva");
    const prompt = other.getByTestId("resume-prompt");
    await expect(prompt).toContainText("en el paso «Productos y cantidades»");
    await prompt.getByRole("button", { name: "Continuar" }).click();
    await expect(progress(other)).toHaveText("Paso 3 de 5");
    await expect(other.getByRole("group", { name: "Producto 1" })).toContainText("Cerveza · 20 Cartón");
  });

  await test.step("RF-24 RF-26 RF-27 la vista completa sigue con lo mismo y se recuerda", async () => {
    await other.getByRole("button", { name: "Vista completa" }).click();
    await other.waitForURL(/vista=completa/);
    await expect(other.getByRole("group", { name: "Producto 1" })).toContainText("Cerveza · 20 Cartón · Heineken");
    await other.goto("/requisiciones/nueva");
    await expect(other.getByRole("button", { name: "Paso a paso" })).toBeVisible();
    await expect(other.getByTestId("wizard-progress")).toHaveCount(0);
    await other.getByRole("button", { name: "Paso a paso" }).click();
    await other.waitForURL(/vista=asistente/);
    await expect(progress(other)).toHaveText("Paso 3 de 5");
    await expect(other.getByRole("group", { name: "Producto 1" })).toContainText("Cerveza · 20 Cartón");
  });

  await test.step("RF-6 RF-7 RF-14 nota y resumen con lo de cada paso; «Cambiar» regresa al paso", async () => {
    await next(other).click();
    await other.getByLabel("Nota").fill("Para el fin de semana");
    await next(other).click();
    await expect(progress(other)).toHaveText("Paso 5 de 5");
    const summary = (id: string) => other.locator(`[data-summary="${id}"]`);
    await expect(summary("warehouse")).toContainText("Bodega");
    await expect(summary("source")).toContainText("Bajo el mínimo");
    await expect(summary("products")).toContainText("1 producto");
    await expect(summary("products")).toContainText("Heineken: 1 producto");
    await expect(summary("products")).toContainText("Fuera de lo normal, confirmado");
    await expect(summary("note")).toContainText("Para el fin de semana");
    await other.getByRole("button", { name: "Cambiar Nota" }).click();
    await expect(other.getByLabel("Nota")).toHaveValue("Para el fin de semana");
    await next(other).click();
    await expect(progress(other)).toHaveText("Paso 5 de 5");
  });

  await test.step("RF-8 RF-9 RF-20 nada se registra hasta confirmar; después dice qué sigue y ya no hay nada a medias", async () => {
    expect(await requisitions(other)).toHaveLength(0);
    await other.getByRole("button", { name: "Enviar", exact: true }).click();
    await expect(other.getByTestId("wizard-done")).toContainText("Se envió la requisición REQ-1.");
    expect(await requisitions(other)).toHaveLength(1);
    await other.getByRole("link", { name: "Ver la requisición" }).click();
    await expect(other.getByRole("heading", { name: "REQ-1" })).toBeVisible();
    await other.goto("/requisiciones/nueva");
    await expect(progress(other)).toHaveText("Paso 1 de 5");
    await expect(other.getByTestId("resume-prompt")).toHaveCount(0);
  });
  await otherContext.close();
  fit();
});

test("asistentes de aprobar, comprar y recibir; error del servidor y decisión de otra persona", async ({ page }) => {
  test.setTimeout(120_000);
  const w = await world();
  await page.setViewportSize({ width: 390, height: 844 });
  const fit = await measureWizards(page);
  // El encargado pide dos requisiciones; el dueño decide.
  await login(page, ADMIN.email, ADMIN.password);
  const warehouseId = (await (await page.request.get(`${BASE}/api/warehouses`)).json()).warehouses[0].id as string;
  const products = (await (await page.request.get(`${BASE}/api/products`)).json()).products as { id: string; name: string; supplier: { id: string } | null }[];
  const cerveza = products.find((p) => p.name === "Cerveza")!;
  const make = async () => (await (await page.request.post(`${BASE}/api/requisitions`, { data: { warehouseId, lines: [{ productId: cerveza.id, quantity: "5", presentationId: null, supplierId: cerveza.supplier?.id }] } })).json()).requisition.id as string;
  const first = await make();
  const second = await make();
  await page.request.post(`${BASE}/api/auth/logout`);
  await login(page, OWNER.email, OWNER.password);
  await page.request.put(`${BASE}/api/session/branch`, { data: { branchId: w.branchId } });

  await test.step("RF-30 aprobar: revisar por proveedor, cambiar una cantidad, decidir y ver el resumen", async () => {
    await page.goto(`/requisiciones/${first}`);
    await page.getByRole("link", { name: "Aprobar", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Revisar por proveedor" })).toBeVisible();
    await page.getByLabel("Cantidad · Cerveza").fill("4");
    await next(page).click();
    await page.getByLabel("Decisión").selectOption({ label: "Aprobar para comprar" });
    await next(page).click();
    await expect(page.locator('[data-summary="review"]')).toContainText("1 cambio");
    await expect(page.locator('[data-summary="review"]')).toContainText("Cerveza: 5 pz → 4 pz");
    await page.getByRole("button", { name: "Aprobar", exact: true }).click();
    await expect(page.getByTestId("wizard-done")).toContainText("Se aprobó la REQ-1.");
    await page.getByRole("link", { name: "Mandar las listas a los compradores" }).click();
    await expect(page.getByText("Aprobada", { exact: true })).toBeVisible();
  });

  await test.step("RF-31 comprar: quién compra, un paso por proveedor y resumen", async () => {
    await page.getByRole("link", { name: "Marcar comprado", exact: true }).click();
    await page.getByLabel("Quién compra").selectOption({ label: "Sin comprador" });
    await next(page).click();
    await expect(page.getByRole("heading", { name: "Heineken" })).toBeVisible();
    await page.getByLabel("Se compró en Heineken").check();
    await page.getByLabel("Cuánto se pagó (opcional)").fill("1200");
    await next(page).click();
    await expect(page.locator('[data-summary]').filter({ hasText: "Heineken" })).toContainText("Comprado, $1,200.00");
    await page.getByRole("button", { name: "Registrar lo comprado" }).click();
    await expect(page.getByTestId("wizard-done")).toContainText("Se registró 1 proveedor como comprado.");
    await page.getByRole("link", { name: "Recibir lo comprado" }).click();
  });

  await test.step("RF-32 recibir: propone lo pendiente, se corrige y entra al inventario", async () => {
    await expect(page.getByLabel("Proveedor")).toHaveValue(/.+/);
    await next(page).click();
    await expect(page.getByLabel("Llegó de Cerveza")).toHaveValue("4");
    await page.getByLabel("Llegó de Cerveza").fill("3");
    await next(page).click();
    await expect(page.locator('[data-summary="quantities"]')).toContainText("Cerveza: 3 pz");
    await page.getByRole("button", { name: "Registrar la entrada" }).click();
    await expect(page.getByTestId("wizard-done")).toContainText("Se registró lo recibido de Heineken");
    await page.getByRole("link", { name: "Ver la requisición" }).click();
    await expect(page.getByRole("region", { name: "Heineken" })).toContainText("Recibido en parte");
  });

  await test.step("RF-10 si el servidor rechaza al confirmar, se ve el mensaje y no se pierde lo capturado", async () => {
    await page.goto(`/requisiciones/${second}/aprobar`);
    await next(page).click();
    await page.getByLabel("Decisión").selectOption({ label: "Aprobar para comprar" });
    await next(page).click();
    // Mientras tanto otra persona la cancela.
    await page.request.post(`${BASE}/api/requisitions/${second}/cancel`, { data: { reason: "Ya no hace falta" } });
    await page.getByRole("button", { name: "Aprobar", exact: true }).click();
    await expect(alertBox(page)).toContainText("cancelada");
    await expect(progress(page)).toHaveText("Paso 3 de 3");
    await expect(page.locator('[data-summary="decision"]')).toContainText("Aprobar para comprar");
  });

  await test.step("RF-21 al volver, el asistente avisa que otra persona ya la decidió y no deja confirmar", async () => {
    await page.reload();
    await expect(page.getByText("Esta requisición ya está cancelada: otra persona la decidió mientras tanto.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Aprobar", exact: true })).toHaveCount(0);
  });
  fit();
});
