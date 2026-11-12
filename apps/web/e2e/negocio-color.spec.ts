// Criterios de la spec 002: color de cada negocio y estructura de la app (banda en teléfono, menú lateral en escritorio), entrega 5.
import { expect, test } from "./fixtures";
import { OWNER, expectNoHorizontalOverflow, login, seedBusiness, seedOwner } from "./helpers";

test("color de negocio y estructura", async ({ page }) => {
  await seedOwner();
  await page.setViewportSize({ width: 1280, height: 860 });
  await login(page, OWNER.email, OWNER.password);
  const active = page.getByTestId("active-branch");

  await test.step("RF-8 al crear un negocio se elige su color de la paleta de 8", async () => {
    await page.goto("/negocios");
    await page.getByRole("button", { name: "Crear negocio" }).click();
    const dialog = page.getByRole("dialog", { name: "Nuevo negocio" });
    const colors = dialog.getByRole("radio");
    await expect(colors).toHaveCount(8);
    await expect(dialog.getByRole("radio", { name: "Violeta" })).toBeChecked();
    await dialog.getByLabel("Nombre del negocio").fill("Pastatti");
    await dialog.getByLabel("Primera sucursal").fill("Sendero");
    await dialog.getByText("Turquesa").click();
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("heading", { name: "Pastatti", exact: true })).toHaveAttribute("data-business-color", "turquesa");

    await page.getByRole("button", { name: "Crear negocio" }).click();
    await expect(dialog.getByRole("radio", { name: "Violeta" })).toBeChecked();
    await dialog.getByLabel("Nombre del negocio").fill("Pirrus");
    await dialog.getByLabel("Primera sucursal").fill("Centro");
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("heading", { name: "Pirrus", exact: true })).toHaveAttribute("data-business-color", "violeta");
  });

  await test.step("RF-12 y RF-14 la barra muestra negocio, sucursal y su color, con el nombre siempre escrito", async () => {
    await page.goto("/");
    await expect(active).toHaveText("Pastatti · Sendero");
    await expect(page.locator("[data-business-color]").filter({ has: active })).toHaveAttribute("data-business-color", "turquesa");
  });

  await test.step("RF-9 el nuevo color se ve en la siguiente pantalla", async () => {
    await page.goto("/negocios");
    await page.getByRole("button", { name: "Color Pastatti" }).click();
    const dialog = page.getByRole("dialog", { name: "Color de Pastatti" });
    await expect(dialog.getByRole("radio", { name: "Turquesa" })).toBeChecked();
    await dialog.getByText("Azul").click();
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("heading", { name: "Pastatti", exact: true })).toHaveAttribute("data-business-color", "azul");
    await page.goto("/");
    await expect(page.locator("[data-business-color]").filter({ has: active })).toHaveAttribute("data-business-color", "azul");
  });

  await test.step("RF-13 elegir sucursal muestra el color junto al nombre del negocio", async () => {
    await page.goto("/elegir-sucursal");
    await expect(page.getByRole("heading", { name: "Pastatti", exact: true })).toHaveAttribute("data-business-color", "azul");
    await expect(page.getByRole("heading", { name: "Pirrus", exact: true })).toHaveAttribute("data-business-color", "violeta");
  });

  await test.step("RF-17 desde 1024 px el menú es lateral y fijo", async () => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Navegación" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Inicio" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("button", { name: "Abrir el menú" })).toBeHidden();
    const box = (await nav.boundingBox())!;
    expect(box.x).toBeLessThan(300);
    await page.evaluate(() => window.scrollBy(0, 600));
    expect((await nav.boundingBox())!.y).toBeCloseTo(box.y, 0);
  });

  await test.step("RF-16 bajo 1024 px el menú se abre con un toque desde la barra", async () => {
    await page.setViewportSize({ width: 1023, height: 800 });
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Navegación" })).toBeHidden();
    await page.getByRole("button", { name: "Abrir el menú" }).click();
    const sheet = page.getByRole("dialog", { name: "Navegación" });
    await expect(sheet).toBeVisible();
    await sheet.getByRole("link", { name: "Personas" }).click();
    await expect(page).toHaveURL(/\/personas$/);
    await expect(sheet).toBeHidden();
  });

  await test.step("RF-18 y caso límite: nombres de 60 caracteres caben en 360 px sin desbordar", async () => {
    const long = "Negocio con un nombre larguísimo para probar la barra sup";
    await seedBusiness(long.slice(0, 60), ["Sucursal con un nombre también larguísimo para la prueba 01".slice(0, 60)], "rosa");
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/elegir-sucursal");
    await page.getByRole("button", { name: /^Trabajar en Negocio con un nombre/ }).click();
    await page.waitForURL((u) => u.pathname === "/");
    await expect(active).toContainText("Negocio con un nombre");
    await expectNoHorizontalOverflow(page);
    const badge = (await active.boundingBox())!;
    expect(badge.x + badge.width).toBeLessThanOrEqual(360);
    await expect(page.getByRole("link", { name: "Cambiar de sucursal" }).first()).toHaveAttribute("title", /larguísimo para probar la barra sup · Sucursal/);
  });
});
