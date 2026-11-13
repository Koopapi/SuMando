// Criterios de la spec 001: personas y accesos (entrega 4).
import { expect, test } from "./fixtures";
import { OWNER, alertBox, expectNoHorizontalOverflow, login, seedBusiness, seedOwner } from "./helpers";

const TEMP = /^[A-HJ-NP-Za-km-z2-9]{10}$/;

test("personas y accesos", async ({ page }) => {
  await seedOwner();
  await seedBusiness("Pastatti", ["Sendero", "Centro"]);
  await seedBusiness("Pirrus", ["Centro"]);
  await login(page, OWNER.email, OWNER.password);
  await page.goto("/personas");
  const dialog = page.getByRole("dialog");
  const temporary = page.getByTestId("temporary-password");

  await test.step("RF-23 RF-11 dar de alta a un administrador muestra su contraseña temporal una sola vez", async () => {
    await expect(page.getByText("Solo estás tú")).toBeVisible();
    await page.getByRole("button", { name: "Dar de alta" }).click();
    await dialog.getByLabel("Nombre").fill("Ana Admin");
    await dialog.getByLabel("Correo").fill("ana@mando.test");
    await dialog.getByLabel("Pastatti · Sendero").check();
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(temporary).toHaveText(TEMP);
    await page.getByRole("button", { name: "Listo" }).click();
    await expect(temporary).toBeHidden();
    await expect(page.getByRole("rowheader", { name: "Ana Admin" })).toBeVisible();
    await expect(page.getByText("Pendiente de cambiar contraseña")).toBeVisible();
  });

  await test.step("RF-25 la ficha muestra sus sucursales y editar las cambia", async () => {
    await expect(page.getByText("Pastatti · Sendero", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Editar Ana Admin" }).click();
    await dialog.getByLabel("Pirrus · Centro").check();
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Pastatti · Sendero, Pirrus · Centro")).toBeVisible();
  });

  await test.step("RF-24 un correo repetido se rechaza con aviso", async () => {
    await page.getByRole("button", { name: "Dar de alta" }).click();
    await dialog.getByLabel("Nombre").fill("Otra");
    await dialog.getByLabel("Correo").fill("ANA@mando.test");
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(alertBox(page)).toHaveText("Ese correo ya está registrado.");
    await dialog.getByRole("button", { name: "Cancelar" }).click();
  });

  await test.step("RF-28 desactivar la deja inactiva", async () => {
    await page.getByRole("button", { name: "Desactivar Ana Admin" }).click();
    await expect(page.getByText("Inactiva", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Editar Ana Admin" })).toBeHidden();
  });

  await test.step("RF-29 reactivar da una contraseña temporal nueva y conserva sus sucursales", async () => {
    await page.getByRole("button", { name: "Reactivar Ana Admin" }).click();
    await expect(temporary).toHaveText(TEMP);
    await page.getByRole("button", { name: "Listo" }).click();
    await expect(page.getByText("Pastatti · Sendero, Pirrus · Centro")).toBeVisible();
    await expect(page.getByText("Activa", { exact: true })).toHaveCount(2);
  });

  await test.step("RF-11 restablecer la contraseña muestra otra temporal", async () => {
    await page.getByRole("button", { name: "Restablecer contraseña Ana Admin" }).click();
    await expect(temporary).toHaveText(TEMP);
    await page.getByRole("button", { name: "Listo" }).click();
  });

  await test.step("la pantalla cabe en un teléfono", async () => {
    await page.setViewportSize({ width: 360, height: 740 });
    await expectNoHorizontalOverflow(page);
  });
});
