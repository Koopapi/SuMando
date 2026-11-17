import { describe, expect, it } from "vitest";
import { applyTable, groupRows, openByDefault, pageOf, PAGE_SIZE, type TableFilter } from "./table-view";

type Row = { name: string; area: string | null; low: boolean };
const rows: Row[] = [
  { name: "Agua", area: "Bebidas", low: true },
  { name: "Cerveza", area: "Bebidas", low: false },
  { name: "Tostitos", area: "Barra fría", low: true },
  { name: "Botiquín", area: null, low: false },
];
const filters: TableFilter<Row>[] = [
  { id: "low", group: "status", label: "Bajo mínimo", test: (r) => r.low },
  { id: "area:Bebidas", group: "area", label: "Bebidas", test: (r) => r.area === "Bebidas" },
  { id: "area:Barra fría", group: "area", label: "Barra fría", test: (r) => r.area === "Barra fría" },
];
const names = (rs: Row[]) => rs.map((r) => r.name);

describe("spec 014 — filtros, grupos y páginas", () => {
  it("test_s014_rf8_un_filtro_por_tipo_y_se_combinan_entre_tipos", () => {
    expect(names(applyTable(rows, filters, { area: "area:Bebidas" }, "", (r) => [r.name]))).toEqual(["Agua", "Cerveza"]);
    expect(names(applyTable(rows, filters, { area: "area:Bebidas", status: "low" }, "", (r) => [r.name]))).toEqual(["Agua"]);
    expect(names(applyTable(rows, filters, { area: "" }, "", (r) => [r.name]))).toHaveLength(4);
  });

  it("test_s014_rf12_filtros_y_busqueda_sobre_todos_los_renglones", () => {
    expect(names(applyTable(rows, filters, { status: "low" }, "tost", (r) => [r.name]))).toEqual(["Tostitos"]);
  });

  it("test_s014_rf13_rf14_grupos_por_nombre_con_cuenta_y_sin_grupo_al_final", () => {
    const groups = groupRows(rows, (r) => r.area, "Sin área");
    expect(groups.map((g) => [g.label, g.rows.length])).toEqual([["Barra fría", 1], ["Bebidas", 2], ["Sin área", 1]]);
    expect(groupRows(rows.slice(0, 2), (r) => r.area, "Sin área")).toHaveLength(1);
  });

  it("test_s014_rf16_con_mas_de_50_renglones_los_grupos_empiezan_cerrados", () => {
    expect(openByDefault(50)).toBe(true);
    expect(openByDefault(51)).toBe(false);
  });

  it("test_s014_rf17_con_busqueda_o_filtro_se_abren_los_grupos_que_coinciden", () => {
    expect(openByDefault(500, true)).toBe(true);
  });

  it("test_s014_rf18_paginas_de_25", () => {
    expect(PAGE_SIZE).toBe(25);
    const many = Array.from({ length: 60 }, (_, i) => i);
    expect(pageOf(many, 1)).toMatchObject({ page: 1, pages: 3, from: 1, to: 25 });
    expect(pageOf(many, 3)).toMatchObject({ page: 3, pages: 3, from: 51, to: 60 });
    expect(pageOf(many, 3).rows).toHaveLength(10);
    expect(pageOf(many, 9).page).toBe(3);
    expect(pageOf([], 1)).toMatchObject({ pages: 1, from: 0, to: 0 });
  });

  it("test_s014_rf11_el_conteo_sale_de_lo_que_coincide", () => {
    expect(applyTable(rows, filters, { status: "low" }, "", (r) => [r.name]).length).toBe(2);
  });
});
