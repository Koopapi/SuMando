// RF-8: cerrar la sesión de este dispositivo.
import { appCtx } from "@/server/app-context";
import { readCookie, SESSION_COOKIE } from "@/server/auth/cookies";
import { withoutSessionCookies } from "@/server/auth/session";
import { handler } from "@/server/http";
import { authenticate, logout } from "@/server/services/auth";

export const POST = handler(async (request: Request) => {
  const token = readCookie(request, SESSION_COOKIE);
  if (token) {
    const auth = await authenticate(appCtx(), token);
    if (auth) await logout(appCtx(), auth.sessionId);
  }
  return withoutSessionCookies(new Response(null, { status: 204 }));
});
