import { describe, expect, it } from "vitest";
import { allDone, canCancel, canDecide, canEdit, canOperate, excessOf, groupStatus, pendingOf } from "./state";

const line = (q: bigint, r: bigint, closed = false) => ({ quantityMicro: q, receivedMicro: r, closed });

describe("spec 007 — estados de la requisición", () => {
  it("test_s007_rf22_rf24_se_edita_solo_mientras_esta_solicitada", () => {
    expect(canEdit("requested")).toBe(true);
    for (const s of ["approved", "rejected", "cancelled", "closed"] as const) expect(canEdit(s)).toBe(false);
  });

  it("test_s007_rf23_rf25_rf26_se_aprueba_o_rechaza_una_solicitada", () => {
    expect(canDecide("requested")).toBe(true);
    expect(canDecide("approved")).toBe(false);
  });

  it("test_s007_rf28_se_cancela_si_no_se_ha_recibido_nada", () => {
    expect(canCancel("requested", false)).toBe(true);
    expect(canCancel("approved", false)).toBe(true);
    expect(canCancel("approved", true)).toBe(false);
    expect(canCancel("closed", false)).toBe(false);
  });

  it("test_s007_rf29_rf34_se_compra_y_recibe_en_una_aprobada", () => {
    expect(canOperate("approved")).toBe(true);
    expect(canOperate("requested")).toBe(false);
  });

  it("test_s007_rf33_estado_de_cada_grupo", () => {
    expect(groupStatus(false, [line(10n, 0n)])).toBe("to_buy");
    expect(groupStatus(true, [line(10n, 0n)])).toBe("purchased");
    expect(groupStatus(true, [line(10n, 4n), line(5n, 0n)])).toBe("partial");
    expect(groupStatus(true, [line(10n, 10n), line(5n, 0n, true)])).toBe("received");
  });

  it("test_s007_rf37_lo_que_llega_de_mas_es_excedente", () => {
    expect(excessOf(line(10n, 12n))).toBe(2n);
    expect(excessOf(line(10n, 8n))).toBe(0n);
  });

  it("test_s007_rf38_lo_que_falta_queda_pendiente", () => {
    expect(pendingOf(line(10n, 8n))).toBe(2n);
    expect(pendingOf(line(10n, 12n))).toBe(0n);
  });

  it("test_s007_rf39_lo_cerrado_ya_no_esta_pendiente", () => {
    expect(pendingOf(line(10n, 8n, true))).toBe(0n);
  });

  it("test_s007_rf40_todo_recibido_o_cerrado_cierra_la_requisicion", () => {
    expect(allDone([line(10n, 10n), line(5n, 2n, true)])).toBe(true);
    expect(allDone([line(10n, 9n)])).toBe(false);
    expect(allDone([])).toBe(false);
  });

  it("test_s007_rf46_no_se_quitan_renglones_fuera_de_solicitada", () => {
    expect(canEdit("approved")).toBe(false);
  });
});
