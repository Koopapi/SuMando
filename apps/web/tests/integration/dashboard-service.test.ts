// Spec 012: tablero contra la BD de pruebas (alcance, secciones, cifras por negocio y sucursal, comparación, alertas,
// marca de revisado, Excel y aislamiento). Hoy es miércoles 11 de noviembre de 2026 (FakeClock).
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { readWorkbook } from "@/server/adapters/xlsx";
import { auditEntriesFor } from "@/server/adapters/drizzle/store";
import { addMovement, cancelMovement, capturePos, closeCut, cutDetail, deliverCount, openCut, reopenCut, reviewCut } from "@/server/services/cash/cuts";
import { saveCashSettings } from "@/server/services/cash/settings";
import { setArchived } from "@/server/services/catalog/archive";
import { recordMovement } from "@/server/services/inventory/movements";
import { setLevel } from "@/server/services/catalog/levels";
import { updateProduct } from "@/server/services/catalog/products";
import { createSupplier } from "@/server/services/catalog/suppliers";
import type { CatalogScope } from "@/server/services/catalog/shared";
import { closeWeek, markDay, reopenWeek } from "@/server/services/payroll/weeks";
import { createEmployee } from "@/server/services/personnel/employees";
import { createPosition } from "@/server/services/personnel/positions";
import { dashboardAlerts } from "@/server/services/reports/alerts";
import { dashboardPage, dashboardSection, dashboardSummary } from "@/server/services/reports/dashboard";
import { dashboardExcel } from "@/server/services/reports/export";
import { documentLogo, setBusinessLogo } from "@/server/services/business-logo";
import { dashboardScope } from "@/server/services/reports/scope";
import { approveRequisition, createRequisition, rejectRequisition } from "@/server/services/requisitions/requisitions";
import { code, inventoryWorld } from "./inventory-fixture";

const LAST = "2026-11-02";

interface CutSpec {
  daysAgo?: number;
  fund?: string;
  pieces: Record<string, number>;
  amounts?: Record<string, string>;
  pos: Record<string, string>;
  moves?: { kind: "expense" | "withdrawal" | "income"; concept: string; amount: string; cancel?: boolean }[];
}

async function world() {
  const w = await inventoryWorld();
  await saveCashSettings(w.ctx, w.ownerSendero, { mode: "daily", floorEnabled: false, methods: [{ name: "BBVA 1" }, { name: "Transferencias" }] });
  const closed = async (scope: CatalogScope, spec: CutSpec) => {
    const back = spec.daysAgo ?? 0;
    w.ctx.clock.advanceDays(-back);
    try {
      const actor = { kind: "user" as const, scope };
      const cut = await openCut(w.ctx, actor, spec.fund ?? "0");
      for (const m of spec.moves ?? []) {
        const after = await addMovement(w.ctx, actor, cut.id, m);
        if (m.cancel) await cancelMovement(w.ctx, actor, cut.id, after.movements.at(-1)!.id, "capturado por error");
      }
      const ids = (byName: Record<string, string>) => Object.fromEntries(cut.methods.map((x) => [x.id, byName[x.name] ?? "0"]));
      await deliverCount(w.ctx, actor, cut.id, { pieces: spec.pieces, amounts: ids(spec.amounts ?? {}) });
      await capturePos(w.ctx, actor, cut.id, ids(spec.pos));
      return await closeCut(w.ctx, actor, cut.id, "");
    } finally {
      w.ctx.clock.advanceDays(back);
    }
  };
  /** Sendero: efectivo 1,500 (fondo 500, gasto 100, ingreso 50), BBVA 2,000, transferencias 300: venta 3,350, sin diferencia. */
  const senderoCut = (daysAgo = 0, extra: Partial<CutSpec> = {}) =>
    closed(w.ownerSendero, {
      daysAgo,
      fund: "500",
      pieces: { "100000": 1, "50000": 1 },
      amounts: { "BBVA 1": "2000", Transferencias: "300" },
      pos: { Efectivo: "1050", "BBVA 1": "2000", Transferencias: "300" },
      moves: [
        { kind: "expense", concept: "Hielo", amount: "100" },
        { kind: "income", concept: "Cambio del banco", amount: "50" },
      ],
      ...extra,
    });
  /** Pirrus: solo efectivo 1,000 sin fondo: venta 1,000. */
  const pirrusCut = (daysAgo = 0, pos = "1000") => closed(w.ownerPirrus, { daysAgo, pieces: { "100000": 1 }, pos: { Efectivo: pos } });
  const mesero = await createPosition(w.ctx, w.ownerSendero, "Mesero");
  const hire = (scope: CatalogScope, name: string, pay: string | null = "400") => createEmployee(w.ctx, scope, { name, positionId: mesero.id, hiredOn: "2026-10-01", ...(pay ? { dailyPay: pay } : {}) });
  return { ...w, closed, senderoCut, pirrusCut, mesero, hire };
}
type W = Awaited<ReturnType<typeof world>>;
const money = async (w: W, section: string, input = {}, actor = w.owner) => {
  const d = await dashboardSection(w.ctx, actor, section, input);
  if (d.section === "alerts") throw new Error("se esperaba una sección de dinero");
  return d;
};
const alerts = async (w: W, actor = w.owner) => (await dashboardAlerts(w.ctx, await dashboardScope(w.ctx, actor))).items;

