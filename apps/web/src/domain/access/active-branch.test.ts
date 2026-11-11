import { describe, expect, it } from "vitest";
import { resolveActiveBranch } from "./active-branch";

const a = { id: "a" };
const b = { id: "b" };

describe("spec 001 — sucursal activa", () => {
  it("test_s001_rf32_con_varias_sucursales_y_ninguna_recordada_hay_que_elegir", () => {
    expect(resolveActiveBranch({ accessible: [a, b], sessionBranchId: null, rememberedBranchId: null })).toEqual({ kind: "choose" });
  });

  it("test_s001_rf33_con_una_sola_sucursal_se_activa_sola", () => {
    expect(resolveActiveBranch({ accessible: [a], sessionBranchId: null, rememberedBranchId: null })).toEqual({ kind: "only", branch: a });
  });

  it("test_s001_rf34_la_ultima_sucursal_recordada_se_activa_al_volver_si_sigue_accesible", () => {
    expect(resolveActiveBranch({ accessible: [a, b], sessionBranchId: null, rememberedBranchId: "b" })).toEqual({ kind: "remembered", branch: b });
    expect(resolveActiveBranch({ accessible: [a, b], sessionBranchId: "a", rememberedBranchId: "b" })).toEqual({ kind: "keep", branch: a });
  });

  it("test_s001_rf36_si_se_pierde_el_acceso_a_la_activa_se_pide_elegir_otra", () => {
    expect(resolveActiveBranch({ accessible: [a, b], sessionBranchId: "c", rememberedBranchId: "c" })).toEqual({ kind: "choose" });
    expect(resolveActiveBranch({ accessible: [a], sessionBranchId: "c", rememberedBranchId: null })).toEqual({ kind: "only", branch: a });
  });

  it("test_s001_rf38_sin_sucursales_accesibles_no_hay_nada_que_activar", () => {
    expect(resolveActiveBranch({ accessible: [], sessionBranchId: "a", rememberedBranchId: "a" })).toEqual({ kind: "none" });
  });
});
