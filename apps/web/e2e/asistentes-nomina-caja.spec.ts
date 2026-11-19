// Criterios de la spec 015 en nómina y caja: «Asistencia de la semana» (el administrador sin montos), «Cerrar la
// semana» con aviso de bono y billetes de cada sobre, y «Abrir caja», «Corte» y «Reporte del punto de venta».
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { OWNER, lastMonday, login, logout, ownerApiAt, seedAdmin, seedBusiness, seedOwner } from "./helpers";
import { BASE } from "./warm";

const ADMIN = { email: "admin.asistentes@mando.test", password: "admin-asistentes-1" };

async function world() {
  await seedOwner();
  const pastatti = await seedBusiness("Pastatti", ["Sendero"], "violeta");
  const branchId = pastatti.branches[0].id;
  await seedAdmin("Administrador de Sendero", ADMIN.email, [branchId], ADMIN.password);
  const call = await ownerApiAt(branchId);
  const { position } = await call("/api/positions", { name: "Mesero" });
  const { employee: uno } = await call("/api/employees", { name: "Empleado Uno", positionId: position.id, hiredOn: "2026-01-01", dailyPay: "400" });
  await call("/api/employees", { name: "Empleado Dos", positionId: position.id, hiredOn: "2026-01-01", dailyPay: "500" });
  await call(`/api/employees/${uno.id}/loans`, { lentOn: "2026-01-15", amount: "1000", weekly: "300" });
  await call("/api/cash/settings", { mode: "daily", floorEnabled: false, methods: [{ name: "BBVA 1" }] }, "PUT");
  return { branchId, week: lastMonday() };
}

const progress = (page: Page) => page.getByTestId("wizard-progress");
const next = (page: Page) => page.getByRole("button", { name: "Siguiente" });
const workAt = (page: Page, branchId: string) => page.request.put(`${BASE}/api/session/branch`, { data: { branchId } });

test("asistentes de nómina: asistencia sin montos y cerrar la semana con billetes", async ({ page }) => {
  test.setTimeout(150_000);
  const w = await world();
  await page.setViewportSize({ width: 390, height: 844 });

  await test.step("RF-1 RF-2 RF-23 RF-38 el administrador pasa asistencia un día a la vez", async () => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto(`/nomina/${w.week}`);
    await expect(progress(page)).toHaveText("Paso 1 de 8");
    await expect(page.getByRole("heading", { name: /: Lunes/ })).toBeVisible();
    await expect(page.getByTestId("wizard-hint")).toContainText("Marca quién trabajó ese día");
    await page.getByLabel("Asistencia de Empleado Uno").selectOption("worked");
    await page.getByLabel("Empleado Uno llegó tarde").check();
    await page.getByLabel("Asistencia de Empleado Dos").selectOption("worked");
    await next(page).click();
    await expect(page.getByRole("heading", { name: /: Martes/ })).toBeVisible();
    await page.getByLabel("Asistencia de Empleado Uno").selectOption("worked");
    for (let i = 0; i < 6; i++) await next(page).click();
    await expect(progress(page)).toHaveText("Paso 8 de 8");
  });

  await test.step("RF-7 RF-11 RF-38 el resumen muestra los cambios por día y nunca montos", async () => {
    await expect(page.locator('[data-summary="day-0"]')).toContainText("Empleado Uno: Trabajó, con retardo");
    await expect(page.locator('[data-summary="day-0"]')).toContainText("Empleado Dos: Trabajó");
    await expect(page.locator('[data-summary="day-1"]')).toContainText("Empleado Uno: Trabajó");
    await expect(page.locator('[data-summary="day-2"]')).toContainText("Sin cambios");
    await expect(page.getByRole("main")).not.toContainText("$");
    await page.getByRole("button", { name: "Guardar asistencia" }).click();
    await expect(page.getByTestId("wizard-done")).toContainText("Se guardaron 3 cambios de asistencia.");
    await page.getByRole("link", { name: "Ver la semana" }).click();
    await expect(page.getByTestId("payroll-row").filter({ hasText: "Empleado Uno" })).toContainText("2 días · 0 medias · 1 retardo");
    await logout(page);
  });

  await test.step("RF-13 RF-39 el dueño captura montos y un bono mayor que el sueldo de la semana pide confirmar", async () => {
    await login(page, OWNER.email, OWNER.password);
    await workAt(page, w.branchId);
    await page.goto(`/nomina/${w.week}/cerrar`);
    await expect(progress(page)).toHaveText("Paso 1 de 4");
    await expect(page.getByRole("heading", { name: "Extras, bonos y comida" })).toBeVisible();
    await page.getByLabel("Bonos · Empleado Uno").fill("900");
    await page.getByLabel("Concepto del bono · Empleado Uno").fill("Buen servicio");
    await expect(page.locator('[data-unusual="pending"]')).toContainText("hasta el sueldo de la semana ($800.00)");
    await page.getByLabel("Comida · Empleado Dos").fill("50");
    await next(page).click();
    await expect(page.getByText("Confirma los montos marcados como fuera de lo normal.")).toBeVisible();
    await page.getByRole("button", { name: /^Sí, es correcto/ }).click();
    await next(page).click();
  });

  await test.step("RF-39 préstamos y revisión por persona calculada por el servidor", async () => {
    await expect(page.getByRole("heading", { name: "Préstamos" })).toBeVisible();
    const loan = page.getByLabel(/^Empleado Uno · Abono del préstamo/);
    await expect(loan).toHaveValue("300.00");
    await loan.fill("100");
    await next(page).click();
    await expect(page.getByRole("heading", { name: "Revisión por persona" })).toBeVisible();
    // Uno: 800 de días + 900 de bono − 200 de retardo − 100 de abono. Dos: 500 − 50 de comida.
    await expect(page.getByTestId("close-review-row").filter({ hasText: "Empleado Uno" })).toContainText("$1,400.00");
    await expect(page.getByTestId("close-review-row").filter({ hasText: "Empleado Dos" })).toContainText("$450.00");
    await next(page).click();
  });

  await test.step("RF-7 RF-9 RF-39 el resumen trae los billetes de cada sobre y cierra la semana", async () => {
    await expect(progress(page)).toHaveText("Paso 4 de 4");
    const envelopes = page.getByTestId("close-envelopes");
    await expect(envelopes).toContainText("$1,850.00");
    const envelope = (name: string) => envelopes.locator("div").filter({ hasText: name }).getByTestId("close-envelope");
    // Uno: 1,400 = 1,000 + 2 × 200. Dos: 450 = 2 × 200 + 50.
    await expect(envelope("Empleado Uno")).toHaveText("Billete de $1,000.00 × 1Billete de $200.00 × 2");
    await expect(envelope("Empleado Dos")).toHaveText("Billete de $200.00 × 2Billete de $50.00 × 1");
    await page.getByRole("button", { name: "Cerrar semana", exact: true }).click();
    await expect(page.getByTestId("wizard-done")).toContainText("Se cerró la semana.");
    await page.getByRole("link", { name: "Ver la hoja de pago" }).click();
    await expect(page).toHaveURL(new RegExp(`/nomina/${w.week}/hoja-de-pago`));
    await expect(page.getByRole("main")).toContainText("$1,850.00");
  });
});

