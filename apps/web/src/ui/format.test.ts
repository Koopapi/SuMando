import { describe, expect, it } from "vitest";
import { formatDate, formatMoney } from "./format";

describe("spec 002 — formato de pesos y fechas", () => {
  it("test_s002_rf23_pesos_con_formato_de_mexico", () => {
    expect(formatMoney(1234.5)).toBe("$1,234.50");
    expect(formatMoney(0)).toBe("$0.00");
    expect(formatMoney(3800)).toBe("$3,800.00");
    expect(formatMoney(-15.2)).toBe("-$15.20");
  });

  it("test_s002_rf24_fechas_con_dia_mes_abreviado_y_ano", () => {
    expect(formatDate(new Date("2026-11-11T18:00:00Z"))).toBe("11 nov 2026");
    expect(formatDate(new Date("2026-01-05T18:00:00Z"))).toBe("5 ene 2026");
  });

  it("test_s002_rf24_la_fecha_es_la_de_la_ciudad_de_mexico_cerca_de_medianoche", () => {
    // 05:30 UTC del 12 de noviembre todavía es 11 de noviembre en la Ciudad de México.
    expect(formatDate(new Date("2026-11-12T05:30:00Z"))).toBe("11 nov 2026");
    expect(formatDate(new Date("2026-11-12T06:30:00Z"))).toBe("12 nov 2026");
  });
});

describe("spec 004 — cantidades y fecha con hora", () => {
  it("test_s004_rf24_las_cantidades_exactas_llevan_separador_de_miles", async () => {
    const { formatQuantity } = await import("./format");
    expect(formatQuantity("8295")).toBe("8,295");
    expect(formatQuantity("999.9")).toBe("999.9");
    expect(formatQuantity("1234567.125")).toBe("1,234,567.125");
    expect(formatQuantity("0.35")).toBe("0.35");
  });

  it("test_s004_rf29_el_historial_muestra_fecha_y_hora_de_la_ciudad_de_mexico", async () => {
    const { formatDateTime } = await import("./format");
    expect(formatDateTime(new Date("2026-11-14T00:05:00Z"))).toBe("13 nov 2026, 18:05");
  });
});
