// Redirecciones baratas por presencia de cookie (plan 001, sección 1). La verdad la deciden los servicios en cada
// página y handler: aquí no hay base de datos.
import { NextResponse, type NextRequest } from "next/server";
import { PASSWORD_CHANGE_COOKIE, SESSION_COOKIE } from "@/server/auth/cookies";

const PUBLIC = new Set(["/login", "/setup", "/offline", "/sistema"]);
const PASSWORD_CHANGE = "/cambiar-contrasena";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) return NextResponse.next();
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const mustChange = request.cookies.has(PASSWORD_CHANGE_COOKIE);
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));
  if (!hasSession) return PUBLIC.has(pathname) ? NextResponse.next() : to("/login");
  if (mustChange && pathname !== PASSWORD_CHANGE) return to(PASSWORD_CHANGE);
  if (pathname === "/login" || pathname === "/setup") return to("/");
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|robots.txt).*)"],
};
