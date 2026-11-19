import { describe, expect, it } from "vitest";
import { unusual } from "./unusual";

describe("spec 015 — datos raros", () => {
  it("test_s015_rf13_pedido_mayor_que_el_doble_del_maximo", () => {
    expect(unusual("order", "10", "5")).toEqual({ unusual: false, expected: "5" });
    expect(unusual("order", "10.001", "5")).toEqual({ unusual: true, expected: "5" });
  });

  it("test_s015_rf13_conteo_que_difiere_mas_del_30_por_ciento", () => {
    expect(unusual("count", "13", "10").unusual).toBe(false);
    expect(unusual("count", "7", "10").unusual).toBe(false);
    expect(unusual("count", "13.5", "10").unusual).toBe(true);
    expect(unusual("count", "6.9", "10").unusual).toBe(true);
    // Con esperado 0, cualquier conteo mayor que 0 es raro.
    expect(unusual("count", "0", "0").unusual).toBe(false);
    expect(unusual("count", "1", "0").unusual).toBe(true);
  });

  it("test_s015_rf13_salida_mayor_que_la_mitad_de_la_existencia", () => {
    expect(unusual("exit", "5", "10").unusual).toBe(false);
    expect(unusual("exit", "5.5", "10").unusual).toBe(true);
  });

  it("test_s015_rf13_entrada_mayor_que_el_triple_del_maximo", () => {
    expect(unusual("entry", "15", "5").unusual).toBe(false);
    expect(unusual("entry", "15.5", "5").unusual).toBe(true);
  });

  it("test_s015_rf13_bono_o_extra_mayor_que_el_sueldo_de_la_semana", () => {
    expect(unusual("pay", "2100", "2100").unusual).toBe(false);
    expect(unusual("pay", "2100.01", "2100").unusual).toBe(true);
  });

  it("test_s015_rf15_sin_con_que_comparar_no_es_raro", () => {
    for (const rule of ["order", "count", "exit", "entry", "pay"] as const) expect(unusual(rule, "99999", null)).toEqual({ unusual: false, expected: null });
    // Un valor vacío o mal escrito tampoco se marca: eso lo avisa la validación del paso.
    expect(unusual("order", "", "5").unusual).toBe(false);
    expect(unusual("order", "abc", "5").unusual).toBe(false);
  });

  it("test_s015_rf16_el_corte_ciego_nunca_avisa", () => {
    expect(unusual("blind", "100000", "1")).toEqual({ unusual: false, expected: null });
  });

  it("test_s015_rf12_devuelve_lo_esperado_para_mostrarlo_al_lado", () => {
    expect(unusual("count", "40", "12.5")).toEqual({ unusual: true, expected: "12.5" });
  });
});
