// Spec 001, RF-4 a RF-9: entrar, salir y sesiones.
import { describe, expect, it } from "vitest";
import { authenticate, login, logout } from "@/server/services/auth";
import { createFirstOwner } from "@/server/services/setup";
import { makeCtx, OWNER } from "./helpers";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

describe("spec 001 — entrada y sesiones", () => {
  it("test_s001_rf4_rf9_entra_con_correo_y_contrasena_correctos_aunque_el_correo_lleve_mayusculas", async () => {
    const ctx = makeCtx();
    await createFirstOwner(ctx, OWNER);
    const result = await login(ctx, { email: "  DUENO@mando.test ", password: OWNER.password }, { userAgent: "test" });
    expect(result.token).toBeTruthy();
    const auth = await authenticate(ctx, result.token);
    expect(auth?.user.email).toBe("dueno@mando.test");
    expect(auth?.sessionId).toBe(result.sessionId);
  });

  it("test_s001_rf5_correo_inexistente_contrasena_mala_y_cuenta_inactiva_dan_el_mismo_error", async () => {
    const ctx = makeCtx();
    const owner = await createFirstOwner(ctx, OWNER);
    const errors = [] as { code: string; message: string }[];
    for (const attempt of [{ email: "nadie@mando.test", password: OWNER.password }, { email: OWNER.email, password: "equivocada-123" }]) {
      await login(ctx, attempt).catch((e) => errors.push({ code: e.code, message: e.message }));
    }
    await ctx.store.users.update(owner.user.id, { isActive: false, updatedAt: ctx.clock.now() });
    await login(ctx, { email: OWNER.email, password: OWNER.password }).catch((e) => errors.push({ code: e.code, message: e.message }));
    expect(errors).toHaveLength(3);
    expect(new Set(errors.map((e) => e.code))).toEqual(new Set(["invalid_credentials"]));
    expect(new Set(errors.map((e) => e.message)).size).toBe(1);
  });

  it("test_s001_rf6_cinco_fallos_bloquean_15_minutos_aunque_la_sexta_sea_correcta", async () => {
    const ctx = makeCtx();
    await createFirstOwner(ctx, OWNER);
    for (let i = 0; i < 5; i++) await expect(login(ctx, { email: OWNER.email, password: "mala-mala-1" })).rejects.toMatchObject({ code: "invalid_credentials" });
    await expect(login(ctx, { email: OWNER.email, password: OWNER.password })).rejects.toMatchObject({ code: "account_locked", status: 423, params: { minutes: 15 } });
    ctx.clock.advanceMinutes(14);
    await expect(login(ctx, { email: OWNER.email, password: OWNER.password })).rejects.toMatchObject({ code: "account_locked", params: { minutes: 1 } });
    ctx.clock.advanceMinutes(1);
    const result = await login(ctx, { email: OWNER.email, password: OWNER.password });
    expect(result.token).toBeTruthy();
    const user = await ctx.store.users.findByEmail(OWNER.email);
    expect(user).toMatchObject({ failedLoginAttempts: 0, lockedUntil: null });
  });

  it("test_s001_rf7_la_sesion_caduca_a_los_30_dias_sin_uso_y_se_desliza_con_uso", async () => {
    const ctx = makeCtx();
    const { token } = await createFirstOwner(ctx, OWNER);
    ctx.clock.advance(29 * DAY);
    expect(await authenticate(ctx, token)).not.toBeNull();
    ctx.clock.advance(29 * DAY);
    expect(await authenticate(ctx, token)).not.toBeNull();
    ctx.clock.advance(30 * DAY);
    expect(await authenticate(ctx, token)).toBeNull();
  });

  it("test_s001_rf7_una_sesion_sin_uso_muere_a_los_30_dias_exactos", async () => {
    const ctx = makeCtx();
    const { token } = await createFirstOwner(ctx, OWNER);
    ctx.clock.advance(30 * DAY);
    expect(await authenticate(ctx, token)).toBeNull();
  });

  it("test_s001_rf8_cerrar_sesion_solo_termina_la_de_ese_dispositivo", async () => {
    const ctx = makeCtx();
    await createFirstOwner(ctx, OWNER);
    const a = await login(ctx, { email: OWNER.email, password: OWNER.password });
    const b = await login(ctx, { email: OWNER.email, password: OWNER.password });
    await logout(ctx, a.sessionId);
    expect(await authenticate(ctx, a.token)).toBeNull();
    expect(await authenticate(ctx, b.token)).not.toBeNull();
  });

  it("test_s001_rf5_un_token_inventado_no_abre_sesion", async () => {
    const ctx = makeCtx();
    await createFirstOwner(ctx, OWNER);
    expect(await authenticate(ctx, "tok-inventado")).toBeNull();
  });
});
