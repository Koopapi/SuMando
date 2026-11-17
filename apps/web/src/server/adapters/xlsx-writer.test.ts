import { describe, expect, it } from "vitest";
import { readWorkbook } from "./xlsx";
import { LOGO_ROWS, Num, writeWorkbook } from "./xlsx-writer";

describe("spec 009 — escritor de Excel", () => {
  it("test_s009_rf45_el_libro_se_lee_de_vuelta_con_textos_y_numeros", () => {
    const buf = writeWorkbook("Nómina 2026-11-02", [
      ["Empleado", "Neto"],
      ["Persona <&> Uno", new Num("1234.50")],
      ["Total", 7],
    ]);
    expect(buf.subarray(0, 2).toString()).toBe("PK");
    const [sheet] = readWorkbook(buf).sheets;
    expect(sheet.name).toBe("Nómina 2026-11-02");
    expect(sheet.rows).toEqual([
      ["Empleado", "Neto"],
      ["Persona <&> Uno", "1234.5"],
      ["Total", "7"],
    ]);
  });
});

describe("spec 014 — logo en el Excel", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

  it("test_s014_rf32_el_libro_lleva_el_logo_arriba_y_los_datos_debajo", () => {
    const buf = writeWorkbook("Semana", [["Empleado", "Neto"], ["Uno", new Num("10.00")]], { logo: { png, width: 96, height: 48 } });
    const text = buf.toString("latin1");
    for (const part of ["xl/media/logo.png", "xl/drawings/drawing1.xml", "xl/worksheets/_rels/sheet1.xml.rels"]) expect(text).toContain(part);
    const [sheet] = readWorkbook(buf).sheets;
    const data = sheet.rows.filter((r) => r.some((c) => c !== ""));
    expect(data).toEqual([["Empleado", "Neto"], ["Uno", "10"]]);
    expect(sheet.numbers[sheet.rows.findIndex((r) => r[0] === "Empleado")]).toBe(LOGO_ROWS + 1);
  });

  it("test_s014_rf32_sin_logo_el_libro_queda_igual", () => {
    const text = writeWorkbook("Semana", [["A"]]).toString("latin1");
    expect(text).not.toContain("xl/media/logo.png");
  });
});
