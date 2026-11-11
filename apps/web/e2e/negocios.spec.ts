// Criterios de la spec 001: negocios y sucursales (entrega 3).
import { expect, test } from "./fixtures";
import { OWNER, alertBox, expectNoHorizontalOverflow, login, seedOwner } from "./helpers";

test("negocios y sucursales", async ({ page }) => {
  await seedOwner();
  await login(page, OWNER.email, OWNER.password);
  await page.goto("/negocios");
  const dialog = page.getByRole("dialog");

  await test.step("RF-17 el dueño crea un negocio con su primera sucursal", async () => {
    await expect(page.getByText("Todavía no hay negocios")).toBeVisible();
    await page.getByRole("button", { name: "Crear negocio" }).click();
    await dialog.getByLabel("Nombre del negocio").fill("Pastatti");
    await dialog.getByLabel("Primera sucursal").fill("Sendero");
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("heading", { name: "Pastatti" })).toBeVisible();
    await expect(page.getByText("Sendero")).toBeVisible();
  });

  await test.step("RF-18 añade una sucursal y renombra el negocio", async () => {
    await page.getByRole("button", { name: "Añadir sucursal Pastatti" }).click();
    await dialog.getByLabel("Nombre de la sucursal").fill("Centro");
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Centro", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Renombrar Pastatti" }).click();
    await dialog.getByLabel("Nombre del negocio").fill("Pastatti MX");
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("heading", { name: "Pastatti MX" })).toBeVisible();
  });

  await test.step("RF-19 un nombre repetido, aunque cambie de mayúsculas, se rechaza con aviso", async () => {
    await page.getByRole("button", { name: "Crear negocio" }).click();
    await dialog.getByLabel("Nombre del negocio").fill("  pastatti mx ");
    await dialog.getByLabel("Primera sucursal").fill("Otra");
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(alertBox(page)).toHaveText("Ya existe uno con ese nombre.");
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialog).toBeHidden();
  });

  await test.step("RF-21 archivar una sucursal la marca y archivar el negocio lo pasa a archivados", async () => {
    await page.getByRole("button", { name: "Archivar Centro (Pastatti MX)" }).click();
    await expect(page.getByText("Archivada")).toBeVisible();
    await page.getByRole("button", { name: "Archivar Pastatti MX" }).click();
    await expect(page.getByRole("heading", { name: "Archivados" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pastatti MX" })).toBeHidden();
  });

  await test.step("RF-22 reactivar el negocio lo devuelve con sus sucursales", async () => {
    await page.getByRole("button", { name: "Reactivar Pastatti MX" }).click();
    await expect(page.getByRole("heading", { name: "Pastatti MX" })).toBeVisible();
    await expect(page.getByText("Archivada")).toBeHidden();
    await expect(page.getByText("Centro", { exact: true })).toBeVisible();
  });

  await test.step("la pantalla cabe en un teléfono", async () => {
    await page.setViewportSize({ width: 360, height: 740 });
    await expectNoHorizontalOverflow(page);
  });
});
