// Criterios de la spec 006: importar la hoja «Inventario por áreas», revisar y confirmar, en escritorio.
import { xlsx } from "../tests/support/xlsx";
import { expect, test } from "./fixtures";
import { OWNER, login, ownerApiAt, seedBusiness, seedOwner } from "./helpers";
import { BASE } from "./warm";

const HEADER = ["ÁREA", "RESPONSABLE", "ARTÍCULO", "PRESENTACIÓN INDIVIDUAL", "CANT", "UNIDAD", "CONVERSIÓN", "TOTAL", "PRESENTACIÓN FINAL", "PROVEEDOR", " MÍNIMO"];
type Cell = string | number | null;
const r = (area: string, name: string, cant: Cell, unit: string, conv: Cell, final: string, supplier = "", min: Cell = null): Cell[] => [area, "PENDIENTE", name, "", cant, unit, conv, null, final, supplier, min];
const book = (rows: Cell[][]) => xlsx([{ name: "Inventario por áreas", rows: [["INVENTARIO POR ÁREAS"], HEADER, ...rows] }]);
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

async function world() {
  await seedOwner();
  const pirrus = await seedBusiness("Pirrus", ["Centro"], "rojo");
  const call = await ownerApiAt(pirrus.branches[0].id);
  const { warehouse } = await call("/api/warehouses", { name: "Bodega", scope: "branch" });
  await call("/api/products", { name: "Bohemia", baseUnit: "ml" });
  return { pirrus, warehouseId: warehouse.id as string };
}

test("importar inventario: revisar, ver problemas y confirmar", async ({ page }) => {
  const w = await world();
  await page.setViewportSize({ width: 1360, height: 950 });
  await login(page, OWNER.email, OWNER.password);
  await page.request.put(`${BASE}/api/session/branch`, { data: { branchId: w.pirrus.branches[0].id } });
  const file = book([
    r("BEBIDAS", "AMSTEL ULTRA", 193, "PIEZA", 24, "CARTON", "HEINEKEN México", 12),
    r("BEBIDAS", "BOHEMIA", 20, "PIEZA", 24, "CARTON", "HEINEKEN México", 10),
    r("LÁCTEOS", "QUESO MANCHEGO", 9.433, "KILOGRAMO", 1, "KILOGRAMO", "SAMS", 2),
    r("LÁCTEOS", "MAYONESA", "/", "BOTE", 1, "BOTE", "SAMS"),
  ]);

  await test.step("RF-37 «Importar inventario» está en Productos y en Conteo", async () => {
    await page.goto("/inventario/conteo");
    await expect(page.getByRole("link", { name: "Importar inventario" })).toBeVisible();
    await page.goto("/productos");
    await page.getByRole("link", { name: "Importar inventario" }).click();
    await expect(page.getByRole("heading", { name: "Importar inventario" })).toBeVisible();
  });

  await test.step("RF-3 RF-16 RF-17 la revisión muestra el resumen y cada producto sin guardar", async () => {
    await page.getByLabel("Almacén donde se cargan las existencias").selectOption({ label: "Bodega (de la sucursal)" });
    await page.getByLabel("Archivo de Excel (.xlsx)").setInputFiles({ name: "INVENTARIO PIRRUS.xlsx", mimeType: XLSX, buffer: file });
    await page.getByRole("button", { name: "Revisar" }).click();
    const summary = page.getByTestId("import-summary");
    await expect(summary).toContainText("3 productos nuevos");
    await expect(summary).toContainText("1 con problema (no se importa)");
    await expect(summary).toContainText("2 proveedores nuevos");
    await expect(summary).toContainText("2 áreas nuevas");
    await expect(page.getByRole("row").filter({ hasText: "AMSTEL ULTRA" })).toContainText("Se compra en Carton (24 pz)");
  });

  await test.step("RF-20 RF-22 el problema dice qué pasa y en qué fila", async () => {
    await page.getByRole("button", { name: "Con problema", exact: true }).click();
    const bohemia = page.getByRole("row").filter({ hasText: "BOHEMIA" });
    await expect(bohemia).toContainText("Ya existe en el catálogo con otra unidad base.");
    await expect(bohemia).toContainText("Hoja «Inventario por áreas», fila 4");
    await page.getByRole("button", { name: "Con problema", exact: true }).click();
  });

  await test.step("RF-32 RF-36 al confirmar se importan y la existencia queda contada", async () => {
    await page.getByRole("button", { name: "Importar 3 productos" }).click();
    await expect(page.getByText("3 productos creados, 0 completados, 1 fila omitida y 2 áreas contadas.")).toBeVisible();
    await page.getByRole("link", { name: "Ver existencias" }).click();
    await expect(page.getByRole("row").filter({ hasText: "AMSTEL ULTRA" })).toContainText("193 pz");
    await expect(page.getByRole("row").filter({ hasText: "QUESO MANCHEGO" })).toContainText("9.433 Kilogramo");
    await expect(page.getByRole("row").filter({ hasText: "MAYONESA" })).toContainText("0 Bote");
  });
});

test("importar inventario: volumen de 300 productos", async ({ page }) => {
  const w = await world();
  await login(page, OWNER.email, OWNER.password);
  await page.request.put(`${BASE}/api/session/branch`, { data: { branchId: w.pirrus.branches[0].id } });
  const rows = Array.from({ length: 300 }, (_, i) => r(`ÁREA ${(i % 10) + 1}`, `Producto ${String(i + 1).padStart(3, "0")}`, (i % 7) + 0.5, i % 3 ? "PIEZA" : "KILOGRAMO", 12, "CAJA", `Proveedor ${i % 15}`, 3));
  const file = book(rows);
  const post = (confirm: boolean) => page.request.post(`${BASE}/api/inventory/import`, { multipart: { file: { name: "grande.xlsx", mimeType: XLSX, buffer: file }, warehouseId: w.warehouseId, ...(confirm ? { confirm: "1" } : {}) } });

  await test.step("un archivo de 300 productos se revisa en menos de 5 segundos", async () => {
    const start = Date.now();
    const res = await post(false);
    expect(res.status()).toBe(200);
    expect((await res.json()).summary.newProducts).toBe(300);
    expect(Date.now() - start).toBeLessThan(5000);
  });

  await test.step("y se importa en menos de 10 segundos", async () => {
    const start = Date.now();
    const res = await post(true);
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ created: 300, completed: 0, skipped: 0, areasCounted: 10 });
    expect(Date.now() - start).toBeLessThan(10_000);
  });
});
