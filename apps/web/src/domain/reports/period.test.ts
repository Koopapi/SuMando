import { describe, expect, it } from "vitest";
import { compare, resolvePeriod, weekInPeriod } from "./period";

// 2026-11-11 es miércoles.
const TODAY = "2026-11-11";

describe("spec 012 — periodos", () => {
  it("test_s012_rf11_rf16_hoy_es_el_periodo_inicial_contra_ayer", () => {
    expect(resolvePeriod({}, TODAY)).toEqual({ kind: "today", from: TODAY, to: TODAY, prevFrom: "2026-11-10", prevTo: "2026-11-10" });
  });

  it("test_s012_rf11_rf18_semana_de_lunes_a_hoy_contra_los_mismos_dias", () => {
    expect(resolvePeriod({ period: "week" }, TODAY)).toMatchObject({ from: "2026-11-09", to: TODAY, prevFrom: "2026-11-02", prevTo: "2026-11-04" });
  });

  it("test_s012_rf17_hoy_lunes_se_compara_con_el_domingo", () => {
    expect(resolvePeriod({ period: "today" }, "2026-11-09")).toMatchObject({ prevFrom: "2026-11-08", prevTo: "2026-11-08" });
  });

  it("test_s012_rf11_rf18_mes_hasta_hoy_contra_los_mismos_dias_del_anterior", () => {
    expect(resolvePeriod({ period: "month" }, TODAY)).toMatchObject({ from: "2026-11-01", to: TODAY, prevFrom: "2026-10-01", prevTo: "2026-10-11" });
  });

  it("test_s012_rf18_el_31_contra_un_mes_mas_corto_termina_en_su_ultimo_dia", () => {
    expect(resolvePeriod({ period: "month" }, "2026-12-31")).toMatchObject({ prevFrom: "2026-11-01", prevTo: "2026-11-30" });
    expect(resolvePeriod({ period: "month" }, "2026-03-30")).toMatchObject({ prevFrom: "2026-02-01", prevTo: "2026-02-28" });
    expect(resolvePeriod({ period: "month" }, "2026-01-15")).toMatchObject({ prevFrom: "2025-12-01", prevTo: "2025-12-15" });
  });

  it("test_s012_rf12_rf17_rango_libre_contra_el_anterior_de_igual_duracion", () => {
    expect(resolvePeriod({ period: "range", from: "2026-10-01", to: "2026-10-10" }, TODAY)).toEqual({ kind: "range", from: "2026-10-01", to: "2026-10-10", prevFrom: "2026-09-21", prevTo: "2026-09-30" });
    expect(resolvePeriod({ period: "range", from: TODAY, to: TODAY }, TODAY)).toMatchObject({ prevFrom: "2026-11-10", prevTo: "2026-11-10" });
  });

  it("test_s012_rf13_final_antes_que_inicial_se_rechaza", () => {
    expect(() => resolvePeriod({ period: "range", from: "2026-10-10", to: "2026-10-01" }, TODAY)).toThrow(expect.objectContaining({ code: "range_order" }));
  });

  it("test_s012_rf14_mas_de_366_dias_se_rechaza", () => {
    expect(resolvePeriod({ period: "range", from: "2025-11-11", to: TODAY }, TODAY)).toMatchObject({ from: "2025-11-11" });
    expect(() => resolvePeriod({ period: "range", from: "2025-11-10", to: TODAY }, TODAY)).toThrow(expect.objectContaining({ code: "range_too_long" }));
  });

  it("test_s012_rf15_rango_que_pasa_de_hoy_se_rechaza", () => {
    expect(() => resolvePeriod({ period: "range", from: TODAY, to: "2026-11-12" }, TODAY)).toThrow(expect.objectContaining({ code: "range_future" }));
  });

  it("test_s012_rf12_fechas_invalidas_o_periodo_desconocido", () => {
    expect(() => resolvePeriod({ period: "range", from: "2026-02-30", to: TODAY }, TODAY)).toThrow(expect.objectContaining({ code: "validation" }));
    expect(() => resolvePeriod({ period: "year" }, TODAY)).toThrow(expect.objectContaining({ code: "validation" }));
  });
});

describe("spec 012 — comparación", () => {
  it("test_s012_rf19_cambio_en_pesos_y_porcentaje_con_direccion", () => {
    expect(compare(11_200n, 10_000n)).toEqual({ change: 1_200n, percent: "12.0", direction: "up" });
    expect(compare(9_000n, 12_000n)).toEqual({ change: -3_000n, percent: "-25.0", direction: "down" });
    expect(compare(5n, 5n)).toEqual({ change: 0n, percent: "0.0", direction: "same" });
    expect(compare(1n, 3n)).toMatchObject({ percent: "-66.7" });
  });

  it("test_s012_rf20_sin_periodo_anterior_no_hay_porcentaje", () => {
    expect(compare(5_000n, 0n)).toEqual({ change: 5_000n, percent: null, direction: "up" });
  });

  it("test_s012_rf19_anterior_negativo_usa_su_magnitud", () => {
    expect(compare(-500n, -1_000n)).toMatchObject({ change: 500n, percent: "50.0", direction: "up" });
  });
});

describe("spec 012 — semana de nómina", () => {
  it("test_s012_rf32_la_semana_cuenta_en_el_periodo_de_su_domingo", () => {
    expect(weekInPeriod("2026-11-02", "2026-11-08", "2026-11-08")).toBe(true);
    expect(weekInPeriod("2026-11-02", "2026-11-07", "2026-11-07")).toBe(false);
    expect(weekInPeriod("2026-10-26", "2026-11-01", "2026-11-30")).toBe(true);
    expect(weekInPeriod("2026-11-30", "2026-11-01", "2026-11-30")).toBe(false);
  });
});
