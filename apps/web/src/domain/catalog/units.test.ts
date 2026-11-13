import { describe, expect, it } from "vitest";
import { dbToMicro, dbToMilli, formatMilli, fromBaseMicro, isBaseUnit, microToDb, milliToDb, parseFactor, parseMilli, toBaseMicro } from "./units";

describe("spec 003 — unidades y cantidades", () => {
  it("test_s003_rf10_la_unidad_base_es_de_una_lista_cerrada", () => {
    expect(["g", "ml", "pz"].every(isBaseUnit)).toBe(true);
    expect(isBaseUnit("kg")).toBe(false);
    expect(isBaseUnit("")).toBe(false);
  });

  it("test_s003_rf13_la_equivalencia_es_positiva_y_con_hasta_3_decimales", () => {
    expect(parseFactor("1000")).toBe(1_000_000n);
    expect(parseFactor("0,5")).toBe(500n);
    expect(parseFactor("2.125")).toBe(2125n);
    expect(parseFactor("0")).toBeNull();
    expect(parseFactor("-3")).toBeNull();
    expect(parseFactor("1.2345")).toBeNull();
    expect(parseFactor("abc")).toBeNull();
  });

  it("test_s003_rf25_una_cantidad_negativa_no_se_acepta", () => {
    expect(parseMilli("-1")).toBeNull();
    expect(parseMilli("0")).toBe(0n);
    expect(parseMilli(" 2,5 ")).toBe(2500n);
  });

  it("test_s003_rf23_se_guarda_en_unidad_base_desde_cualquier_presentacion", () => {
    // 2.5 cajas de 6000 ml = 15000 ml
    expect(microToDb(toBaseMicro(parseMilli("2.5")!, parseFactor("6000")!))).toBe("15000.000000");
    expect(dbToMicro("15000.000000")).toBe(15_000_000_000n);
    expect(dbToMilli("1000.000")).toBe(1_000_000n);
    expect(milliToDb(2125n)).toBe("2.125");
  });

  it("test_s003_rf17_rf26_se_muestra_recalculado_con_la_nueva_equivalencia", () => {
    const base = toBaseMicro(parseMilli("2")!, parseFactor("6000")!); // 2 cajas de 6 botellas
    expect(formatMilli(fromBaseMicro(base, parseFactor("1000")!))).toBe("12"); // 12 botellas
    expect(formatMilli(fromBaseMicro(base, parseFactor("12000")!))).toBe("1"); // la caja pasa a 12
    expect(formatMilli(fromBaseMicro(base, parseFactor("7000")!))).toBe("1.714"); // redondeo a 3 decimales
    expect(formatMilli(fromBaseMicro(1n, 3n))).toBe("0"); // menos de media milésima
    expect(formatMilli(fromBaseMicro(3n, 2n))).toBe("0.002"); // la mitad redondea hacia arriba
  });
});
