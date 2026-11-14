// Criterios de la spec 010: checklists (el dueño arma la plantilla, un administrador habilita el teléfono de piso,
// el empleado llena con foto, el administrador cierra con pendientes y lo ve en el historial), en escritorio.
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { OWNER, login, logout, ownerApiAt, seedAdmin, seedBusiness, seedOwner } from "./helpers";
import { BASE } from "./warm";

const ADMIN = { email: "admin.checklists@mando.test", password: "admin-checklists-1" };
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1]);

async function world() {
  await seedOwner();
  const pastatti = await seedBusiness("Pastatti", ["Sendero"], "violeta");
  const branchId = pastatti.branches[0].id;
  await seedAdmin("Administrador de Sendero", ADMIN.email, [branchId], ADMIN.password);
  const call = await ownerApiAt(branchId);
  const { position: cocina } = await call("/api/positions", { name: "Cocina" });
  await call("/api/positions", { name: "Caja" });
  await call("/api/employees", { name: "Cocinera de Prueba", positionId: cocina.id, hiredOn: "2026-01-01" });
  return { branchId, businessId: pastatti.id, cocinaId: cocina.id as string };
}

const section = (page: Page, name: string) => page.getByTestId("sheet-section").filter({ has: page.getByRole("heading", { name, exact: true }) });

test("checklists: plantilla, teléfono de piso, foto, cierre con pendientes e historial", async ({ page, browser }) => {
  const w = await world();
  await page.setViewportSize({ width: 1360, height: 950 });

  await test.step("RF-6 RF-9 RF-10 RF-11 el dueño arma la plantilla con clave y foto", async () => {
    await login(page, OWNER.email, OWNER.password);
    await page.request.put(`${BASE}/api/session/branch`, { data: { branchId: w.branchId } });
    await page.goto("/checklists/plantillas/nueva");
    await page.getByLabel("Nombre", { exact: true }).fill("Apertura");
    await page.getByRole("checkbox", { name: "Sendero" }).check();
    await page.getByRole("button", { name: "Agregar sección" }).click();
    let s = page.getByTestId("template-section").nth(0);
    await s.getByLabel("Nombre de la sección").fill("Cocina");
    await s.getByLabel("Puesto responsable").selectOption({ label: "Cocina" });
    await s.getByTestId("template-item").nth(0).getByLabel("Punto", { exact: true }).fill("Gas abierto");
    await s.getByTestId("template-item").nth(0).getByRole("checkbox", { name: "Clave" }).check();
    await s.getByRole("button", { name: "Agregar punto" }).click();
    await s.getByTestId("template-item").nth(1).getByLabel("Punto", { exact: true }).fill("Refrigerador a temperatura");
    await s.getByTestId("template-item").nth(1).getByLabel("Tipo").selectOption({ label: "Palomita con foto" });
    await s.getByRole("button", { name: "Agregar punto" }).click();
    await s.getByTestId("template-item").nth(2).getByLabel("Punto", { exact: true }).fill("Mesas limpias");
    await page.getByRole("button", { name: "Agregar sección" }).click();
    s = page.getByTestId("template-section").nth(1);
    await s.getByLabel("Nombre de la sección").fill("Caja");
    await s.getByLabel("Puesto responsable").selectOption({ label: "Caja" });
    await s.getByTestId("template-item").nth(0).getByLabel("Punto", { exact: true }).fill("Fondo de caja contado");
    await s.getByTestId("template-item").nth(0).getByRole("checkbox", { name: "Clave" }).check();
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByTestId("checklist-templates")).toContainText("Apertura");
    await logout(page);
  });

  await test.step("RF-37 un administrador habilita el teléfono de piso y su sesión se cierra en él", async () => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto("/checklists/telefonos");
    await page.getByLabel("Nombre del teléfono").fill("Tablet de cocina");
    await page.getByRole("button", { name: "Habilitar este teléfono" }).click();
    await expect(page.getByRole("heading", { name: "¿Quién eres?" })).toBeVisible();
    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name === "mando_floor")).toBe(true);
    expect(cookies.some((c) => c.name === "mando_session")).toBe(false);
  });

  await test.step("RF-39 el teléfono no abre nada más", async () => {
    await page.goto("/productos");
    await expect(page).toHaveURL(/\/piso$/);
    expect((await page.request.get(`${BASE}/api/products`)).status()).toBe(401);
  });

  await test.step("RF-19 RF-40 RF-25 RF-22 RF-27 el empleado elige su nombre, palomea, toma la foto y da por lista", async () => {
    await page.getByRole("button", { name: "Cocinera de Prueba" }).click();
    await page.getByRole("link", { name: /Apertura/ }).click();
    await expect(page.getByTestId("sheet-section").first()).toContainText("Cocina");
    const cocina = section(page, "Cocina");
    await cocina.getByRole("button", { name: "Todo en orden en Cocina" }).click();
    await expect(cocina.getByRole("checkbox", { name: "Mesas limpias" })).toBeChecked();
    await expect(cocina.getByRole("checkbox", { name: "Gas abierto" })).not.toBeChecked();
    await expect(cocina.getByRole("button", { name: "Sección lista: Cocina" })).toBeDisabled();
    await cocina.getByRole("checkbox", { name: "Gas abierto" }).click();
    await expect(cocina.getByRole("checkbox", { name: "Gas abierto" })).toBeChecked();
    await cocina.getByLabel("Foto de Refrigerador a temperatura").setInputFiles({ name: "refri.jpg", mimeType: "image/jpeg", buffer: JPG });
    await expect(cocina.getByRole("checkbox", { name: "Refrigerador a temperatura" })).toBeChecked();
    await cocina.getByRole("button", { name: "Sección lista: Cocina" }).click();
    await expect(cocina).toContainText("Lista · Cocinera de Prueba (Tablet de cocina)");
    await expect(page.getByRole("button", { name: "Cerrar hoja" })).toHaveCount(0);
  });

  await test.step("RF-32 RF-33 RF-46 RF-47 el administrador cierra con pendientes y lo ve en el historial", async () => {
    const admin = await browser.newPage({ viewport: { width: 1360, height: 950 } });
    await login(admin, ADMIN.email, ADMIN.password);
    await admin.goto("/checklists");
    await admin.getByRole("link", { name: /Apertura/ }).click();
    await expect(section(admin, "Cocina")).toContainText("Cocinera de Prueba");
    await admin.getByRole("button", { name: "Cerrar hoja" }).first().click();
    await admin.getByRole("dialog").getByRole("button", { name: "Cerrar hoja" }).click();
    await expect(admin.getByTestId("sheet-pending")).toContainText("Caja: Fondo de caja contado");
    await admin.goto("/checklists/historial");
    await expect(admin.getByTestId("checklists-history")).toContainText("Cerrada · 1 sección pendiente");
    await admin.goto("/checklists/telefonos");
    await admin.getByRole("button", { name: "Deshabilitar Tablet de cocina" }).click();
    await expect(admin.getByTestId("floor-devices")).toContainText("Deshabilitado");
    await admin.close();
  });

  await test.step("RF-44 el teléfono deshabilitado deja de funcionar", async () => {
    expect((await page.request.get(`${BASE}/api/checklists`)).status()).toBe(401);
    await page.goto("/piso");
    await expect(page).toHaveURL(/\/login$/);
  });
});

