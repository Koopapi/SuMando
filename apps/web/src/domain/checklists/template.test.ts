import { describe, expect, it } from "vitest";
import { todayInMexico } from "../personnel/documents";
import { appliesOn, canBeKey, daysToMask, isItemKind, maskToDays, validDays, weekdayOf } from "./template";

describe("spec 010 — plantillas", () => {
  it("test_s010_rf6_dias_de_la_semana_como_mascara", () => {
    expect(daysToMask([4, 5, 6])).toBe(0b1110000);
    expect(maskToDays(0b1110000)).toEqual([4, 5, 6]);
  });

  it("test_s010_rf7_al_menos_un_dia_valido", () => {
    expect(validDays([])).toBeNull();
    expect(validDays([7])).toBeNull();
    expect(validDays("lunes")).toBeNull();
    expect(validDays([6, 0, 6])).toEqual([0, 6]);
  });

  it("test_s010_rf10_rf11_tipos_de_punto_y_cuales_pueden_ser_clave", () => {
    expect(["check", "photo", "comment"].every(isItemKind)).toBe(true);
    expect(isItemKind("numero")).toBe(false);
    expect(canBeKey("check")).toBe(true);
    expect(canBeKey("photo")).toBe(true);
    expect(canBeKey("comment")).toBe(false);
  });

  it("test_s010_rf16_aplica_por_sucursal_y_dia", () => {
    const t = { daysMask: daysToMask([4, 5, 6]), branchIds: ["b1"] };
    expect(weekdayOf("2026-11-13")).toBe(4);
    expect(appliesOn(t, "b1", "2026-11-13")).toBe(true);
    expect(appliesOn(t, "b1", "2026-11-12")).toBe(false);
    expect(appliesOn(t, "b2", "2026-11-13")).toBe(false);
  });

  it("test_s010_rf18_la_fecha_es_la_de_la_ciudad_de_mexico", () => {
    expect(todayInMexico(new Date("2026-11-14T05:30:00Z"))).toBe("2026-11-13");
    expect(todayInMexico(new Date("2026-11-14T06:30:00Z"))).toBe("2026-11-14");
  });
});
