import { describe, expect, it } from "vitest";
import { DEFAULT_DOCUMENTS } from "./defaults";

describe("spec 008 — lista inicial de documentos", () => {
  it("test_s008_rf16_trece_documentos_con_vigencia_de_domicilio_y_constancia", () => {
    expect(DEFAULT_DOCUMENTS).toHaveLength(13);
    expect(DEFAULT_DOCUMENTS.filter((d) => d.validityMonths !== null)).toEqual([
      { name: "Comprobante de domicilio", validityMonths: 3 },
      { name: "Constancia de situación fiscal", validityMonths: 12 },
    ]);
  });
});