describe("spec 012 — alcance y secciones", () => {
  it("test_s012_rf1_rf2_rf4_el_dueno_ve_todo_y_el_administrador_alertas_y_ventas", async () => {
    const w = await world();
    expect((await dashboardSummary(w.ctx, w.owner, {})).sections).toEqual(["alerts", "sales", "expenses", "payroll", "remaining"]);
    const admin = await dashboardSummary(w.ctx, w.senderoAdmin, {});
    expect(admin.sections).toEqual(["alerts", "sales"]);
    expect(Object.keys(admin.figures)).toEqual(["sales"]);
  });

  it("test_s012_rf2_rf3_el_dueno_ve_todos_los_negocios_y_el_administrador_solo_su_sucursal", async () => {
    const w = await world();
    const owner = await money(w, "sales");
    expect(owner.businesses.map((b) => [b.name, b.branches.map((x) => x.name)])).toEqual([
      ["Pastatti", ["Centro", "Sendero"]],
      ["Pirrus", ["Centro"]],
    ]);
    const admin = await money(w, "sales", {}, w.senderoAdmin);
    expect(admin.businesses.map((b) => [b.name, b.branches.map((x) => x.name)])).toEqual([["Pastatti", ["Sendero"]]]);
  });

  it("test_s012_rf5_el_administrador_no_obtiene_gastos_nomina_ni_lo_que_queda", async () => {
    const w = await world();
    for (const s of ["expenses", "payroll", "remaining"]) {
      expect(await code(dashboardSection(w.ctx, w.senderoAdmin, s, {}))).toBe("forbidden");
      expect(await code(dashboardExcel(w.ctx, w.senderoAdmin, s, {}))).toBe("forbidden");
    }
    expect(await code(dashboardSection(w.ctx, w.owner, "inventario", {}))).toBe("not_found");
    // La página no abre una sección prohibida aunque venga en la dirección.
    expect((await dashboardPage(w.ctx, w.senderoAdmin, {}, "payroll")).detail).toBeNull();
  });

  it("test_s012_rf6_las_cifras_se_calculan_al_momento", async () => {
    const w = await world();
    expect((await dashboardSummary(w.ctx, w.owner, {})).figures.sales!.amount).toBe("0.00");
    await w.pirrusCut();
    expect((await dashboardSummary(w.ctx, w.owner, {})).figures.sales!.amount).toBe("1000.00");
  });

  it("test_s012_rf13_rf14_rf15_el_rango_invalido_se_rechaza", async () => {
    const w = await world();
    expect(await code(dashboardSummary(w.ctx, w.owner, { period: "range", from: "2026-11-10", to: "2026-11-01" }))).toBe("range_order");
    expect(await code(dashboardSummary(w.ctx, w.owner, { period: "range", from: "2025-01-01", to: "2026-11-01" }))).toBe("range_too_long");
    expect(await code(dashboardSummary(w.ctx, w.owner, { period: "range", from: "2026-11-01", to: "2026-11-12" }))).toBe("range_future");
  });
});

