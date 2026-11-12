// Spec 002: pantallas tipo del catálogo (tabla larga, captura por renglones y asistente por pasos), entrega 4.
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { expectNoHorizontalOverflow } from "./helpers";

/** RF-41: las pantallas tipo no guardan nada; cualquier escritura a la app durante la prueba es un fallo. */
function watchWrites(page: Page) {
  const writes: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.port === "3500" && r.method() !== "GET" && r.method() !== "HEAD") writes.push(`${r.method()} ${u.pathname}`);
  });
  return writes;
}

const rows = (page: Page) => page.locator("tbody tr");

test("tabla larga con búsqueda y filtros", async ({ page }) => {
  const writes = watchWrites(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/sistema/tabla");

  await test.step("RF-19 desde 1024 px la tabla muestra todas sus columnas", async () => {
    for (const name of ["Producto", "Estado", "Área", "Existencia", "Almacén", "Presentación", "Mínimo", "Proveedor"]) {
      await expect(page.getByRole("columnheader", { name })).toBeVisible();
    }
    await expect(page.getByRole("cell", { name: "Carnes Selectas" }).first()).toBeVisible();
  });

  await test.step("RF-30 la búsqueda ignora mayúsculas y acentos", async () => {
    const search = page.getByRole("searchbox", { name: "Buscar producto, área o proveedor" });
    await search.fill("JAMON");
    await expect(rows(page)).toHaveCount(2);
    await expect(rows(page).first()).toContainText("Jamón serrano");
    await search.fill("lacteos");
    await expect(page.getByTestId("table-count")).toHaveText("Mostrando 10 de 60");
    await search.fill("");
    await expect(page.getByTestId("table-count")).toHaveText("Mostrando 60 de 60");
  });

  await test.step("RF-31 sin resultados aparece el vacío con acción para limpiar", async () => {
    await page.getByRole("button", { name: "Lácteos" }).click();
    await page.getByRole("button", { name: "Solo bajos" }).click();
    await expect(page.getByRole("button", { name: "Lácteos" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("searchbox").fill("aceite");
    await expect(page.locator("[data-state=empty]")).toContainText("Ningún renglón coincide");
    await page.getByRole("button", { name: "Limpiar búsqueda y filtros" }).click();
    await expect(page.getByTestId("table-count")).toHaveText("Mostrando 60 de 60");
    await expect(page.getByRole("searchbox")).toHaveValue("");
  });

  await test.step("RF-20 en teléfono cada renglón es tarjeta y el resto se ve al abrirla", async () => {
    await page.setViewportSize({ width: 360, height: 760 });
    // El encabezado sigue para lectores de pantalla, pero no ocupa lugar en la tarjeta.
    expect((await page.locator("thead").boundingBox())!.width).toBeLessThanOrEqual(1);
    const first = rows(page).first();
    await expect(first).toContainText("Queso manchego");
    await expect(first.getByText("Abarrotes del Centro")).toBeHidden();
    await first.getByRole("button", { name: "Ver más: Queso manchego (Cocina)" }).click();
    await expect(first.getByText("Abarrotes del Centro")).toBeVisible();
    await expect(first.getByRole("button", { name: "Ocultar detalle: Queso manchego (Cocina)" })).toHaveAttribute("aria-expanded", "true");
    await expectNoHorizontalOverflow(page);
  });

  expect(writes).toEqual([]);
});

test("captura por renglones", async ({ page }) => {
  const writes = watchWrites(page);
  await page.setViewportSize({ width: 360, height: 760 });
  await page.goto("/sistema/captura");

  await test.step("RF-32 menos y más suben y bajan la cantidad sin bajar de cero", async () => {
    const rojo = page.getByLabel("Cantidad de Aguachile rojo");
    await expect(rojo).toHaveValue("14");
    await page.getByRole("button", { name: "Sumar a Aguachile rojo" }).click();
    await expect(rojo).toHaveValue("15");
    const charola = page.getByLabel("Cantidad de Charola grande");
    for (let i = 0; i < 6; i++) await page.getByRole("button", { name: "Restar a Charola grande" }).click();
    await expect(charola).toHaveValue("0");
  });

  await test.step("RF-22 cada cantidad abre el teclado numérico", async () => {
    await expect(page.getByLabel("Cantidad de Aguachile verde")).toHaveAttribute("inputmode", "decimal");
  });

  await test.step("RF-33 un valor que no es número marca el renglón y no se da por capturado", async () => {
    const tostada = page.getByLabel("Cantidad de Tostada de la casa");
    await expect(tostada).toHaveValue("dos");
    await expect(tostada).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("[data-entry=tostada]")).toHaveAttribute("data-invalid", "true");
    await expect(page.locator("[data-entry=tostada]")).toContainText("Escribe un número, por ejemplo 2 o 2.5.");
    await expect(page.getByRole("button", { name: "Calcular insumos" })).toBeDisabled();
    await tostada.fill("2.5");
    await expect(tostada).not.toHaveAttribute("aria-invalid", "true");
    await expect(page.getByTestId("capture-errors")).toHaveText("Sin errores");
    await expect(page.getByRole("button", { name: "Calcular insumos" })).toBeEnabled();
  });

  await test.step("caso límite: una cantidad de 9 dígitos cabe en 360 px", async () => {
    await page.getByLabel("Cantidad de Aguachile verde").fill("123456789");
    await expectNoHorizontalOverflow(page);
  });

  expect(writes).toEqual([]);
});

test("asistente por pasos", async ({ page }) => {
  const writes = watchWrites(page);
  await page.setViewportSize({ width: 360, height: 760 });
  await page.goto("/sistema/asistente");
  const next = page.getByRole("button", { name: "Siguiente" });
  const back = page.getByRole("button", { name: "Anterior" });
  const progress = page.getByTestId("wizard-progress");

  await test.step("RF-34 el asistente muestra el paso actual y el total", async () => {
    await expect(progress).toHaveText("Paso 1 de 4");
    await page.getByLabel("Fondo con el que abrió la caja").fill("1500");
    await next.click();
    await expect(progress).toHaveText("Paso 2 de 4");
    await expect(page.getByRole("heading", { name: "Cuenta el efectivo" })).toBeVisible();
  });

  await test.step("RF-35 volver atrás conserva lo capturado en todos los pasos", async () => {
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Sumar a $500" }).click();
    await expect(page.getByTestId("page-figure")).toContainText("$1,500");
    await next.click();
    await back.click();
    await back.click();
    await expect(page.getByLabel("Fondo con el que abrió la caja")).toHaveValue("1500");
    await next.click();
    await expect(page.getByLabel("Cantidad de $500")).toHaveValue("3");
  });

  await test.step("RF-36 salir con datos pide confirmar: botón de salir, enlace de la app y recarga", async () => {
    await page.getByRole("button", { name: "Salir", exact: true }).click();
    const confirm = page.getByRole("dialog", { name: "¿Salir sin terminar?" });
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "Seguir capturando" }).click();
    await expect(confirm).toBeHidden();
    await expect(page.getByLabel("Cantidad de $500")).toHaveValue("3");

    await page.getByRole("link", { name: "Volver al catálogo" }).click();
    await expect(confirm).toBeVisible();
    await expect(page).toHaveURL(/\/sistema\/asistente$/);
    await confirm.getByRole("button", { name: "Seguir capturando" }).click();

    const asked = new Promise<string>((resolve) => page.once("dialog", (d) => (resolve(d.type()), d.dismiss())));
    await page.reload({ timeout: 3000 }).catch(() => undefined);
    expect(await asked).toBe("beforeunload");
    await expect(page.getByLabel("Cantidad de $500")).toHaveValue("3");

    await page.getByRole("button", { name: "Salir", exact: true }).click();
    await confirm.getByRole("button", { name: "Salir" }).click();
    await expect(page).toHaveURL(/\/sistema$/);
  });

  expect(writes).toEqual([]);
});
