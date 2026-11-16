import { describe, expect, it } from "vitest";
import { cutHasDifference, unclosedWeeks } from "./alerts";

describe("spec 012 — alertas", () => {
  it("test_s012_rf43_semanas_terminadas_sin_cerrar_desde_la_primera_captura", () => {
    // Hoy miércoles 11; la última semana terminada empezó el lunes 2.
    const weeks = unclosedWeeks({ today: "2026-11-11", firstMonday: "2026-10-19", closed: new Set(["2026-10-26"]), staffed: () => true });
    expect(weeks).toEqual(["2026-10-19", "2026-11-02"]);
  });

  it("test_s012_rf43_sin_captura_no_hay_alerta_y_la_semana_en_curso_no_cuenta", () => {
    expect(unclosedWeeks({ today: "2026-11-11", firstMonday: null, closed: new Set(), staffed: () => true })).toEqual([]);
    expect(unclosedWeeks({ today: "2026-11-11", firstMonday: "2026-11-09", closed: new Set(), staffed: () => true })).toEqual([]);
    // El domingo la semana aún no termina; el lunes siguiente sí.
    expect(unclosedWeeks({ today: "2026-11-08", firstMonday: "2026-11-02", closed: new Set(), staffed: () => true })).toEqual([]);
    expect(unclosedWeeks({ today: "2026-11-09", firstMonday: "2026-11-02", closed: new Set(), staffed: () => true })).toEqual(["2026-11-02"]);
  });

  it("test_s012_rf43_solo_semanas_con_personal_con_sueldo", () => {
    expect(unclosedWeeks({ today: "2026-11-11", firstMonday: "2026-10-26", closed: new Set(), staffed: (m) => m === "2026-11-02" })).toEqual(["2026-11-02"]);
  });

  it("test_s012_rf44_cualquier_diferencia_aunque_sea_de_un_peso", () => {
    expect(cutHasDifference([0n, 0n])).toBe(false);
    expect(cutHasDifference([100n, -100n])).toBe(true);
    expect(cutHasDifference([0n, 1n])).toBe(true);
  });
});
