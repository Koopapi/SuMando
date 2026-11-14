// Spec 009: nómina contra la BD de pruebas (semana, asistencia, montos, préstamos, cierre, reapertura, permisos).
// El reloj de pruebas está en el miércoles 11 de noviembre de 2026; la semana pasada empieza el lunes 2.
import { describe, expect, it } from "vitest";
import { auditEntriesFor } from "@/server/adapters/drizzle/store";
import { db } from "@/db/client";
import { createLoan, employeeLoans } from "@/server/services/payroll/loans";
import { closeWeek, listPayrollWeeks, markDay, payrollWeek, reopenWeek, setAmounts, setLoanPayment } from "@/server/services/payroll/weeks";
import { createEmployee, moveEmployee, setEmployeePay, terminateEmployee } from "@/server/services/personnel/employees";
import { createPosition } from "@/server/services/personnel/positions";
import { catalogWorld } from "./catalog-fixture";
import { code } from "./inventory-fixture";

const LAST = "2026-11-02";
const THIS = "2026-11-09";

async function world() {
  const w = await catalogWorld();
  const mesero = await createPosition(w.ctx, w.ownerSendero, "Mesero");
  const cocina = await createPosition(w.ctx, w.ownerSendero, "Cocina");
  const hire = async (name: string, pay: string | null = "400", extra: Record<string, unknown> = {}) => {
    const e = await createEmployee(w.ctx, w.ownerSendero, { name, positionId: mesero.id, hiredOn: "2026-10-01", ...(pay ? { dailyPay: pay } : {}), ...extra });
    return e;
  };
  const mark = (id: string, day: number, state: "worked" | "half" | "empty", late = false, scope = w.adminSendero, week = LAST) => markDay(w.ctx, scope, week, { employeeId: id, day, state, late });
  const row = async (id: string, scope = w.ownerSendero, week = LAST) => (await payrollWeek(w.ctx, scope, week)).groups.flatMap((g) => g.rows).find((r) => r.employeeId === id)!;
  return { ...w, mesero, cocina, hire, mark, row };
}

describe("spec 009 — semana y permisos", () => {
  it("test_s009_rf1_rf3_una_nomina_por_semana_y_sucursal", async () => {
    const w = await world();
    const e = await w.hire("Empleado Uno");
    await w.mark(e.id, 0, "worked");
    expect((await payrollWeek(w.ctx, w.ownerSendero, LAST)).groups.flatMap((g) => g.rows).map((r) => r.name)).toEqual(["Empleado Uno"]);
    expect((await payrollWeek(w.ctx, w.ownerCentro, LAST)).groups).toEqual([]);
    expect((await listPayrollWeeks(w.ctx, w.ownerSendero)).map((x) => x.start)).toEqual([LAST]);
    expect(await listPayrollWeeks(w.ctx, w.ownerCentro)).toEqual([]);
  });

  it("test_s009_rf2_la_semana_empieza_en_lunes", async () => {
    const w = await world();
    expect(await code(payrollWeek(w.ctx, w.ownerSendero, "2026-11-03"))).toBe("invalid_week");
    const v = await payrollWeek(w.ctx, w.ownerSendero, LAST);
    expect([v.start, v.end, v.prev, v.next]).toEqual([LAST, "2026-11-08", "2026-10-26", THIS]);
  });

  it("test_s009_rf4_el_administrador_marca_dias_medias_y_retardos", async () => {
    const w = await world();
    const e = await w.hire("Empleado Uno");
    await w.mark(e.id, 0, "worked", true);
    await w.mark(e.id, 1, "half");
    expect((await w.row(e.id, w.adminSendero)).counts).toEqual({ days: 1, half: 1, late: 1 });
  });

  it("test_s009_rf5_el_administrador_no_recibe_ningun_monto", async () => {
    const w = await world();
    const e = await w.hire("Empleado Uno");
    await w.mark(e.id, 0, "worked");
    const v = await payrollWeek(w.ctx, w.adminSendero, LAST);
    expect(v.totals).toBeUndefined();
    expect(v.groups[0].rows[0].money).toBeUndefined();
    expect(JSON.stringify(v)).not.toMatch(/400/);
    expect((await listPayrollWeeks(w.ctx, w.adminSendero))[0]).not.toHaveProperty("total");
  });

  it("test_s009_rf6_rf7_montos_prestamos_y_cierre_solo_el_dueno", async () => {
    const w = await world();
    const e = await w.hire("Empleado Uno");
    expect(await code(setAmounts(w.ctx, w.adminSendero, LAST, e.id, { extras: "100" }))).toBe("owner_only");
    expect(await code(createLoan(w.ctx, w.adminSendero, e.id, { lentOn: "2026-10-01", amount: "1000", weekly: "300" }))).toBe("owner_only");
    expect(await code(employeeLoans(w.ctx, w.adminSendero, e.id))).toBe("owner_only");
    expect(await code(closeWeek(w.ctx, w.adminSendero, LAST))).toBe("owner_only");
    expect(await code(reopenWeek(w.ctx, w.adminSendero, LAST, "corrección de días"))).toBe("owner_only");
  });

  it("test_s009_rf8_otra_sucursal_no_existe", async () => {
    const w = await world();
    const e = await w.hire("Empleado Uno");
    expect(await code(markDay(w.ctx, w.ownerCentro, LAST, { employeeId: e.id, day: 0, state: "worked" }))).toBe("not_found");
    expect(await code(markDay(w.ctx, w.adminPirrus, LAST, { employeeId: e.id, day: 0, state: "worked" }))).toBe("not_found");
    expect(await code(setAmounts(w.ctx, w.ownerPirrus, LAST, e.id, { extras: "1" }))).toBe("not_found");
  });
});

