// Criterios de la spec 015 en las altas: «Nuevo producto» con parecidos, presentaciones, proveedor y niveles; «Nuevo
// proveedor» con comprador; «Nuevo empleado» (el sueldo solo para el dueño) con un documento, y «Nueva plantilla».
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { OWNER, login, logout, ownerApiAt, seedAdmin, seedBusiness, seedOwner, measureWizards } from "./helpers";
import { BASE } from "./warm";

const ADMIN = { email: "admin.altas@mando.test", password: "admin-altas-1" };

async function world() {
  await seedOwner();
  const pastatti = await seedBusiness("Pastatti", ["Sendero"], "violeta");
  const branchId = pastatti.branches[0].id;
  await seedAdmin("Administrador de Sendero", ADMIN.email, [branchId], ADMIN.password);
  const call = await ownerApiAt(branchId);
  await call("/api/suppliers", { name: "COSTCO" });
  await call("/api/products", { name: "Agua mineral", baseUnit: "pz" });
  await call("/api/warehouses", { name: "Bodega", scope: "branch" });
  const { position } = await call("/api/positions", { name: "Mesero" });
  await call("/api/employees", { name: "Comprador Uno", positionId: position.id, hiredOn: "2026-01-01" });
  await call("/api/document-types", { name: "INE", required: true, validityMonths: null });
  return { branchId };
}

const progress = (page: Page) => page.getByTestId("wizard-progress");
const next = (page: Page) => page.getByRole("button", { name: "Siguiente" });
const workAt = (page: Page, branchId: string) => page.request.put(`${BASE}/api/session/branch`, { data: { branchId } });

test("asistentes de altas: producto con parecidos y proveedor con comprador", async ({ page }) => {
  test.setTimeout(120_000);
  const w = await world();
  await page.setViewportSize({ width: 390, height: 844 });
  const fit = await measureWizards(page);
  await login(page, OWNER.email, OWNER.password);
  await workAt(page, w.branchId);

  await test.step("RF-43 RF-44 el mismo nombre no pasa y uno parecido pide confirmar que es otro", async () => {
    await page.goto("/productos");
    await page.getByRole("link", { name: "Nuevo producto" }).click();
    await expect(progress(page)).toHaveText("Paso 1 de 5");
    await page.getByLabel("Nombre").fill("AGUA  MINERÁL");
    await expect(page.getByText("Ya existe «Agua mineral».", { exact: false }).first()).toBeVisible();
    await next(page).click();
    await expect(progress(page)).toHaveText("Paso 1 de 5");
    await page.getByLabel("Nombre").fill("Aguamineral");
    await expect(page.locator('[data-similar="pending"]')).toContainText("Se parece a «Agua mineral».");
    await next(page).click();
    await expect(page.getByText("Confirma que es otro producto o cambia el nombre.")).toBeVisible();
    await page.getByRole("button", { name: "Sí, es otro producto" }).click();
    await page.getByLabel("Unidad").selectOption("pz");
    await next(page).click();
  });

  await test.step("RF-43 presentaciones, proveedor y mínimo y máximo por almacén", async () => {
    await expect(page.getByRole("heading", { name: "Presentaciones" })).toBeVisible();
    await page.getByRole("button", { name: "Agregar presentación" }).click();
    await page.getByLabel("Nombre de la presentación 1").fill("Caja de 12");
    await page.getByLabel("Cuánto trae la presentación 1 (pz)").fill("12");
    await page.getByLabel("Se compra en").selectOption({ label: "Caja de 12" });
    await page.getByLabel("Se cuenta en").selectOption({ label: "Caja de 12" });
    await next(page).click();
    await page.getByLabel("Proveedor habitual").selectOption({ label: "COSTCO" });
    await next(page).click();
    await expect(page.getByText("En Caja de 12")).toBeVisible();
    await page.getByLabel("Mínimo en Bodega").fill("1");
    await page.getByLabel("Máximo en Bodega").fill("3");
    await next(page).click();
    await expect(progress(page)).toHaveText("Paso 5 de 5");
    await expect(page.locator('[data-summary="presentations"]')).toContainText("Caja de 12 = 12 pz");
    await expect(page.locator('[data-summary="supplier"]')).toContainText("COSTCO");
    await expect(page.locator('[data-summary="levels"]')).toContainText("Bodega: mínimo 1 Caja de 12, máximo 3 Caja de 12");
    await page.getByRole("button", { name: "Dar de alta" }).click();
    await expect(page.getByTestId("wizard-done")).toContainText("Se dio de alta Aguamineral.");
    await page.getByRole("link", { name: "Ver el producto" }).click();
    await expect(page.getByRole("main")).toContainText("Caja de 12");
  });

  await test.step("RF-44 RF-45 «Nuevo proveedor» con su comprador en la sucursal", async () => {
    await page.goto("/proveedores");
    await page.getByRole("link", { name: "Nuevo proveedor" }).click();
    await page.getByLabel("Nombre").fill("Costco");
    await expect(page.getByText("Ya existe «COSTCO».", { exact: false }).first()).toBeVisible();
    await page.getByLabel("Nombre").fill("SAMS");
    await page.getByLabel("Teléfono").fill("5500000000");
    await next(page).click();
    await expect(page.getByRole("heading", { name: "Comprador" })).toBeVisible();
    await page.getByLabel("Comprador en Sendero").selectOption({ label: "Comprador Uno" });
    await next(page).click();
    await expect(page.locator('[data-summary="buyer"]')).toContainText("Comprador en Sendero: Comprador Uno");
    await page.getByRole("button", { name: "Dar de alta" }).click();
    await expect(page.getByTestId("wizard-done")).toContainText("Se dio de alta SAMS.");
    await page.getByRole("link", { name: "Ver los proveedores" }).click();
    await expect(page.getByLabel("Comprador de SAMS en Sendero")).toHaveValue(/.+/);
  });
  fit();
});

