// Barrido de calidad (no pertenece a un RF): cada página, con cada perfil y en escritorio, tableta y móvil, sin
// errores de consola, sin respuestas fallidas, sin desbordamiento lateral, sin imágenes rotas y con nombre
// accesible en botones y enlaces. Spec 002: además en modo claro y oscuro, con axe (WCAG 2.1 A y AA, contraste
// incluido).
import AxeBuilder from "@axe-core/playwright";
import type { Browser, Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { OWNER, login, seedAdmin, seedBusiness, seedCatalog, seedOwner, seedInventory, seedRecipes, seedRequisition } from "./helpers";

const VIEWPORTS = [
  { name: "escritorio", width: 1360, height: 950 },
  { name: "tableta", width: 820, height: 1180 },
  { name: "movil", width: 360, height: 740 },
];

interface Problem {
  page: string;
  viewport: string;
  issue: string;
}

function watch(page: Page, problems: Problem[], ctx: { url: string; vp: string }) {
  page.on("console", (m) => {
    if (m.type() === "error" && !ctx.url.includes("no-existe")) problems.push({ page: ctx.url, viewport: ctx.vp, issue: `consola: ${m.text().slice(0, 200)}` });
  });
  page.on("pageerror", (e) => problems.push({ page: ctx.url, viewport: ctx.vp, issue: `excepción: ${e.message.slice(0, 200)}` }));
  page.on("response", (r) => {
    const u = new URL(r.url());
    if (u.host === "localhost:3500" && r.status() >= 400 && !ctx.url.includes("no-existe")) problems.push({ page: ctx.url, viewport: ctx.vp, issue: `HTTP ${r.status()} ${u.pathname}` });
  });
}

async function audit(page: Page, url: string, vp: { name: string; width: number; height: number }, problems: Problem[]) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  const found = await page.evaluate(() => {
    const out: string[] = [];
    const root = document.documentElement;
    if (root.scrollWidth > window.innerWidth + 1) {
      const wide = [...document.querySelectorAll<HTMLElement>("body *")]
        .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1 && getComputedStyle(el).position !== "fixed")
        .slice(0, 3)
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 3).join(".")}`);
      out.push(`desborde lateral (${root.scrollWidth}px > ${window.innerWidth}px): ${wide.join(", ")}`);
    }
    for (const img of document.querySelectorAll("img")) if (img.complete && img.naturalWidth === 0) out.push(`imagen rota: ${img.getAttribute("src")}`);
    for (const el of document.querySelectorAll<HTMLElement>("button, a[href], [role=button]")) {
      const labelledBy = (el.getAttribute("aria-labelledby") ?? "")
        .split(" ")
        .map((id) => document.getElementById(id)?.textContent ?? "")
        .join(" ");
      const name = (el.getAttribute("aria-label") || labelledBy || el.textContent || el.getAttribute("title") || "").trim();
      if (!name && el.offsetParent !== null) out.push(`control sin nombre: ${el.outerHTML.slice(0, 120)}`);
    }
    return out;
  });
  for (const issue of found) problems.push({ page: url, viewport: vp.name, issue });
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  for (const v of axe.violations) {
    for (const node of v.nodes.slice(0, 3)) problems.push({ page: url, viewport: vp.name, issue: `axe ${v.id}: ${node.target.join(" ")} ${node.failureSummary?.split("\n")[1]?.trim() ?? ""}` });
  }
}

async function sweep(browser: Browser, urls: string[], problems: Problem[], prepare?: (page: Page) => Promise<void>) {
  for (const base of VIEWPORTS) for (const mode of ["light", "dark"] as const) {
    const vp = { ...base, name: `${base.name} ${mode === "light" ? "claro" : "oscuro"}` };
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, colorScheme: mode });
    const page = await context.newPage();
    if (prepare) await prepare(page);
    for (const url of urls) {
      const ctx = { url, vp: vp.name };
      watch(page, problems, ctx);
      await audit(page, url, vp, problems);
      page.removeAllListeners("console");
      page.removeAllListeners("pageerror");
      page.removeAllListeners("response");
    }
    await context.close();
  }
}

test("barrido de todas las pantallas", async ({ browser }) => {
  test.setTimeout(900_000);
  const problems: Problem[] = [];
  await sweep(browser, ["/setup"], problems);
  await seedOwner();
  const pastatti = await seedBusiness("Pastatti", ["Sendero", "Centro"]);
  const pirrus = await seedBusiness("Pirrus", ["Centro"]);
  await seedAdmin("Ana", "ana@mando.test", [pastatti.branches[0].id], "ana-123456");
  // Spec 003: catálogo con datos para que sus pantallas no salgan vacías.
  const { productId } = await seedCatalog(pastatti.branches[0].id);
  // Spec 004: recetario con una receta, un cálculo guardado y una plantilla.
  const { recipeId, calculationId } = await seedRecipes(pastatti.branches[0].id, productId);
  // Spec 005: inventario con lista de área, movimientos y un traspaso en camino.
  const inv = await seedInventory(pastatti.branches[0].id, productId, pirrus.branches[0].id);
  // Spec 007: una requisición aprobada y una plantilla de compra.
  const requisitionId = await seedRequisition(pastatti.branches[0].id, productId, inv.warehouseId);
  const catalog = [
    "/productos",
    `/productos/${productId}`,
    "/proveedores",
    "/almacenes",
    "/recetas",
    `/recetas/${recipeId}`,
    "/recetas/nueva",
    "/recetas/importar",
    "/insumos",
    "/insumos/historial",
    `/insumos/historial/${calculationId}`,
    "/insumos/plantillas",
    "/inventario",
    "/inventario/entrada",
    "/inventario/salida",
    "/inventario/ajuste",
    "/inventario/traspaso",
    "/inventario/traspasos",
    `/inventario/traspasos/${inv.transferId}`,
    "/inventario/conteo",
    `/inventario/conteo/${inv.areaId}`,
    `/almacenes/areas/${inv.areaId}`,
    "/inventario/movimientos",
    `/inventario/movimientos/${inv.movementId}`,
    `/inventario/historial?almacen=${inv.warehouseId}&producto=${productId}`,
    "/inventario/importar",
    "/requisiciones",
    "/requisiciones/nueva",
    `/requisiciones/${requisitionId}`,
    "/requisiciones/plantillas",
  ];
  await sweep(browser, ["/login", "/offline", "/sistema", "/sistema/tabla", "/sistema/captura", "/sistema/asistente", "/no-existe"], problems);
  await sweep(browser, ["/elegir-sucursal", "/", "/negocios", "/personas", "/cambiar-contrasena", ...catalog], problems, async (page) => {
    await login(page, OWNER.email, OWNER.password);
    await page.goto("/elegir-sucursal");
    await page.getByRole("button", { name: "Trabajar en Pastatti · Sendero" }).click();
    await page.waitForURL(/\/$/);
  });
  await sweep(browser, ["/", "/elegir-sucursal", "/cambiar-contrasena", "/negocios", ...catalog], problems, async (page) => {
    await login(page, "ana@mando.test", "ana-123456");
  });
  expect(problems.map((p) => `${p.viewport} ${p.page}: ${p.issue}`)).toEqual([]);
});
