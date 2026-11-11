// Reloj de pruebas y guardia de las rutas de desarrollo (plan 001, sección 3 y T6).
import { afterEach, describe, expect, it } from "vitest";
import { DELETE, POST } from "@/app/api/dev/clock/route";
import { now, setClockOffset } from "@/server/clock";

const post = (body: unknown) => POST(new Request("http://test/api/dev/clock", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));

describe("spec 001 — rutas de desarrollo", () => {
  afterEach(() => {
    setClockOffset(0);
    process.env.DEV_ENDPOINTS = "1";
  });

  it("test_s001_rutas_dev_adelantan_el_reloj_y_lo_reinician", async () => {
    const res = await post({ advanceHours: 2, advanceMinutes: 30 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ offsetMs: 2.5 * 3_600_000 });
    expect(now().getTime() - Date.now()).toBeGreaterThanOrEqual(2.5 * 3_600_000 - 50);
    const reset = await DELETE();
    expect(reset.status).toBe(204);
    expect(Math.abs(now().getTime() - Date.now())).toBeLessThan(50);
  });

  it("test_s001_rutas_dev_rechazan_un_cuerpo_invalido", async () => {
    const res = await post({ advanceHours: "dos" });
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("validation");
  });

  it("test_s001_rutas_dev_responden_404_sin_dev_endpoints", async () => {
    process.env.DEV_ENDPOINTS = "0";
    const res = await post({ advanceHours: 1 });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("dev_only");
    expect((await DELETE()).status).toBe(404);
  });
});
