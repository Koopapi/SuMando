import { describe, expect, it } from "vitest";
import { canManageBranchCatalog, canManageBusinessCatalog } from "./access";

const owner = { role: "owner" as const };
const admin = { role: "admin" as const };
const branches = [
  { id: "sendero", businessId: "pastatti", archivedAt: null },
  { id: "centro", businessId: "pastatti", archivedAt: null },
  { id: "pirrus-centro", businessId: "pirrus", archivedAt: null },
  { id: "cerrada", businessId: "pirrus", archivedAt: new Date() },
];

describe("spec 003 — quién administra el catálogo", () => {
  it("test_s003_rf6_dueno_y_administradores_con_sucursal_en_el_negocio_administran_su_catalogo", () => {
    expect(canManageBusinessCatalog(owner, [], branches, "pirrus")).toBe(true);
    expect(canManageBusinessCatalog(admin, [{ branchId: "sendero" }], branches, "pastatti")).toBe(true);
    expect(canManageBusinessCatalog(admin, [{ branchId: "sendero" }], branches, "pirrus")).toBe(false);
    expect(canManageBusinessCatalog(admin, [{ branchId: "cerrada" }], branches, "pirrus")).toBe(false);
  });

  it("test_s003_rf7_los_almacenes_y_areas_de_una_sucursal_solo_con_esa_sucursal", () => {
    expect(canManageBranchCatalog(owner, [], branches[1])).toBe(true);
    expect(canManageBranchCatalog(admin, [{ branchId: "sendero" }], branches[0])).toBe(true);
    expect(canManageBranchCatalog(admin, [{ branchId: "sendero" }], branches[1])).toBe(false);
  });
});
