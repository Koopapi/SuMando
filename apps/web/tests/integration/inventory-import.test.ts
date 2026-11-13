// Spec 006: importar la hoja «Inventario por áreas» contra la BD de pruebas (revisión, confirmación, conteo).
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { POST as importRoute } from "@/app/api/inventory/import/route";
import { auditEntriesFor } from "@/server/adapters/drizzle/store";
import { createArea } from "@/server/services/catalog/places";
import { createProduct } from "@/server/services/catalog/products";
import { catalogView } from "@/server/services/catalog/views";
import { setAreaProducts } from "@/server/services/inventory/counts";
import { confirmInventoryImport, reviewInventoryImport } from "@/server/services/inventory/import";
import { productHistory } from "@/server/services/inventory/movements";
import { stockOfWarehouse } from "@/server/services/inventory/stock";
import { xlsx } from "../support/xlsx";
import { code, inventoryWorld } from "./inventory-fixture";

const HEADER = ["ÁREA", "RESPONSABLE", "ARTÍCULO", "PRESENTACIÓN INDIVIDUAL", "CANT", "UNIDAD", "CONVERSIÓN", "TOTAL", "PRESENTACIÓN FINAL", "PROVEEDOR", " MÍNIMO"];
type Cell = string | number | null;
const r = (area: string, name: string, cant: Cell, unit: string, conv: Cell, final: string, supplier = "", min: Cell = null): Cell[] => [area, "PENDIENTE", name, "", cant, unit, conv, null, final, supplier, min];
const book = (rows: Cell[][]) => xlsx([{ name: "Inventario por áreas", rows: [["INVENTARIO POR ÁREAS"], HEADER, ["BEBIDAS  |  RESPONSABLE: PENDIENTE  |  PRODUCTOS: 2"], ...rows] }]);
const PIRRUS = book([
  r("BEBIDAS", "AMSTEL ULTRA", 193, "PIEZA", 24, "CARTON", "HEINEKEN México", 12),
  r("BEBIDAS", "AGUA ARTESANAL", "/", "PIEZA", 1, "BOTELLA", "PROVEEDOR LOCAL", 90),
  r("LÁCTEOS", "QUESO MANCHEGO", 9.4329999999999998, "KILOGRAMO", 1, "KILOGRAMO", "SAMS", 2),
  r("LÁCTEOS", "MAYONESA", 3, "BOTE", 1, "BOTE", "SAMS"),
  r("LÁCTEOS", "Amstel ultra", 1, "PIEZA", 24, "CARTON"),
]);
type World = Awaited<ReturnType<typeof inventoryWorld>>;
const rowOf = async (w: World, name: string) => (await stockOfWarehouse(w.ctx, w.ownerSendero, w.bodegaSendero.id)).rows.find((x) => x.name === name);

