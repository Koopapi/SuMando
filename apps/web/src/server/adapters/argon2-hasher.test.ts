import { describe, expect, it } from "vitest";
import { argon2Hasher } from "./argon2-hasher";

describe("spec 001 — hash de contraseñas", () => {
  it("test_s001_nf_seguridad_argon2_no_guarda_la_contrasena_y_verifica_bien", async () => {
    const digest = await argon2Hasher.hash("secreta-123");
    expect(digest.startsWith("$argon2id$")).toBe(true);
    expect(digest).not.toContain("secreta-123");
    expect(await argon2Hasher.verify(digest, "secreta-123")).toBe(true);
    expect(await argon2Hasher.verify(digest, "secreta-124")).toBe(false);
    expect(await argon2Hasher.verify("no-es-un-hash", "secreta-123")).toBe(false);
  });
});
