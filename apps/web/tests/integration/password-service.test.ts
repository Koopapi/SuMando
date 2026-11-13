// Spec 001, RF-11, RF-13 a RF-16: cambio y restablecimiento de contraseña.
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { auditEntriesFor } from "@/server/adapters/drizzle/store";
import { authenticate, changePassword, issueTemporaryPassword, login } from "@/server/services/auth";
import { createFirstOwner } from "@/server/services/setup";
import { makeCtx, OWNER } from "./helpers";

describe("spec 001 — contraseñas", () => {
  it("test_s001_rf13_rf15_cambia_la_contrasena_con_la_actual_y_la_nueva_vale_para_entrar", async () => {
    const ctx = makeCtx();
    const owner = await createFirstOwner(ctx, OWNER);
    await changePassword(ctx, owner.user.id, { currentPassword: OWNER.password, newPassword: "nueva-clave-456" });
    await expect(login(ctx, { email: OWNER.email, password: OWNER.password })).rejects.toMatchObject({ code: "invalid_credentials" });
    const result = await login(ctx, { email: OWNER.email, password: "nueva-clave-456" });
    expect(result.user.mustChangePassword).toBe(false);
    expect((await auditEntriesFor(db, "user", owner.user.id)).map((e) => e.action)).toContain("user.password_changed");
  });

  it("test_s001_rf16_rf10_rechaza_la_actual_equivocada_y_la_nueva_corta_sin_cambiar_nada", async () => {
    const ctx = makeCtx();
    const owner = await createFirstOwner(ctx, OWNER);
    await expect(changePassword(ctx, owner.user.id, { currentPassword: "otra-cosa-123", newPassword: "nueva-clave-456" })).rejects.toMatchObject({ code: "password_mismatch", status: 422 });
    await expect(changePassword(ctx, owner.user.id, { currentPassword: OWNER.password, newPassword: "corta" })).rejects.toMatchObject({ code: "password_too_short" });
    expect((await login(ctx, { email: OWNER.email, password: OWNER.password })).token).toBeTruthy();
  });

  it("test_s001_rf11_rf14_la_temporal_tiene_10_caracteres_cierra_las_sesiones_y_exige_cambio", async () => {
    const ctx = makeCtx();
    const owner = await createFirstOwner(ctx, OWNER);
    const other = await login(ctx, { email: OWNER.email, password: OWNER.password });
    const user = (await ctx.store.users.findById(owner.user.id))!;
    const temporary = await issueTemporaryPassword(ctx.store, ctx.ports, user, owner.user.id, "user.password_reset");
    expect(temporary).toHaveLength(10);
    expect(temporary).toMatch(/^[A-HJ-NP-Za-km-z2-9]+$/);
    const stored = await ctx.store.users.findById(owner.user.id);
    expect(stored?.passwordHash).not.toContain(temporary);
    expect(stored?.mustChangePassword).toBe(true);
    expect(await authenticate(ctx, owner.token)).toBeNull();
    expect(await authenticate(ctx, other.token)).toBeNull();
    const back = await login(ctx, { email: OWNER.email, password: temporary });
    expect(back.user.mustChangePassword).toBe(true);
    await changePassword(ctx, owner.user.id, { currentPassword: temporary, newPassword: "definitiva-789" });
    expect((await login(ctx, { email: OWNER.email, password: "definitiva-789" })).user.mustChangePassword).toBe(false);
  });
});
