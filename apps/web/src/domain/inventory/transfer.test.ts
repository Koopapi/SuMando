import { describe, expect, it } from "vitest";
import { canTransition, proposeProduct, sameWarehouse } from "./transfer";

const candidates = [
  { id: "manchego", nameKey: "queso manchego", baseUnit: "g", archived: false },
  { id: "manchego-pz", nameKey: "queso manchego pieza", baseUnit: "pz", archived: false },
  { id: "viejo", nameKey: "queso añejo", baseUnit: "g", archived: true },
  { id: "panela", nameKey: "queso panela", baseUnit: "g", archived: false },
];

describe("spec 005 — traspasos", () => {
  it("test_s005_rf23_origen_y_destino_deben_ser_distintos", () => {
    expect(sameWarehouse("a", "a")).toBe(true);
    expect(sameWarehouse("a", "b")).toBe(false);
  });

  it("test_s005_rf27_entre_negocios_nace_en_camino_y_se_recibe_o_cancela", () => {
    expect(canTransition("in_transit", "receive", true)).toBe(true);
    expect(canTransition("in_transit", "cancel", true)).toBe(true);
  });

  it("test_s005_rf37_no_se_recibe_ni_cancela_lo_ya_recibido_o_cancelado", () => {
    expect(canTransition("received", "receive", true)).toBe(false);
    expect(canTransition("cancelled", "receive", true)).toBe(false);
    expect(canTransition("received", "cancel", true)).toBe(false);
    expect(canTransition("cancelled", "cancel", false)).toBe(false);
    expect(canTransition("done", "receive", false)).toBe(false);
    expect(canTransition("done", "cancel", false)).toBe(true);
  });

  it("test_s005_rf31_se_propone_el_producto_con_el_mismo_nombre_y_unidad", () => {
    expect(proposeProduct({ nameKey: "queso manchego", baseUnit: "g" }, null, candidates)).toBe("manchego");
  });

  it("test_s005_rf32_sin_producto_igual_no_se_propone_nada", () => {
    expect(proposeProduct({ nameKey: "queso manchego", baseUnit: "ml" }, null, candidates)).toBeNull();
    expect(proposeProduct({ nameKey: "queso añejo", baseUnit: "g" }, null, candidates)).toBeNull();
  });

  it("test_s005_rf33_la_correspondencia_recordada_va_primero_si_sigue_valida", () => {
    expect(proposeProduct({ nameKey: "queso manchego", baseUnit: "g" }, "panela", candidates)).toBe("panela");
    expect(proposeProduct({ nameKey: "queso manchego", baseUnit: "g" }, "viejo", candidates)).toBe("manchego");
    expect(proposeProduct({ nameKey: "queso manchego", baseUnit: "g" }, "manchego-pz", candidates)).toBe("manchego");
  });
});
