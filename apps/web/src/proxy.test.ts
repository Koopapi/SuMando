// Spec 001, RF-4 y RF-12: el proxy manda a entrar sin sesión y a cambiar la contraseña temporal.
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

const req = (path: string, cookie?: string) => new NextRequest(`http://localhost:3500${path}`, { headers: cookie ? { cookie } : {} });
const location = (res: Response) => new URL(res.headers.get("location")!).pathname;

describe("spec 001 — proxy", () => {
  it("test_s001_rf4_sin_cookie_de_sesion_una_pagina_privada_redirige_a_entrar", () => {
    const res = proxy(req("/negocios"));
    expect(res.status).toBe(307);
    expect(location(res)).toBe("/login");
    expect(proxy(req("/login")).status).toBe(200);
    expect(proxy(req("/setup")).status).toBe(200);
    expect(proxy(req("/api/auth/login")).status).toBe(200);
  });

  it("test_s001_rf12_con_la_marca_de_contrasena_temporal_todo_redirige_a_cambiarla", () => {
    const cookie = "mando_session=tok; mando_pwchange=1";
    expect(location(proxy(req("/", cookie)))).toBe("/cambiar-contrasena");
    expect(location(proxy(req("/negocios", cookie)))).toBe("/cambiar-contrasena");
    expect(proxy(req("/cambiar-contrasena", cookie)).status).toBe(200);
  });

  it("test_s001_rf4_con_sesion_entrar_y_primer_arranque_mandan_al_inicio", () => {
    expect(location(proxy(req("/login", "mando_session=tok")))).toBe("/");
    expect(location(proxy(req("/setup", "mando_session=tok")))).toBe("/");
    expect(proxy(req("/negocios", "mando_session=tok")).status).toBe(200);
  });
});
