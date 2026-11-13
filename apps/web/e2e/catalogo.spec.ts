// Criterios de la spec 003: catálogo de cada negocio (productos, presentaciones, almacenes, áreas, proveedores y mínimos), en escritorio.
import postgres from "postgres";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { OWNER, login, seedBusiness, seedOwner } from "./helpers";
import { DB } from "./warm";

async function workIn(page: Page, label: string) {
  await page.goto("/elegir-sucursal");
  await page.getByRole("button", { name: new RegExp(`^Trabajar en ${label}`) }).click();
  await page.waitForURL((u) => u.pathname === "/");
}

function dialog(page: Page, name: string) {
  return page.getByRole("dialog", { name });
}

test("catálogo: flujo principal y consulta", async ({ page }) => {
  await seedOwner();
  await seedBusiness("Pastatti", ["Sendero", "Centro"], "violeta");
  await seedBusiness("Pirrus", ["Centro"], "rojo");
  await page.setViewportSize({ width: 1360, height: 950 });
  await login(page, OWNER.email, OWNER.password);
  await workIn(page, "Pastatti · Sendero");

  await test.step("RF-27 alta de proveedor con teléfono", async () => {
    await page.getByRole("navigation", { name: "Navegación" }).getByRole("link", { name: "Proveedores" }).click();
    await page.getByRole("button", { name: "Nuevo proveedor" }).click();
    const d = dialog(page, "Nuevo proveedor");
    await d.getByLabel("Nombre").fill("Lácteos del Norte");
    await d.getByLabel("Teléfono").fill("555 010 2030");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("heading", { name: "Lácteos del Norte" })).toBeVisible();
    await expect(page.getByText("555 010 2030")).toBeVisible();
  });

  await test.step("RF-18 almacén de la sucursal y almacén del negocio completo", async () => {
    await page.goto("/almacenes");
    for (const [name, scope] of [["Cámara fría", "Solo la sucursal Sendero"], ["Bodega central", "Todo Pastatti"]]) {
      await page.getByRole("button", { name: "Nuevo almacén" }).click();
      const d = dialog(page, "Nuevo almacén");
      await d.getByLabel("Nombre").fill(name);
      await d.getByLabel("Pertenece a").selectOption({ label: scope });
      await d.getByRole("button", { name: "Guardar" }).click();
      await expect(d).toBeHidden();
    }
    const list = page.getByRole("region", { name: "Almacenes" });
    await expect(list.locator('[data-item="Cámara fría"]')).toContainText("Sucursal");
    await expect(list.locator('[data-item="Bodega central"]')).toContainText("Negocio");
  });

  await test.step("RF-19 área con responsable", async () => {
    await page.getByRole("button", { name: "Nueva área" }).click();
    const d = dialog(page, "Nueva área");
    await d.getByLabel("Nombre").fill("Cocina");
    await d.getByLabel("Responsable").selectOption({ label: OWNER.name });
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("region", { name: "Áreas" }).locator('[data-item="Cocina"]')).toContainText(`Responsable: ${OWNER.name}`);
  });

  await test.step("RF-9 RF-10 alta de producto con unidad base y proveedor", async () => {
    await page.goto("/productos");
    await page.getByRole("button", { name: "Nuevo producto" }).click();
    const d = dialog(page, "Nuevo producto");
    await d.getByLabel("Nombre").fill("Aceite de oliva");
    await expect(d.getByLabel("Unidad base").locator("option")).toHaveText(["gramo (g)", "mililitro (ml)", "pieza (pz)"]);
    await d.getByLabel("Unidad base").selectOption("ml");
    await d.getByLabel("Proveedor habitual").selectOption({ label: "Lácteos del Norte" });
    await d.getByRole("button", { name: "Guardar" }).click();
    await page.waitForURL(/\/productos\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1, name: "Aceite de oliva" })).toBeVisible();
  });

  const presentations = page.getByTestId("presentations");
  await test.step("RF-11 RF-12 presentaciones con su equivalencia y la unidad base implícita", async () => {
    await expect(presentations).toContainText("ml · unidad base");
    for (const [name, factor] of [["Botella", "1000"], ["Caja", "6000"]]) {
      await page.getByRole("button", { name: "Añadir presentación" }).click();
      const d = dialog(page, "Nueva presentación");
      await d.getByLabel("Nombre de la presentación").fill(name);
      await d.getByLabel("Equivalencia en ml").fill(factor);
      await d.getByRole("button", { name: "Guardar" }).click();
      await expect(d).toBeHidden();
    }
    await expect(presentations.getByRole("listitem")).toHaveText([/ml · unidad base/, /1 Botella = 1000 ml/, /1 Caja = 6000 ml/]);
  });

  await test.step("RF-13 una equivalencia inválida se rechaza con el formato válido", async () => {
    await page.getByRole("button", { name: "Añadir presentación" }).click();
    const d = dialog(page, "Nueva presentación");
    await d.getByLabel("Nombre de la presentación").fill("Garrafa");
    await d.getByLabel("Equivalencia en ml").fill("0");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d.getByRole("alert").filter({ hasText: /mayor que cero/ })).toBeVisible();
    await d.getByRole("button", { name: "Cancelar" }).click();
  });

  await test.step("RF-15 presentación para comprar y para contar", async () => {
    await page.getByLabel("Para comprar").selectOption({ label: "Caja" });
    await page.getByLabel("Para contar").selectOption({ label: "Botella" });
    await page.getByRole("button", { name: "Guardar uso" }).click();
    await expect(presentations.getByRole("listitem").filter({ hasText: "Caja" })).toContainText("Compra");
    await expect(presentations.getByRole("listitem").filter({ hasText: "Botella" })).toContainText("Conteo");
  });

  await test.step("RF-16 la unidad base no se edita", async () => {
    await page.getByRole("button", { name: "Editar Aceite de oliva" }).click();
    const d = dialog(page, "Editar Aceite de oliva");
    await expect(d.getByLabel("Unidad base")).toHaveCount(0);
    await expect(d).toContainText("La unidad base no se cambia");
    await d.getByRole("button", { name: "Cancelar" }).click();
  });

  await test.step("RF-22 RF-23 RF-26 mínimo y máximo capturados en cajas y mostrados en botellas", async () => {
    await page.getByRole("button", { name: "Fijar mínimo y máximo en Cámara fría" }).click();
    const d = dialog(page, "Mínimo y máximo en Cámara fría");
    await d.getByLabel("Capturar en").selectOption({ label: "Caja" });
    await d.getByLabel("Mínimo").fill("2");
    await d.getByLabel("Máximo").fill("3");
    await d.getByRole("button", { name: "Guardar" }).click();
    const row = page.getByTestId("levels").locator('[data-warehouse="Cámara fría"]');
    await expect(row.getByTestId("level-min")).toHaveText("Mínimo: 12 Botella");
    await expect(row.getByTestId("level-max")).toHaveText("Máximo: 18 Botella");
  });

  await test.step("RF-24 un máximo menor que el mínimo se rechaza", async () => {
    await page.getByRole("button", { name: "Fijar mínimo y máximo en Bodega central" }).click();
    const d = dialog(page, "Mínimo y máximo en Bodega central");
    await d.getByLabel("Mínimo").fill("5");
    await d.getByLabel("Máximo").fill("4");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d.getByRole("alert").filter({ hasText: "El máximo debe ser igual o mayor que el mínimo." })).toBeVisible();
    await d.getByRole("button", { name: "Cancelar" }).click();
  });

  await test.step("RF-17 cambiar la equivalencia recalcula lo mostrado", async () => {
    await page.getByRole("button", { name: "Editar Botella" }).click();
    const d = dialog(page, "Editar Botella");
    await d.getByLabel("Equivalencia en ml").fill("500");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByTestId("levels").locator('[data-warehouse="Cámara fría"]').getByTestId("level-min")).toHaveText("Mínimo: 24 Botella");
  });

  await test.step("RF-29 el proveedor muestra sus productos", async () => {
    await page.goto("/proveedores");
    await expect(page.getByRole("list", { name: "Productos de Lácteos del Norte" }).getByRole("link")).toHaveText(["Aceite de oliva"]);
  });

  await test.step("RF-39 RF-40 RF-41 búsqueda sin acentos y filtros por proveedor, archivados y mínimo", async () => {
    await page.goto("/productos");
    await page.getByRole("button", { name: "Nuevo producto" }).click();
    const d = dialog(page, "Nuevo producto");
    await d.getByLabel("Nombre").fill("Azúcar");
    await d.getByRole("button", { name: "Guardar" }).click();
    await page.waitForURL(/\/productos\/[0-9a-f-]{36}$/);
    await page.goto("/productos");
    const names = page.locator("tbody th");
    await expect(names).toHaveText(["Aceite de oliva", "Azúcar"]);
    await page.getByRole("searchbox", { name: "Buscar producto" }).fill("azucar");
    await expect(names).toHaveText(["Azúcar"]);
    await page.getByRole("searchbox", { name: "Buscar producto" }).fill("");
    await page.getByLabel("Proveedor", { exact: true }).selectOption({ label: "Lácteos del Norte" });
    await expect(names).toHaveText(["Aceite de oliva"]);
    await page.getByLabel("Proveedor", { exact: true }).selectOption({ label: "Sin proveedor" });
    await expect(names).toHaveText(["Azúcar"]);
    await page.getByLabel("Proveedor", { exact: true }).selectOption({ label: "Todos los proveedores" });
    await page.getByLabel("Mínimos del almacén").selectOption({ label: "Cámara fría" });
    await page.getByRole("button", { name: "Con mínimo" }).click();
    await expect(names).toHaveText(["Aceite de oliva"]);
    await expect(page.locator("tbody tr").first()).toContainText("24 Botella");
    await page.getByRole("button", { name: "Con mínimo" }).click();
    await page.getByRole("button", { name: "Sin mínimo" }).click();
    await expect(names).toHaveText(["Azúcar"]);
    await page.getByRole("button", { name: "Sin mínimo" }).click();
  });

  await test.step("RF-33 RF-34 archivar oculta de los activos y se puede reactivar", async () => {
    await page.getByRole("link", { name: "Azúcar" }).click();
    await page.getByRole("button", { name: "Archivar" }).click();
    await expect(page.getByText("Archivado", { exact: true })).toBeVisible();
    await page.goto("/productos");
    const names = page.locator("tbody th");
    await expect(page.getByRole("button", { name: "Activos" })).toHaveAttribute("aria-pressed", "true");
    await expect(names).toHaveText(["Aceite de oliva"]);
    await page.getByRole("button", { name: "Activos" }).click();
    await page.getByRole("button", { name: "Archivados" }).click();
    await expect(names).toHaveText(["Azúcar"]);
    await page.getByRole("link", { name: "Azúcar" }).click();
    await page.getByRole("button", { name: "Reactivar" }).click();
    await expect(page.getByRole("button", { name: "Archivar" })).toBeVisible();
  });

  await test.step("RF-5 otra sucursal ve los almacenes del negocio pero no los de Sendero", async () => {
    await workIn(page, "Pastatti · Centro");
    await page.goto("/almacenes");
    const list = page.getByRole("region", { name: "Almacenes" });
    await expect(list.locator("[data-item]")).toHaveCount(1);
    await expect(list.locator('[data-item="Bodega central"]')).toBeVisible();
    await expect(page.getByRole("region", { name: "Áreas" })).toContainText("Esta sucursal aún no tiene áreas.");
  });

  await test.step("RF-4 en Pirrus no aparece nada del catálogo de Pastatti", async () => {
    await workIn(page, "Pirrus · Centro");
    await page.goto("/productos");
    await expect(page.getByText("Todavía no hay productos")).toBeVisible();
    await page.goto("/proveedores");
    await expect(page.getByText("Todavía no hay proveedores")).toBeVisible();
  });
});

