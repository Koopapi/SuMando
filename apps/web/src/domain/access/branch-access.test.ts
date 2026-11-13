import { describe, expect, it } from "vitest";
import { accessibleBranches, canAccessBranch } from "./branch-access";

const owner = { role: "owner" as const };
const admin = { role: "admin" as const };
const branches = [
  { id: "a", archivedAt: null },
  { id: "b", archivedAt: null },
  { id: "c", archivedAt: new Date("2026-11-01") },
];

describe("spec 001 — acceso a sucursales", () => {
  it("test_s001_rf26_el_dueno_accede_a_todas_las_sucursales_activas_sin_membresias", () => {
    expect(accessibleBranches(owner, [], branches).map((b) => b.id)).toEqual(["a", "b"]);
    expect(canAccessBranch(owner, [], branches[1])).toBe(true);
    expect(canAccessBranch(owner, [], branches[2])).toBe(false);
  });

  it("test_s001_rf25_el_administrador_accede_exactamente_a_sus_sucursales_activas", () => {
    const memberships = [{ branchId: "b" }, { branchId: "c" }];
    expect(accessibleBranches(admin, memberships, branches).map((b) => b.id)).toEqual(["b"]);
    expect(canAccessBranch(admin, memberships, branches[0])).toBe(false);
    expect(canAccessBranch(admin, memberships, branches[1])).toBe(true);
    expect(canAccessBranch(admin, memberships, branches[2])).toBe(false);
  });
});
