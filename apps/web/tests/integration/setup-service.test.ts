// Spec 001, RF-1 a RF-3: primer arranque.
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { auditEntriesFor } from "@/server/adapters/drizzle/store";
import { isAppError } from "@/server/errors";
import { authenticate } from "@/server/services/auth";
import { createFirstOwner, isSetupNeeded } from "@/server/services/setup";
import { makeCtx, OWNER } from "./helpers";

describe("spec 001 — primer arranque", () => {
  it("test_s001_rf1_sin_cuentas_hace_falta_el_primer_arranque_y_despues_ya_no", async () => {
    const ctx = makeCtx();
    expect(await isSetupNeeded(ctx)).toBe(true);
    await createFirstOwner(ctx, OWNER);
    expect(await isSetupNeeded(ctx)).toBe(false);
  });

  it("test_s001_rf2_crea_al_dueno_con_hash_y_rol_dueno_e_inicia_su_sesion", async () => {
    const ctx = makeCtx();
    const result = await createFirstOwner(ctx, { ...OWNER, email: " Dueno@Mando.TEST " });
    expect(result.user.role).toBe("owner");
    expect(result.user.email).toBe("dueno@mando.test");
    expect(result.user.mustChangePassword).toBe(false);
    const stored = await ctx.store.users.findByEmail("dueno@mando.test");
    expect(stored?.passwordHash).not.toBe(OWNER.password);
    expect(await ctx.ports.hasher.verify(stored!.passwordHash, OWNER.password)).toBe(true);
    const auth = await authenticate(ctx, result.token);
    expect(auth?.user.id).toBe(result.user.id);
    const audit = await auditEntriesFor(db, "user", result.user.id);
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ actorId: result.user.id, action: "user.created", before: null });
    expect(JSON.stringify(audit[0].after)).not.toContain("passwordHash");
  });

  it("test_s001_rf3_con_una_cuenta_existente_rechaza_crear_otra", async () => {
    const ctx = makeCtx();
    await createFirstOwner(ctx, OWNER);
    await expect(createFirstOwner(ctx, { ...OWNER, email: "otro@mando.test" })).rejects.toMatchObject({ code: "setup_done", status: 409 });
    expect(await ctx.store.users.count()).toBe(1);
  });

  it("test_s001_rf3_dos_peticiones_simultaneas_solo_crean_un_dueno", async () => {
    const ctx = makeCtx();
    const results = await Promise.allSettled([createFirstOwner(ctx, OWNER), createFirstOwner(ctx, { ...OWNER, email: "otro@mando.test" })]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(isAppError(rejected.reason) && rejected.reason.code).toBe("setup_done");
    expect(await ctx.store.users.count()).toBe(1);
  });

  it("test_s001_rf10_rf20_rechaza_contrasena_corta_nombre_vacio_y_correo_invalido", async () => {
    const ctx = makeCtx();
    await expect(createFirstOwner(ctx, { ...OWNER, password: "corta" })).rejects.toMatchObject({ code: "password_too_short", params: { min: 8 } });
    await expect(createFirstOwner(ctx, { ...OWNER, name: "   " })).rejects.toMatchObject({ code: "name_invalid", params: { max: 60 } });
    await expect(createFirstOwner(ctx, { ...OWNER, email: "sin-arroba" })).rejects.toMatchObject({ code: "validation" });
    expect(await isSetupNeeded(ctx)).toBe(true);
  });
});
