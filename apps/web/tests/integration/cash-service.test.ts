// Spec 011: corte de caja contra la BD de pruebas (configuración, apertura, movimientos, conteo, reporte del punto
// de venta, cierre, reapertura, teléfono de piso a ciegas, permisos y registro).
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { auditEntriesFor } from "@/server/adapters/drizzle/store";
import { addMovement, cancelMovement, capturePos, closeCut, currentCut, cutDetail, cutHistory, deliverCount, openCut, reopenCut, saveCount } from "@/server/services/cash/cuts";
import { cashSettingsView, saveCashSettings } from "@/server/services/cash/settings";
import { deviceActor, type ChecklistActor } from "@/server/services/checklists/actor";
import { enableFloorDevice, floorDeviceFromToken } from "@/server/services/checklists/floor";
import { createEmployee } from "@/server/services/personnel/employees";
import { createPosition } from "@/server/services/personnel/positions";
import { catalogWorld } from "./catalog-fixture";
import { code } from "./inventory-fixture";

async function world(opts: { floor?: boolean; mode?: "daily" | "multiple" } = {}) {
  const w = await catalogWorld();
  const s = await saveCashSettings(w.ctx, w.ownerSendero, { mode: opts.mode ?? "daily", floorEnabled: opts.floor ?? false, methods: [{ name: "BBVA 1" }, { name: "Transferencias" }] });
  const user = (scope = w.adminSendero): ChecklistActor => ({ kind: "user", scope });
  const caja = await createPosition(w.ctx, w.ownerSendero, "Caja");
  const cajero = await createEmployee(w.ctx, w.ownerSendero, { name: "Cajero Uno", positionId: caja.id, hiredOn: "2026-01-01" });
  const phone = async () => {
    const { token } = await enableFloorDevice(w.ctx, w.adminSendero, "Tablet de caja");
    const base = await floorDeviceFromToken(w.ctx, token);
    return (employeeId: string | null = cajero.id) => deviceActor(w.ctx, base, employeeId);
  };
  const methodId = (cut: { methods: { id: string; name: string }[] }, name: string) => cut.methods.find((m) => m.name === name)!.id;
  /** Abre, gasta, cuenta y entrega: efectivo 1,500 (fondo 500, gasto 100, ingreso 50), BBVA 2,000, transferencias 300. */
  const counted = async (actor = user()) => {
    const cut = await openCut(w.ctx, actor, "500");
    await addMovement(w.ctx, actor, cut.id, { kind: "expense", concept: "Hielo", amount: "100" });
    await addMovement(w.ctx, actor, cut.id, { kind: "income", concept: "Cambio del banco", amount: "50" });
    return deliverCount(w.ctx, actor, cut.id, { pieces: { "100000": 1, "50000": 1 }, amounts: { [methodId(cut, "BBVA 1")]: "2000", [methodId(cut, "Transferencias")]: "300" } });
  };
  return { ...w, settings: s, user, cajero, phone, methodId, counted };
}

describe("spec 011 — configuración", () => {
  it("test_s011_rf4_solo_el_dueno_configura", async () => {
    const w = await world();
    expect(await code(saveCashSettings(w.ctx, w.adminSendero, { mode: "multiple", floorEnabled: true, methods: [] }))).toBe("owner_only");
    expect((await cashSettingsView(w.ctx, w.adminSendero)).canEdit).toBe(false);
  });

  it("test_s011_rf6_uno_o_varios_por_dia", async () => {
    const w = await world({ mode: "multiple" });
    expect(w.settings.mode).toBe("multiple");
    expect(await code(saveCashSettings(w.ctx, w.ownerSendero, { mode: "semanal", floorEnabled: false, methods: [] }))).toBe("validation");
  });

  it("test_s011_rf7_efectivo_siempre_esta", async () => {
    const w = await world();
    expect(w.settings.methods.map((m) => [m.name, m.isCash])).toEqual([
      ["Efectivo", true],
      ["BBVA 1", false],
      ["Transferencias", false],
    ]);
    expect(await code(saveCashSettings(w.ctx, w.ownerSendero, { mode: "daily", floorEnabled: false, methods: [{ name: "efectivo" }] }))).toBe("duplicate_name");
  });

  it("test_s011_rf8_rf9_formas_de_pago_y_archivado", async () => {
    const w = await world();
    const bbva = w.settings.methods[1];
    expect(await code(saveCashSettings(w.ctx, w.ownerSendero, { mode: "daily", floorEnabled: false, methods: [{ name: "Clip" }, { name: "clip " }] }))).toBe("duplicate_name");
    const cut = await openCut(w.ctx, w.user(), "0");
    const s = await saveCashSettings(w.ctx, w.ownerSendero, { mode: "daily", floorEnabled: false, methods: [{ name: "Clip" }, { id: bbva.id, name: "BBVA Uno" }] });
    expect(s.methods.map((m) => m.name)).toEqual(["Efectivo", "Clip", "BBVA Uno"]);
    expect((await currentCut(w.ctx, w.user()))!.methods.map((m) => m.name)).toEqual(cut.methods.map((m) => m.name));
  });

  it("test_s011_rf10_el_dueno_decide_si_el_telefono_hace_cortes", async () => {
    const w = await world({ floor: false });
    const as = await w.phone();
    expect(await code(openCut(w.ctx, await as(), "100"))).toBe("floor_not_allowed");
  });
});

