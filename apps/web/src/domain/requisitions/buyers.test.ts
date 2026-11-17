import { describe, expect, it } from "vitest";
import { byBuyer } from "./buyers";

const g = (id: string, buyer: { key: string; name: string } | null, status: "to_buy" | "purchased" | "partial" | "received") => ({ id, buyer, status });

describe("spec 013 — requisición por comprador", () => {
  it("test_s013_rf8_agrupa_por_comprador_en_orden_y_sin_comprador_al_final", () => {
    const out = byBuyer([g("a", null, "to_buy"), g("b", { key: "e2", name: "Vicente" }, "to_buy"), g("c", { key: "e1", name: "Ángel" }, "to_buy"), g("d", { key: "e2", name: "Vicente" }, "received")]);
    expect(out.map((b) => b.buyer?.name ?? null)).toEqual(["Ángel", "Vicente", null]);
    expect(out[1].groups.map((x) => x.id)).toEqual(["b", "d"]);
    expect(out[2].groups.map((x) => x.id)).toEqual(["a"]);
  });

  it("test_s013_rf9_cuenta_proveedores_por_comprar_comprados_y_recibidos", () => {
    const [one] = byBuyer([g("a", { key: "e1", name: "A" }, "to_buy"), g("b", { key: "e1", name: "A" }, "purchased"), g("c", { key: "e1", name: "A" }, "partial"), g("d", { key: "e1", name: "A" }, "received")]);
    expect(one.counts).toEqual({ toBuy: 1, purchased: 2, received: 1 });
  });

  it("test_s013_rf8_sin_grupos_no_hay_compradores", () => {
    expect(byBuyer([])).toEqual([]);
  });
});
