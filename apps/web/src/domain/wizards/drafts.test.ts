import { describe, expect, it } from "vitest";
import { DRAFT_MAX_BYTES, DRAFT_TTL_DAYS, WIZARD_KINDS, draftExpired, isFloorKind, isWizardKind, needsTarget } from "./drafts";

const day = 24 * 60 * 60 * 1000;

describe("spec 015 — borradores de los asistentes", () => {
  it("test_s015_rf17_tipos_de_asistente_conocidos", () => {
    expect(WIZARD_KINDS).toHaveLength(20);
    expect(isWizardKind("req-new")).toBe(true);
    expect(isWizardKind("cualquier-cosa")).toBe(false);
    // Los que trabajan sobre algo que ya existe (una requisición, un traspaso, una semana) llevan su objetivo.
    expect(needsTarget("req-new")).toBe(false);
    expect(needsTarget("req-approve")).toBe(true);
    expect(needsTarget("pay-close")).toBe(true);
    expect(needsTarget("floor-cash")).toBe(true);
  });

  it("test_s015_rf22_solo_checklist_y_corte_ciego_son_del_telefono_de_piso", () => {
    expect(WIZARD_KINDS.filter(isFloorKind)).toEqual(["floor-checklist", "floor-cash"]);
  });

  it("test_s015_rf51_se_descarta_a_los_7_dias_sin_cambios", () => {
    expect(DRAFT_TTL_DAYS).toBe(7);
    const now = new Date("2026-11-19T12:00:00Z");
    expect(draftExpired(new Date(now.getTime() - 7 * day), now)).toBe(false);
    expect(draftExpired(new Date(now.getTime() - 7 * day - 1), now)).toBe(true);
  });

  it("test_s015_rf17_lo_guardado_tiene_un_tamano_maximo", () => {
    expect(DRAFT_MAX_BYTES).toBe(256 * 1024);
  });
});
