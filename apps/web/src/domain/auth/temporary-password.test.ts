import { describe, expect, it } from "vitest";
import { TEMP_ALPHABET, TEMP_LENGTH, generateTemporaryPassword } from "./temporary-password";

describe("spec 001 — contraseña temporal", () => {
  it("test_s001_rf11_la_temporal_tiene_10_caracteres_sin_ambiguos", () => {
    expect(TEMP_LENGTH).toBe(10);
    for (const c of "0O1lI") expect(TEMP_ALPHABET).not.toContain(c);
    let i = 0;
    const p = generateTemporaryPassword((max) => i++ % max);
    expect(p).toHaveLength(10);
    expect(p).toBe(TEMP_ALPHABET.slice(0, 10));
    expect([...p].every((c) => TEMP_ALPHABET.includes(c))).toBe(true);
  });
});