test("checklists: volumen de 150 puntos", async ({ page }) => {
  const w = await world();
  const call = await ownerApiAt(w.branchId);
  const sections = Array.from({ length: 15 }, (_, s) => ({ name: `Sección ${s + 1}`, items: Array.from({ length: 10 }, (_, i) => ({ text: `Punto ${s + 1}.${i + 1}`, kind: "check" })) }));
  const { template } = await call("/api/checklist-templates", { name: "Grande", days: [0, 1, 2, 3, 4, 5, 6], branchIds: [w.branchId], sections });
  await page.setViewportSize({ width: 1360, height: 950 });
  await login(page, OWNER.email, OWNER.password);
  await page.request.put(`${BASE}/api/session/branch`, { data: { branchId: w.branchId } });
  await page.goto("/checklists");
  const href = await page.getByRole("link", { name: /Grande/ }).getAttribute("href");

  await test.step("la hoja de 150 puntos abre en menos de 2 segundos", async () => {
    await page.goto(href!);
    const start = Date.now();
    await page.goto(href!);
    await expect(page.getByTestId("sheet-item")).toHaveCount(150);
    expect(Date.now() - start).toBeLessThan(2000);
    expect(template.sections).toHaveLength(15);
  });

  await test.step("una palomita se guarda en menos de 300 ms", async () => {
    const first = section(page, "Sección 1");
    await first.getByRole("checkbox", { name: "Punto 1.1", exact: true }).click();
    await expect(first.getByRole("checkbox", { name: "Punto 1.1", exact: true })).toBeChecked();
    const start = Date.now();
    await first.getByRole("checkbox", { name: "Punto 1.2", exact: true }).click();
    await expect(first.getByText("2 de 10")).toBeVisible();
    expect(Date.now() - start).toBeLessThan(300);
  });
});
