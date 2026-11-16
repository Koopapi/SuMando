// Criterios de la spec 009: nómina (el administrador marca sin ver pesos; el dueño captura, presta, cierra, ve la
// hoja de pago, baja el Excel, reabre con motivo y vuelve a cerrar), en escritorio.
import type { Page } from "@playwright/test";
import postgres from "postgres";
import { expect, test } from "./fixtures";
import { OWNER, lastMonday, login, logout, ownerApiAt, seedAdmin, seedBusiness, seedOwner } from "./helpers";
import { BASE, DB } from "./warm";

const ADMIN = { email: "admin.nomina@mando.test", password: "admin-nomina-1" };

async function world() {
  await seedOwner();
  const pastatti = await seedBusiness("Pastatti", ["Sendero"], "violeta");
  const branchId = pastatti.branches[0].id;
  await seedAdmin("Administrador de Sendero", ADMIN.email, [branchId], ADMIN.password);
  const call = await ownerApiAt(branchId);
  const { position } = await call("/api/positions", { name: "Mesero" });
  const { employee } = await call("/api/employees", { name: "Empleado de Nómina", positionId: position.id, hiredOn: "2026-10-01", dailyPay: "400" });
  return { branchId, businessId: pastatti.id, positionId: position.id as string, employeeId: employee.id as string, week: lastMonday() };
}

