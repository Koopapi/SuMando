import { describe, expect, it } from "vitest";
import { DEFAULT_HALF_PERCENT, isHalfPercent, parsePieces } from "./portions";

describe("spec 004 — porciones", () => {
  it("test_s004_rf17_la_media_porcion_empieza_en_50", () => {
    expect(DEFAULT_HALF_PERCENT).toBe(50);
  });

  it("test_s004_rf18_el_porcentaje_es_entero_de_1_a_100", () => {
    for (const ok of [1, 50, 60, 100]) expect(isHalfPercent(ok)).toBe(true);
    for (const bad of [0, 101, -5, 50.5, Number.NaN, "50", null, undefined]) expect(isHalfPercent(bad)).toBe(false);
  });

  it("test_s004_rf21_las_piezas_son_enteros_de_0_a_9999", () => {
    expect(parsePieces("0")).toBe(0);
    expect(parsePieces(" 40 ")).toBe(40);
    expect(parsePieces(9999)).toBe(9999);
    expect(parsePieces("")).toBe(0);
    for (const bad of ["10000", "-1", "2.5", "1,5", "abc", 10000, 1.5, -1]) expect(parsePieces(bad)).toBeNull();
  });
});
