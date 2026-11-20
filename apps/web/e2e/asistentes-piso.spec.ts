// Criterios de la spec 015 en el teléfono de piso: «Checklist» (elige tu nombre, una sección por paso, puntos clave uno
// por uno con foto, retomar por empleado en ese teléfono) y «Corte ciego» (efectivo, terminales y resumen sin nada de lo
// esperado, sin avisos de dato raro), a 390 × 844.
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { expectNoHorizontalOverflow, login, ownerApiAt, seedAdmin, seedBusiness, seedOwner, measureWizards } from "./helpers";

const ADMIN = { email: "admin.piso@mando.test", password: "admin-piso-1" };
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1]);

async function world() {
  await seedOwner();
  const pastatti = await seedBusiness("Pastatti", ["Sendero"], "violeta");
  const branchId = pastatti.branches[0].id;
  await seedAdmin("Administrador de Sendero", ADMIN.email, [branchId], ADMIN.password);
  const call = await ownerApiAt(branchId);
  const { position: cocina } = await call("/api/positions", { name: "Cocina" });
  const { position: caja } = await call("/api/positions", { name: "Caja" });
  await call("/api/employees", { name: "Cocinera de Prueba", positionId: cocina.id, hiredOn: "2026-01-01" });
  await call("/api/employees", { name: "Cajero de Prueba", positionId: caja.id, hiredOn: "2026-01-01" });
  await call("/api/checklist-templates", {
    name: "Apertura",
    days: [0, 1, 2, 3, 4, 5, 6],
    branchIds: [branchId],
    sections: [
      {
        name: "Cocina",
        positionId: cocina.id,
        items: [
          { text: "Gas abierto", kind: "check", isKey: true },
          { text: "Refrigerador a temperatura", kind: "photo", isKey: true },
          { text: "Mesas limpias", kind: "check" },
          { text: "Observaciones", kind: "comment" },
        ],
      },
      { name: "Caja", positionId: caja.id, items: [{ text: "Fondo contado", kind: "check", isKey: true }] },
    ],
  });
  await call("/api/cash/settings", { mode: "multiple", floorEnabled: true, methods: [{ name: "BBVA 1" }] }, "PUT");
  await call("/api/cash/cuts", { fund: "500" });
  return { branchId };
}

const progress = (page: Page) => page.getByTestId("wizard-progress");
const next = (page: Page) => page.getByRole("button", { name: "Siguiente" });
const heading = (page: Page, name: string) => page.getByRole("heading", { name: new RegExp(`: ${name}$`) });

