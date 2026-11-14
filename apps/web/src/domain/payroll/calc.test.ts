import { describe, expect, it } from "vitest";
import { halfDay, lineTotals, weekTotals, type DayMark } from "./calc";

const W: DayMark = { state: "worked", late: false };
const H: DayMark = { state: "half", late: false };
const L: DayMark = { state: "worked", late: true };
const _: DayMark | null = null;

const line = (pay: bigint | null, days: (DayMark | null)[], extra: Partial<{ extras: bigint; bonus: bigint; meal: bigint; loans: bigint }> = {}) =>
  lineTotals({ dailyPayCents: pay, days, extrasCents: extra.extras ?? 0n, bonusCents: extra.bonus ?? 0n, mealCents: extra.meal ?? 0n, loanCents: extra.loans ?? 0n });

describe("spec 009 — cálculo de la nómina", () => {
  it("test_s009_rf13_cada_dia_es_vacio_trabajado_o_media", () => {
    const t = line(40_000n, [W, H, _, _, _, _, _]);
    expect(t.daysCount).toBe(1);
    expect(t.halfCount).toBe(1);
    expect(t.daysCents).toBe(60_000n);
  });

  it("test_s009_rf14_retardo_en_dia_trabajado_o_media", () => {
    const t = line(40_000n, [L, { state: "half", late: true }, _, _, _, _, _]);
    expect(t.lateCount).toBe(2);
  });

  it("test_s009_rf15_un_dia_vacio_no_cuenta_retardo", () => {
    expect(line(40_000n, [_, _, _, _, _, _, _]).lateCount).toBe(0);
  });

  it("test_s009_rf17_conteos_por_empleado", () => {
    const t = line(40_000n, [W, W, H, L, _, _, _]);
    expect([t.daysCount, t.halfCount, t.lateCount]).toEqual([3, 1, 1]);
  });

  it("test_s009_rf18_pago_de_dias_y_medias", () => {
    expect(line(50_000n, [W, W, H, _, _, _, _]).daysCents).toBe(125_000n);
  });

  it("test_s009_rf19_cada_retardo_descuenta_media_jornada", () => {
    const t = line(40_000n, [L, L, W, _, _, _, _]);
    expect(t.lateCents).toBe(40_000n);
    expect(t.netCents).toBe(80_000n);
    expect(line(40_000n, [{ state: "half", late: true }, _, _, _, _, _, _]).netCents).toBe(0n);
  });

  it("test_s009_rf22_neto_con_extras_bonos_comida_y_abonos", () => {
    const t = line(40_000n, [W, W, W, _, _, _, _], { extras: 20_000n, bonus: 55_000n, meal: 5_000n, loans: 30_000n });
    expect(t.grossCents).toBe(195_000n);
    expect(t.deductionsCents).toBe(35_000n);
    expect(t.netCents).toBe(160_000n);
  });

  it("test_s009_rf22_semana_de_la_hoja_de_referencia_da_los_mismos_netos", () => {
    // Renglones tomados de la hoja de nómina de referencia (sin nombres): días, retardos, sueldo, extras, bonos → neto.
    const cases: [number, number, bigint, bigint, bigint, bigint][] = [
      [2, 1, 40_000n, 0n, 0n, 60_000n],
      [3, 2, 40_000n, 0n, 0n, 80_000n],
      [2, 0, 40_000n, 20_000n, 0n, 100_000n],
      [3, 0, 40_000n, 20_000n, 55_000n, 195_000n],
      [4, 0, 50_000n, 90_000n, 0n, 290_000n],
      [6, 0, 50_000n, 0n, 40_000n, 340_000n],
    ];
    let total = 0n;
    for (const [days, lates, pay, extras, bonus, net] of cases) {
      const marks: (DayMark | null)[] = Array.from({ length: 7 }, (_, i) => (i < days ? { state: "worked", late: i < lates } : null));
      const t = line(pay, marks, { extras, bonus });
      expect(t.netCents).toBe(net);
      total += t.netCents;
    }
    expect(total).toBe(1_065_000n);
  });

  it("test_s009_rf23_media_jornada_redondea_el_medio_centavo_hacia_arriba", () => {
    expect(halfDay(33_333n)).toBe(16_667n);
    expect(halfDay(40_000n)).toBe(20_000n);
    expect(line(33_333n, [H, _, _, _, _, _, _]).daysCents).toBe(16_667n);
  });

  it("test_s009_rf25_totales_de_la_semana", () => {
    const a = line(40_000n, [W, L, _, _, _, _, _], { extras: 10_000n, meal: 2_000n });
    const b = line(50_000n, [W, _, _, _, _, _, _], { bonus: 5_000n, loans: 10_000n });
    const t = weekTotals([a, b]);
    expect(t.daysCents).toBe(130_000n);
    expect(t.extrasBonusCents).toBe(15_000n);
    expect(t.lateCents).toBe(20_000n);
    expect(t.mealCents).toBe(2_000n);
    expect(t.loanCents).toBe(10_000n);
    expect(t.netCents).toBe(a.netCents + b.netCents);
  });

  it("test_s009_rf12_sin_sueldo_cuenta_dias_pero_no_pesos", () => {
    const t = line(null, [W, _, _, _, _, _, _]);
    expect(t.daysCount).toBe(1);
    expect(t.daysCents).toBe(0n);
    expect(t.missingPay).toBe(true);
  });
});