const row = (page: Page, name: string) => page.getByTestId("payroll-row").filter({ hasText: name });
const shot = async (page: Page, name: string) => {
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/${name}.png`, fullPage: true });
};

test("nómina: el administrador marca, el dueño paga, cierra, reabre y vuelve a cerrar", async ({ page }) => {
  const w = await world();
  await page.setViewportSize({ width: 1360, height: 950 });
  const r = () => row(page, "Empleado de Nómina");

  await test.step("RF-3 RF-4 el administrador abre Nómina y marca días, media jornada y retardo", async () => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.getByRole("navigation").getByRole("link", { name: "Nómina" }).first().click();
    await expect(page).toHaveURL(/\/nomina\/\d{4}-\d{2}-\d{2}$/);
    await page.goto(`/nomina/${w.week}`);
    await r().getByRole("button", { name: "Empleado de Nómina, Lunes: Sin marcar" }).click();
    await expect(r().getByRole("button", { name: "Empleado de Nómina, Lunes: Trabajó" })).toBeVisible();
    await r().getByRole("button", { name: "Empleado de Nómina, Martes: Sin marcar" }).click();
    await r().getByRole("button", { name: "Empleado de Nómina, Martes: Trabajó" }).click();
    await expect(r().getByRole("button", { name: "Empleado de Nómina, Martes: Media jornada" })).toBeVisible();
    await r().getByRole("button", { name: "Empleado de Nómina, Miércoles: Sin marcar" }).click();
    await r().getByRole("button", { name: "Empleado de Nómina, Miércoles: marcar retardo" }).click();
    await expect(r()).toContainText("2 días · 1 media · 1 retardo");
  });

  await test.step("RF-5 el administrador no ve ningún monto", async () => {
    await expect(page.getByTestId("payroll-net")).toHaveCount(0);
    await expect(page.getByTestId("payroll-totals")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Montos de / })).toHaveCount(0);
    await expect(page.getByRole("main")).not.toContainText("$");
    await shot(page, "semana-admin");
    await logout(page);
  });

  await test.step("RF-18 RF-19 RF-25 el dueño ve el neto y el total", async () => {
    await login(page, OWNER.email, OWNER.password);
    await page.request.put(`${BASE}/api/session/branch`, { data: { branchId: w.branchId } });
    await page.goto(`/nomina/${w.week}`);
    // 2 días × 400 + media 200 − retardo 200 = 800.
    await expect(r().getByTestId("payroll-net")).toHaveText("$800.00");
    await expect(page.getByTestId("page-figure")).toContainText("$800.00");
  });

  await test.step("RF-20 RF-24 el dueño captura extras, bonos y comida y el neto cambia al instante", async () => {
    await page.getByRole("button", { name: "Montos de Empleado de Nómina" }).click();
    await page.getByLabel("Extras").fill("200");
    await page.getByLabel("Bonos").fill("550");
    await page.getByLabel("Concepto del bono").fill("Bono del camarón");
    await page.getByLabel("Comida").fill("50");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(r().getByTestId("payroll-net")).toHaveText("$1,500.00");
    await shot(page, "semana-dueno");
  });

  await test.step("RF-27 RF-29 RF-34 el dueño presta desde el expediente y el abono se propone solo", async () => {
    await page.goto(`/personal/${w.employeeId}`);
    await page.getByRole("button", { name: "Nuevo préstamo" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Fecha").fill("2026-10-15");
    await dialog.getByLabel("Monto").fill("1000");
    await dialog.getByLabel("Abono semanal").fill("300");
    await page.getByRole("dialog").getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByTestId("employee-loans")).toContainText("Debe $1,000.00");
    await page.goto(`/nomina/${w.week}`);
    await expect(r().getByTestId("payroll-net")).toHaveText("$1,200.00");
  });

  await test.step("RF-35 RF-38 cerrar congela la semana", async () => {
    await page.getByRole("button", { name: "Cerrar semana" }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Cerrar semana" }).click();
    await expect(page.getByText("Cerrada", { exact: true })).toBeVisible();
    await expect(r().getByRole("button", { name: "Empleado de Nómina, Jueves: Sin marcar" })).toBeDisabled();
  });

  await test.step("RF-41 RF-42 RF-43 RF-44 la hoja de pago trae el neto, los billetes y la firma", async () => {
    await page.getByRole("link", { name: "Hoja de pago" }).click();
    const person = page.getByTestId("pay-sheet-person").filter({ hasText: "Empleado de Nómina" });
    await expect(person.getByTestId("pay-sheet-net")).toHaveText("$1,200.00");
    await expect(person.getByTestId("pay-sheet-cash")).toContainText("Billete de $1,000.00 × 1");
    await expect(person.getByTestId("pay-sheet-cash")).toContainText("Billete de $200.00 × 1");
    await expect(person).toContainText("Firma");
    await expect(page.getByTestId("pay-sheet-total-cash")).toContainText("Billete de $1,000.00 × 1");
    await expect(page.getByRole("button", { name: "Imprimir" })).toBeVisible();
    await shot(page, "hoja-de-pago");
  });

  await test.step("RF-45 el dueño baja la semana en Excel", async () => {
    const res = await page.request.get(`${BASE}/api/payroll/weeks/${w.week}/excel`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-disposition"]).toContain(`nomina-sendero-${w.week}.xlsx`);
    expect((await res.body()).subarray(0, 2).toString()).toBe("PK");
  });

  await test.step("RF-32 RF-39 RF-40 reabrir con motivo devuelve el abono y se vuelve a cerrar", async () => {
    await page.goto(`/personal/${w.employeeId}`);
    await expect(page.getByTestId("employee-loans")).toContainText("Debe $700.00");
    await page.goto(`/nomina/${w.week}`);
    await page.getByRole("button", { name: "Reabrir semana" }).click();
    await page.getByRole("dialog").getByLabel("Motivo").fill("Faltó marcar el jueves");
    await page.getByRole("dialog").getByRole("button", { name: "Reabrir" }).click();
    await expect(page.getByText("Abierta", { exact: true })).toBeVisible();
    await page.goto(`/personal/${w.employeeId}`);
    await expect(page.getByTestId("employee-loans")).toContainText("Debe $1,000.00");
    await page.goto(`/nomina/${w.week}`);
    await r().getByRole("button", { name: "Empleado de Nómina, Jueves: Sin marcar" }).click();
    await expect(r().getByTestId("payroll-net")).toHaveText("$1,600.00");
    await page.getByRole("button", { name: "Cerrar semana" }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Cerrar semana" }).click();
    await expect(page.getByText("Cerrada", { exact: true })).toBeVisible();
  });

  await test.step("RF-46 el historial muestra la semana cerrada con su total", async () => {
    await page.getByRole("link", { name: "Semanas" }).click();
    await expect(page.getByTestId("payroll-weeks")).toContainText("Cerrada · 1 persona · $1,600.00");
  });

  await test.step("RF-7 el administrador no llega a la hoja de pago ni al Excel", async () => {
    await logout(page);
    await login(page, ADMIN.email, ADMIN.password);
    expect((await page.request.get(`${BASE}/api/payroll/weeks/${w.week}/excel`)).status()).toBe(403);
    const res = await page.goto(`/nomina/${w.week}/hoja-de-pago`);
    expect(res?.status()).toBe(404);
  });
});

test("nómina: volumen de 60 empleados", async ({ page }) => {
  const w = await world();
  const sql = postgres(DB, { max: 1, onnotice: () => {} });
  try {
    const rows = Array.from({ length: 59 }, (_, i) => {
      const name = `Empleado ${String(i + 1).padStart(3, "0")}`;
      return { business_id: w.businessId, branch_id: w.branchId, name, name_key: name.toLowerCase(), position_id: w.positionId, daily_pay_cents: 40_000 };
    });
    const ids = (await sql<{ id: string }[]>`insert into employees ${sql(rows)} returning id`).map((r) => r.id);
    await sql`insert into employee_periods ${sql(ids.map((employee_id) => ({ employee_id, hired_on: "2026-01-01" })))}`;
  } finally {
    await sql.end();
  }
  await page.setViewportSize({ width: 1360, height: 950 });
  await login(page, OWNER.email, OWNER.password);
  await page.request.put(`${BASE}/api/session/branch`, { data: { branchId: w.branchId } });
  await page.goto(`/nomina/${w.week}`);

  await test.step("la semana de 60 empleados abre en menos de 2 segundos", async () => {
    const start = Date.now();
    await page.goto(`/nomina/${w.week}`);
    await expect(page.getByTestId("payroll-row")).toHaveCount(60);
    expect(Date.now() - start).toBeLessThan(2000);
  });

  await test.step("marcar un día actualiza el neto en menos de 300 ms", async () => {
    const one = row(page, "Empleado 001");
    await one.getByRole("button", { name: "Empleado 001, Lunes: Sin marcar" }).click();
    await expect(one.getByTestId("payroll-net")).toHaveText("$400.00");
    const start = Date.now();
    await one.getByRole("button", { name: "Empleado 001, Martes: Sin marcar" }).click();
    await expect(one.getByTestId("payroll-net")).toHaveText("$800.00");
    expect(Date.now() - start).toBeLessThan(300);
  });
});
