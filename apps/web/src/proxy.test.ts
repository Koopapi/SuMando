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

  it("test_s001_rf4_con_cookie_de_sesion_el_proxy_deja_pasar_y_la_pagina_decide", () => {
    // Una cookie revocada o caducada no debe producir un bucle: /login se deja pasar y la página comprueba la sesión.
    expect(proxy(req("/login", "mando_session=tok")).status).toBe(200);
    expect(proxy(req("/setup", "mando_session=tok")).status).toBe(200);
    expect(proxy(req("/negocios", "mando_session=tok")).status).toBe(200);
  });

  it("test_s002_rf41_las_pantallas_tipo_del_catalogo_no_piden_sesion", () => {
    // Fuera de DEV_ENDPOINTS=1 la propia página responde 404 (RF-42); el proxy no decide eso.
    for (const path of ["/sistema", "/sistema/tabla", "/sistema/captura", "/sistema/asistente"]) expect(proxy(req(path)).status).toBe(200);
    expect(location(proxy(req("/sistemas")))).toBe("/login");
  });
});
