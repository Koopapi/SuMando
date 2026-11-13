// Spec 001: handlers de primer arranque, entrada, salida y contraseña con el contexto real (Argon2id, reloj con desfase).
import { afterEach, describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { POST as password } from "@/app/api/auth/password/route";
import { GET as me } from "@/app/api/me/route";
import { GET as setupGet, POST as setupPost } from "@/app/api/setup/route";
import { appCtx } from "@/server/app-context";
import { setClockOffset } from "@/server/clock";
import { issueTemporaryPassword } from "@/server/services/auth";
import { ApiClient, json } from "./api";
import { OWNER } from "./helpers";

async function createOwner(client = new ApiClient()) {
  const res = await client.call(setupPost, "/api/setup", { body: OWNER });
  expect(res.status).toBe(201);
  return { client, user: (await json(res)).user as { id: string; email: string } };
}

describe("spec 001 — API de acceso", () => {
  afterEach(() => setClockOffset(0));

  it("test_s001_rf1_rf2_el_primer_arranque_crea_al_dueno_y_deja_la_cookie_de_sesion", async () => {
    const client = new ApiClient();
    expect(await json(await client.call(setupGet, "/api/setup"))).toEqual({ needed: true });
    const res = await client.call(setupPost, "/api/setup", { body: OWNER });
    expect(res.status).toBe(201);
    const cookie = res.headers.getSetCookie().find((c) => c.startsWith("mando_session="))!;
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(client.cookies.mando_session).toBeTruthy();
    expect(client.cookies.mando_pwchange).toBeUndefined();
    const who = await client.call(me, "/api/me");
    expect(who.status).toBe(200);
    expect((await json(who)).user.email).toBe(OWNER.email);
    expect(await json(await client.call(setupGet, "/api/setup"))).toEqual({ needed: false });
  });

  it("test_s001_rf3_el_segundo_primer_arranque_responde_409_aunque_llegue_directo", async () => {
    await createOwner();
    const res = await new ApiClient().call(setupPost, "/api/setup", { body: { ...OWNER, email: "otro@mando.test" } });
    expect(res.status).toBe(409);
    expect((await json(res)).error.code).toBe("setup_done");
  });

  it("test_s001_rf4_rf5_entrar_bien_da_sesion_y_entrar_mal_un_401_sin_detalles", async () => {
    await createOwner();
    const client = new ApiClient();
    const bad = await client.call(login, "/api/auth/login", { body: { email: OWNER.email, password: "nope-nope-1" } });
    expect(bad.status).toBe(401);
    expect(await json(bad)).toEqual({ error: { code: "invalid_credentials", message: "Correo o contraseña incorrectos." } });
    expect(client.cookies.mando_session).toBeUndefined();
    const ok = await client.call(login, "/api/auth/login", { body: { email: OWNER.email, password: OWNER.password } });
    expect(ok.status).toBe(200);
    expect((await json(ok)).next).toBe("/");
    expect((await client.call(me, "/api/me")).status).toBe(200);
  });

  it("test_s001_rf6_cinco_fallos_responden_423_con_los_minutos_y_el_reloj_de_pruebas_desbloquea", async () => {
    await createOwner();
    const client = new ApiClient();
    for (let i = 0; i < 5; i++) await client.call(login, "/api/auth/login", { body: { email: OWNER.email, password: "nope-nope-1" } });
    const locked = await client.call(login, "/api/auth/login", { body: { email: OWNER.email, password: OWNER.password } });
    expect(locked.status).toBe(423);
    expect((await json(locked)).error).toMatchObject({ code: "account_locked", params: { minutes: 15 } });
    setClockOffset(15 * 60_000);
    expect((await client.call(login, "/api/auth/login", { body: { email: OWNER.email, password: OWNER.password } })).status).toBe(200);
  });

  it("test_s001_rf8_cerrar_sesion_borra_la_cookie_y_la_sesion_deja_de_valer", async () => {
    const { client } = await createOwner();
    const token = client.cookies.mando_session;
    const res = await client.call(logout, "/api/auth/logout", { method: "POST" });
    expect(res.status).toBe(204);
    expect(client.cookies.mando_session).toBeUndefined();
    const stale = new ApiClient();
    stale.cookies.mando_session = token;
    expect((await stale.call(me, "/api/me")).status).toBe(401);
  });

  it("test_s001_rf12_rf13_con_temporal_solo_se_puede_cambiar_la_contrasena_y_despues_todo_vuelve", async () => {
    const { user } = await createOwner();
    const ctx = appCtx();
    const stored = (await ctx.store.users.findById(user.id))!;
    const temporary = await issueTemporaryPassword(ctx.store, ctx.ports, stored, user.id, "user.password_reset");
    const client = new ApiClient();
    const res = await client.call(login, "/api/auth/login", { body: { email: OWNER.email, password: temporary } });
    expect((await json(res)).next).toBe("/cambiar-contrasena");
    expect(client.cookies.mando_pwchange).toBe("1");
    const blocked = await client.call(me, "/api/me");
    expect(blocked.status).toBe(403);
    expect((await json(blocked)).error.code).toBe("password_change_required");
    const wrong = await client.call(password, "/api/auth/password", { body: { currentPassword: "otra-otra-1", newPassword: "definitiva-789" } });
    expect(wrong.status).toBe(422);
    expect((await json(wrong)).error.code).toBe("password_mismatch");
    const changed = await client.call(password, "/api/auth/password", { body: { currentPassword: temporary, newPassword: "definitiva-789" } });
    expect(changed.status).toBe(204);
    expect(client.cookies.mando_pwchange).toBeUndefined();
    expect((await client.call(me, "/api/me")).status).toBe(200);
  });

  it("test_s001_rf10_un_cuerpo_invalido_o_una_contrasena_corta_responden_422", async () => {
    const { client } = await createOwner();
    const invalid = await client.call(password, "/api/auth/password", { body: { newPassword: 1 } });
    expect(invalid.status).toBe(422);
    expect((await json(invalid)).error.code).toBe("validation");
    const short = await client.call(password, "/api/auth/password", { body: { currentPassword: OWNER.password, newPassword: "corta" } });
    expect(short.status).toBe(422);
    expect((await json(short)).error).toMatchObject({ code: "password_too_short", params: { min: 8 } });
  });
});
