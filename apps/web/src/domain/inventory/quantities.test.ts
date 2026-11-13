import { describe, expect, it } from "vitest";
import { formatStock, lineToBase, parseAdjustment, parseCountQuantity, parseLineQuantity, stockStatus } from "./quantities";

describe("spec 005 — cantidades del inventario", () => {
  it("test_s005_rf7_la_cantidad_en_una_presentacion_se_guarda_en_unidad_base", () => {
    // 2.5 cajas de 6,000 ml = 15,000 ml = 15,000,000,000 millonésimas.
    expect(lineToBase(parseLineQuantity("2.5")!, 6_000_000n)).toBe(15_000_000_000n);
    expect(lineToBase(parseLineQuantity("0,105")!, 2_000_000n)).toBe(210_000_000n);
  });

  it("test_s005_rf8_la_cantidad_de_un_renglon_es_positiva_con_hasta_3_decimales", () => {
    for (const bad of ["0", "-1", "1.2345", "abc", "", "0.000", "10000000"]) expect(parseLineQuantity(bad)).toBeNull();
    expect(parseLineQuantity("1,25")).toBe(1250n);
    expect(parseLineQuantity("9999999.999")).toBe(9_999_999_999n);
  });

  it("test_s005_rf45_lo_contado_admite_cero", () => {
    expect(parseCountQuantity("0")).toBe(0n);
    expect(parseCountQuantity("-1")).toBeNull();
  });

  it("test_s005_rf9_las_existencias_se_muestran_con_hasta_3_decimales_sin_perder_exactitud", () => {
    // 1 g en cajas de 3 kg: 0.000333… se muestra 0 pero la existencia guardada no cambia.
    expect(formatStock(1_000_000n, 3_000_000n)).toBe("0");
    expect(formatStock(1_500_000_000n, 1_000_000n)).toBe("1.5");
    expect(formatStock(1_000_000n * 7n, 3000n)).toBe("2.333");
    expect(formatStock(-2_000_000n, 1000n)).toBe("-2");
  });

  it("test_s005_rf18_el_ajuste_suma_o_resta", () => {
    expect(parseAdjustment("-1.5")).toBe(-1500n);
    expect(parseAdjustment("+2")).toBe(2000n);
    expect(parseAdjustment("3")).toBe(3000n);
  });

  it("test_s005_rf19_el_ajuste_no_puede_ser_cero", () => {
    for (const bad of ["0", "-0", "", "-", "1.2345", "--1"]) expect(parseAdjustment(bad)).toBeNull();
  });

  it("test_s005_rf20_una_existencia_puede_quedar_en_negativo", () => {
    expect(stockStatus(-1n, null)).toBe("negative");
  });

  it("test_s005_rf21_negativo_se_marca_antes_que_bajo_minimo", () => {
    expect(stockStatus(-1n, 5n)).toBe("negative");
  });

  it("test_s005_rf56_bajo_minimo_es_menor_que_el_minimo", () => {
    expect(stockStatus(4n, 5n)).toBe("below_min");
    expect(stockStatus(5n, 5n)).toBe("ok");
    expect(stockStatus(0n, null)).toBe("ok");
  });
});