describe("spec 012 — ventas", () => {
  it("test_s012_rf21_rf22_rf23_rf25_total_por_negocio_y_sucursal_contra_ayer", async () => {
    const w = await world();
    await w.senderoCut(1);
    await w.senderoCut(0);
    await w.pirrusCut(0);
    const d = await money(w, "sales");
    expect(d.total).toEqual({ amount: "4350.00", previous: "3350.00", change: "1000.00", percent: "29.9", direction: "up" });
    const [pastatti, pirrus] = d.businesses;
    expect(pastatti.figure.amount).toBe("3350.00");
    expect(pastatti.figure.direction).toBe("same");
    expect(pastatti.branches.find((b) => b.name === "Sendero")!.figure.amount).toBe("3350.00");
    expect(pirrus.figure).toMatchObject({ amount: "1000.00", previous: "0.00", percent: null });
  });

  it("test_s012_rf24_negocios_y_sucursales_sin_movimientos_en_cero", async () => {
    const w = await world();
    await w.pirrusCut();
    const d = await money(w, "sales");
    expect(d.businesses[0].figure.amount).toBe("0.00");
    expect(d.businesses[0].branches.find((b) => b.name === "Centro")!.figure).toMatchObject({ amount: "0.00", percent: null, direction: "same" });
  });

  it("test_s012_rf26_rf27_por_forma_de_pago_solo_cortes_cerrados_del_periodo", async () => {
    const w = await world();
    await w.senderoCut(3);
    await w.senderoCut(0);
    // Un corte abierto de Pirrus no cuenta.
    await openCut(w.ctx, { kind: "user", scope: w.ownerPirrus }, "200");
    const d = await money(w, "sales");
    expect(d.methods!.map((m) => [m.name, m.figure.amount])).toEqual([
      ["BBVA 1", "2000.00"],
      ["Efectivo", "1050.00"],
      ["Transferencias", "300.00"],
    ]);
    expect((await money(w, "sales", { period: "week" })).total.amount).toBe("3350.00");
    expect((await money(w, "sales", { period: "range", from: "2026-11-08", to: "2026-11-11" })).total.amount).toBe("6700.00");
  });

  it("test_s012_rf28_un_corte_reabierto_deja_de_contar", async () => {
    const w = await world();
    const cut = await w.pirrusCut();
    await reopenCut(w.ctx, { kind: "user", scope: w.ownerPirrus }, cut.id, "faltó un voucher");
    expect((await money(w, "sales")).total.amount).toBe("0.00");
    await closeCut(w.ctx, { kind: "user", scope: w.ownerPirrus }, cut.id, "");
    expect((await money(w, "sales")).total.amount).toBe("1000.00");
  });
});