test("asistentes de altas: empleado con documento (sueldo solo del dueño) y plantilla de checklist", async ({ page }) => {
  test.setTimeout(120_000);
  const w = await world();
  await page.setViewportSize({ width: 390, height: 844 });
  const fit = await measureWizards(page);

  await test.step("RF-11 RF-46 el administrador no tiene el paso del sueldo", async () => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto("/personal/nuevo");
    await expect(progress(page)).toHaveText("Paso 1 de 4");
    await page.getByLabel("Nombre").fill("Mesero Nuevo");
    await next(page).click();
    await next(page).click();
    await expect(page.getByRole("heading", { name: "Documentos" })).toBeVisible();
    await expect(page.getByRole("main")).not.toContainText("Sueldo");
    await logout(page);
  });

  await test.step("RF-46 el dueño da de alta con sueldo y sube un documento", async () => {
    await login(page, OWNER.email, OWNER.password);
    await workAt(page, w.branchId);
    await page.goto("/personal/nuevo");
    await expect(progress(page)).toHaveText("Paso 1 de 5");
    await page.getByLabel("Nombre").fill("Cocinera Nueva");
    await page.getByLabel("Teléfono").fill("5511111111");
    await next(page).click();
    await expect(page.getByLabel("Puesto")).toHaveValue(/.+/);
    await next(page).click();
    await expect(page.getByRole("heading", { name: "Sueldo por día" })).toBeVisible();
    await page.getByLabel("Sueldo por día").fill("450");
    await next(page).click();
    await page.getByLabel("Archivos de INE").setInputFiles({ name: "ine.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%prueba\n") });
    await next(page).click();
    await expect(page.locator('[data-summary="pay"]')).toContainText("$450.00");
    await expect(page.locator('[data-summary="documents"]')).toContainText("INE · ine.pdf");
    await page.getByRole("button", { name: "Dar de alta" }).click();
    await expect(page.getByTestId("wizard-done")).toContainText("Se dio de alta Cocinera Nueva.");
    await page.getByRole("link", { name: "Ver el expediente" }).click();
    await expect(page.getByRole("heading", { name: "Cocinera Nueva" })).toBeVisible();
    await expect(page.getByRole("main")).toContainText("ine.pdf");
  });

  await test.step("RF-47 la plantilla se arma por secciones y puntos", async () => {
    await page.goto("/checklists/plantillas/nueva");
    await expect(page.getByRole("heading", { name: "Nombre, días y sucursales" })).toBeVisible();
    await page.getByLabel("Nombre").fill("Apertura");
    await next(page).click();
    await next(page).click();
    await expect(page.getByText("Agrega al menos una sección con nombre.")).toBeVisible();
    await page.getByRole("button", { name: "Agregar sección" }).click();
    await page.getByLabel("Sección 1 · Nombre de la sección").fill("Barra");
    await next(page).click();
    await expect(page.getByRole("heading", { name: "Puntos de Barra" })).toBeVisible();
    await page.getByLabel("Punto 1 · Punto").fill("Foto de la barra limpia");
    await page.getByLabel("Punto 1 · Tipo").selectOption("photo");
    await page.getByLabel("Clave · Punto 1").check();
    await next(page).click();
    await expect(page.locator('[data-summary="sections"]')).toContainText("Barra: 1 punto");
    await expect(page.locator('[data-summary^="section-"]')).toContainText("Foto de la barra limpia · Palomita con foto · clave");
    await page.getByRole("button", { name: "Guardar plantilla" }).click();
    await expect(page.getByTestId("wizard-done")).toContainText("Se guardó la plantilla Apertura.");
    await page.getByRole("link", { name: "Ver la plantilla" }).click();
    await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Apertura");
  });
  fit();
});