describe("spec 009 — quién aparece y asistencia", () => {
  it("test_s009_rf9_aparece_quien_estuvo_activo_en_la_semana", async () => {
    const w = await world();
    await w.hire("Activo");
    const old = await w.hire("Baja antes");
    await terminateEmployee(w.ctx, w.ownerSendero, old.id, { leftOn: "2026-10-31", reason: "resignation" });
    const later = await createEmployee(w.ctx, w.ownerSendero, { name: "Entra después", positionId: w.mesero.id, hiredOn: "2026-11-10" });
    const names = (await payrollWeek(w.ctx, w.ownerSendero, LAST)).groups.flatMap((g) => g.rows).map((r) => r.name);
    expect(names).toEqual(["Activo"]);
    expect((await payrollWeek(w.ctx, w.ownerSendero, THIS)).groups.flatMap((g) => g.rows).map((r) => r.employeeId)).toContain(later.id);
  });

  it("test_s009_rf10_no_se_marca_antes_del_ingreso_ni_despues_de_la_baja", async () => {
    const w = await world();
    const e = await createEmployee(w.ctx, w.ownerSendero, { name: "Entra jueves", positionId: w.mesero.id, hiredOn: "2026-11-05", dailyPay: "400" });
    expect(await code(w.mark(e.id, 2, "worked"))).toBe("outside_period");
    expect((await w.row(e.id)).days.map((d) => d.editable)).toEqual([false, false, false, true, true, true, true]);
    await w.mark(e.id, 3, "worked");
    const b = await w.hire("Baja martes");
    await terminateEmployee(w.ctx, w.ownerSendero, b.id, { leftOn: "2026-11-03", reason: "resignation" });
    await w.mark(b.id, 1, "worked");
    expect(await code(w.mark(b.id, 2, "worked"))).toBe("outside_period");
  });

  it("test_s009_rf11_agrupados_por_puesto", async () => {
    const w = await world();
    await w.hire("Mesero Uno");
    await createEmployee(w.ctx, w.ownerSendero, { name: "Cocinera", positionId: w.cocina.id, hiredOn: "2026-10-01" });
    const v = await payrollWeek(w.ctx, w.ownerSendero, LAST);
    expect(v.groups.map((g) => [g.position, g.rows.map((r) => r.name)])).toEqual([
      ["Cocina", ["Cocinera"]],
      ["Mesero", ["Mesero Uno"]],
    ]);
  });

  it("test_s009_rf12_sin_sueldo_se_marca_para_el_dueno", async () => {
    const w = await world();
    const e = await w.hire("Sin sueldo", null);
    expect((await w.row(e.id)).money?.missingPay).toBe(true);
  });

  it("test_s009_rf13_rf15_vacio_trabajado_o_media_y_vaciar_quita_el_retardo", async () => {
    const w = await world();
    const e = await w.hire("Empleado Uno");
    await w.mark(e.id, 0, "worked", true);
    await w.mark(e.id, 1, "half");
    expect((await w.row(e.id)).days.slice(0, 3).map((d) => [d.state, d.late])).toEqual([["worked", true], ["half", false], ["empty", false]]);
    await w.mark(e.id, 0, "empty", true);
    expect((await w.row(e.id)).days[0]).toMatchObject({ state: "empty", late: false });
    expect(await code(markDay(w.ctx, w.adminSendero, LAST, { employeeId: e.id, day: 7, state: "worked" }))).toBe("validation");
    expect(await code(markDay(w.ctx, w.adminSendero, LAST, { employeeId: e.id, day: 0, state: "doble" }))).toBe("validation");
  });

  it("test_s009_rf14_retardo_en_dia_trabajado_o_media", async () => {
    const w = await world();
    const e = await w.hire("Empleado Uno");
    await w.mark(e.id, 0, "half", true);
    expect((await w.row(e.id)).counts.late).toBe(1);
  });

  it("test_s009_rf16_no_se_marcan_dias_futuros", async () => {
    const w = await world();
    const e = await w.hire("Empleado Uno");
    await w.mark(e.id, 2, "worked", false, w.adminSendero, THIS);
    expect(await code(w.mark(e.id, 3, "worked", false, w.adminSendero, THIS))).toBe("future_day");
    expect((await w.row(e.id, w.ownerSendero, THIS)).days.map((d) => d.editable)).toEqual([true, true, true, false, false, false, false]);
  });

  it("test_s009_rf17_conteos_por_empleado", async () => {
    const w = await world();
    const e = await w.hire("Empleado Uno");
    for (const d of [0, 1, 2]) await w.mark(e.id, d, "worked", d === 2);
    await w.mark(e.id, 3, "half");
    expect((await w.row(e.id)).counts).toEqual({ days: 3, half: 1, late: 1 });
  });

  it("test_s009_rf47_semanas_anteriores_se_capturan_mientras_esten_abiertas", async () => {
    const w = await world();
    const e = await w.hire("Empleado Uno");
    await w.mark(e.id, 0, "worked", false, w.adminSendero, "2026-10-26");
    expect((await w.row(e.id, w.ownerSendero, "2026-10-26")).counts.days).toBe(1);
  });
});

