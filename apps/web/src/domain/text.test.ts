import { describe, expect, it } from "vitest";
import { NAME_MAX, isValidEmail, nameKey, nameProblem, normalizeEmail, normalizeName } from "./text";

describe("spec 001 — texto", () => {
  it("test_s001_rf9_el_correo_se_normaliza_a_minusculas_sin_espacios_exteriores", () => {
    expect(normalizeEmail("  Dueno@Mando.MX ")).toBe("dueno@mando.mx");
    expect(isValidEmail("dueno@mando.mx")).toBe(true);
    expect(isValidEmail("sin-arroba")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
  });

  it("test_s001_rf19_la_clave_de_nombre_ignora_mayusculas_y_espacios", () => {
    expect(nameKey("  Pastatti   Sendero ")).toBe("pastatti sendero");
    expect(nameKey("PASTATTI SENDERO")).toBe(nameKey("pastatti sendero"));
    expect(normalizeName("  Pastatti   Sendero ")).toBe("Pastatti Sendero");
  });

  it("test_s001_rf20_el_nombre_vacio_o_de_mas_de_60_caracteres_se_rechaza", () => {
    expect(nameProblem("")).toBe("empty");
    expect(nameProblem("   ")).toBe("empty");
    expect(nameProblem("a".repeat(NAME_MAX))).toBeNull();
    expect(nameProblem("a".repeat(NAME_MAX + 1))).toBe("too_long");
  });
});
