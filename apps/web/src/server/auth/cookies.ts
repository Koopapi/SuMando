// Cookies de sesión (plan 001, sección 3): la de sesión lleva el token opaco; `mando_pwchange` solo marca, sin
// datos, que la persona debe cambiar su contraseña temporal, para que el proxy pueda redirigir sin consultar la BD.
export const SESSION_COOKIE = "mando_session";
export const PASSWORD_CHANGE_COOKIE = "mando_pwchange";

// Secure fuera de desarrollo; el E2E corre compilado sobre http://localhost y lo apaga con COOKIE_SECURE=0.
const secure = () => (process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "1" : process.env.NODE_ENV === "production");
const base = () => `Path=/; HttpOnly; SameSite=Lax${secure() ? "; Secure" : ""}`;

export function sessionCookie(token: string, expiresAt: Date): string {
  return `${SESSION_COOKIE}=${token}; ${base()}; Expires=${expiresAt.toUTCString()}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; ${base()}; Max-Age=0`;
}

export function passwordChangeCookie(on: boolean): string {
  return on ? `${PASSWORD_CHANGE_COOKIE}=1; ${base()}; Max-Age=${30 * 86_400}` : `${PASSWORD_CHANGE_COOKIE}=; ${base()}; Max-Age=0`;
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function readCookie(request: Request, name: string): string | undefined {
  return parseCookies(request.headers.get("cookie"))[name];
}
