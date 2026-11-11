// Sesión en cada petición (RF-4, RF-7, RF-12, RF-31): los handlers leen la cookie del `Request`; las páginas, de
// `cookies()`. La decisión siempre la toma `authenticate` contra la BD; el proxy solo redirige por presencia de cookie.
import { cookies } from "next/headers";
import { isOwner } from "@/domain/access/owner";
import { appCtx } from "../app-context";
import { AppError } from "../errors";
import { authenticate, type Authenticated, type LoginResult } from "../services/auth";
import type { Ctx } from "../services/context";
import { clearSessionCookie, passwordChangeCookie, readCookie, SESSION_COOKIE, sessionCookie } from "./cookies";

export interface SessionOptions {
  /** Permite la petición aunque la persona deba cambiar su contraseña temporal (solo cambio de contraseña y salida). */
  allowPasswordChange?: boolean;
}

export async function sessionFromToken(ctx: Ctx, token: string | undefined, opts: SessionOptions = {}): Promise<Authenticated> {
  if (!token) throw new AppError("unauthorized");
  const auth = await authenticate(ctx, token);
  if (!auth) throw new AppError("unauthorized");
  if (auth.user.mustChangePassword && !opts.allowPasswordChange) throw new AppError("password_change_required");
  return auth;
}

/** Para handlers de `app/api`. */
export function requireSession(request: Request, opts?: SessionOptions) {
  return sessionFromToken(appCtx(), readCookie(request, SESSION_COOKIE), opts);
}

export async function requireOwner(request: Request): Promise<Authenticated> {
  const session = await requireSession(request);
  if (!isOwner(session.user)) throw new AppError("forbidden");
  return session;
}

/** Para componentes de servidor: la sesión viva o null (sin exigir el cambio de contraseña). */
export async function currentSession(): Promise<Authenticated | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return token ? authenticate(appCtx(), token) : null;
}

/** Cookies de una sesión recién creada: la de sesión y la marca de cambio de contraseña si hace falta. */
export function withSessionCookies(response: Response, result: LoginResult): Response {
  response.headers.append("set-cookie", sessionCookie(result.token, result.expiresAt));
  response.headers.append("set-cookie", passwordChangeCookie(result.user.mustChangePassword));
  return response;
}

export function withoutSessionCookies(response: Response): Response {
  response.headers.append("set-cookie", clearSessionCookie());
  response.headers.append("set-cookie", passwordChangeCookie(false));
  return response;
}