async function checkStep(page: Page, button = "Siguiente") {
  await expectNoHorizontalOverflow(page);
  await expect(page.getByRole("button", { name: button })).toBeInViewport();
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

async function enablePhone(page: Page) {
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/checklists/telefonos");
  await page.getByLabel("Nombre del teléfono").fill("Tablet de piso");
  await page.getByRole("button", { name: "Habilitar este teléfono" }).click();
  await expect(page.getByRole("heading", { name: "¿Quién eres?" })).toBeVisible();
}

test("asistentes de piso: checklist por secciones con puntos clave y foto", async ({ page }) => {
  test.setTimeout(120_000);
  await world();
  await page.setViewportSize({ width: 390, height: 844 });
  const fit = await measureWizards(page);
  await enablePhone(page);

  await test.step("RF-48 elige tu nombre y solo sus secciones", async () => {
    await page.getByRole("button", { name: "Cocinera de Prueba" }).click();
    await page.getByRole("link", { name: /Apertura/ }).click();
    await expect(heading(page, "Elige tu nombre")).toBeVisible();
    await expect(progress(page)).toHaveText("Paso 1 de 3");
    await expect(page.getByRole("button", { name: "Cocinera de Prueba" })).toHaveAttribute("aria-pressed", "true");
    await checkStep(page);
  });

  await test.step("RF-4 «Atrás» salvo en el primer paso y «Siguiente» en cada uno", async () => {
    await expect(page.getByRole("button", { name: "Atrás" })).toBeDisabled();
    await expect(next(page)).toBeEnabled();
    await next(page).click();
    await expect(heading(page, "Cocina")).toBeVisible();
    await expect(page.getByRole("button", { name: "Atrás" })).toBeEnabled();
    await expect(next(page)).toBeEnabled();
  });

  await test.step("RF-49 RF-5 los puntos clave van uno por uno y la foto se pide", async () => {
    await expect(page.getByTestId("floor-key-item")).toContainText("Punto clave 1 de 2");
    await checkStep(page);
    await next(page).click();
    await expect(page.getByText("Falta «Gas abierto»: es un punto clave.")).toBeVisible();
    await page.getByRole("checkbox", { name: "Gas abierto" }).check();
    await next(page).click();
    await expect(page.getByTestId("floor-key-item")).toContainText("Punto clave 2 de 2");
    await next(page).click();
    await expect(page.getByText("Toma la foto de «Refrigerador a temperatura»: es un punto clave.")).toBeVisible();
    await page.getByLabel("Foto de Refrigerador a temperatura").setInputFiles({ name: "refri.jpg", mimeType: "image/jpeg", buffer: JPG });
    await expect(page.getByText("Foto lista: refri.jpg")).toBeVisible();
    await next(page).click();
    await expect(page.getByTestId("floor-item")).toHaveCount(2);
    const saved = page.waitForResponse((r) => r.url().includes("/api/wizards/floor-checklist/draft") && r.request().method() === "PUT");
    await page.getByLabel("Observaciones").fill("Falta jabón");
    expect((await saved).ok()).toBe(true);
  });

  await test.step("RF-22 se retoma por empleado en este teléfono (la foto se vuelve a tomar)", async () => {
    await page.reload();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(heading(page, "Cocina")).toBeVisible();
    await expect(page.getByLabel("Observaciones")).toHaveValue("Falta jabón");
    await page.getByRole("button", { name: "Atrás" }).click();
    await page.getByRole("button", { name: "Cajero de Prueba" }).click();
    await expect(heading(page, "Elige tu nombre")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar" })).toHaveCount(0);
    await page.getByRole("button", { name: "Cocinera de Prueba" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    // Retoma donde se quedó (en «Elige tu nombre»); lo de Cocina sigue, sin la foto, que no se guarda a medias.
    await expect(heading(page, "Elige tu nombre")).toBeVisible();
    await next(page).click();
    await expect(page.getByLabel("Observaciones")).toHaveValue("Falta jabón");
    await next(page).click();
    await expect(page.getByText("Toma la foto de «Refrigerador a temperatura»: es un punto clave.")).toBeVisible();
    await page.getByLabel("Foto de Refrigerador a temperatura").setInputFiles({ name: "refri.jpg", mimeType: "image/jpeg", buffer: JPG });
    await next(page).click();
    await page.getByRole("button", { name: "Todo en orden en Cocina" }).click();
    await expect(page.getByRole("checkbox", { name: "Mesas limpias" })).toBeChecked();
    await next(page).click();
  });

  await test.step("RF-7 RF-8 RF-9 el resumen de su parte y al confirmar queda lista", async () => {
    await expect(progress(page)).toHaveText("Paso 3 de 3");
    const summary = page.locator("[data-summary]").filter({ hasText: "Gas abierto" });
    await expect(summary).toContainText("✓ Gas abierto");
    await expect(summary).toContainText("✓ Refrigerador a temperatura · foto refri.jpg");
    await expect(summary).toContainText("Observaciones: Falta jabón");
    await checkStep(page, "Registrar y dar por lista");
    await page.getByRole("button", { name: "Registrar y dar por lista" }).click();
    await expect(page.getByTestId("wizard-done")).toContainText("Se registró tu sección y quedó lista.");
    await page.getByRole("link", { name: "Volver al inicio" }).click();
  });

  await test.step("RF-24 RF-26 la vista completa muestra lo registrado y se recuerda", async () => {
    await page.getByRole("link", { name: /Apertura/ }).click();
    await page.getByRole("button", { name: "Vista completa" }).click();
    const cocina = page.getByTestId("sheet-section").filter({ has: page.getByRole("heading", { name: "Cocina", exact: true }) });
    await expect(cocina).toContainText("Lista · Cocinera de Prueba (Tablet de piso)");
    await page.goto("/piso");
    await page.getByRole("link", { name: /Apertura/ }).click();
    await expect(page.getByRole("button", { name: "Paso a paso" })).toBeVisible();
  });
  fit();
});

test("asistentes de piso: corte ciego sin lo esperado", async ({ page }) => {
  test.setTimeout(120_000);
  await world();
  await page.setViewportSize({ width: 390, height: 844 });
  const fit = await measureWizards(page);
  await enablePhone(page);
  await page.getByRole("button", { name: "Cajero de Prueba" }).click();
  await page.getByRole("link", { name: /Corte de caja/ }).click();

  await test.step("RF-50 RF-16 efectivo y terminales sin nada de lo esperado", async () => {
    await page.getByRole("button", { name: "Contar" }).click();
    await expect(heading(page, "Efectivo por denominación")).toBeVisible();
    await expect(progress(page)).toHaveText("Paso 1 de 3");
    await page.getByLabel("Billetes de $500.00", { exact: true }).fill("2");
    await expect(page.getByTestId("cash-counted-total")).toContainText("$1,000.00");
    await expect(page.getByRole("main")).not.toContainText(/esperado|diferencia|cuadra/i);
    await checkStep(page);
    await next(page).click();
    await expect(heading(page, "Terminales")).toBeVisible();
    await next(page).click();
    await expect(page.getByText("Escribe lo de BBVA 1; si no hubo, escribe 0.")).toBeVisible();
    await page.getByLabel("BBVA 1").fill("1500");
  });

  await test.step("RF-24 RF-25 RF-27 a la vista completa y de regreso sin perder lo contado", async () => {
    await page.getByRole("button", { name: "Vista completa" }).click();
    await expect(page.getByTestId("count-wizard")).toBeVisible();
    await expect(page.getByTestId("cash-counted-total")).toContainText("$1,000.00");
    await page.getByRole("button", { name: "Paso a paso" }).click();
    await expect(page.getByTestId("floor-cut-wizard")).toBeVisible();
    await expect(page.getByTestId("cash-counted-total")).toContainText("$1,000.00");
    await next(page).click();
    await expect(page.getByLabel("BBVA 1")).toHaveValue("1500");
    await next(page).click();
  });

  await test.step("RF-7 RF-9 el resumen y la entrega, sin lo esperado", async () => {
    await expect(progress(page)).toHaveText("Paso 3 de 3");
    await expect(page.locator('[data-summary="cash"]')).toContainText("$1,000.00 · 2 piezas");
    await expect(page.locator('[data-summary="methods"]')).toContainText("BBVA 1: $1,500.00");
    await expect(page.getByRole("main")).not.toContainText(/esperado|diferencia|cuadra/i);
    await checkStep(page, "Entregar conteo");
    await page.getByRole("button", { name: "Entregar conteo" }).click();
    await expect(page.getByTestId("wizard-done")).toContainText("Se entregó el conteo.");
    await expect(page.getByText("Contado", { exact: true })).toBeVisible();
    await expect(page.getByTestId("cash-summary")).toHaveCount(0);
  });
  fit();
});