describe("spec 011 — apertura, movimientos y conteo", () => {
  it("test_s011_rf1_rf2_rf3_rf5_el_corte_es_de_la_sucursal", async () => {
    const w = await world();
    const cut = await openCut(w.ctx, w.user(), "500");
    expect(await currentCut(w.ctx, w.user(w.ownerCentro))).toBeNull();
    expect(await code(cutDetail(w.ctx, w.user(w.ownerCentro), cut.id))).toBe("not_found");
    expect(await code(cutDetail(w.ctx, w.user(w.adminPirrus), cut.id))).toBe("not_found");
  });

  it("test_s011_rf11_rf14_abrir_con_fondo", async () => {
    const w = await world();
    expect(await code(openCut(w.ctx, w.user(), "-1"))).toBe("invalid_amount");
    const cut = await openCut(w.ctx, w.user(), "0");
    expect([cut.fund, cut.date, cut.openedBy, cut.status]).toEqual(["0.00", "2026-11-11", "Admin sendero@mando.test", "open"]);
  });

  it("test_s011_rf12_uno_abierto_a_la_vez", async () => {
    const w = await world({ mode: "multiple" });
    await openCut(w.ctx, w.user(), "500");
    expect(await code(openCut(w.ctx, w.user(w.ownerSendero), "500"))).toBe("cut_open");
  });

  it("test_s011_rf13_uno_por_dia", async () => {
    const w = await world({ mode: "daily" });
    const c = await w.counted();
    await capturePos(w.ctx, w.user(), c.id, Object.fromEntries(c.methods.map((m) => [m.id, "0"])));
    await closeCut(w.ctx, w.user(), c.id, "");
    expect(await code(openCut(w.ctx, w.user(), "500"))).toBe("cut_today");
    w.ctx.clock.advanceDays(1);
    expect((await openCut(w.ctx, w.user(), "500")).date).toBe("2026-11-12");
  });

  it("test_s011_rf15_rf16_movimientos_con_quien_y_hora", async () => {
    const w = await world();
    const cut = await openCut(w.ctx, w.user(), "500");
    expect(await code(addMovement(w.ctx, w.user(), cut.id, { kind: "expense", concept: "Hielo", amount: "0" }))).toBe("invalid_amount");
    expect(await code(addMovement(w.ctx, w.user(), cut.id, { kind: "propina", concept: "x", amount: "1" }))).toBe("validation");
    expect(await code(addMovement(w.ctx, w.user(), cut.id, { kind: "expense", concept: "", amount: "1" }))).toBe("validation");
    const v = await addMovement(w.ctx, w.user(), cut.id, { kind: "withdrawal", concept: "Depósito al banco", amount: "1,000" });
    expect(v.movements[0]).toMatchObject({ kind: "withdrawal", concept: "Depósito al banco", amount: "1000.00", by: "Admin sendero@mando.test", at: "2026-11-11T12:00:00.000Z" });
  });

  it("test_s011_rf17_cancelar_con_motivo_sin_borrar", async () => {
    const w = await world();
    const cut = await openCut(w.ctx, w.user(), "500");
    const v = await addMovement(w.ctx, w.user(), cut.id, { kind: "expense", concept: "Hielo", amount: "100" });
    expect(await code(cancelMovement(w.ctx, w.user(), cut.id, v.movements[0].id, ""))).toBe("reason_required");
    const c = await cancelMovement(w.ctx, w.user(), cut.id, v.movements[0].id, "se capturó dos veces");
    expect(c.movements[0]).toMatchObject({ cancelled: true, cancelReason: "se capturó dos veces" });
    expect(c.totals.expenses).toBe("0.00");
  });

  it("test_s011_rf18_rf19_rf20_rf21_conteo_por_piezas_y_formas_de_pago", async () => {
    const w = await world();
    const cut = await openCut(w.ctx, w.user(), "500");
    expect(await code(saveCount(w.ctx, w.user(), cut.id, { pieces: { "100000": 1.5 }, amounts: {} }))).toBe("invalid_cash_pieces");
    expect(await code(saveCount(w.ctx, w.user(), cut.id, { pieces: {}, amounts: { [w.methodId(cut, "BBVA 1")]: "-5" } }))).toBe("invalid_amount");
    const v = await saveCount(w.ctx, w.user(), cut.id, { pieces: { "100000": 1, "50": 3 }, amounts: { [w.methodId(cut, "BBVA 1")]: "2000" } });
    expect([v.cashCounted, v.methods[1].counted, v.methods[2].counted, v.status]).toEqual(["1001.50", "2000.00", null, "open"]);
  });

  it("test_s011_rf22_para_entregar_se_cuentan_todas_las_formas_de_pago", async () => {
    const w = await world();
    const cut = await openCut(w.ctx, w.user(), "500");
    expect(await code(deliverCount(w.ctx, w.user(), cut.id, { pieces: {}, amounts: { [w.methodId(cut, "BBVA 1")]: "1" } }))).toBe("cut_incomplete");
  });

  it("test_s011_rf22_despues_de_entregar_no_hay_cambios", async () => {
    const w = await world();
    const c = await w.counted();
    expect([c.status, c.countedBy]).toEqual(["counted", "Admin sendero@mando.test"]);
    expect(await code(addMovement(w.ctx, w.user(), c.id, { kind: "expense", concept: "Otro", amount: "1" }))).toBe("cut_state");
    expect(await code(saveCount(w.ctx, w.user(), c.id, { pieces: {}, amounts: {} }))).toBe("cut_state");
  });
});

