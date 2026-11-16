// Criterios de la spec 011: corte de caja (el dueño configura, el cajero abre, gasta y cuenta a ciegas en el teléfono
// de piso, el administrador captura el reporte del punto de venta, ve una diferencia y cierra; el dueño reabre).
import { expect, test } from "./fixtures";
import { OWNER, login, ownerApiAt, seedAdmin, seedBusiness, seedOwner } from "./helpers";
import { BASE } from "./warm";

const ADMIN = { email: "admin.caja@mando.test", password: "admin-caja-1" };

async function world() {
  await seedOwner();
  const pastatti = await seedBusiness("Pastatti", ["Sendero"], "violeta");
  const branchId = pastatti.branches[0].id;
  await seedAdmin("Administrador de Sendero", ADMIN.email, [branchId], ADMIN.password);
  const call = await ownerApiAt(branchId);
  const { position } = await call("/api/positions", { name: "Caja" });
  await call("/api/employees", { name: "Cajero de Prueba", positionId: position.id, hiredOn: "2026-01-01" });
  return { branchId };
}

test("corte de caja: configuración, conteo a ciegas en el teléfono, diferencias, cierre y reapertura", async ({ page, browser }) => {
  const w = await world();
  await page.setViewportSize({ width: 1360, height: 950 });

  await test.step("RF-6 RF-8 RF-10 el dueño configura la sucursal", async () => {
    await login(page, OWNER.email, OWNER.password);
    await page.request.put(`${BASE}/api/session/branch`, { data: { branchId: w.branchId } });
    await page.goto("/caja/configuracion");
    await page.getByLabel("Cortes").selectOption({ label: "Varios por día" });
    await page.getByRole("checkbox", { name: /teléfono de piso/ }).check();
    for (const name of ["BBVA 1", "Transferencias"]) {
      await page.getByRole("button", { name: "Agregar forma de pago" }).click();
      await page.getByTestId("cash-methods").getByLabel("Nombre", { exact: true }).last().fill(name);
    }
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Guardado")).toBeVisible();
  });

  const phone = await browser.newPage({ viewport: { width: 1360, height: 950 } });
  await test.step("RF-30 RF-31 el cajero abre la caja en el teléfono de piso y registra un gasto", async () => {
    await login(phone, ADMIN.email, ADMIN.password);
    await phone.goto("/checklists/telefonos");
    await phone.getByLabel("Nombre del teléfono").fill("Tablet de caja");
    await phone.getByRole("button", { name: "Habilitar este teléfono" }).click();
    await phone.getByRole("button", { name: "Cajero de Prueba" }).click();
    await phone.getByRole("link", { name: /Corte de caja/ }).click();
    await phone.getByLabel("Fondo inicial").fill("500");
    await phone.getByRole("button", { name: "Abrir caja" }).click();
    await expect(phone.getByText(/abierto .* por Cajero de Prueba/)).toBeVisible();
    await phone.getByLabel("Concepto").fill("Hielo");
    await phone.getByLabel("Monto", { exact: true }).fill("100");
    await phone.getByRole("button", { name: "Registrar" }).click();
    await expect(phone.getByTestId("cash-movements")).toContainText("Hielo");
  });

  await test.step("RF-18 RF-20 RF-22 RF-32 cuenta a ciegas con el asistente y entrega", async () => {
    await phone.getByRole("button", { name: "Contar" }).click();
    await phone.getByLabel("Billetes de $1,000.00", { exact: true }).fill("1");
    await phone.getByRole("button", { name: "Una más: Billetes de $200.00" }).click();
    await expect(phone.getByTestId("cash-counted-total")).toContainText("$1,200.00");
    await phone.getByRole("button", { name: "Siguiente" }).click();
    await phone.getByLabel("BBVA 1").fill("2000");
    await phone.getByLabel("Transferencias").fill("300");
    await phone.getByRole("button", { name: "Siguiente" }).click();
    await phone.getByRole("button", { name: "Terminar" }).click();
    await expect(phone.getByText("Contado", { exact: true })).toBeVisible();
    await expect(phone.getByTestId("cash-summary")).toHaveCount(0);
    await expect(phone.getByText("Punto de venta")).toHaveCount(0);
  });

  await test.step("RF-23 RF-25 RF-26 RF-29 el administrador captura el reporte y ve la diferencia", async () => {
    await page.goto("/caja");
    await page.getByLabel("Efectivo").fill("800");
    await page.getByLabel("BBVA 1").fill("2100");
    await page.getByLabel("Transferencias").fill("300");
    await page.getByRole("button", { name: "Guardar reporte" }).click();
    // Esperado 800 + 500 − 100 = 1,200: cuadra. BBVA: faltan 100.
    const summary = page.getByTestId("cash-summary");
    await expect(summary.getByRole("row", { name: /Efectivo/ })).toContainText("Cuadra");
    await expect(summary.getByRole("row", { name: /BBVA 1/ })).toContainText("Faltan $100.00");
    await expect(page.getByTestId("cash-figures")).toContainText("$3,200.00");
  });

  await test.step("RF-34 RF-40 cierra y queda en el historial", async () => {
    await page.getByRole("button", { name: "Cerrar corte" }).click();
    await page.getByRole("dialog").getByLabel("Nota (opcional)").fill("Revisar voucher de BBVA");
    await page.getByRole("dialog").getByRole("button", { name: "Cerrar corte" }).click();
    await expect(page.getByText("No hay un corte abierto")).toBeVisible();
    await page.goto("/caja/historial");
    await expect(page.getByTestId("cash-history")).toContainText("diferencia -$100.00");
  });

  await test.step("RF-38 el dueño reabre con motivo", async () => {
    await page.getByTestId("cash-history").getByRole("link").first().click();
    await page.getByRole("button", { name: "Reabrir corte" }).click();
    await page.getByRole("dialog").getByLabel("Motivo").fill("Corregir el reporte de BBVA");
    await page.getByRole("dialog").getByRole("button", { name: "Reabrir" }).click();
    await expect(page.getByText("Contado", { exact: true })).toBeVisible();
  });
  await phone.close();
});
