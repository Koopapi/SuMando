// Criterios de la spec 004: recetario e insumos (recetas, importación, cálculo, historial y plantillas), en escritorio.
import postgres from "postgres";
import type { Page } from "@playwright/test";
import { xlsx } from "../tests/support/xlsx";
import { expect, test } from "./fixtures";
import { OWNER, login, ownerApiAt, seedBusiness, seedOwner } from "./helpers";
import { BASE, DB } from "./warm";

const HEADER = ["Ingredientes ", "Cantidad bruta ", "Unidad", "Nota "];

async function pirrusCatalog() {
  await seedOwner();
  const pirrus = await seedBusiness("Pirrus", ["Centro"], "rojo");
  const call = await ownerApiAt(pirrus.branches[0].id);
  const product = async (name: string, baseUnit: string, purchase?: [string, string]) => {
    const { product } = await call("/api/products", { name, baseUnit });
    if (purchase) {
      const { presentation } = await call(`/api/products/${product.id}/presentations`, { name: purchase[0], factor: purchase[1] });
      await call(`/api/products/${product.id}`, { purchasePresentationId: presentation.id, countPresentationId: presentation.id }, "PATCH");
    }
    return product.id as string;
  };
  await product("Camarón", "g", ["Bolsa", "2000"]);
  await product("Pepino", "g");
  await product("Salsa negra Especial", "ml");
  return pirrus;
}

const lineOf = (page: Page, product: string) => page.getByTestId("supply-lines").first().locator(`[data-product="${product}"]`);