describe("spec 009 — montos y préstamos", () => {
  it("test_s009_rf18_rf19_pago_de_dias_y_retardo_de_media_jornada", async () => {
    const w = await world();
    const e = await w.hire("Empleado Uno", "400");
    await w.mark(e.id, 0, "worked", true);
    await w.mark(e.id, 1, "worked");
    await w.mark(e.id, 2, "half");
    const m = (await w.row(e.id)).money!;
    expect([m.days, m.late, m.net]).toEqual(["1000.00", "200.00", "800.00"]);
  });

  it("test_s009_rf20_rf22_extras_bonos_con_concepto_y_comida", async () => {
    const w = await world();
    const e = await w.hire("Empleado Uno", "400");
    for (const d of [0, 1, 2]) await w.mark(e.id, d, "worked");
    await setAmounts(w.ctx, w.ownerSendero, LAST, e.id, { extras: "200", bonus: "550", bonusConcept: "Bono del camarón", meal: "50" });
    const m = (await w.row(e.id)).money!;
    expect([m.extras, m.bonus, m.bonusConcept, m.meal, m.gross, m.deductions, m.net]).toEqual(["200.00", "550.00", "Bono del camarón", "50.00", "1950.00", "50.00", "1900.00"]);
  });

  it("test_s009_rf21_montos_negativos_o_con_mas_de_dos_decimales", async () => {
    const w = await world();
    const e = await w.hire("Empleado Uno");
    expect(await code(setAmounts(w.ctx, w.ownerSendero, LAST, e.id, { extras: "-1" }))).toBe("invalid_amount");
    expect(await code(setAmounts(w.ctx, w.ownerSendero, LAST, e.id, { meal: "1.234" }))).toBe("invalid_amount");
    expect(await code(setAmounts(w.ctx, w.ownerSendero, LAST, e.id, { bonusConcept: "x".repeat(81) }))).toBe("validation");
  });

  it("test_s009_rf24_rf25_cada_cambio_devuelve_neto_y_totales", async () => {
    const w = await world();
    const a = await w.hire("Uno", "400");
    const b = await w.hire("Dos", "500");
    await w.mark(a.id, 0, "worked", true, w.ownerSendero);
    const v = await setAmounts(w.ctx, w.ownerSendero, LAST, b.id, { bonus: "100", meal: "20" });
    expect(v.totals).toEqual({ days: "400.00", extrasBonus: "100.00", late: "200.00", meal: "20.00", loans: "0.00", net: "280.00" });
  });

  it("test_s009_rf26_la_semana_abierta_usa_el_sueldo_vigente", async () => {
    const w = await world();
    const e = await w.hire("Empleado Uno", "400");
    await w.mark(e.id, 0, "worked");
    await setEmployeePay(w.ctx, w.ownerSendero, e.id, "450");
    expect((await w.row(e.id)).money!.days).toBe("450.00");
  });

  it("test_s009_rf27_rf28_prestamo_con_monto_y_abono", async () => {
    const w = await world();
    const e = await w.hire("Empleado Uno");
    expect(await code(createLoan(w.ctx, w.ownerSendero, e.id, { lentOn: "2026-10-01", amount: "0", weekly: "1" }))).toBe("invalid_amount");
    expect(await code(createLoan(w.ctx, w.ownerSendero, e.id, { lentOn: "2026-10-01", amount: "100", weekly: "150" }))).toBe("weekly_over_amount");
    expect(await code(createLoan(w.ctx, w.ownerSendero, e.id, { lentOn: "1/10/2026", amount: "100", weekly: "50" }))).toBe("invalid_date");
    const [loan] = await createLoan(w.ctx, w.ownerSendero, e.id, { lentOn: "2026-10-01", amount: "1,000", weekly: "300" });
    expect(loan).toMatchObject({ amount: "1000.00", weekly: "300.00", balance: "1000.00", settled: false });
  });

  it("test_s009_rf29_rf30_abono_propuesto_y_cambiado_a_cero", async () => {
    const w = await world();
    const e = await w.hire("Empleado Uno", "400");
    for (const d of [0, 1, 2]) await w.mark(e.id, d, "worked");
    const [loan] = await createLoan(w.ctx, w.ownerSendero, e.id, { lentOn: "2026-10-01", amount: "1000", weekly: "300" });
    expect((await w.row(e.id)).money!).toMatchObject({ loans: "300.00", net: "900.00" });
    await setLoanPayment(w.ctx, w.ownerSendero, LAST, loan.id, "0");
    expect((await w.row(e.id)).money!).toMatchObject({ loans: "0.00", net: "1200.00" });
    expect(await code(setLoanPayment(w.ctx, w.adminSendero, LAST, loan.id, "10"))).toBe("owner_only");
  });

  it("test_s009_rf34_prestamos_con_saldo_y_abonos_por_semana", async () => {
    const w = await world();
    const e = await w.hire("Empleado Uno", "400");
    for (const d of [0, 1, 2]) await w.mark(e.id, d, "worked");
    await createLoan(w.ctx, w.ownerSendero, e.id, { lentOn: "2026-10-01", amount: "1000", weekly: "300" });
    await closeWeek(w.ctx, w.ownerSendero, LAST);
    const [loan] = await employeeLoans(w.ctx, w.ownerSendero, e.id);
    expect(loan).toMatchObject({ balance: "700.00", payments: [{ week: LAST, amount: "300.00" }] });
  });
});