describe("spec 006 — importar inventario por áreas", () => {
  it("test_s006_rf16_rf17_la_revision_no_guarda_nada", async () => {
    const w = await inventoryWorld();
    const review = await reviewInventoryImport(w.ctx, w.ownerSendero, w.bodegaSendero.id, PIRRUS);
    expect(review.summary).toEqual({ rows: 5, newProducts: 3, existingProducts: 1, problems: 1, newSuppliers: 3, newAreas: 2, areasCounted: 2 });
    expect(review.rows.map((x) => [x.name, x.status])).toEqual([["AMSTEL ULTRA", "new"], ["AGUA ARTESANAL", "new"], ["QUESO MANCHEGO", "existing"], ["MAYONESA", "new"], ["Amstel ultra", "problem"]]);
    expect(review.rows[0]).toMatchObject({ sheet: "Inventario por áreas", row: 4, purchase: { name: "Carton", factor: "24" }, min: "288", quantity: "193" });
    const catalog = await catalogView(w.ctx, w.ownerSendero);
    expect(catalog.products.map((p) => p.name)).toEqual(["Leche", "Queso manchego"]);
  });

  it("test_s006_rf23_rf25_rf27_rf28_al_confirmar_se_crea_el_catalogo_y_las_areas", async () => {
    const w = await inventoryWorld();
    const result = await confirmInventoryImport(w.ctx, w.ownerSendero, w.bodegaSendero.id, PIRRUS, "INVENTARIO PIRRUS.xlsx");
    expect(result).toEqual({ created: 3, completed: 1, skipped: 1, areasCounted: 2 });
    const catalog = await catalogView(w.ctx, w.ownerSendero);
    const amstel = catalog.products.find((p) => p.name === "AMSTEL ULTRA")!;
    expect(amstel).toMatchObject({ baseUnit: "pz", supplier: { name: "HEINEKEN México" } });
    expect(amstel.presentations.map((p) => [p.name, p.factor])).toEqual([[null, "1"], ["Carton", "24"]]);
    expect(amstel.purchasePresentationId).toBe(amstel.presentations[1].id);
    expect(catalog.products.find((p) => p.name === "MAYONESA")!.presentations.map((p) => p.name)).toContain("Bote");
    expect(catalog.suppliers.map((s) => s.name).sort()).toEqual(["HEINEKEN México", "PROVEEDOR LOCAL", "SAMS"]);
    expect(catalog.areas.map((a) => [a.name, a.responsible.id])).toEqual(expect.arrayContaining([["BEBIDAS", w.owner.id], ["LÁCTEOS", w.owner.id]]));
  });

  it("test_s006_rf26_un_existente_se_completa_sin_cambiar_lo_que_tiene", async () => {
    const w = await inventoryWorld();
    // «Queso manchego» ya existe en gramos con su presentación «Pieza» de conteo.
    await confirmInventoryImport(w.ctx, w.ownerSendero, w.bodegaSendero.id, PIRRUS, "x.xlsx");
    const queso = (await catalogView(w.ctx, w.ownerSendero)).products.find((p) => p.id === w.queso.id)!;
    expect(queso.name).toBe("Queso manchego");
    expect(queso.countPresentationId).toBe(w.pieza.id);
    expect(queso.presentations.map((p) => p.name)).toEqual([null, "Kilogramo", "Pieza"]);
    expect(queso.supplier?.name).toBe("SAMS");
    expect(queso.levels[w.bodegaSendero.id].min).toBe("2");
  });

  it("test_s006_rf31_el_minimo_va_en_la_presentacion_final", async () => {
    const w = await inventoryWorld();
    await confirmInventoryImport(w.ctx, w.ownerSendero, w.bodegaSendero.id, PIRRUS, "x.xlsx");
    expect((await rowOf(w, "AMSTEL ULTRA"))?.min).toBe("288");
    expect((await rowOf(w, "AGUA ARTESANAL"))?.min).toBe("90");
  });

  it("test_s006_rf32_rf33_la_cantidad_entra_como_conteo_y_lo_que_no_trae_no_cambia", async () => {
    const w = await inventoryWorld();
    await w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.queso.id, quantity: "1000" }]);
    await confirmInventoryImport(w.ctx, w.ownerSendero, w.bodegaSendero.id, PIRRUS, "x.xlsx");
    expect((await rowOf(w, "AMSTEL ULTRA"))?.quantity).toBe("193");
    expect((await rowOf(w, "AGUA ARTESANAL"))?.quantity).toBe("0");
    expect((await rowOf(w, "Queso manchego"))).toMatchObject({ quantity: "9.433", area: "LÁCTEOS" });
    const h = await productHistory(w.ctx, w.ownerSendero, w.bodegaSendero.id, w.queso.id, null);
    expect(h.entries[0]).toMatchObject({ kind: "count", delta: "8.433", balance: "9.433" });
  });

  it("test_s006_rf34_cantidades_con_ruido_de_excel_quedan_exactas", async () => {
    const w = await inventoryWorld();
    await confirmInventoryImport(w.ctx, w.ownerSendero, w.bodegaSendero.id, book([r("A", "Tocino", 0.82699999999999996, "KILOGRAMO", 1, "GRAMO")]), "x.xlsx");
    const row = await rowOf(w, "Tocino");
    expect(row).toMatchObject({ quantity: "0.827", presentation: "Kilogramo" });
  });

  it("test_s006_rf30_el_producto_entra_a_la_lista_de_su_area_salvo_que_ya_este_en_otra", async () => {
    const w = await inventoryWorld();
    const barra = await createArea(w.ctx, w.ownerSendero, { name: "Barra", responsibleId: w.owner.id });
    await setAreaProducts(w.ctx, w.ownerSendero, barra.id, { warehouseId: w.bodegaSendero.id, productIds: [w.leche.id] });
    await confirmInventoryImport(w.ctx, w.ownerSendero, w.bodegaSendero.id, book([r("Cocina", "Leche", 2, "LITRO", 1, "LITRO"), r("Cocina", "Sal", 1, "KILOGRAMO", 1, "KILOGRAMO")]), "x.xlsx");
    expect((await rowOf(w, "Leche"))?.area).toBe("Barra");
    expect((await rowOf(w, "Sal"))?.area).toBe("Cocina");
    expect(await rowOf(w, "Leche")).toMatchObject({ quantity: "2", presentation: "Litro" });
  });

  it("test_s006_rf29_un_area_que_se_cuenta_en_otro_almacen_no_se_importa", async () => {
    const w = await inventoryWorld();
    const barra = await createArea(w.ctx, w.ownerSendero, { name: "Barra", responsibleId: w.owner.id });
    await setAreaProducts(w.ctx, w.ownerSendero, barra.id, { warehouseId: w.central.id, productIds: [] });
    const review = await reviewInventoryImport(w.ctx, w.ownerSendero, w.bodegaSendero.id, book([r("Barra", "Sal", 1, "KILOGRAMO", 1, "KILOGRAMO")]));
    expect(review.rows[0]).toMatchObject({ status: "problem", problems: ["area_other_warehouse"] });
  });

  it("test_s006_rf24_sin_filas_importables_no_se_guarda_nada", async () => {
    const w = await inventoryWorld();
    await createProduct(w.ctx, w.ownerSendero, { name: "Sal", baseUnit: "pz" });
    expect(await code(confirmInventoryImport(w.ctx, w.ownerSendero, w.bodegaSendero.id, book([r("A", "Sal", 1, "KILOGRAMO", 1, "KILOGRAMO")]), "x.xlsx"))).toBe("import_empty");
    expect((await catalogView(w.ctx, w.ownerSendero)).areas).toEqual([]);
  });

  it("test_s006_rf36_reimportar_no_duplica_y_resume_lo_hecho", async () => {
    const w = await inventoryWorld();
    await confirmInventoryImport(w.ctx, w.ownerSendero, w.bodegaSendero.id, PIRRUS, "x.xlsx");
    const again = await confirmInventoryImport(w.ctx, w.ownerSendero, w.bodegaSendero.id, PIRRUS, "x.xlsx");
    expect(again).toEqual({ created: 0, completed: 4, skipped: 1, areasCounted: 2 });
    const catalog = await catalogView(w.ctx, w.ownerSendero);
    expect(catalog.products).toHaveLength(5);
    expect(catalog.products.find((p) => p.name === "AMSTEL ULTRA")!.presentations).toHaveLength(2);
    expect(catalog.areas).toHaveLength(2);
  });

  it("test_s006_rf35_queda_registro_de_lo_creado_y_de_la_importacion", async () => {
    const w = await inventoryWorld();
    await confirmInventoryImport(w.ctx, w.ownerSendero, w.bodegaSendero.id, PIRRUS, "INVENTARIO PIRRUS.xlsx");
    const amstel = (await catalogView(w.ctx, w.ownerSendero)).products.find((p) => p.name === "AMSTEL ULTRA")!;
    expect((await auditEntriesFor(db, "product", amstel.id)).map((e) => e.action)).toEqual(["product.imported"]);
    const [imported] = await auditEntriesFor(db, "inventory_import", w.bodegaSendero.id);
    expect(imported).toMatchObject({ action: "inventory.imported", actorId: w.owner.id, after: { file: "INVENTARIO PIRRUS.xlsx", created: 3 } });
  });

  it("test_s006_rf1_rf4_solo_toca_el_negocio_y_la_sucursal_activa", async () => {
    const w = await inventoryWorld();
    await confirmInventoryImport(w.ctx, w.ownerSendero, w.bodegaSendero.id, PIRRUS, "x.xlsx");
    expect((await catalogView(w.ctx, w.ownerPirrus)).products.map((p) => p.name).sort()).toEqual(["Crema", "Leche", "queso Manchego"]);
    expect((await catalogView(w.ctx, w.ownerCentro)).areas).toEqual([]);
  });

  it("test_s006_rf2_rf3_permisos_del_catalogo_y_del_almacen", async () => {
    const w = await inventoryWorld();
    expect(await code(reviewInventoryImport(w.ctx, w.adminSendero, w.bodegaCentro.id, PIRRUS))).toBe("not_found");
    expect(await code(reviewInventoryImport(w.ctx, w.adminSendero, w.bodegaSendero.id, PIRRUS))).toBe("ok");
    expect(await code(reviewInventoryImport(w.ctx, w.adminPirrus, w.bodegaSendero.id, PIRRUS))).toBe("not_found");
  });

  it("test_s006_rf5_rf8_el_archivo_se_valida_por_la_api", async () => {
    const w = await inventoryWorld();
    const bad = await importRoute(new Request("http://test/api/inventory/import", { method: "POST" }));
    expect(bad.status).toBe(401);
    expect(await code(reviewInventoryImport(w.ctx, w.ownerSendero, w.bodegaSendero.id, Buffer.from("no es excel")))).toBe("invalid_file");
    const noHeader = xlsx([{ name: "Precios", rows: [["ARTÍCULO", "PRECIO"], ["Aceite", 643.46]] }]);
    expect(await code(reviewInventoryImport(w.ctx, w.ownerSendero, w.bodegaSendero.id, noHeader))).toBe("invalid_file");
    expect(await code(reviewInventoryImport(w.ctx, w.ownerSendero, w.bodegaSendero.id, Buffer.alloc(41 * 1024 * 1024)))).toBe("file_too_large");
  });
});