test("recetario: recetas, importación, cálculo, historial y plantillas", async ({ page }) => {
  await pirrusCatalog();
  await page.setViewportSize({ width: 1360, height: 950 });
  await login(page, OWNER.email, OWNER.password);

  await test.step("RF-7 RF-8 RF-9 se da de alta una receta con ingredientes del catálogo, nota y preparación", async () => {
    await page.goto("/recetas");
    await page.getByRole("link", { name: "Nueva receta" }).click();
    await page.getByLabel("Platillo").fill("Negro");
    const first = page.getByRole("group", { name: "Ingrediente 1" });
    await first.getByLabel("Producto").selectOption({ label: "Pepino" });
    await first.getByLabel("Cantidad bruta").fill("60");
    await first.getByLabel("Nota").fill("1 puño de lunas");
    await page.getByRole("button", { name: "Agregar ingrediente" }).click();
    const second = page.getByRole("group", { name: "Ingrediente 2" });
    await second.getByLabel("Producto").selectOption({ label: "Camarón" });
    await second.getByLabel("Cantidad bruta").fill("0.105");
    await second.getByLabel("En").selectOption({ label: "Bolsa (2000 g)" });
    await page.getByLabel("Modo de preparación").fill("1.- Colocar el pepino\n2.- Agregar el camarón");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("heading", { name: "Negro", exact: true })).toBeVisible();
  });

  await test.step("RF-15 la receta muestra cada cantidad en unidad base y en la presentación de conteo", async () => {
    const ingredients = page.getByTestId("ingredients");
    await expect(ingredients.getByRole("listitem").filter({ hasText: "Camarón" })).toContainText("210 g");
    await expect(ingredients.getByRole("listitem").filter({ hasText: "Camarón" })).toContainText("= 0.105 Bolsa");
    await expect(ingredients.getByRole("listitem").filter({ hasText: "Pepino" })).toContainText("1 puño de lunas");
    await expect(page.getByText("2.- Agregar el camarón")).toBeVisible();
  });

  await test.step("RF-42 RF-47 importar revisa cada platillo antes de guardar y solo entran los listos", async () => {
    await page.goto("/recetas/importar");
    const file = xlsx([
      { name: "VERDE", rows: [["VERDE"], HEADER, ["camaron", 210, "Gramos "], ["pepino", 60, "gramos", "1 puño"], ["1.- Curtir"]] },
      { name: "LIMONADA", rows: [["LIMONADA"], HEADER, ["limones", 140, "Gramos"]] },
    ]);
    await page.getByLabel("Archivo de Excel (.xlsx)").setInputFiles({ name: "recetario.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: file });
    await page.getByRole("button", { name: "Revisar archivo" }).click();
    await expect(page.getByTestId("import-summary")).toHaveText("1 platillo listo · 1 queda fuera");
    await expect(page.locator('[data-dish="LIMONADA"]')).toContainText("«limones» no está en el catálogo.");
    await page.getByRole("button", { name: "Importar 1 platillo" }).click();
    await expect(page.getByText("Se importaron 1 platillo; 1 quedó fuera.")).toBeVisible();
  });

  await test.step("RF-54 la tabla de recetas busca sin acentos y filtra activas y archivadas", async () => {
    await page.goto("/recetas");
    await expect(page.getByRole("link", { name: "VERDE" })).toBeVisible();
    await page.getByRole("searchbox", { name: "Buscar receta" }).fill("negro");
    await expect(page.getByRole("link", { name: "Negro" })).toBeVisible();
    await expect(page.getByRole("link", { name: "VERDE" })).toHaveCount(0);
  });

  await test.step("RF-20 RF-22 RF-24 RF-25 el cálculo suma completas y medias y redondea las bolsas hacia arriba", async () => {
    await page.goto("/insumos");
    await page.getByLabel("Completas de Negro").fill("30");
    await page.getByLabel("Medias de Negro").fill("7");
    await page.getByLabel("Medias de VERDE").fill("10");
    // Camarón: 33.5 × 210 + 5 × 210 = 8,085 g → 5 bolsas de 2 kg. Pepino: 33.5 × 60 + 5 × 60 = 2,310 g.
    await expect(lineOf(page, "Camarón").getByTestId("supply-total")).toHaveText("8,085 g");
    await expect(lineOf(page, "Camarón").getByTestId("supply-purchase")).toHaveText("5 × Bolsa de 2,000 g");
    await expect(lineOf(page, "Pepino").getByTestId("supply-total")).toHaveText("2,310 g");
    await expect(lineOf(page, "Pepino").getByTestId("supply-purchase")).toHaveCount(0);
  });

  await test.step("RF-35 RF-37 se guarda como plantilla y un nombre ocupado pide confirmar el reemplazo", async () => {
    await page.getByRole("button", { name: "Guardar como plantilla" }).click();
    await page.getByRole("dialog", { name: "Guardar como plantilla" }).getByLabel("Nombre de la plantilla").fill("Fin de semana");
    await page.getByRole("dialog", { name: "Guardar como plantilla" }).getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Plantilla «Fin de semana» guardada.")).toBeVisible();
    await page.getByLabel("Completas de Negro").fill("40");
    await expect(lineOf(page, "Camarón").getByTestId("supply-total")).toHaveText("10,185 g");
    await page.getByRole("button", { name: "Guardar como plantilla" }).click();
    await page.getByRole("dialog", { name: "Guardar como plantilla" }).getByLabel("Nombre de la plantilla").fill("fin de semana");
    await page.getByRole("dialog", { name: "Guardar como plantilla" }).getByRole("button", { name: "Guardar" }).click();
    const replace = page.getByRole("dialog", { name: "Reemplazar plantilla" });
    await expect(replace).toContainText("¿Reemplazar sus piezas");
    await replace.getByRole("button", { name: "Reemplazar" }).click();
    await expect(page.getByText("Plantilla «Fin de semana» guardada.")).toBeVisible();
  });

  await test.step("RF-29 RF-30 guardar el cálculo lo lleva al historial con su autor", async () => {
    await page.getByRole("button", { name: "Guardar cálculo" }).click();
    await expect(page.getByRole("heading", { name: /^Cálculo del / })).toBeVisible();
    await expect(page.getByText(`Hecho por ${OWNER.name}`)).toBeVisible();
    await expect(lineOf(page, "Camarón").getByTestId("supply-total")).toHaveText("10,185 g");
    await page.goto("/insumos/historial");
    await expect(page.getByRole("cell", { name: OWNER.name })).toHaveCount(1);
  });

  await test.step("RF-33 «Usar como base» empieza un cálculo nuevo con esas piezas", async () => {
    await page.getByRole("link", { name: /^Ver el cálculo del / }).click();
    await page.getByRole("link", { name: "Usar como base" }).click();
    await expect(page.getByText(/^Piezas del cálculo del /)).toBeVisible();
    await expect(page.getByLabel("Completas de Negro")).toHaveValue("40");
    await expect(page.getByLabel("Medias de VERDE")).toHaveValue("10");
  });

  await test.step("RF-36 una plantilla empieza un cálculo con sus piezas", async () => {
    await page.goto("/insumos/plantillas");
    await page.getByRole("link", { name: "Usar Fin de semana" }).click();
    await expect(page.getByText("Piezas de la plantilla «Fin de semana».")).toBeVisible();
    await expect(page.getByLabel("Completas de Negro")).toHaveValue("40");
  });
});

test("recetario: volumen de 100 recetas y archivo de 50 hojas", async ({ page }) => {
  const pirrus = await pirrusCatalog();
  const sql = postgres(DB, { max: 1, onnotice: () => {} });
  try {
    const products = Array.from({ length: 15 }, (_, i) => {
      const name = `Insumo ${String(i + 1).padStart(2, "0")}`;
      return { business_id: pirrus.id, name, name_key: name.toLowerCase(), base_unit: "g" };
    });
    const productIds = (await sql<{ id: string }[]>`insert into products ${sql(products)} returning id`).map((r) => r.id);
    const recipes = Array.from({ length: 100 }, (_, i) => {
      const name = `Receta ${String(i + 1).padStart(3, "0")}`;
      return { business_id: pirrus.id, name, name_key: name.toLowerCase() };
    });
    const recipeIds = (await sql<{ id: string }[]>`insert into recipes ${sql(recipes)} returning id`).map((r) => r.id);
    const ingredients = recipeIds.flatMap((recipe_id) => productIds.map((product_id, position) => ({ recipe_id, product_id, quantity_base: "12.5", position })));
    await sql`insert into recipe_ingredients ${sql(ingredients)}`;
  } finally {
    await sql.end();
  }
  await page.setViewportSize({ width: 1360, height: 950 });
  await login(page, OWNER.email, OWNER.password);

  await test.step("con 100 recetas de 15 ingredientes la lista se actualiza en menos de 300 ms", async () => {
    await page.goto("/insumos");
    await page.getByLabel("Completas de Receta 001").fill("1");
    await expect(lineOf(page, "Insumo 01").getByTestId("supply-total")).toHaveText("12.5 g");
    const elapsed = await page.evaluate(async () => {
      const input = document.querySelector<HTMLInputElement>('input[aria-label="Completas de Receta 100"]')!;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      const total = () => document.querySelector('[data-product="Insumo 01"] [data-testid="supply-total"]')?.textContent;
      const t0 = performance.now();
      setter.call(input, "3");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      while (total() !== "50 g") await new Promise((r) => requestAnimationFrame(r));
      return performance.now() - t0;
    });
    expect(elapsed).toBeLessThan(300);
  });

  await test.step("un archivo de 50 hojas se revisa en menos de 5 segundos", async () => {
    const rows = Array.from({ length: 15 }, (_, i) => [`insumo ${String(i + 1).padStart(2, "0")}`, 12.5, "Gramos", "nota"]);
    const file = xlsx(Array.from({ length: 50 }, (_, i) => ({ name: `Hoja ${i + 1}`, rows: [[`Platillo ${i + 1}`], HEADER, ...rows, ["1.- Paso uno"], ["2.- Paso dos"]] })));
    const start = Date.now();
    const res = await page.request.post(`${BASE}/api/recipes/import`, { multipart: { file: { name: "recetario.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: file } } });
    const elapsed = Date.now() - start;
    expect(res.status()).toBe(200);
    const { dishes } = await res.json();
    expect(dishes.filter((d: { status: string }) => d.status === "ready")).toHaveLength(50);
    expect(elapsed).toBeLessThan(5000);
  });
});
