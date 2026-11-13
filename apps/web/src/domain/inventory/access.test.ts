import { describe, expect, it } from "vitest";
import { canMoveInWarehouse } from "./access";

const branches = [
  { id: "centro", businessId: "pastatti", archivedAt: null },
  { id: "sendero", businessId: "pastatti", archivedAt: null },
  { id: "cerrada", businessId: "pastatti", archivedAt: new Date() },
  { id: "pirrus-centro", businessId: "pirrus", archivedAt: null },
];
const owner = { role: "owner" as const };
const admin = { role: "admin" as const };

describe("spec 005 — quién mueve inventario", () => {
  it("test_s005_rf3_en_un_almacen_de_sucursal_solo_sus_administradores_y_el_dueno", () => {
    const wh = { businessId: "pastatti", branchId: "centro" };
    expect(canMoveInWarehouse(owner, [], branches, wh)).toBe(true);
    expect(canMoveInWarehouse(admin, [{ branchId: "centro" }], branches, wh)).toBe(true);
    expect(canMoveInWarehouse(admin, [{ branchId: "sendero" }], branches, wh)).toBe(false);
    expect(canMoveInWarehouse(admin, [{ branchId: "cerrada" }], branches, { businessId: "pastatti", branchId: "cerrada" })).toBe(false);
  });

  it("test_s005_rf4_en_un_almacen_del_negocio_cualquier_administrador_del_negocio", () => {
    const wh = { businessId: "pastatti", branchId: null };
    expect(canMoveInWarehouse(admin, [{ branchId: "sendero" }], branches, wh)).toBe(true);
    expect(canMoveInWarehouse(admin, [{ branchId: "pirrus-centro" }], branches, wh)).toBe(false);
    expect(canMoveInWarehouse(admin, [{ branchId: "cerrada" }], branches, wh)).toBe(false);
    expect(canMoveInWarehouse(owner, [], branches, wh)).toBe(true);
  });
});
