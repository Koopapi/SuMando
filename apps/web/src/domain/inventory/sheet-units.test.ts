import { describe, expect, it } from "vitest";
import { presentationLabel, sheetNumber, sheetUnit, toBaseMilli } from "./sheet-units";

describe("spec 006 — unidades y números de la hoja", () => {
  it("test_s006_rf10_kilogramo_y_gramo_a_gramos_litro_a_mililitros_lo_demas_a_piezas", () => {
    for (const u of ["KILOGRAMO", "kg", "KILOGRAMOS", " Kilos "]) expect(sheetUnit(u)).toMatchObject({ base: "g", kind: "weight", factorMilli: 1_000_000n });
    for (const u of ["GRAMO", "GRAMOS", "gr"]) expect(sheetUnit(u)).toMatchObject({ base: "g", factorMilli: 1000n });
    for (const u of ["LITRO", "LITROS", "L"]) expect(sheetUnit(u)).toMatchObject({ base: "ml", kind: "volume", factorMilli: 1_000_000n });
    expect(sheetUnit("ML")).toMatchObject({ base: "ml", factorMilli: 1000n });
    for (const u of ["PIEZA", "PIEZAS", "pz"]) expect(sheetUnit(u)).toMatchObject({ base: "pz", kind: "piece" });
    for (const u of ["BOTE", "CAJA", "DE DOS BOTES", "MANOJO", "PAR"]) expect(sheetUnit(u)).toMatchObject({ base: "pz", kind: "other", factorMilli: 1000n });
    expect(sheetUnit("")).toMatchObject({ base: "pz", kind: "piece" });
  });

  it("test_s006_rf11_otras_unidades_se_nombran_como_presentacion", () => {
    expect(sheetUnit("DE DOS BOTES").label).toBe("De dos botes");
    expect(presentationLabel("  CARTON ")).toBe("Carton");
    expect(sheetUnit("CAJAS").key).toBe(sheetUnit("caja").key);
  });

  it("test_s006_rf12_kilogramo_y_litro_valen_1000_de_la_unidad_base", () => {
    expect(toBaseMilli(sheetNumber("1")!, sheetUnit("KILOGRAMO").factorMilli)).toBe(1_000_000n);
    expect(toBaseMilli(sheetNumber("1")!, sheetUnit("LITRO").factorMilli)).toBe(1_000_000n);
  });

  it("test_s006_rf13_rf14_la_conversion_por_el_factor_de_la_unidad", () => {
    // Cartón de 24 piezas = 24 pz; bulto de 2.5 kg = 2,500 g.
    expect(toBaseMilli(sheetNumber("24")!, sheetUnit("PIEZA").factorMilli)).toBe(24_000n);
    expect(toBaseMilli(sheetNumber("2.5")!, sheetUnit("KG").factorMilli)).toBe(2_500_000n);
  });

  it("test_s006_rf21_lo_que_no_es_numero_no_se_lee", () => {
    for (const bad of ["/", "", "-1", "abc", "1.2.3", "#VALUE!"]) expect(sheetNumber(bad)).toBeNull();
  });

  it("test_s006_rf34_cantidades_exactas_redondeadas_a_3_decimales_de_la_base", () => {
    expect(toBaseMilli(sheetNumber("7.688")!, sheetUnit("KILOGRAMO").factorMilli)).toBe(7_688_000n);
    expect(toBaseMilli(sheetNumber("0.0005")!, sheetUnit("GRAMO").factorMilli)).toBe(1n);
    expect(toBaseMilli(sheetNumber("0.00049")!, sheetUnit("GRAMO").factorMilli)).toBe(0n);
    expect(toBaseMilli(sheetNumber("8.04166666667")!, sheetUnit("PIEZA").factorMilli)).toBe(8042n);
    expect(sheetNumber("1e-7")).toBe(100n);
    expect(sheetNumber("1,5")).toBe(1_500_000_000n);
  });
});
