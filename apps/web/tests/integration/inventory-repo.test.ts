// Spec 005: la existencia se suma de forma atómica en la base (RNF «El servidor decide»).
import { describe, expect, it } from "vitest";
import { createWarehouse } from "@/server/services/catalog/places";
import { createProduct } from "@/server/services/catalog/products";
import { catalogWorld } from "./catalog-fixture";

describe("spec 005 — existencias en la base", () => {
  it("test_s005_rf1_movimientos_simultaneos_no_pierden_ninguna_suma", async () => {
    const w = await catalogWorld();
    const wh = await createWarehouse(w.ctx, w.ownerSendero, { name: "Bodega", scope: "branch" });
    const p = await createProduct(w.ctx, w.ownerSendero, { name: "Harina", baseUnit: "g" });
    const at = new Date();
    await Promise.all(Array.from({ length: 20 }, () => w.ctx.store.transaction((repos) => repos.inventory.stock.apply(w.pastatti.id, wh.id, [{ productId: p.id, deltaBase: "1.5" }], at))));
    const [row] = await w.ctx.store.inventory.stock.listByWarehouses([wh.id]);
    expect(row.quantityBase).toBe("30.000000");
    const after = await w.ctx.store.transaction((repos) => repos.inventory.stock.apply(w.pastatti.id, wh.id, [{ productId: p.id, deltaBase: "-31" }], at));
    expect(after.get(p.id)).toBe("-1.000000");
  });

  it("test_s005_rf1_bloquear_crea_en_cero_lo_que_falta", async () => {
    const w = await catalogWorld();
    const wh = await createWarehouse(w.ctx, w.ownerSendero, { name: "Bodega", scope: "branch" });
    const p = await createProduct(w.ctx, w.ownerSendero, { name: "Sal", baseUnit: "g" });
    const locked = await w.ctx.store.transaction((repos) => repos.inventory.stock.lock(w.pastatti.id, wh.id, [p.id], new Date()));
    expect(locked.get(p.id)).toBe("0.000000");
  });
});