describe("spec 012 — gastos, nómina y lo que queda", () => {
  it("test_s012_rf29_rf30_gastos_sin_retiros_ingresos_ni_cancelados", async () => {
    const w = await world();
    await w.senderoCut(0, {
      moves: [
        { kind: "expense", concept: "Hielo", amount: "100" },
        { kind: "expense", concept: "Gas", amount: "300", cancel: true },
        { kind: "withdrawal", concept: "Depósito", amount: "200" },
        { kind: "income", concept: "Cambio", amount: "50" },
      ],
      pos: { Efectivo: "850", "BBVA 1": "2000", Transferencias: "300" },
    });
    const d = await money(w, "expenses");
    expect(d.total.amount).toBe("100.00");
    expect(d.expenses!.map((e) => [e.date, e.business, e.branch, e.concept, e.amount])).toEqual([["2026-11-11", "Pastatti", "Sendero", "Hielo", "100.00"]]);
  });

  it("test_s012_rf31_rf32_rf33_rf34_nomina_de_semanas_cerradas_por_su_domingo", async () => {
    const w = await world();
    const e = await w.hire(w.ownerSendero, "Mesero Uno");
    for (const day of [0, 1]) await markDay(w.ctx, w.ownerSendero, LAST, { employeeId: e.id, day, state: "worked" });
    expect((await money(w, "payroll", { period: "month" })).total.amount).toBe("0.00");
    await closeWeek(w.ctx, w.ownerSendero, LAST);
    // Su domingo es el 8: cuenta en el mes y en un rango que lo contiene, no en esta semana.
    const month = await money(w, "payroll", { period: "month" });
    expect(month.total.amount).toBe("800.00");
    expect(month.weeks!.map((x) => [x.weekStart, x.business, x.branch, x.total])).toEqual([[LAST, "Pastatti", "Sendero", "800.00"]]);
    expect((await money(w, "payroll", { period: "week" })).total.amount).toBe("0.00");
    expect((await money(w, "payroll", { period: "range", from: "2026-11-08", to: "2026-11-08" })).total.amount).toBe("800.00");
    expect((await money(w, "payroll", { period: "range", from: "2026-11-02", to: "2026-11-07" })).total.amount).toBe("0.00");
    await reopenWeek(w.ctx, w.ownerSendero, LAST, "faltó un día");
    expect((await money(w, "payroll", { period: "month" })).total.amount).toBe("0.00");
  });

  it("test_s012_rf35_rf36_lo_que_queda_es_ventas_menos_gastos_menos_nomina", async () => {
    const w = await world();
    const e = await w.hire(w.ownerSendero, "Mesero Uno", "2000");
    for (const day of [0, 1]) await markDay(w.ctx, w.ownerSendero, LAST, { employeeId: e.id, day, state: "worked" });
    await closeWeek(w.ctx, w.ownerSendero, LAST);
    await w.senderoCut(5);
    const d = await money(w, "remaining", { period: "month" });
    // 3,350 − 100 − 4,000.
    expect(d.total.amount).toBe("-750.00");
    expect(d.businesses[0].branches.find((b) => b.name === "Sendero")!.figure.amount).toBe("-750.00");
    expect((await dashboardSummary(w.ctx, w.owner, { period: "month" })).figures).toMatchObject({ sales: { amount: "3350.00" }, expenses: { amount: "100.00" }, payroll: { amount: "4000.00" }, remaining: { amount: "-750.00" } });
  });
});

