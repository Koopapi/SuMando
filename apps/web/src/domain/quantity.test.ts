import { describe, expect, it } from "vitest";
import { parseQuantity, stepQuantity } from "./quantity";

describe("spec 002 — cantidad capturada", () => {
  it("test_s002_rf33_acepta_enteros_y_decimales_con_punto_o_coma", () => {
    expect(parseQuantity("3")).toEqual({ ok: true, value: 3 });
    expect(parseQuantity(" 2.5 ")).toEqual({ ok: true, value: 2.5 });
    expect(parseQuantity("2,5")).toEqual({ ok: true, value: 2.5 });
    expect(parseQuantity("0")).toEqual({ ok: true, value: 0 });
    expect(parseQuantity("123456789")).toEqual({ ok: true, value: 123456789 });
  });

  it("test_s002_rf33_rechaza_negativos_texto_demasiados_decimales_y_vacio", () => {
    for (const bad of ["-1", "abc", "1.2345", "", "dos", "1,2,3", "1."]) expect(parseQuantity(bad).ok, bad).toBe(false);
  });

  it("test_s002_rf32_menos_y_mas_suben_y_bajan_sin_pasar_de_cero", () => {
    expect(stepQuantity("4", 1)).toBe("5");
    expect(stepQuantity("4", -1)).toBe("3");
    expect(stepQuantity("0", -1)).toBe("0");
    expect(stepQuantity("0.5", -1)).toBe("0");
    expect(stepQuantity("2,5", 1)).toBe("3.5");
    expect(stepQuantity("abc", 1)).toBe("1");
    expect(stepQuantity("", -1)).toBe("0");
  });
});
