import { describe, expect, it } from "vitest";
import { PASSWORD_MIN, passwordProblem } from "./password-policy";

describe("spec 001 — política de contraseñas", () => {
  it("test_s001_rf10_la_contrasena_de_menos_de_8_caracteres_se_rechaza", () => {
    expect(PASSWORD_MIN).toBe(8);
    expect(passwordProblem("1234567")).toBe("too_short");
    expect(passwordProblem("12345678")).toBeNull();
    expect(passwordProblem("")).toBe("too_short");
  });
});
