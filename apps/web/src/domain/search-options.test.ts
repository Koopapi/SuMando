import { describe, expect, it } from "vitest";
import { filterOptions } from "./search";

const opts = ["Camarón 41-50", "CALLO DE HACHA", "Pescado", "Salsa de camarón", "Limón"].map((label) => ({ label }));

describe("spec 013 — buscador de productos", () => {
  it("test_s013_rf29_busca_sin_acentos_ni_mayusculas_y_primero_lo_que_empieza", () => {
    expect(filterOptions(opts, "camaron").map((o) => o.label)).toEqual(["Camarón 41-50", "Salsa de camarón"]);
    expect(filterOptions(opts, "LIMON").map((o) => o.label)).toEqual(["Limón"]);
    expect(filterOptions(opts, "  ca ").map((o) => o.label)).toEqual(["Camarón 41-50", "CALLO DE HACHA", "Pescado", "Salsa de camarón"]);
  });

  it("test_s013_rf29_sin_texto_muestra_todo_hasta_el_limite", () => {
    expect(filterOptions(opts, "")).toHaveLength(5);
    expect(filterOptions(opts, "", 2)).toHaveLength(2);
    expect(filterOptions(opts, "zzz")).toEqual([]);
  });
});
