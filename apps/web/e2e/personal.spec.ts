// Criterios de la spec 008: personal (expediente, documentos, sueldo solo del dueño, baja y reingreso), en escritorio.
import postgres from "postgres";
import { expect, test } from "./fixtures";
import { OWNER, login, logout, ownerApiAt, seedAdmin, seedBusiness, seedOwner } from "./helpers";
import { BASE, DB } from "./warm";

const ADMIN = { email: "admin.personal@mando.test", password: "admin-personal-1" };
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1]);
const PDF = Buffer.from("%PDF-1.4\n%prueba\n");

async function world() {
  await seedOwner();
  const pastatti = await seedBusiness("Pastatti", ["Sendero"], "violeta");
  const branchId = pastatti.branches[0].id;
  await seedAdmin("Administrador de Sendero", ADMIN.email, [branchId], ADMIN.password);
  const call = await ownerApiAt(branchId);
  await call("/api/positions", { name: "Mesero" });
  return { branchId, businessId: pastatti.id };
}

test("personal: alta, documentos, sueldo del dueño, baja y reingreso", async ({ page }) => {
  const w = await world();
  await page.setViewportSize({ width: 1360, height: 950 });
  let url = "";

  await test.step("RF-39 RF-9 el administrador da de alta desde Personal", async () => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.getByRole("navigation").getByRole("link", { name: "Personal" }).first().click();
    await page.getByRole("link", { name: "Nuevo empleado" }).click();
    await expect(page.getByLabel("Sueldo por día")).toHaveCount(0);
    await page.getByLabel("Nombre").fill("Empleado de Prueba");
    await page.getByLabel("Puesto").selectOption({ label: "Mesero" });
    await page.getByLabel("Teléfono").fill("555 123 4567");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("heading", { name: "Empleado de Prueba" })).toBeVisible();
    url = page.url();
  });

  await test.step("RF-18 RF-21 sube el INE y queda entregado", async () => {
    await page.getByRole("button", { name: "Subir INE" }).click();
    await page.getByLabel("Foto o PDF").setInputFiles({ name: "ine.jpg", mimeType: "image/jpeg", buffer: JPG });
    await page.getByRole("dialog").getByRole("button", { name: "Subir" }).click();
    await expect(page.getByText("Documento guardado.")).toBeVisible();
    await expect(page.getByTestId("employee-document").filter({ hasText: "INE" })).toContainText("Entregado");
  });

  await test.step("RF-22 un comprobante de domicilio viejo queda vencido", async () => {
    await page.getByRole("button", { name: "Subir Comprobante de domicilio" }).click();
    await page.getByLabel("Foto o PDF").setInputFiles({ name: "luz.pdf", mimeType: "application/pdf", buffer: PDF });
    await page.getByLabel("Fecha de expedición").fill("2020-01-15");
    await page.getByRole("dialog").getByRole("button", { name: "Subir" }).click();
    await expect(page.getByTestId("employee-document").filter({ hasText: "Comprobante de domicilio" })).toContainText("Vencido");
  });

  await test.step("RF-5 RF-4 el administrador no ve archivos ni sueldo", async () => {
    await expect(page.getByRole("link", { name: /^Abrir / })).toHaveCount(0);
    await expect(page.getByLabel("Sueldo por día")).toHaveCount(0);
    await logout(page);
  });

  await test.step("RF-13 RF-36 el dueño fija el sueldo y lo ve en la tabla", async () => {
    await login(page, OWNER.email, OWNER.password);
    await page.request.put(`${BASE}/api/session/branch`, { data: { branchId: w.branchId } });
    await page.goto(url);
    await page.getByLabel("Sueldo por día").fill("450");
    await page.getByRole("button", { name: "Guardar sueldo" }).click();
    await expect(page.getByText("$450.00")).toBeVisible();
    await page.goto("/personal");
    await expect(page.getByRole("row").filter({ hasText: "Empleado de Prueba" })).toContainText("$450.00");
    await page.goto(url);
  });

  await test.step("RF-41 el dueño abre el archivo y queda en el registro", async () => {
    const href = await page.getByRole("link", { name: "Abrir ine.jpg" }).getAttribute("href");
    const res = await page.request.get(`${BASE}${href}`);
    expect(res.headers()["cache-control"]).toBe("private, no-store");
    await page.reload();
    await expect(page.getByTestId("employee-history")).toContainText("Archivo abierto");
  });

  await test.step("RF-28 RF-32 RF-33 baja con motivo y reingreso con el mismo expediente", async () => {
    await page.getByRole("button", { name: "Dar de baja" }).click();
    await page.getByLabel("Motivo").selectOption({ label: "Renuncia" });
    await page.getByRole("dialog").getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Baja", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Reactivar (reingreso)" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("region", { name: "Periodos de trabajo" }).getByRole("listitem")).toHaveCount(2);
    await expect(page.getByTestId("employee-document").filter({ hasText: "INE" })).toContainText("Entregado");
  });

  await test.step("RF-37 el filtro de incompletos lo encuentra", async () => {
    await page.goto("/personal");
    await page.getByRole("button", { name: "Incompletos" }).click();
    await expect(page.getByRole("row").filter({ hasText: "Empleado de Prueba" })).toBeVisible();
  });
});

test("personal: volumen de 200 empleados", async ({ page }) => {
  const w = await world();
  const sql = postgres(DB, { max: 1, onnotice: () => {} });
  try {
    const [{ id: positionId }] = await sql<{ id: string }[]>`select id from positions limit 1`;
    const rows = Array.from({ length: 200 }, (_, i) => {
      const name = `Empleado ${String(i + 1).padStart(3, "0")}`;
      return { business_id: w.businessId, branch_id: w.branchId, name, name_key: name.toLowerCase(), position_id: positionId };
    });
    const ids = (await sql<{ id: string }[]>`insert into employees ${sql(rows)} returning id`).map((r) => r.id);
    await sql`insert into employee_periods ${sql(ids.map((employee_id) => ({ employee_id, hired_on: "2026-01-01" })))}`;
  } finally {
    await sql.end();
  }
  await page.setViewportSize({ width: 1360, height: 950 });
  await login(page, OWNER.email, OWNER.password);
  await page.request.put(`${BASE}/api/session/branch`, { data: { branchId: w.branchId } });
  await test.step("la tabla de 200 empleados abre en menos de 2 segundos", async () => {
    await page.goto("/personal");
    const start = Date.now();
    await page.goto("/personal");
    await expect(page.getByTestId("table-count")).toHaveText("Mostrando 200 de 200");
    expect(Date.now() - start).toBeLessThan(2000);
  });
});
