// RF-7: la sesión dura 30 días desde el último uso. Para no escribir en cada petición, la caducidad se desliza
// solo cuando el último uso registrado tiene más de una hora.
export const SESSION_DAYS = 30;
export const SESSION_TOUCH_MINUTES = 60;

export function sessionExpiry(now: Date): Date {
  return new Date(now.getTime() + SESSION_DAYS * 86_400_000);
}

export function isSessionExpired(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function shouldTouchSession(lastSeenAt: Date, now: Date): boolean {
  return now.getTime() - lastSeenAt.getTime() >= SESSION_TOUCH_MINUTES * 60_000;
}
