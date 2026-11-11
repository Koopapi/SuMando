import { describe, expect, it } from "vitest";
import { wouldLeaveNoOwner } from "./last-owner";

describe("spec 001 — último dueño", () => {
  it("test_s001_rf30_quitar_al_unico_dueno_activo_deja_al_sistema_sin_dueno", () => {
    expect(wouldLeaveNoOwner({ target: { role: "owner", isActive: true }, otherActiveOwners: 0 })).toBe(true);
    expect(wouldLeaveNoOwner({ target: { role: "owner", isActive: true }, otherActiveOwners: 1 })).toBe(false);
    expect(wouldLeaveNoOwner({ target: { role: "owner", isActive: false }, otherActiveOwners: 0 })).toBe(false);
    expect(wouldLeaveNoOwner({ target: { role: "admin", isActive: true }, otherActiveOwners: 0 })).toBe(false);
  });
});
