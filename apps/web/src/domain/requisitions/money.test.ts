import { describe, expect, it } from "vitest";
import { centsToText, groupTotal, parseMoney } from "./money";

describe("spec 007 — importes de compra", () => {
  it("test_s007_rf30_pesos_con_hasta_2_decimales_no_negativos", () => {
    expect(parseMoney("1,234.50")).toBe(123_450n);
    expect(parseMoney("$ 99.9")).toBe(9_990n);
    expect(parseMoney("0")).toBe(0n);
    expect(parseMoney("")).toBeNull();
    for (const bad of ["-5", "1.234", "abc", "1,23", "12,34.5"]) expect(parseMoney(bad)).toBeUndefined();
    expect(centsToText(123_450n)).toBe("1234.50");
  });

  it("test_s007_rf31_con_importes_por_renglon_el_total_es_su_suma", () => {
    expect(groupTotal(5_000n, [1_000n, null, 2_500n])).toBe(3_500n);
    expect(groupTotal(5_000n, [null, null])).toBe(5_000n);
    expect(groupTotal(null, [])).toBeNull();
  });
});
