// Criterios de la spec 002: recorrido principal de los criterios de finalización (sistema de diseño de punta a punta).
import { expect, test } from "./fixtures";
import { OWNER, expectNoHorizontalOverflow, login, logout, seedOwner } from "./helpers";

const bg = (page: import("@playwright/test").Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test("recorrido completo de la spec 002", async ({ page }) => {
  await seedOwner();
  await page.setViewportSize({ width: 360, height: 740 });
  await page.emulateMedia({ colorScheme: "light" });

  await test.step("RF-1 en el teléfono la entrada muestra SuMando con su logo", async () => {
    await page.goto("/login");
    await expect(page.getByTestId("brand").getByRole("img", { name: "SuMando" })).toBeVisible();
    await expect(page).toHaveTitle("SuMando");
    expect(await bg(page)).toBe("rgb(245, 246, 250)");
  });

  await test.step("RF-8 el dueño entra y crea un negocio eligiendo su color", async () => {
    await login(page, OWNER.email, OWNER.password);
    await page.goto("/negocios");
    await page.getByRole("button", { name: "Crear negocio" }).click();
    const dialog = page.getByRole("dialog", { name: "Nuevo negocio" });
    await dialog.getByLabel("Nombre del negocio").fill("Pirrus");
    await dialog.getByLabel("Primera sucursal").fill("Centro");
    await dialog.getByText("Violeta").click();
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("heading", { name: "Pirrus", exact: true })).toHaveAttribute("data-business-color", "violeta");
  });

  await test.step("RF-12 la barra muestra el negocio, la sucursal y su color", async () => {
    await page.goto("/");
    const active = page.getByTestId("active-branch");
    await expect(active).toHaveText("Pirrus · Centro");
    await expect(page.locator("[data-business-color]").filter({ has: active })).toHaveAttribute("data-business-color", "violeta");
    await expectNoHorizontalOverflow(page);
  });

  await test.step("RF-4 y RF-6 cambiar el teléfono a modo oscuro no pierde la pantalla", async () => {
    await page.evaluate(() => ((window as unknown as { marca: boolean }).marca = true));
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(() => bg(page)).toBe("rgb(14, 17, 32)");
    expect(await page.evaluate(() => (window as unknown as { marca?: boolean }).marca)).toBe(true);
    await expect(page.getByTestId("active-branch")).toHaveText("Pirrus · Centro");
  });

  await test.step("RF-16 el menú se abre con un toque", async () => {
    await page.getByRole("button", { name: "Abrir el menú" }).click();
    const sheet = page.getByRole("dialog", { name: "Navegación" });
    await expect(sheet.getByRole("link", { name: "Personas" })).toBeVisible();
    await sheet.getByRole("link", { name: "Personas" }).click();
    await expect(page).toHaveURL(/\/personas$/);
  });

  await test.step("RF-17 y RF-19 en escritorio, menú lateral y tabla de personas con todas sus columnas", async () => {
    await page.setViewportSize({ width: 1280, height: 860 });
    await expect(page.getByRole("navigation", { name: "Navegación" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navegación" }).getByRole("link", { name: "Personas" })).toHaveAttribute("aria-current", "page");
    for (const name of ["Nombre", "Estado", "Rol", "Sucursales", "Correo", "Acciones"]) await expect(page.getByRole("columnheader", { name })).toBeVisible();
    await expect(page.getByRole("cell", { name: OWNER.email })).toBeVisible();
  });

  await test.step("RF-43 y RF-44 las pantallas reconstruidas conservan el comportamiento de la spec 001", async () => {
    await page.getByRole("navigation", { name: "Navegación" }).getByRole("link", { name: "Inicio" }).click();
    await expect(page.getByTestId("home-branch")).toHaveText("Pirrus · Centro");
    await page.getByRole("link", { name: /cambiar de sucursal/i }).first().click();
    await expect(page.getByRole("button", { name: /Trabajar en Pirrus · Centro/ })).toHaveAttribute("aria-current", "true");
    await logout(page);
    await page.getByLabel("Correo").fill(OWNER.email);
    await page.getByLabel("Contraseña", { exact: true }).fill("contraseña-mala");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("Correo o contraseña incorrectos.");
  });
});
