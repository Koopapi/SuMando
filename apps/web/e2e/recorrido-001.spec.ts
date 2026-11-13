// Criterios de la spec 001: el recorrido completo del criterio de finalización, con el dueño y un administrador.
import type { Browser } from "@playwright/test";
import { expect, test } from "./fixtures";
import { OWNER, alertBox, login, logout } from "./helpers";

const ANA = { name: "Ana Admin", email: "ana@mando.test", password: "ana-definitiva-1" };
const TEMP = /^[A-HJ-NP-Za-km-z2-9]{10}$/;

/** Un contexto nuevo con el dispositivo del proyecto (el dueño y el administrador usan navegadores distintos). */
async function newPage(browser: Browser) {
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, locale, baseURL } = test.info().project.use;
  const context = await browser.newContext({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, locale, baseURL });
  return context.newPage();
}

test("recorrido completo de la spec 001", async ({ browser }) => {
  const owner = await newPage(browser);
  const admin = await newPage(browser);
  const dialog = owner.getByRole("dialog");
  let temporary = "";

  await test.step("RF-1 RF-2 primer arranque: el dueño crea su cuenta", async () => {
    await owner.goto("/");
    await expect(owner).toHaveURL(/\/setup$/);
    await owner.getByLabel("Nombre").fill(OWNER.name);
    await owner.getByLabel("Correo").fill(OWNER.email);
    await owner.getByLabel("Contraseña", { exact: true }).fill(OWNER.password);
    await owner.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(owner).toHaveURL(/\/elegir-sucursal$/);
  });

  await test.step("RF-17 RF-18 el dueño crea Pastatti con dos sucursales y Pirrus con una", async () => {
    await owner.getByRole("link", { name: "Ir a Negocios" }).click();
    await owner.getByRole("button", { name: "Crear negocio" }).click();
    await dialog.getByLabel("Nombre del negocio").fill("Pastatti");
    await dialog.getByLabel("Primera sucursal").fill("Sendero");
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(owner.getByRole("heading", { name: "Pastatti" })).toBeVisible();
    await owner.getByRole("button", { name: "Añadir sucursal Pastatti" }).click();
    await dialog.getByLabel("Nombre de la sucursal").fill("Centro");
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(owner.getByText("Centro", { exact: true })).toBeVisible();
    await owner.getByRole("button", { name: "Crear negocio" }).click();
    await dialog.getByLabel("Nombre del negocio").fill("Pirrus");
    await dialog.getByLabel("Primera sucursal").fill("Centro");
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(owner.getByRole("heading", { name: "Pirrus" })).toBeVisible();
  });

  await test.step("RF-23 RF-11 RF-25 da de alta a un administrador con una sucursal y recibe su contraseña temporal", async () => {
    await owner.goto("/personas");
    await owner.getByRole("button", { name: "Dar de alta" }).click();
    await dialog.getByLabel("Nombre").fill(ANA.name);
    await dialog.getByLabel("Correo").fill(ANA.email);
    await dialog.getByLabel("Pastatti · Sendero").check();
    await dialog.getByRole("button", { name: "Guardar" }).click();
    const shown = owner.getByTestId("temporary-password");
    await expect(shown).toHaveText(TEMP);
    temporary = (await shown.textContent())!.trim();
    await owner.getByRole("button", { name: "Listo" }).click();
  });

  await test.step("RF-12 RF-13 RF-33 el administrador entra, cambia la contraseña obligatoriamente y cae en su única sucursal", async () => {
    await login(admin, ANA.email, temporary);
    await expect(admin).toHaveURL(/\/cambiar-contrasena$/);
    await admin.getByLabel("Contraseña actual").fill(temporary);
    await admin.getByLabel("Contraseña nueva", { exact: true }).fill(ANA.password);
    await admin.getByLabel("Repite la contraseña nueva").fill(ANA.password);
    await admin.getByRole("button", { name: "Guardar contraseña" }).click();
    await expect(admin).toHaveURL(/\/$/);
    await expect(admin.getByTestId("active-branch")).toHaveText("Pastatti · Sendero");
  });

  await test.step("RF-27 RF-35 el dueño le añade otra sucursal y el administrador la elige al cambiar", async () => {
    await owner.getByRole("button", { name: `Editar ${ANA.name}` }).click();
    await dialog.getByLabel("Pirrus · Centro").check();
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(owner.getByText("Pastatti · Sendero, Pirrus · Centro")).toBeVisible();
    await admin.getByRole("link", { name: "Cambiar de sucursal" }).first().click();
    await admin.getByRole("button", { name: "Trabajar en Pirrus · Centro" }).click();
    await expect(admin).toHaveURL(/\/$/);
    await expect(admin.getByTestId("active-branch")).toHaveText("Pirrus · Centro");
  });

  await test.step("RF-28 el dueño lo desactiva y el administrador deja de poder entrar", async () => {
    await owner.getByRole("button", { name: `Desactivar ${ANA.name}` }).click();
    await expect(owner.getByText("Inactiva", { exact: true })).toBeVisible();
    await admin.goto("/");
    await expect(admin).toHaveURL(/\/login$/);
    await login(admin, ANA.email, ANA.password);
    await expect(alertBox(admin)).toHaveText("Correo o contraseña incorrectos.");
  });

  await test.step("RF-33 RF-35 al dueño se le activó sola la primera sucursal y la cambia desde el inicio en dos toques", async () => {
    await owner.goto("/");
    await expect(owner.getByTestId("active-branch")).toHaveText("Pastatti · Sendero");
    await owner.getByRole("link", { name: "Cambiar de sucursal" }).first().click();
    await owner.getByRole("button", { name: "Trabajar en Pirrus · Centro" }).click();
    await expect(owner.getByTestId("home-branch")).toHaveText("Pirrus · Centro");
  });

  await test.step("RF-8 el dueño cierra sesión", async () => {
    await logout(owner);
  });
});