describe("spec 011 — reporte, cierre y reapertura", () => {
  it("test_s011_rf23_rf24_rf25_rf26_reporte_esperado_y_diferencias", async () => {
    const w = await world();
    const c = await w.counted();
    // Efectivo del punto de venta 1,000 → esperado 1,000 + 500 + 50 − 100 = 1,450; contado 1,500: sobran 50.
    const v = await capturePos(w.ctx, w.user(), c.id, { [w.methodId(c, "Efectivo")]: "1000", [w.methodId(c, "BBVA 1")]: "2100", [w.methodId(c, "Transferencias")]: "300" });
    expect(v.figures!.cashExpected).toBe("1450.00");
    expect(v.methods.map((m) => [m.name, m.counted, m.pos, m.difference])).toEqual([
      ["Efectivo", "1500.00", "1000.00", "50.00"],
      ["BBVA 1", "2000.00", "2100.00", "-100.00"],
      ["Transferencias", "300.00", "300.00", "0.00"],
    ]);
    expect(await code(capturePos(w.ctx, w.user(), c.id, { [w.methodId(c, "Efectivo")]: "1000" }))).toBe("invalid_amount");
  });

  it("test_s011_rf27_rf28_rf29_venta_antes_y_despues_de_gastos", async () => {
    const w = await world();
    const c = await w.counted();
    const v = await capturePos(w.ctx, w.user(), c.id, { [w.methodId(c, "Efectivo")]: "1000", [w.methodId(c, "BBVA 1")]: "2100", [w.methodId(c, "Transferencias")]: "300" });
    // 1,500 − 500 − 50 + 100 + 2,000 + 300 = 3,350; después de gastos 3,250.
    expect(v.figures).toMatchObject({ salesBefore: "3350.00", salesAfter: "3250.00", posTotal: "3400.00", expenses: "100.00", totalDifference: "-50.00" });
  });

  it("test_s011_rf34_rf35_rf36_rf37_cerrar_y_congelar", async () => {
    const w = await world();
    const cut = await openCut(w.ctx, w.user(), "0");
    expect(await code(closeCut(w.ctx, w.user(), cut.id, ""))).toBe("cut_incomplete");
    const counted = await deliverCount(w.ctx, w.user(), cut.id, { pieces: {}, amounts: { [w.methodId(cut, "BBVA 1")]: "0", [w.methodId(cut, "Transferencias")]: "0" } });
    expect(await code(closeCut(w.ctx, w.user(), cut.id, ""))).toBe("cut_incomplete");
    await capturePos(w.ctx, w.user(), cut.id, Object.fromEntries(counted.methods.map((m) => [m.id, "0"])));
    expect(await code(closeCut(w.ctx, w.user(), cut.id, "x".repeat(301)))).toBe("validation");
    const v = await closeCut(w.ctx, w.user(), cut.id, "Sin ventas");
    expect([v.status, v.closedBy, v.note]).toEqual(["closed", "Admin sendero@mando.test", "Sin ventas"]);
    expect(await code(capturePos(w.ctx, w.user(), cut.id, {}))).toBe("cut_state");
    const row = (await w.ctx.store.cash.cuts.findById(cut.id))!;
    expect((row.snapshot as { figures: { totalDifference: string } }).figures.totalDifference).toBe("0.00");
  });

  it("test_s011_rf38_rf39_solo_el_dueno_reabre_con_motivo", async () => {
    const w = await world();
    const c = await w.counted();
    await capturePos(w.ctx, w.user(), c.id, Object.fromEntries(c.methods.map((m) => [m.id, "0"])));
    await closeCut(w.ctx, w.user(), c.id, "");
    expect(await code(reopenCut(w.ctx, w.user(), c.id, "corregir reporte"))).toBe("owner_only");
    expect(await code(reopenCut(w.ctx, w.user(w.ownerSendero), c.id, ""))).toBe("reason_required");
    const v = await reopenCut(w.ctx, w.user(w.ownerSendero), c.id, "corregir el reporte de BBVA");
    expect(v.status).toBe("counted");
    await capturePos(w.ctx, w.user(), c.id, Object.fromEntries(c.methods.map((m) => [m.id, "1"])));
  });

  it("test_s011_rf40_rf41_historial_y_detalle", async () => {
    const w = await world();
    const c = await w.counted();
    await capturePos(w.ctx, w.user(), c.id, { [w.methodId(c, "Efectivo")]: "1000", [w.methodId(c, "BBVA 1")]: "2100", [w.methodId(c, "Transferencias")]: "300" });
    await closeCut(w.ctx, w.user(), c.id, "");
    expect(await cutHistory(w.ctx, w.user())).toEqual([{ id: c.id, date: "2026-11-11", openedAt: "2026-11-11T12:00:00.000Z", status: "closed", posTotal: "3400.00", salesBefore: "3350.00", totalDifference: "-50.00" }]);
    const d = await cutDetail(w.ctx, w.user(), c.id);
    expect([d.pieces, d.movements.length, d.countedBy]).toEqual([{ "100000": 1, "50000": 1 }, 2, "Admin sendero@mando.test"]);
  });

  it("test_s011_rf42_cada_paso_queda_en_el_registro", async () => {
    const w = await world();
    const c = await w.counted();
    await capturePos(w.ctx, w.user(), c.id, Object.fromEntries(c.methods.map((m) => [m.id, "0"])));
    await closeCut(w.ctx, w.user(), c.id, "");
    await reopenCut(w.ctx, w.user(w.ownerSendero), c.id, "corrección");
    expect((await auditEntriesFor(db, "cash_cut", c.id)).map((a) => a.action).reverse()).toEqual(["cash_cut.opened", "cash_cut.movement", "cash_cut.movement", "cash_cut.counted", "cash_cut.pos", "cash_cut.closed", "cash_cut.reopened"]);
    expect((await auditEntriesFor(db, "cash_settings", w.sendero.id)).map((a) => a.action)).toEqual(["cash_settings.updated"]);
  });
});

