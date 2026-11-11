import { describe, expect, it } from "vitest";
import { LOCK_MINUTES, MAX_FAILED_ATTEMPTS, isLocked, minutesRemaining, registerFailure } from "./lockout";

const t0 = new Date("2026-11-11T12:00:00Z");
const min = (n: number) => new Date(t0.getTime() + n * 60_000);

describe("spec 001 — bloqueo por intentos", () => {
  it("test_s001_rf6_cinco_fallos_seguidos_bloquean_15_minutos", () => {
    expect(MAX_FAILED_ATTEMPTS).toBe(5);
    expect(LOCK_MINUTES).toBe(15);
    let state = { failedAttempts: 0, lockedUntil: null as Date | null };
    for (let i = 1; i <= 4; i++) {
      state = registerFailure(state, t0);
      expect(state).toEqual({ failedAttempts: i, lockedUntil: null });
    }
    state = registerFailure(state, t0);
    expect(state.failedAttempts).toBe(0);
    expect(state.lockedUntil).toEqual(min(15));
    expect(isLocked(state.lockedUntil, t0)).toBe(true);
    expect(minutesRemaining(state.lockedUntil!, min(0.5))).toBe(15);
    expect(minutesRemaining(state.lockedUntil!, min(14.2))).toBe(1);
  });

  it("test_s001_rf6_el_bloqueo_termina_pasados_15_minutos", () => {
    const lockedUntil = min(15);
    expect(isLocked(lockedUntil, min(14.99))).toBe(true);
    expect(isLocked(lockedUntil, min(15))).toBe(false);
    expect(isLocked(null, t0)).toBe(false);
  });
});
