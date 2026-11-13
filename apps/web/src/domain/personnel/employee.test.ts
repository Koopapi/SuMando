import { describe, expect, it } from "vitest";
import { leaveBeforeHire, leaveProblem, payProblem } from "./employee";

describe("spec 008 — reglas del expediente", () => {
  it("test_s008_rf13_el_sueldo_por_dia_es_mayor_que_cero", () => {
    expect(payProblem(40_000n)).toBeNull();
    expect(payProblem(0n)).toBe("invalid_pay");
    expect(payProblem(null)).toBe("invalid_pay");
    expect(payProblem(-1n)).toBe("invalid_pay");
  });

  it("test_s008_rf28_motivos_de_baja_de_una_lista", () => {
    for (const r of ["resignation", "dismissal", "abandonment", "season_end"]) expect(leaveProblem(r, null)).toBeNull();
    expect(leaveProblem("vacaciones", null)).toBe("validation");
  });

  it("test_s008_rf29_otro_pide_nota", () => {
    expect(leaveProblem("other", null)).toBe("reason_required");
    expect(leaveProblem("other", "se mudó de ciudad")).toBeNull();
  });

  it("test_s008_rf30_la_baja_no_es_antes_del_ingreso", () => {
    expect(leaveBeforeHire("2026-11-10", "2026-11-09")).toBe(true);
    expect(leaveBeforeHire("2026-11-10", "2026-11-10")).toBe(false);
  });
});
