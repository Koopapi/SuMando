import { describe, expect, it } from "vitest";
import { SESSION_DAYS, SESSION_TOUCH_MINUTES, isSessionExpired, sessionExpiry, shouldTouchSession } from "./session-policy";

const t0 = new Date("2026-11-11T12:00:00Z");
const days = (n: number) => new Date(t0.getTime() + n * 86_400_000);
const minutes = (n: number) => new Date(t0.getTime() + n * 60_000);

describe("spec 001 — caducidad de sesión", () => {
  it("test_s001_rf7_la_sesion_caduca_a_los_30_dias_sin_uso", () => {
    expect(SESSION_DAYS).toBe(30);
    const expiresAt = sessionExpiry(t0);
    expect(expiresAt).toEqual(days(30));
    expect(isSessionExpired(expiresAt, days(29.9))).toBe(false);
    expect(isSessionExpired(expiresAt, days(30))).toBe(true);
  });

  it("test_s001_rf7_la_sesion_se_desliza_solo_tras_una_hora_de_uso", () => {
    expect(SESSION_TOUCH_MINUTES).toBe(60);
    expect(shouldTouchSession(t0, minutes(59))).toBe(false);
    expect(shouldTouchSession(t0, minutes(60))).toBe(true);
  });
});
