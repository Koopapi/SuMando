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

/** Sin desplazamiento lateral: la página cabe en el ancho de la ventana (móvil primero). */
export async function expectNoHorizontalOverflow(page: Page) {
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (wide) throw new Error("La página se desborda lateralmente");
}

/** El aviso de error de un formulario (el anunciador de rutas de Next también tiene role="alert", pero está vacío). */
export function alertBox(page: Page) {
  return page.getByRole("alert").filter({ hasText: /\S/ });
}
