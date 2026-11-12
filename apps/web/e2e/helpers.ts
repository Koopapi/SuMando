// Datos de partida de los E2E: se siembran por la API de la app (mismos servicios), no recorriendo pantallas.
import type { Page } from "@playwright/test";
import { BASE } from "./warm";

export const OWNER = { name: "Dueño de prueba", email: "dueno@mando.test", password: "secreta-123" };

export async function seedOwner() {
  const res = await fetch(`${BASE}/api/setup`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(OWNER) });
  if (res.status !== 201) throw new Error(`No se pudo crear al dueño: ${res.status}`);
}

export async function temporaryPasswordFor(email: string): Promise<string> {
  const res = await fetch(`${BASE}/api/dev/temporary-password`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
  return (await res.json()).temporaryPassword;
}

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  // Espera a que la entrada termine (bien o mal) antes de seguir: o cambia la URL o aparece el aviso.
  await Promise.race([page.waitForURL((u) => !u.pathname.endsWith("/login")), alertBox(page).waitFor()]);
}

/** En teléfono (bajo 1024 px) la navegación vive en el menú de la banda (spec 002, RF-16): lo abre si hace falta. */
export async function openMenuIfNeeded(page: Page) {
  const menu = page.getByRole("button", { name: "Abrir el menú" });
  if (await menu.isVisible()) await menu.click();
}

/** Comprueba que se puede cerrar sesión (en teléfono, dentro del menú, que luego se vuelve a cerrar). */
export async function expectCanLogout(page: Page) {
  const menu = page.getByRole("button", { name: "Abrir el menú" });
  const phone = await menu.isVisible();
  if (phone) await menu.click();
  await page.getByRole("button", { name: "Cerrar sesión" }).waitFor();
  if (phone) await page.keyboard.press("Escape");
}

/** Cierra la sesión y espera a estar de vuelta en la pantalla de entrada. */
export async function logout(page: Page) {
  await openMenuIfNeeded(page);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.waitForURL(/\/login$/);
}

/** Sin desplazamiento lateral: la página cabe en el ancho de la ventana (móvil primero). */
export async function expectNoHorizontalOverflow(page: Page) {
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (wide) throw new Error("La página se desborda lateralmente");
}

/** El aviso de error de un formulario (el anunciador de rutas de Next también tiene role="alert", pero está vacío). */
export function alertBox(page: Page) {
  return page.getByRole("alert").filter({ hasText: /\S/ });
}

/** Peticiones a la API con la sesión del dueño (para sembrar datos sin recorrer pantallas). */
export async function ownerApi() {
  const res = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: OWNER.email, password: OWNER.password }) });
  const cookie = res.headers.get("set-cookie")?.split(",").map((c) => c.split(";")[0].trim()).join("; ") ?? "";
  return async (path: string, body?: unknown, method = body === undefined ? "GET" : "POST") => {
    const r = await fetch(`${BASE}${path}`, { method, headers: { "content-type": "application/json", cookie }, body: body === undefined ? undefined : JSON.stringify(body) });
    return r.status === 204 ? null : r.json();
  };
}

export async function seedBusiness(name: string, branches: string[], color = "turquesa") {
  const call = await ownerApi();
  const { business } = await call("/api/businesses", { name, firstBranchName: branches[0], color });
  for (const branch of branches.slice(1)) await call(`/api/businesses/${business.id}/branches`, { name: branch });
  return business as { id: string; name: string; branches: { id: string; name: string }[] };
}

/** Da de alta a un administrador con sus sucursales y le deja una contraseña definitiva. */
export async function seedAdmin(name: string, email: string, branchIds: string[], password: string) {
  const call = await ownerApi();
  const { temporaryPassword } = await call("/api/people", { name, email, role: "admin", branchIds });
  const res = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: temporaryPassword }) });
  const cookie = res.headers.get("set-cookie")?.split(",").map((c) => c.split(";")[0].trim()).join("; ") ?? "";
  await fetch(`${BASE}/api/auth/password`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ currentPassword: temporaryPassword, newPassword: password }) });
  await fetch(`${BASE}/api/auth/logout`, { method: "POST", headers: { cookie } });
}
