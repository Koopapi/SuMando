import { describe, expect, it } from "vitest";
import { addMonths, docStatus, isDate, requiredSummary, todayInMexico } from "./documents";

describe("spec 008 — documentos del expediente", () => {
  it("test_s008_rf21_sin_archivos_falta_con_archivos_entregado", () => {
    expect(docStatus(null, [], "2026-11-13")).toBe("missing");
    expect(docStatus(null, [{ issuedOn: null }], "2026-11-13")).toBe("delivered");
  });

  it("test_s008_rf22_vence_cuando_expedicion_mas_vigencia_es_anterior_a_hoy", () => {
    expect(docStatus(3, [{ issuedOn: "2026-08-13" }], "2026-11-13")).toBe("delivered");
    expect(docStatus(3, [{ issuedOn: "2026-08-12" }], "2026-11-13")).toBe("expired");
    expect(docStatus(3, [{ issuedOn: "2026-07-01" }, { issuedOn: "2026-10-01" }], "2026-11-13")).toBe("delivered");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2026-11-13", 12)).toBe("2027-11-13");
  });

  it("test_s008_rf23_resumen_de_obligatorios_entregados_y_vigentes", () => {
    expect(requiredSummary([{ required: true, status: "delivered" }, { required: true, status: "expired" }, { required: false, status: "missing" }, { required: true, status: "missing" }])).toEqual({ ok: 1, total: 3 });
  });

  it("test_s008_rf9_las_fechas_son_de_calendario", () => {
    expect(isDate("2026-02-29")).toBe(false);
    expect(isDate("2024-02-29")).toBe(true);
    expect(isDate("13/11/2026")).toBe(false);
    expect(todayInMexico(new Date("2026-11-14T03:00:00Z"))).toBe("2026-11-13");
  });
});
