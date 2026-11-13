// RF-6: cinco intentos fallidos seguidos bloquean la cuenta 15 minutos, aunque la siguiente contraseña sea correcta.
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

export interface LockState {
  failedAttempts: number;
  lockedUntil: Date | null;
}

export function registerFailure(state: LockState, now: Date): LockState {
  const failed = state.failedAttempts + 1;
  if (failed >= MAX_FAILED_ATTEMPTS) return { failedAttempts: 0, lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60_000) };
  return { failedAttempts: failed, lockedUntil: state.lockedUntil };
}

export function isLocked(lockedUntil: Date | null, now: Date): boolean {
  return lockedUntil !== null && lockedUntil.getTime() > now.getTime();
}

/** Minutos que faltan, redondeados hacia arriba (nunca 0 mientras siga bloqueada). */
export function minutesRemaining(lockedUntil: Date, now: Date): number {
  return Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / 60_000));
}