describe("spec 009 — cerrar, reabrir e historial", () => {
  it("test_s009_rf31_no_cierra_con_un_abono_mayor_que_el_saldo", async () => {
    const w = await world();
    const e = await w.hire("Empleado Uno", "400");
    for (const d of [0, 1, 2]) await w.mark(e.id, d, "worked");
    const [loan] = await createLoan(w.ctx, w.ownerSendero, e.id, { lentOn: "2026-10-01", amount: "500", weekly: "300" });
    await setLoanPayment(w.ctx, w.ownerSendero, LAST, loan.id, "600");
    expect(await code(closeWeek(w.ctx, w.ownerSendero, LAST))).toBe("close_loan_over");
  });

  it("test_s009_rf32_rf33_cerrar_baja_el_saldo_y_liquida", async () => {
    const w = await world();
    const e = await w.hire("Empleado Uno", "400");
    const weeks = ["2026-10-12", "2026-10-19", "2026-10-26", LAST];
    await createLoan(w.ctx, w.ownerSendero, e.id, { lentOn: "2026-10-01", amount: "1000", weekly: "300" });
    for (const wk of weeks) {
      for (const d of [0, 1]) await w.mark(e.id, d, "worked", false, w.ownerSendero, wk);
      await closeWeek(w.ctx, w.ownerSendero, wk);
    }
    const [loan] = await employeeLoans(w.ctx, w.ownerSendero, e.id);
    expect(loan.payments.map((p) => p.amount)).toEqual(["300.00", "300.00", "300.00", "100.00"]);
    expect(loan).toMatchObject({ balance: "0.00", settled: true });
    expect((await w.row(e.id, w.ownerSendero, THIS)).money!.loanLines).toEqual([]);
  });

  it("test_s009_rf35_rf38_cerrar_congela_y_rechaza_cambios", async () => {
    const w = await world();
    const e = await w.hire("Empleado Uno", "400");
    await w.mark(e.id, 0, "worked");
    await closeWeek(w.ctx, w.ownerSendero, LAST);
    await setEmployeePay(w.ctx, w.ownerSendero, e.id, "900");
    const v = await payrollWeek(w.ctx, w.ownerSendero, LAST);
    expect(v.status).toBe("closed");
    expect(v.groups[0].rows[0].money).toMatchObject({ pay: "400.00", net: "400.00" });
    expect(v.groups[0].rows[0].days.every((d) => !d.editable)).toBe(true);
    expect(await code(w.mark(e.id, 1, "worked"))).toBe("week_closed");
    expect(await code(setAmounts(w.ctx, w.ownerSendero, LAST, e.id, { extras: "1" }))).toBe("week_closed");
    expect(await code(closeWeek(w.ctx, w.ownerSendero, LAST))).toBe("week_closed");
  });

  it("test_s009_rf36_no_cierra_con_neto_negativo", async () => {
    const w = await world();
    const e = await w.hire("Empleado Uno", "400");
    await setAmounts(w.ctx, w.ownerSendero, LAST, e.id, { meal: "50" });
    expect(await code(closeWeek(w.ctx, w.ownerSendero, LAST))).toBe("close_negative");
  });

  it("test_s009_rf37_no_cierra_si_alguien_con_dias_no_tiene_sueldo", async () => {
    const w = await world();
    const e = await w.hire("Sin sueldo", null);
    await w.mark(e.id, 0, "worked");
    expect(await code(closeWeek(w.ctx, w.ownerSendero, LAST))).toBe("close_missing_pay");
  });

  it("test_s009_rf39_rf40_reabrir_con_motivo_devuelve_el_saldo_exacto", async () => {
    const w = await world();
    const e = await w.hire("Empleado Uno", "400");
    for (const d of [0, 1, 2]) await w.mark(e.id, d, "worked");
    await createLoan(w.ctx, w.ownerSendero, e.id, { lentOn: "2026-10-01", amount: "1000", weekly: "300" });
    await closeWeek(w.ctx, w.ownerSendero, LAST);
    expect(await code(reopenWeek(w.ctx, w.ownerSendero, LAST, ""))).toBe("reason_required");
    expect(await code(reopenWeek(w.ctx, w.ownerSendero, THIS, "no está cerrada"))).toBe("week_not_closed");
    const v = await reopenWeek(w.ctx, w.ownerSendero, LAST, "faltó un día");
    expect(v.status).toBe("open");
    expect((await employeeLoans(w.ctx, w.ownerSendero, e.id))[0].balance).toBe("1000.00");
    const [loan] = await employeeLoans(w.ctx, w.ownerSendero, e.id);
    await setLoanPayment(w.ctx, w.ownerSendero, LAST, loan.id, "250");
    await w.mark(e.id, 3, "worked");
    await closeWeek(w.ctx, w.ownerSendero, LAST);
    expect((await employeeLoans(w.ctx, w.ownerSendero, e.id))[0]).toMatchObject({ balance: "750.00", payments: [{ amount: "250.00" }] });
  });

  it("test_s009_rf46_historial_con_estado_y_total_para_el_dueno", async () => {
    const w = await world();
    const e = await w.hire("Empleado Uno", "400");
    await w.mark(e.id, 0, "worked", false, w.adminSendero, "2026-10-26");
    await closeWeek(w.ctx, w.ownerSendero, "2026-10-26");
    await w.mark(e.id, 0, "worked");
    await w.mark(e.id, 1, "worked");
    expect(await listPayrollWeeks(w.ctx, w.ownerSendero)).toEqual([
      { start: LAST, end: "2026-11-08", status: "open", people: 1, total: "800.00" },
      { start: "2026-10-26", end: "2026-11-01", status: "closed", people: 1, total: "400.00" },
    ]);
  });

  it("test_s009_rf48_cada_cambio_queda_en_el_registro", async () => {
    const w = await world();
    const e = await w.hire("Empleado Uno", "400");
    await w.mark(e.id, 0, "worked");
    await setAmounts(w.ctx, w.ownerSendero, LAST, e.id, { extras: "100" });
    await closeWeek(w.ctx, w.ownerSendero, LAST);
    await reopenWeek(w.ctx, w.ownerSendero, LAST, "corrección");
    const week = (await w.ctx.store.payroll.weeks.find(w.sendero.id, LAST))!;
    const actions = (await auditEntriesFor(db, "payroll_week", week.id)).map((a) => a.action).reverse();
    expect(actions).toEqual(["payroll.day", "payroll.amounts", "payroll.closed", "payroll.reopened"]);
    const [loan] = await createLoan(w.ctx, w.ownerSendero, e.id, { lentOn: "2026-10-01", amount: "100", weekly: "50" });
    expect((await auditEntriesFor(db, "loan", loan.id)).map((a) => a.action)).toEqual(["loan.created"]);
  });
});

describe("spec 009 — casos límite", () => {
  it("test_s009_rf9_quien_cambia_de_sucursal_sigue_donde_se_le_marco", async () => {
    const w = await world();
    const e = await w.hire("Se cambia", "400");
    await w.mark(e.id, 0, "worked");
    await moveEmployee(w.ctx, w.ownerSendero, e.id, { branchId: w.centro.id });
    expect((await payrollWeek(w.ctx, w.ownerSendero, LAST)).groups.flatMap((g) => g.rows).map((r) => r.name)).toEqual(["Se cambia"]);
    expect((await payrollWeek(w.ctx, w.ownerCentro, LAST)).groups.flatMap((g) => g.rows).map((r) => r.name)).toEqual(["Se cambia"]);
  });

  it("test_s009_rf35_semana_sin_empleados_se_cierra_en_cero", async () => {
    const w = await world();
    const v = await closeWeek(w.ctx, w.ownerSendero, LAST);
    expect([v.status, v.totals?.net]).toEqual(["closed", "0.00"]);
  });
});