describe("spec 011 — teléfono de piso a ciegas", () => {
  it("test_s011_rf30_rf31_el_cajero_abre_gasta_y_cuenta_con_su_nombre", async () => {
    const w = await world({ floor: true });
    const as = await w.phone();
    expect(await code(openCut(w.ctx, await as(null), "500"))).toBe("employee_required");
    const c = await w.counted(await as());
    expect([c.openedBy, c.countedBy, c.movements[0].by]).toEqual(["Cajero Uno", "Cajero Uno", "Cajero Uno"]);
  });

  it("test_s011_rf32_el_telefono_nunca_ve_el_punto_de_venta", async () => {
    const w = await world({ floor: true });
    const as = await w.phone();
    const c = await w.counted(await as());
    await capturePos(w.ctx, w.user(), c.id, { [w.methodId(c, "Efectivo")]: "1234", [w.methodId(c, "BBVA 1")]: "5678", [w.methodId(c, "Transferencias")]: "300" });
    const blind = (await currentCut(w.ctx, await as()))!;
    const text = JSON.stringify(blind);
    expect(text).not.toMatch(/1234|5678|"pos"|difference|figures|salesBefore/);
    expect(await code(capturePos(w.ctx, await as(), c.id, {}))).toBe("forbidden");
    expect(await code(cutHistory(w.ctx, await as()))).toBe("forbidden");
    expect(await code(closeCut(w.ctx, await as(), c.id, ""))).toBe("forbidden");
    await closeCut(w.ctx, w.user(), c.id, "");
    expect(await currentCut(w.ctx, await as())).toBeNull();
  });

  it("test_s011_rf33_si_la_sucursal_no_lo_permite_se_rechaza", async () => {
    const w = await world({ floor: true });
    const as = await w.phone();
    const cut = await openCut(w.ctx, await as(), "500");
    await saveCashSettings(w.ctx, w.ownerSendero, { mode: "daily", floorEnabled: false, methods: [{ name: "BBVA 1" }] });
    expect(await code(currentCut(w.ctx, await as()))).toBe("floor_not_allowed");
    expect(await code(addMovement(w.ctx, await as(), cut.id, { kind: "expense", concept: "Hielo", amount: "1" }))).toBe("floor_not_allowed");
    expect((await currentCut(w.ctx, w.user()))!.id).toBe(cut.id);
  });
});
