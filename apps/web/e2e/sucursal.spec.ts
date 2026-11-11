// Criterios de la spec 001: sucursal activa y pantalla de inicio (entrega 5).
import { expect, test } from "./fixtures";
import { OWNER, expectNoHorizontalOverflow, login, logout, ownerApi, seedAdmin, seedBusiness, seedOwner } from "./helpers";

const ANA = { email: "ana@mando.test", password: "ana-123456" };

test("sucursal activa e inicio", async ({ page }) => {
  await seedOwner();
  const pastatti = await seedBusiness("Pastatti", ["Sendero", "Centro"]);
  await seedBusiness("Pirrus", ["Centro"]);
  const sendero = pastatti.branches.find((b) => b.name === "Sendero")!;
  await seedAdmin("Ana", ANA.email, [sendero.id], ANA.password);
  const activeBar = page.getByTestId("active-branch");

  await test.step("RF-33 con una sola sucursal entra directo con ella activa", async () => {
    await login(page, ANA.email, ANA.password);
    await expect(page).toHaveURL(/\/$/);
    await expect(activeBar).toHaveText("Pastatti · Sendero");
    await expect(page.getByTestId("home-branch")).toHaveText("Pastatti · Sendero");
    await logout(page);
  });

  await test.step("RF-32 con varias sucursales hay que elegir, agrupadas por negocio", async () => {
    await login(page, OWNER.email, OWNER.password);
    await expect(page).toHaveURL(/\/elegir-sucursal$/);
    await expect(page.getByRole("heading", { name: "Pastatti" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pirrus" })).toBeVisible();
    await page.getByRole("button", { name: "Trabajar en Pirrus · Centro" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(activeBar).toHaveText("Pirrus · Centro");
  });

  await test.step("RF-35 RF-41 desde el inicio se cambia de sucursal en dos toques", async () => {
    await expect(page.getByText(`Hola, ${OWNER.name}`)).toBeVisible();
    await expect(page.getByRole("link", { name: "Negocios" })).toHaveCount(2);
    await expect(page.getByRole("link", { name: "Cambiar contraseña" })).toHaveCount(2);
    await page.getByRole("link", { name: "Cambiar de sucursal" }).first().click();
    await page.getByRole("button", { name: "Trabajar en Pastatti · Sendero" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(activeBar).toHaveText("Pastatti · Sendero");
  });

  await test.step("RF-34 al volver a entrar se recuerda la última sucursal", async () => {
    await logout(page);
    await login(page, OWNER.email, OWNER.password);
    await expect(page).toHaveURL(/\/$/);
    await expect(activeBar).toHaveText("Pastatti · Sendero");
  });

  await test.step("RF-36 si se archiva la activa, la siguiente acción pide elegir otra", async () => {
    const call = await ownerApi();
    await call(`/api/branches/${sendero.id}/archive`, {}, "POST");
    await page.goto("/");
    await expect(page).toHaveURL(/\/elegir-sucursal$/);
    await expect(page.getByRole("button", { name: "Trabajar en Pastatti · Sendero" })).toBeHidden();
    await logout(page);
  });

  await test.step("RF-38 sin ninguna sucursal, el administrador ve el aviso y no puede operar", async () => {
    await login(page, ANA.email, ANA.password);
    await expect(page).toHaveURL(/\/elegir-sucursal$/);
    await expect(page.getByText("No tienes ninguna sucursal asignada. Pide al dueño que te asigne una.")).toBeVisible();
    await expect(activeBar).toHaveText("Sin sucursal");
    await page.goto("/");
    await expect(page).toHaveURL(/\/elegir-sucursal$/);
  });

  await test.step("las pantallas caben en un teléfono", async () => {
    await page.setViewportSize({ width: 360, height: 740 });
    await expectNoHorizontalOverflow(page);
  });
});
