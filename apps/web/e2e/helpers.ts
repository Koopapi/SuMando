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

/** Botón «Más» de la barra inferior del teléfono (spec 002, RF-16 y RF-46). */
const moreButton = (page: Page) => page.getByRole("navigation", { name: "Navegación" }).getByRole("button", { name: "Más" });

/** En teléfono (bajo 1024 px) lo que no está en la barra inferior vive en «Más»: lo abre si hace falta. */
export async function openMenuIfNeeded(page: Page) {
  const more = moreButton(page);
  if (await more.isVisible()) await more.click();
}

/** Comprueba que se puede cerrar sesión (en teléfono, dentro de «Más», que luego se vuelve a cerrar). */
export async function expectCanLogout(page: Page) {
  const more = moreButton(page);
  const phone = await more.isVisible();
  if (phone) await more.click();
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

/** Peticiones a la API como el dueño trabajando en una sucursal (el catálogo pide sucursal activa, spec 003). */
export async function ownerApiAt(branchId: string) {
  const call = await ownerApi();
  await call("/api/session/branch", { branchId }, "PUT");
  return call;
}

/** Catálogo mínimo de Pastatti · Sendero para recorrer sus pantallas (spec 003). */
export async function seedCatalog(branchId: string) {
  const call = await ownerApiAt(branchId);
  const { supplier } = await call("/api/suppliers", { name: "Lácteos del Norte", phone: "555 010 2030" });
  const { product } = await call("/api/products", { name: "Aceite de oliva", baseUnit: "ml", supplierId: supplier.id });
  const { presentation } = await call(`/api/products/${product.id}/presentations`, { name: "Botella", factor: "1000" });
  await call(`/api/products/${product.id}`, { countPresentationId: presentation.id }, "PATCH");
  const { warehouse } = await call("/api/warehouses", { name: "Cámara fría", scope: "branch" });
  await call("/api/warehouses", { name: "Bodega central", scope: "business" });
  await call(`/api/products/${product.id}/levels`, { warehouseId: warehouse.id, min: "2", max: "6", presentationId: presentation.id }, "PUT");
  const { candidates } = await call("/api/areas");
  await call("/api/areas", { name: "Cocina", responsibleId: candidates[0].id });
  return { productId: product.id as string };
}

/** Recetario mínimo sobre `seedCatalog` (spec 004): una receta, un cálculo guardado y una plantilla. */
export async function seedRecipes(branchId: string, productId: string) {
  const call = await ownerApiAt(branchId);
  const { recipe } = await call("/api/recipes", { name: "Ensalada de la casa", preparation: "1.- Mezclar todo", ingredients: [{ productId, quantity: "30", note: "Un chorrito" }] });
  const { calculation } = await call("/api/calculations", { items: [{ recipeId: recipe.id, full: 12, half: 4 }] });
  await call("/api/recipe-templates", { name: "Fin de semana", items: [{ recipeId: recipe.id, full: 40, half: 0 }] });
  return { recipeId: recipe.id as string, calculationId: calculation.id as string };
}

/** Inventario mínimo sobre `seedCatalog` (spec 005): lista del área, una entrada, una salida y un traspaso a otro negocio. */
export async function seedInventory(branchId: string, productId: string, otherBranchId: string) {
  const call = await ownerApiAt(branchId);
  const { warehouses } = await call("/api/inventory/stock");
  const camara = warehouses.find((w: { name: string }) => w.name === "Cámara fría").id as string;
  const { areas } = await call("/api/areas");
  await call(`/api/areas/${areas[0].id}/products`, { warehouseId: camara, productIds: [productId] }, "PUT");
  const { movement } = await call("/api/inventory/movements", { kind: "entry", warehouseId: camara, reference: "F-1", lines: [{ productId, quantity: "3000" }] });
  await call("/api/inventory/movements", { kind: "exit", warehouseId: camara, reason: "waste", lines: [{ productId, quantity: "500" }] });
  const other = await ownerApiAt(otherBranchId);
  const { warehouse } = await other("/api/warehouses", { name: "Bodega Pirrus", scope: "branch" });
  const back = await ownerApiAt(branchId);
  const { transfer } = await back("/api/inventory/transfers", { fromWarehouseId: camara, toWarehouseId: warehouse.id, lines: [{ productId, quantity: "250" }] });
  return { warehouseId: camara, areaId: areas[0].id as string, movementId: movement.id as string, transferId: transfer.id as string };
}
