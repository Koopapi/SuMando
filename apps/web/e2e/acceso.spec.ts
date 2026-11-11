// Criterios de la spec 001: primer arranque, entrada, salida y contraseña temporal (entrega 2).
import { expect, test } from "./fixtures";
import { OWNER, alertBox, expectNoHorizontalOverflow, login, seedBusiness, seedOwner, temporaryPasswordFor } from "./helpers";

test("primer arranque, entrada y salida", async ({ page }) => {
  await test.step("RF-1 sin cuentas, la dirección de inicio lleva a crear al dueño", async () => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/setup$/);
    await expect(page.getByRole("heading", { name: "Crear la cuenta del dueño" })).toBeVisible();
  });

  await test.step("RF-2 crear al dueño inicia su sesión; sin negocios, invita a crear el primero", async () => {
    await page.getByLabel("Nombre").fill(OWNER.name);
    await page.getByLabel("Correo").fill(OWNER.email);
    await page.getByLabel("Contraseña", { exact: true }).fill(OWNER.password);
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page).toHaveURL(/\/elegir-sucursal$/);
    await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
    await expect(page.getByText("Aún no hay negocios. Crea el primero para empezar a trabajar.")).toBeVisible();
  });

  await test.step("RF-3 con una cuenta, la pantalla de primer arranque ya no existe", async () => {
    await page.goto("/setup");
    await expect(page).not.toHaveURL(/\/setup$/);
  });

  await test.step("RF-8 cerrar sesión vuelve a la pantalla de entrada", async () => {
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  await test.step("RF-5 correo inexistente y contraseña mala muestran el mismo mensaje", async () => {
    await login(page, "nadie@mando.test", OWNER.password);
    await expect(alertBox(page)).toHaveText("Correo o contraseña incorrectos.");
    await login(page, OWNER.email, "equivocada-123");
    await expect(alertBox(page)).toHaveText("Correo o contraseña incorrectos.");
  });

  await test.step("RF-4 entrar con correo y contraseña correctos", async () => {
    await login(page, " DUENO@mando.test ", OWNER.password);
    await expect(page).toHaveURL(/\/elegir-sucursal$/);
    await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
  });
});

test("contraseña temporal: solo se puede cambiarla", async ({ page }) => {
  await seedOwner();
  await seedBusiness("Pastatti", ["Sendero"]);
  const temporary = await temporaryPasswordFor(OWNER.email);

  await test.step("RF-12 con contraseña temporal, entrar lleva a cambiarla y nada más se puede abrir", async () => {
    await login(page, OWNER.email, temporary);
    await expect(page).toHaveURL(/\/cambiar-contrasena$/);
    await expect(page.getByText("Tu contraseña es temporal. Elige una propia para continuar.")).toBeVisible();
    await page.goto("/");
    await expect(page).toHaveURL(/\/cambiar-contrasena$/);
  });

  await test.step("RF-16 la contraseña actual equivocada se rechaza sin cambiar nada", async () => {
    await page.getByLabel("Contraseña actual").fill("otra-otra-123");
    await page.getByLabel("Contraseña nueva", { exact: true }).fill("definitiva-789");
    await page.getByLabel("Repite la contraseña nueva").fill("definitiva-789");
    await page.getByRole("button", { name: "Guardar contraseña" }).click();
    await expect(alertBox(page)).toHaveText("La contraseña actual no coincide.");
  });

  await test.step("RF-13 al poner una propia, el resto de la aplicación se abre", async () => {
    await page.getByLabel("Contraseña actual").fill(temporary);
    await page.getByLabel("Contraseña nueva", { exact: true }).fill("definitiva-789");
    await page.getByLabel("Repite la contraseña nueva").fill("definitiva-789");
    await page.getByRole("button", { name: "Guardar contraseña" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(`Hola, ${OWNER.name}`)).toBeVisible();
  });
});

test("las pantallas de acceso caben en un teléfono", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/setup");
  await expectNoHorizontalOverflow(page);
  await seedOwner();
  await page.goto("/login");
  await expectNoHorizontalOverflow(page);
});