describe("spec 012 — alertas", () => {
  it("test_s012_rf50_sin_alertas_todo_en_orden", async () => {
    const w = await world();
    const d = await dashboardSection(w.ctx, w.owner, "alerts", {});
    expect(d).toEqual({ section: "alerts", alerts: { total: 0, counts: { low_stock: 0, requisition: 0, payroll: 0, cash_difference: 0 }, items: [] } });
  });

  it("test_s012_rf39_rf40_rf45_existencia_bajo_el_minimo_en_la_presentacion_de_conteo", async () => {
    const w = await world();
    await setLevel(w.ctx, w.ownerSendero, w.queso.id, { warehouseId: w.bodegaSendero.id, presentationId: w.pieza.id, min: "2", max: "5" });
    await w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.queso.id, quantity: "1", presentationId: w.pieza.id }]);
    // En la central del negocio, sin existencia: también está bajo el mínimo.
    await setLevel(w.ctx, w.ownerSendero, w.leche.id, { warehouseId: w.central.id, min: "500", max: "1000" });
    // Sin mínimo o con lo suficiente, no hay alerta.
    await setLevel(w.ctx, w.ownerPirrus, w.cremaPirrus.id, { warehouseId: w.bodegaPirrus.id, min: "100", max: "200" });
    await w.entry(w.ownerPirrus, w.bodegaPirrus.id, [{ productId: w.cremaPirrus.id, quantity: "100" }]);
    const items = await alerts(w);
    expect(items.map((a) => (a.kind === "low_stock" ? [a.business, a.branch, a.product, a.warehouse, a.quantity, a.min, a.presentation] : null))).toEqual([
      ["Pastatti", null, "Leche", "Central", "0", "500", null],
      ["Pastatti", "Sendero", "Queso manchego", "Bodega Sendero", "1", "2", "Pieza"],
    ]);
    expect(items[1]).toMatchObject({ href: `/inventario?almacen=${w.bodegaSendero.id}`, targetBranchId: w.sendero.id });
    // El de Sendero ve las dos (la central es de su negocio); el de Pirrus, ninguna.
    expect((await alerts(w, w.senderoAdmin)).length).toBe(2);
    expect(await alerts(w, w.pirrusAdmin)).toEqual([]);
  });

  it("test_s012_rf39_producto_archivado_o_negativo", async () => {
    const w = await world();
    await setLevel(w.ctx, w.ownerSendero, w.leche.id, { warehouseId: w.bodegaSendero.id, min: "0", max: "10" });
    await w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.leche.id, quantity: "5" }]);
    expect(await alerts(w)).toEqual([]);
    await setLevel(w.ctx, w.ownerSendero, w.queso.id, { warehouseId: w.bodegaSendero.id, min: "10", max: "20" });
    await setArchived(w.ctx, w.ownerSendero, "products", w.queso.id, true);
    expect(await alerts(w)).toEqual([]);
    // Una salida que deja la leche en negativo sí alerta, aunque el mínimo sea cero.
    await recordMovement(w.ctx, w.ownerSendero, { kind: "exit", warehouseId: w.bodegaSendero.id, lines: [{ productId: w.leche.id, quantity: "8" }], reason: "waste" });
    expect((await alerts(w)).map((a) => (a.kind === "low_stock" ? [a.product, a.quantity, a.negative] : null))).toEqual([["Leche", "-3", true]]);
  });

  it("test_s012_rf41_rf42_requisiciones_solicitadas_y_aprobadas_por_recibir", async () => {
    const w = await world();
    const sams = await createSupplier(w.ctx, w.ownerSendero, { name: "Sams" });
    await updateProduct(w.ctx, w.ownerSendero, w.leche.id, { supplierId: sams.id });
    const request = () => createRequisition(w.ctx, w.adminSendero, { warehouseId: w.bodegaSendero.id, lines: [{ productId: w.leche.id, quantity: "2000", supplierId: sams.id }], note: null });
    const a = await request();
    const b = await request();
    const c = await request();
    await approveRequisition(w.ctx, w.ownerSendero, b.id);
    await rejectRequisition(w.ctx, w.ownerSendero, c.id, "ya hay suficiente");
    const items = (await alerts(w)).filter((x) => x.kind === "requisition");
    expect(items.map((x) => (x.kind === "requisition" ? [x.folio, x.status, x.branch, x.href] : null))).toEqual([
      [a.folio, "requested", "Sendero", `/requisiciones/${a.id}`],
      [b.folio, "approved", "Sendero", `/requisiciones/${b.id}`],
    ]);
    expect(await alerts(w, w.pirrusAdmin)).toEqual([]);
  });

  it("test_s012_rf43_semanas_terminadas_sin_cerrar", async () => {
    const w = await world();
    const e = await w.hire(w.ownerCentro, "Cocinero Uno");
    await w.hire(w.ownerSendero, "Sin captura");
    // Centro capturó la semana del 26 de octubre y nunca cerró; Sendero no tiene captura.
    await markDay(w.ctx, w.ownerCentro, "2026-10-26", { employeeId: e.id, day: 0, state: "worked" });
    const items = (await alerts(w)).filter((x) => x.kind === "payroll");
    expect(items.map((x) => (x.kind === "payroll" ? [x.branch, x.weekStart, x.href] : null))).toEqual([
      ["Centro", "2026-10-26", "/nomina/2026-10-26"],
      ["Centro", "2026-11-02", "/nomina/2026-11-02"],
    ]);
    for (const day of [0, 1]) await markDay(w.ctx, w.ownerCentro, LAST, { employeeId: e.id, day, state: "worked" });
    await closeWeek(w.ctx, w.ownerCentro, LAST);
    expect((await alerts(w)).filter((x) => x.kind === "payroll").length).toBe(1);
    expect(await alerts(w, w.senderoAdmin)).toEqual([]);
  });

  it("test_s012_rf38_las_alertas_no_dependen_del_periodo", async () => {
    const w = await world();
    await w.pirrusCut(40, "900");
    for (const p of [{}, { period: "week" }, { period: "range", from: "2026-11-01", to: "2026-11-02" }]) expect((await dashboardSummary(w.ctx, w.owner, p)).alerts).toBe(1);
  });

  it("test_s012_rf44_corte_con_diferencia_desde_un_peso", async () => {
    const w = await world();
    await w.senderoCut(2);
    await w.pirrusCut(1, "999");
    const items = (await alerts(w)).filter((x) => x.kind === "cash_difference");
    expect(items.map((x) => (x.kind === "cash_difference" ? [x.business, x.branch, x.date, x.difference] : null))).toEqual([["Pirrus", "Centro", "2026-11-10", "1.00"]]);
    expect(await alerts(w, w.senderoAdmin)).toEqual([]);
  });

  it("test_s012_rf47_rf48_rf49_rf55_solo_el_dueno_marca_revisado_y_al_reabrir_se_quita", async () => {
    const w = await world();
    const cut = await w.closed(w.ownerSendero, { pieces: { "100000": 1 }, pos: { Efectivo: "800" } });
    const admin = { kind: "user" as const, scope: w.adminSendero };
    const owner = { kind: "user" as const, scope: w.ownerSendero };
    expect((await cutDetail(w.ctx, owner, cut.id)).canReview).toBe(true);
    expect((await cutDetail(w.ctx, admin, cut.id)).canReview).toBe(false);
    expect(await code(reviewCut(w.ctx, admin, cut.id))).toBe("owner_only");
    const reviewed = await reviewCut(w.ctx, owner, cut.id);
    expect(reviewed).toMatchObject({ reviewedBy: "Dueño de prueba", canReview: false });
    expect(reviewed.reviewedAt).toBe(w.ctx.clock.now().toISOString());
    expect(await alerts(w)).toEqual([]);
    // Dos marcas seguidas dejan una sola.
    await reviewCut(w.ctx, owner, cut.id);
    const log = (await auditEntriesFor(db, "cash_cut", cut.id)).filter((e) => e.action === "cash_cut.reviewed");
    expect(log.length).toBe(1);
    expect(log[0].actorId).toBe(w.owner.id);
    await reopenCut(w.ctx, owner, cut.id, "revisar otra vez");
    const again = await closeCut(w.ctx, owner, cut.id, "");
    expect(again.reviewedAt).toBeNull();
    expect((await alerts(w)).length).toBe(1);
  });

  it("test_s012_rf47_solo_se_marca_un_corte_cerrado", async () => {
    const w = await world();
    const open = await openCut(w.ctx, { kind: "user", scope: w.ownerPirrus }, "0");
    expect(await code(reviewCut(w.ctx, { kind: "user", scope: w.ownerPirrus }, open.id))).toBe("cut_state");
  });

  it("test_s012_rf37_cuenta_por_tipo_y_total", async () => {
    const w = await world();
    await w.pirrusCut(1, "999");
    await setLevel(w.ctx, w.ownerSendero, w.leche.id, { warehouseId: w.central.id, min: "500", max: "1000" });
    const d = await dashboardSection(w.ctx, w.owner, "alerts", {});
    if (d.section !== "alerts") throw new Error("alertas");
    expect(d.alerts.total).toBe(2);
    expect(d.alerts.counts).toEqual({ low_stock: 1, requisition: 0, payroll: 0, cash_difference: 1 });
  });
});