test("asistentes de caja: abrir, corte con gasto y reporte con lo que no cuadra", async ({ page }) => {
  test.setTimeout(120_000);
  const w = await world();
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, OWNER.email, OWNER.password);
  await workAt(page, w.branchId);

  await test.step("RF-23 RF-40 sin corte abierto, /caja abre el asistente «Abrir caja»", async () => {
    await page.goto("/caja");
    await expect(progress(page)).toHaveText("Paso 1 de 2");
    await expect(page.getByRole("heading", { name: "Fondo" })).toBeVisible();
    await page.getByLabel("Fondo inicial").fill("500");
    await next(page).click();
    await expect(page.locator('[data-summary="fund"]')).toContainText("$500.00");
    await page.getByRole("button", { name: "Abrir caja" }).click();
    await expect(page.getByTestId("wizard-done")).toContainText("Se abrió la caja.");
    await page.getByRole("link", { name: "Ver el corte" }).click();
  });

  await test.step("RF-5 RF-41 el corte cuenta por denominación, pide cada terminal y agrega un gasto", async () => {
    await page.getByRole("link", { name: "Contar", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Efectivo por denominación" })).toBeVisible();
    await page.getByLabel("Billetes de $1,000.00", { exact: true }).fill("1");
    await page.getByLabel("Billetes de $500.00", { exact: true }).fill("1");
    await expect(page.getByTestId("cash-counted-total")).toContainText("$1,500.00");
    await next(page).click();
    await next(page).click();
    await expect(page.getByText("Escribe lo de BBVA 1; si no hubo, escribe 0.")).toBeVisible();
    await page.getByLabel("BBVA 1").fill("2000");
    await next(page).click();
    await expect(page.getByRole("heading", { name: "Gastos pagados de la caja" })).toBeVisible();
    await page.getByRole("button", { name: "Agregar gasto" }).click();
    await page.getByLabel("Concepto del gasto 1").fill("Hielo");
    await page.getByLabel("Monto del gasto 1").fill("100");
    await next(page).click();
    await expect(page.locator('[data-summary="expenses"]')).toContainText("Hielo · $100.00");
    await page.getByRole("button", { name: "Entregar conteo" }).click();
    await expect(page.getByTestId("wizard-done")).toContainText("Se entregó el conteo.");
    await page.getByRole("link", { name: "Ver el corte" }).click();
    await expect(page.getByTestId("cash-movements")).toContainText("Hielo");
  });

  await test.step("RF-42 el reporte del punto de venta muestra lo que no cuadra antes de guardarlo", async () => {
    await page.getByRole("link", { name: "Capturar reporte" }).click();
    await page.getByLabel("Efectivo").fill("1000");
    await page.getByLabel("BBVA 1").fill("2100");
    await next(page).click();
    // Efectivo: esperado 500 + 1,000 − 100 = 1,400 y se contaron 1,500. BBVA: 2,000 contra 2,100.
    const preview = page.getByTestId("pos-preview");
    await expect(preview).toContainText("2 formas de pago no cuadran.");
    await expect(preview).toContainText("Sobran $100.00");
    await expect(preview).toContainText("Faltan $100.00");
    await page.getByRole("button", { name: "Guardar reporte" }).click();
    await expect(page.getByTestId("wizard-done")).toContainText("Se guardó el reporte del punto de venta.");
    await page.getByRole("link", { name: "Ver el corte" }).click();
    await expect(page.getByRole("button", { name: "Cerrar corte" })).toBeVisible();
  });
});
