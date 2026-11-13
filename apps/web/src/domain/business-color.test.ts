import { describe, expect, it } from "vitest";
import { BUSINESS_COLORS, isBusinessColor, suggestColor } from "./business-color";

describe("spec 002 — color de negocio", () => {
  it("test_s002_rf8_solo_valen_las_8_claves_de_la_paleta", () => {
    for (const c of BUSINESS_COLORS) expect(isBusinessColor(c)).toBe(true);
    for (const bad of ["Violeta", "#6D28D9", "morado", "", null, 3]) expect(isBusinessColor(bad)).toBe(false);
  });

  it("test_s002_rf10_sugiere_el_primer_color_que_nadie_usa", () => {
    expect(suggestColor([])).toBe("violeta");
    expect(suggestColor(["violeta", "rojo"])).toBe("naranja");
    expect(suggestColor(["rojo"])).toBe("violeta");
  });

  it("test_s002_rf10_si_todos_estan_en_uso_sugiere_el_primero", () => {
    expect(suggestColor([...BUSINESS_COLORS])).toBe("violeta");
    expect(suggestColor([...BUSINESS_COLORS, "violeta"])).toBe("violeta");
  });
});