describe("spec 012 — Excel", () => {
  it("test_s012_rf51_rf53_rf54_la_seccion_abierta_con_su_periodo_y_desglose", async () => {
    const w = await world();
    await w.senderoCut(0);
    await w.pirrusCut(0);
    const file = await dashboardExcel(w.ctx, w.owner, "sales", {});
    expect(file.fileName).toBe("tablero-sales-2026-11-11-a-2026-11-11.xlsx");
    const [sheet] = readWorkbook(file.bytes).sheets;
    expect(sheet.rows[0]).toEqual(["Ventas"]);
    expect(sheet.rows[1]).toEqual(["Periodo: 2026-11-11 al 2026-11-11"]);
    const body = sheet.rows.filter((r) => r.length >= 6);
    expect(body[0]).toEqual(["Negocio", "Sucursal", "Monto", "Periodo anterior", "Cambio", "Cambio %"]);
    expect(body[1]).toEqual(["Total general", "Todas", "4350", "0", "4350", "sin periodo anterior"]);
    expect(body.map((r) => r.slice(0, 3))).toContainEqual(["Pastatti", "Sendero", "3350"]);
    expect(body.map((r) => r.slice(0, 3))).toContainEqual(["Pastatti", "Centro", "0"]);
    expect(body.map((r) => r.slice(0, 3))).toContainEqual(["Pirrus", "Todas", "1000"]);
  });

  it("test_s012_rf52_el_administrador_exporta_solo_su_sucursal", async () => {
    const w = await world();
    await w.senderoCut(0);
    await w.pirrusCut(0, "999");
    const sales = readWorkbook((await dashboardExcel(w.ctx, w.senderoAdmin, "sales", {})).bytes).sheets[0].rows.flat();
    expect(sales).not.toContain("Pirrus");
    const alertRows = readWorkbook((await dashboardExcel(w.ctx, w.senderoAdmin, "alerts", {})).bytes).sheets[0].rows;
    expect(alertRows.flat()).not.toContain("Pirrus");
    const ownerAlerts = readWorkbook((await dashboardExcel(w.ctx, w.owner, "alerts", {})).bytes).sheets[0].rows;
    expect(ownerAlerts.at(-1)).toEqual(["Cortes con diferencia", "Pirrus", "Centro", "Corte del 2026-11-11", "Diferencia de 1.00"]);
  });
});

