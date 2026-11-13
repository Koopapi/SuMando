import { describe, expect, it } from "vitest";
import { analyzeInventorySheets, type CatalogSnapshot } from "./sheet-import";

const HEADER = ["ÁREA", "RESPONSABLE", "ARTÍCULO", "PRESENTACIÓN INDIVIDUAL", "CANT", "UNIDAD", "CONVERSIÓN", "TOTAL", "PRESENTACIÓN FINAL", "PROVEEDOR", " MÍNIMO"];
const empty: CatalogSnapshot = { products: [], areas: [], productArea: new Map() };
const sheet = (rows: string[][], name = "Inventario por áreas") => ({ name, rows: [["INVENTARIO POR ÁREAS"], HEADER, ...rows] });
const row = (area: string, name: string, cant: string, unit: string, conv: string, final: string, supplier = "", min = "") => [area, "PENDIENTE", name, "", cant, unit, conv, "", final, supplier, min];
const analyze = (rows: string[][], catalog = empty) => analyzeInventorySheets([sheet(rows)], catalog, "wh");

describe("spec 006 — análisis de la hoja de inventario", () => {
  it("test_s006_rf6_se_reconoce_el_encabezado_sin_acentos_ni_espacios", () => {
    const r = analyze([row("BEBIDAS", "AMSTEL ULTRA", "193", "PIEZA", "24", "CARTON", "HEINEKEN México", "12")]);
    expect(r.readable).toBe(true);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({ area: "BEBIDAS", name: "AMSTEL ULTRA", baseUnit: "pz", purchase: { name: "Carton", factorMilli: 24_000n }, supplier: "HEINEKEN México", quantityMilli: 193_000n, minMilli: 288_000n, status: "new", row: 3 });
  });

  it("test_s006_rf7_se_ignoran_hojas_sin_encabezado_filas_de_grupo_y_sin_articulo", () => {
    const precios = { name: "Precios", rows: [["ÁREA", "RESPONSABLE", "ARTÍCULO", "CANT", "", "PRESENTACIÓN INDIVIDUAL"], ["ABARROTES", "PENDIENTE", "Aceite", "", "643.46", "GARRAFA"]] };
    const r = analyzeInventorySheets([sheet([["BEBIDAS  |  RESPONSABLE: PENDIENTE  |  PRODUCTOS: 29"], row("BEBIDAS", "", "1", "PIEZA", "", ""), row("BEBIDAS", "BOHEMIA", "20", "PIEZA", "24", "CARTON")]), precios], empty, "wh");
    expect(r.rows.map((x) => x.name)).toEqual(["BOHEMIA"]);
    expect(analyzeInventorySheets([precios], empty, "wh").readable).toBe(false);
  });

  it("test_s006_rf9_las_columnas_opcionales_pueden_faltar", () => {
    const r = analyzeInventorySheets([{ name: "Mínima", rows: [["ÁREA", "ARTÍCULO", "UNIDAD"], ["LÁCTEOS", "Queso", "KILOGRAMO"]] }], empty, "wh");
    expect(r.rows[0]).toMatchObject({ name: "Queso", baseUnit: "g", quantityMilli: null, minMilli: null, supplier: null, purchase: null, warnings: ["no_purchase"] });
  });

  it("test_s006_rf15_sin_presentacion_final_o_conversion_invalida_hay_aviso", () => {
    const [a, b, c, d] = analyze([row("A", "Uno", "1", "PIEZA", "", "CAJA"), row("A", "Dos", "1", "PIEZA", "0", ""), row("A", "Tres", "1", "KILOGRAMO", "1", "KILOGRAMO"), row("A", "Cuatro", "1", "PIEZA", "1", "PIEZA")]).rows;
    expect([a.warnings, b.warnings]).toEqual([["no_purchase"], ["no_purchase"]]);
    expect([c.purchase, c.warnings, d.purchase, d.warnings]).toEqual([null, [], null, []]);
  });

  it("test_s006_rf16_cada_fila_trae_su_estado_unidad_presentaciones_minimo_y_cantidad", () => {
    const [q] = analyze([row("LÁCTEOS", "QUESO MANCHEGO", "9.4329999999999998", "KILOGRAMO", "1", "KILOGRAMO", "SAMS", "2")]).rows;
    expect(q).toMatchObject({ baseUnit: "g", count: { name: "Kilogramo", factorMilli: 1_000_000n }, purchase: null, quantityMilli: 9_433_000n, minMilli: 2_000_000n, status: "new" });
  });

  it("test_s006_rf17_el_resumen_sale_de_las_filas", () => {
    const r = analyze([row("A", "Uno", "1", "PIEZA", "", ""), row("B", "Dos", "", "PIEZA", "", "")]);
    expect(new Set(r.rows.map((x) => x.areaKey)).size).toBe(2);
    expect(r.rows.filter((x) => x.quantityMilli !== null)).toHaveLength(1);
  });

  it("test_s006_rf18_un_nombre_de_mas_de_80_caracteres_es_problema", () => {
    expect(analyze([row("A", "x".repeat(81), "1", "PIEZA", "", "")]).rows[0]).toMatchObject({ status: "problem", problems: ["name_too_long"] });
  });

  it("test_s006_rf19_el_mismo_articulo_dos_veces_es_problema_en_la_segunda", () => {
    const r = analyze([row("A", "Tecate Roja", "1", "PIEZA", "", ""), row("B", "TECATE  ROJA ", "2", "PIEZA", "", "")]);
    expect(r.rows.map((x) => x.status)).toEqual(["new", "problem"]);
    expect(r.rows[1].problems).toEqual(["repeated"]);
  });

  it("test_s006_rf20_existente_con_otra_unidad_base_es_problema", () => {
    const catalog = { ...empty, products: [{ id: "p1", nameKey: "leche", baseUnit: "pz" as const }] };
    expect(analyze([row("A", "Leche", "1", "LITRO", "", "")], catalog).rows[0]).toMatchObject({ status: "problem", problems: ["unit_mismatch"] });
    expect(analyze([row("A", "LECHE", "1", "PIEZA", "", "")], catalog).rows[0]).toMatchObject({ status: "existing", existingId: "p1" });
  });

  it("test_s006_rf21_cantidad_o_minimo_invalidos_son_aviso_y_la_fila_entra", () => {
    const [r] = analyze([row("A", "Uno", "mucho", "PIEZA", "", "", "", "-2")]).rows;
    expect(r).toMatchObject({ status: "new", quantityMilli: null, minMilli: null });
    expect(r.warnings).toEqual(expect.arrayContaining(["invalid_quantity", "invalid_minimum"]));
    const [slash] = analyze([row("A", "Dos", "/", "PIEZA", "", "")]).rows;
    expect(slash.warnings).not.toContain("invalid_quantity");
  });

  it("test_s006_rf22_cada_fila_dice_su_hoja_y_fila_del_excel", () => {
    const r = analyzeInventorySheets([{ name: "Sendero", rows: [HEADER, row("A", "Uno", "1", "PIEZA", "", "")], numbers: [4, 9] }], empty, "wh");
    expect(r.rows[0]).toMatchObject({ sheet: "Sendero", row: 9 });
  });

  it("test_s006_rf26_un_existente_conserva_su_id_para_completarse", () => {
    const catalog = { ...empty, products: [{ id: "p1", nameKey: "amstel ultra", baseUnit: "pz" as const }] };
    expect(analyze([row("BEBIDAS", "Amstel Ultra", "5", "PIEZA", "24", "CARTON")], catalog).rows[0]).toMatchObject({ status: "existing", existingId: "p1", purchase: { name: "Carton" } });
  });

  it("test_s006_rf29_un_area_que_se_cuenta_en_otro_almacen_es_problema", () => {
    const catalog = { ...empty, areas: [{ id: "a1", nameKey: "bebidas", warehouseId: "otro" }] };
    expect(analyze([row("Bebidas", "Uno", "1", "PIEZA", "", "")], catalog).rows[0].problems).toEqual(["area_other_warehouse"]);
    expect(analyze([row("Bebidas", "Uno", "1", "PIEZA", "", "")], { ...empty, areas: [{ id: "a1", nameKey: "bebidas", warehouseId: "wh" }] }).rows[0].status).toBe("new");
  });

  it("test_s006_rf30_un_existente_contado_en_otra_area_del_almacen_es_aviso", () => {
    const catalog = { products: [{ id: "p1", nameKey: "uno", baseUnit: "pz" as const }], areas: [{ id: "a1", nameKey: "barra", warehouseId: "wh" }], productArea: new Map([["p1", "a1"]]) };
    expect(analyze([row("Cocina", "Uno", "1", "PIEZA", "1", "PIEZA")], catalog).rows[0]).toMatchObject({ status: "existing", warnings: ["in_other_area"] });
    expect(analyze([row("Barra", "Uno", "1", "PIEZA", "1", "PIEZA")], catalog).rows[0].warnings).toEqual([]);
  });

  it("test_s006_rf11_rf12_presentaciones_de_conteo_segun_la_unidad", () => {
    const [bote, litro, gramo] = analyze([row("A", "Mayonesa", "3", "BOTE", "1", "BOTE"), row("A", "Crema", "7", "LITRO", "1", "LITRO"), row("A", "Tocino", "827", "GRAMO", "1", "GRAMO")]).rows;
    expect(bote).toMatchObject({ baseUnit: "pz", count: { name: "Bote", factorMilli: 1000n }, purchase: null, quantityMilli: 3000n });
    expect(litro).toMatchObject({ baseUnit: "ml", count: { name: "Litro", factorMilli: 1_000_000n }, quantityMilli: 7_000_000n });
    expect(gramo).toMatchObject({ baseUnit: "g", count: null, quantityMilli: 827_000n });
  });

  it("test_s006_rf14_presentacion_final_de_peso_usa_su_equivalencia_estandar", () => {
    const [r] = analyze([row("A", "Harina", "500", "GRAMO", "7", "KILOGRAMO")]).rows;
    expect(r.purchase).toEqual({ name: "Kilogramo", factorMilli: 1_000_000n });
    expect(analyze([row("A", "Raro", "1", "LITRO", "1", "KILOGRAMO")]).rows[0].warnings).toEqual(["no_purchase"]);
  });
});
