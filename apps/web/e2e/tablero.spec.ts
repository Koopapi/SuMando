// Criterios de la spec 012: tablero (el dueño ve alertas de los cuatro tipos en dos negocios, abre ventas y desglosa
// por negocio y sucursal, cambia a un rango libre, exporta a Excel y marca un corte como revisado; el administrador
// solo ve alertas y ventas de su sucursal).
import { expect, test } from "./fixtures";
import { OWNER, login, ownerApiAt, seedAdmin, seedBusiness, seedCashCut, seedCatalog, seedEmployee, seedOwner, seedPayroll } from "./helpers";

const ADMIN = { email: "admin.tablero@mando.test", password: "admin-tablero-1" };
const today = () => new Date(Date.now() - 6 * 3_600_000).toISOString().slice(0, 10);

async function world() {
  await seedOwner();
  const pastatti = await seedBusiness("Pastatti", ["Sendero"], "violeta");
  const pirrus = await seedBusiness("Pirrus", ["Centro"], "rojo");
  const sendero = pastatti.branches[0].id;
  await seedAdmin("Administrador de Sendero", ADMIN.email, [sendero], ADMIN.password);
  // Sendero: existencia bajo el mínimo, una requisición aprobada por recibir y una semana terminada sin cerrar.
  const { productId } = await seedCatalog(sendero);
  const call = await ownerApiAt(sendero);
  const { warehouses } = await call("/api/inventory/stock");
  const camara = warehouses.find((w: { name: string }) => w.name === "Cámara fría").id;
  await call("/api/requisitions", { warehouseId: camara, lines: [{ productId, quantity: "2000" }], note: null });
  await seedPayroll(sendero, await seedEmployee(sendero));
  // Pirrus: un corte cerrado con diferencia (venta 2,600).
  const cutId = await seedCashCut(pirrus.branches[0].id);
  return { cutId };
}

test("tablero: alertas, ventas por negocio y sucursal, rango, Excel, revisado y vista del administrador", async ({ page }) => {
  const w = await world();
  await page.setViewportSize({ width: 1360, height: 950 });

  await test.step("RF-1 RF-2 RF-7 RF-16 RF-37 el dueño abre el tablero desde la navegación", async () => {
    await login(page, OWNER.email, OWNER.password);
    await page.goto("/elegir-sucursal");
    await page.getByRole("button", { name: "Trabajar en Pastatti · Sendero" }).click();
    await page.waitForURL(/\/$/);
    await page.getByRole("navigation").getByRole("link", { name: "Tablero" }).click();
    await page.waitForURL(/\/tablero$/);
    for (const s of ["alerts", "sales", "expenses", "payroll", "remaining"]) await expect(page.getByTestId(`section-${s}`)).toBeVisible();
    await expect(page.getByRole("button", { name: "Hoy", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("section-alerts")).toContainText("4 alertas");
    await expect(page.getByTestId("section-sales")).toContainText("$2,600.00");
  });

  await test.step("RF-8 RF-39 RF-41 RF-43 RF-44 RF-45 las alertas se abren en la misma pantalla", async () => {
    await page.getByTestId("section-alerts").click();
    await page.waitForURL(/seccion=alerts/);
    const detail = page.getByTestId("dashboard-detail");
    await expect(detail.getByTestId("alerts-low_stock")).toContainText("Aceite de oliva en Cámara fría");
    await expect(detail.getByTestId("alerts-requisition")).toContainText("Aprobada");
    await expect(detail.getByTestId("alerts-payroll")).toContainText("Terminó y sigue sin cerrar");
    await expect(detail.getByTestId("alerts-cash_difference")).toContainText("Pirrus · Centro");
  });

  await test.step("RF-9 RF-21 RF-22 RF-27 ventas: total, por negocio y por sucursal", async () => {
    await page.getByTestId("section-sales").click();
    await page.waitForURL(/seccion=sales/);
    const detail = page.getByTestId("dashboard-detail");
    await expect(detail.getByTestId("alerts-low_stock")).toHaveCount(0);
    await expect(detail.getByTestId("detail-total")).toContainText("$2,600.00");
    await detail.getByRole("button", { name: /Ver sucursales de Pirrus/ }).click();
    await expect(detail.getByTestId("branches-Pirrus")).toContainText("Centro");
    await expect(detail.getByTestId("detail-methods")).toContainText("BBVA 1");
  });

  await test.step("RF-10 RF-12 RF-20 un rango libre mantiene la sección abierta", async () => {
    await page.getByRole("button", { name: "Rango", exact: true }).click();
    await page.getByLabel("Desde").fill(today());
    await page.getByLabel("Hasta").fill(today());
    await page.getByRole("button", { name: "Ver rango" }).click();
    await page.waitForURL(/periodo=range.*seccion=sales/);
    await expect(page.getByTestId("dashboard-detail").getByTestId("detail-total")).toContainText("sin periodo anterior");
  });

  await test.step("RF-51 RF-53 exporta la sección abierta a Excel", async () => {
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: "Bajar Excel" }).click();
    expect((await download).suggestedFilename()).toBe(`tablero-sales-${today()}-a-${today()}.xlsx`);
  });

  await test.step("RF-46 RF-47 RF-48 la alerta abre el corte en su sucursal y el dueño lo marca revisado", async () => {
    await page.goto("/tablero?seccion=alerts");
    await page.getByTestId("alerts-cash_difference").getByRole("button").click();
    await page.waitForURL(new RegExp(`/caja/${w.cutId}`));
    await page.getByRole("button", { name: "Marcar como revisado" }).click();
    await expect(page.getByTestId("cut-reviewed")).toContainText("Revisado por Dueño de prueba");
    await page.goto("/tablero");
    await expect(page.getByTestId("section-alerts")).toContainText("3 alertas");
  });

  await test.step("RF-3 RF-4 el administrador solo ve alertas y ventas de su sucursal", async () => {
    await page.context().clearCookies();
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto("/tablero?seccion=sales");
    await expect(page.getByTestId("section-alerts")).toContainText("3 alertas");
    for (const s of ["expenses", "payroll", "remaining"]) await expect(page.getByTestId(`section-${s}`)).toHaveCount(0);
    const detail = page.getByTestId("dashboard-detail");
    await expect(detail).toContainText("Pastatti");
    await expect(detail).not.toContainText("Pirrus");
  });
});
