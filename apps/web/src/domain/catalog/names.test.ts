import { describe, expect, it } from "vitest";
import { CATALOG_NAME_MAX, catalogKey, catalogNameProblem, nameMatches } from "./names";

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

describe("spec 015 — parecidos de nombre", () => {
  const existing = ["Coca-Cola 355 ml", "Queso manchego", "Agua mineral"];

  it("test_s015_rf44_mismo_nombre_sin_acentos_mayusculas_ni_espacios_sobrantes_es_el_mismo", () => {
    expect(nameMatches("  QUESO   Manchégo ", existing)).toEqual({ same: "Queso manchego", similar: [] });
  });

  it("test_s015_rf44_sin_espacios_entre_palabras_es_parecido", () => {
    expect(nameMatches("Aguamineral", existing)).toEqual({ same: null, similar: ["Agua mineral"] });
    expect(nameMatches("queso man chego", existing)).toEqual({ same: null, similar: ["Queso manchego"] });
  });

  it("test_s015_rf44_un_nombre_distinto_no_se_parece", () => {
    expect(nameMatches("Queso panela", existing)).toEqual({ same: null, similar: [] });
    expect(nameMatches("   ", existing)).toEqual({ same: null, similar: [] });
  });
});
