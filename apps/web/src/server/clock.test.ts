import { afterEach, describe, expect, it } from "vitest";
import { clockOffset, now, setClockOffset } from "./clock";

describe("spec 001 — reloj de pruebas", () => {
  afterEach(() => {
    setClockOffset(0);
    process.env.DEV_ENDPOINTS = "1";
  });

  it("test_s001_reloj_de_pruebas_adelanta_y_vuelve", () => {
    process.env.DEV_ENDPOINTS = "1";
    setClockOffset(2 * 3_600_000);
    expect(now().getTime() - Date.now()).toBeGreaterThanOrEqual(2 * 3_600_000 - 50);
    setClockOffset(0);
    expect(Math.abs(now().getTime() - Date.now())).toBeLessThan(50);
  });

  it("test_s001_reloj_de_pruebas_no_actua_sin_dev_endpoints", () => {
    process.env.DEV_ENDPOINTS = "0";
    setClockOffset(3_600_000);
    expect(clockOffset()).toBe(0);
    expect(Math.abs(now().getTime() - Date.now())).toBeLessThan(50);
  });
});
