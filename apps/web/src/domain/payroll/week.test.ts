import { describe, expect, it } from "vitest";
import { dayIsFuture, dayWithinPeriods, isMonday, weekDates, weekOf, weekOverlapsPeriods } from "./week";

describe("spec 009 — semana de nómina", () => {
  it("test_s009_rf2_la_semana_va_de_lunes_a_domingo", () => {
    expect(weekOf("2026-11-13")).toBe("2026-11-09");
    expect(weekOf("2026-11-09")).toBe("2026-11-09");
    expect(weekOf("2026-11-15")).toBe("2026-11-09");
    expect(weekOf("2026-11-16")).toBe("2026-11-16");
    expect(weekOf("2027-01-01")).toBe("2026-12-28");
    expect(weekDates("2026-11-09")).toEqual(["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"]);
    expect(isMonday("2026-11-09")).toBe(true);
    expect(isMonday("2026-11-10")).toBe(false);
    expect(isMonday("2026-02-30")).toBe(false);
  });

  it("test_s009_rf9_entra_quien_estuvo_activo_algun_dia", () => {
    const week = "2026-11-09";
    expect(weekOverlapsPeriods(week, [{ hiredOn: "2026-11-12", leftOn: null }])).toBe(true);
    expect(weekOverlapsPeriods(week, [{ hiredOn: "2026-01-01", leftOn: "2026-11-09" }])).toBe(true);
    expect(weekOverlapsPeriods(week, [{ hiredOn: "2026-01-01", leftOn: "2026-11-08" }])).toBe(false);
    expect(weekOverlapsPeriods(week, [{ hiredOn: "2026-11-16", leftOn: null }])).toBe(false);
  });

  it("test_s009_rf10_no_se_marca_fuera_del_periodo", () => {
    const periods = [
      { hiredOn: "2026-01-01", leftOn: "2026-11-10" },
      { hiredOn: "2026-11-13", leftOn: null },
    ];
    expect(dayWithinPeriods("2026-11-10", periods)).toBe(true);
    expect(dayWithinPeriods("2026-11-11", periods)).toBe(false);
    expect(dayWithinPeriods("2026-11-13", periods)).toBe(true);
  });

  it("test_s009_rf16_no_se_marcan_dias_futuros", () => {
    expect(dayIsFuture("2026-11-14", "2026-11-13")).toBe(true);
    expect(dayIsFuture("2026-11-13", "2026-11-13")).toBe(false);
  });
});
