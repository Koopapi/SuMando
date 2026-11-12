// Redirecciones baratas por presencia de cookie (plan 001, sección 1). La verdad la deciden los servicios en cada
// página y handler: aquí no hay base de datos.
import { NextResponse, type NextRequest } from "next/server";
import { PASSWORD_CHANGE_COOKIE, SESSION_COOKIE } from "@/server/auth/cookies";

const PUBLIC_PAGES = new Set(["/login", "/setup", "/offline", "/sistema"]);
// El catálogo y sus pantallas tipo (spec 002) se protegen solos: fuera de DEV_ENDPOINTS=1 responden 404.
const isPublic = (path: string) => PUBLIC_PAGES.has(path) || path.startsWith("/sistema/");
const PASSWORD_CHANGE = "/cambiar-contrasena";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) return NextResponse.next();
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const mustChange = request.cookies.has(PASSWORD_CHANGE_COOKIE);
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));
  if (!hasSession) return isPublic(pathname) ? NextResponse.next() : to("/login");
  if (mustChange && pathname !== PASSWORD_CHANGE && !isPublic(pathname)) return to(PASSWORD_CHANGE);
  // Con cookie (quizá ya caducada o revocada) se deja pasar: la página de entrada decide con la sesión real,
  // así una cookie vieja nunca produce un bucle entre /login y /.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|icon.png|icons/|manifest.webmanifest|sw.js|robots.txt).*)"],
};