describe("spec 014 — logo en el Excel del tablero", () => {
  const png = (width: number, height: number) => {
    const b = new Uint8Array(33);
    b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
    new DataView(b.buffer).setUint32(16, width);
    new DataView(b.buffer).setUint32(20, height);
    return b;
  };

  it("test_s014_rf32_el_excel_de_un_negocio_lleva_su_logo_y_el_de_varios_no", async () => {
    const w = await world();
    await w.senderoCut(0);
    await w.pirrusCut(0);
    await setBusinessLogo(w.ctx, w.owner, w.pastatti.id, png(400, 100));
    const one = (await dashboardExcel(w.ctx, w.senderoAdmin, "sales", {})).bytes.toString("latin1");
    expect(one).toContain("xl/media/logo.png");
    const many = (await dashboardExcel(w.ctx, w.owner, "sales", {})).bytes.toString("latin1");
    expect(many).not.toContain("xl/media/logo.png");
  });

  it("test_s014_rf31_rf32_el_logo_del_documento_mide_48_px_de_alto_y_cabe_completo", async () => {
    const w = await world();
    await setBusinessLogo(w.ctx, w.owner, w.pastatti.id, png(400, 100));
    expect(await documentLogo(w.ctx, w.pastatti.id)).toMatchObject({ width: 192, height: 48 });
    expect(await documentLogo(w.ctx, w.pirrus.id)).toBeNull();
  });
});
