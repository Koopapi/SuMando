import { describe, expect, it } from "vitest";
import { exitReasonProblem, linesProblem, writtenReason } from "./movement";

describe("spec 005 — validación de movimientos", () => {
  it("test_s005_rf10_un_producto_no_se_repite_en_el_movimiento", () => {
    expect(linesProblem([{ productId: "a" }, { productId: "b" }, { productId: "a" }])).toEqual({ code: "duplicate_line", index: 2 });
    expect(linesProblem([{ productId: "a" }, { productId: "b" }])).toBeNull();
  });

  it("test_s005_rf14_una_salida_lleva_renglones_y_motivo", () => {
    expect(linesProblem([])).toEqual({ code: "movement_empty" });
    expect(exitReasonProblem(undefined, null)).toBe("validation");
  });

  it("test_s005_rf15_los_motivos_de_salida_son_una_lista_cerrada", () => {
    for (const r of ["waste", "expired", "staff", "courtesy"]) expect(exitReasonProblem(r, null)).toBeNull();
    expect(exitReasonProblem("robo", null)).toBe("validation");
  });

  it("test_s005_rf16_con_motivo_otro_la_nota_es_obligatoria", () => {
    expect(exitReasonProblem("other", null)).toBe("reason_required");
    expect(exitReasonProblem("other", "se cayó la charola")).toBeNull();
  });

  it("test_s005_rf19_el_motivo_del_ajuste_va_de_3_a_200_caracteres", () => {
    expect(writtenReason("  ")).toBeNull();
    expect(writtenReason("ok")).toBeNull();
    expect(writtenReason("x".repeat(201))).toBeNull();
    expect(writtenReason("  faltó  registrar ")).toBe("faltó registrar");
  });

  it("test_s005_rf64_la_cancelacion_pide_motivo_escrito", () => {
    expect(writtenReason(undefined)).toBeNull();
    expect(writtenReason("Entrada duplicada")).toBe("Entrada duplicada");
  });
});
