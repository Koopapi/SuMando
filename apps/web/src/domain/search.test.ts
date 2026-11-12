import { describe, expect, it } from "vitest";
import { matchesSearch, searchKey } from "./search";

describe("spec 002 — búsqueda", () => {
  it("test_s002_rf30_busca_sin_distinguir_mayusculas_ni_acentos", () => {
    expect(searchKey("  Jamón   Serrano ")).toBe("jamon serrano");
    for (const q of ["jamon", "JAMÓN", "Jamón", "amó"]) expect(matchesSearch(["Jamón serrano"], q)).toBe(true);
    expect(matchesSearch(["Champiñones"], "champinones")).toBe(true);
  });

  it("test_s002_rf30_un_renglon_coincide_si_alguno_de_sus_campos_contiene_el_texto", () => {
    expect(matchesSearch(["Crema", "Lácteos"], "lacteos")).toBe(true);
    expect(matchesSearch(["Crema", "Lácteos"], "verduras")).toBe(false);
    expect(matchesSearch(["Crema"], "   ")).toBe(true);
  });
});
