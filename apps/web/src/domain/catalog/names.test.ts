import { describe, expect, it } from "vitest";
import { CATALOG_NAME_MAX, catalogKey, catalogNameProblem } from "./names";

describe("spec 003 — nombres del catálogo", () => {
  it("test_s003_rf31_los_nombres_se_comparan_sin_mayusculas_acentos_ni_espacios_exteriores", () => {
    expect(catalogKey("Azúcar")).toBe(catalogKey("  azucar "));
    expect(catalogKey("Aceite  de  oliva")).toBe("aceite de oliva");
    expect(catalogKey("Piña")).toBe(catalogKey("pina"));
    expect(catalogKey("Arroz")).not.toBe(catalogKey("Arroz rojo"));
  });

  it("test_s003_rf32_un_nombre_vacio_o_de_mas_de_80_caracteres_se_rechaza", () => {
    expect(CATALOG_NAME_MAX).toBe(80);
    expect(catalogNameProblem("   ")).toBe("empty");
    expect(catalogNameProblem("a".repeat(80))).toBeNull();
    expect(catalogNameProblem("a".repeat(81))).toBe("too_long");
  });
});
