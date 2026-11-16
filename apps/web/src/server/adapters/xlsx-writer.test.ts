import { describe, expect, it } from "vitest";
import { readWorkbook } from "./xlsx";
import { Num, writeWorkbook } from "./xlsx-writer";

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
