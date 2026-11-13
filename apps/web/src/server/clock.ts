// Hora del servidor. Con DEV_ENDPOINTS=1 (desarrollo y E2E) se puede adelantar con /api/dev/clock para probar el
// bloqueo de 15 minutos y la caducidad a 30 días sin esperar. Sin esa variable el desfase es siempre 0.
const g = globalThis as { __mandoClockOffsetMs?: number };

export const devEndpointsEnabled = () => process.env.DEV_ENDPOINTS === "1";

export function clockOffset() {
  return devEndpointsEnabled() ? (g.__mandoClockOffsetMs ?? 0) : 0;
}

export function setClockOffset(ms: number) {
  g.__mandoClockOffsetMs = ms;
}

export function now() {
  return new Date(Date.now() + clockOffset());
}