test("catálogo: volumen de 1,000 productos", async ({ page }) => {
  await seedOwner();
  const pastatti = await seedBusiness("Pastatti", ["Sendero"], "violeta");
  const sql = postgres(DB, { max: 1, onnotice: () => {} });
  try {
    const rows = Array.from({ length: 1000 }, (_, i) => {
      const name = `Producto ${String(i + 1).padStart(4, "0")}`;
      return { business_id: pastatti.id, name, name_key: name.toLowerCase(), base_unit: "g" };
    });
    await sql`insert into products ${sql(rows)}`;
  } finally {
    await sql.end();
  }
  await page.setViewportSize({ width: 1360, height: 950 });
  await login(page, OWNER.email, OWNER.password);

  await test.step("la tabla de 1,000 productos abre en menos de 2 segundos", async () => {
    await page.goto("/productos");
    const start = Date.now();
    await page.goto("/productos");
    await expect(page.getByTestId("table-count")).toHaveText("Mostrando 1000 de 1000");
    expect(Date.now() - start).toBeLessThan(2000);
  });

  await test.step("la búsqueda filtra en menos de 300 ms", async () => {
    const elapsed = await page.evaluate(async () => {
      const input = document.querySelector<HTMLInputElement>('input[type="search"]')!;
      const count = document.querySelector('[data-testid="table-count"]')!;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      const t0 = performance.now();
      setter.call(input, "producto 0999");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      while (count.textContent !== "Mostrando 1 de 1000") await new Promise((r) => requestAnimationFrame(r));
      return performance.now() - t0;
    });
    expect(elapsed).toBeLessThan(300);
  });
});
