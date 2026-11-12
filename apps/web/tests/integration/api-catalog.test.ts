// Spec 003: handlers del catálogo con sesión y sucursal activa (RF-4, RF-8, RF-37) y su contrato.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as archiveAction } from "@/app/api/catalog/[kind]/[id]/[action]/route";
import { PATCH as patchProduct } from "@/app/api/products/[id]/route";
import { PUT as putLevel } from "@/app/api/products/[id]/levels/route";
import { POST as addPresentation } from "@/app/api/products/[id]/presentations/route";
import { GET as listProducts, POST as createProduct } from "@/app/api/products/route";
import { PUT as selectBranch } from "@/app/api/session/branch/route";
import { GET as listSuppliers, POST as createSupplier } from "@/app/api/suppliers/route";
import { POST as createWarehouse } from "@/app/api/warehouses/route";
import { POST as setupPost } from "@/app/api/setup/route";
import { appCtx } from "@/server/app-context";
import { createBusiness } from "@/server/services/businesses";
import { publicUser } from "@/server/services/users-public";
import { ApiClient, json } from "./api";
import { OWNER } from "./helpers";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

async function world() {
  const owner = new ApiClient();
  expect((await owner.call(setupPost, "/api/setup", { body: OWNER })).status).toBe(201);
  const app = appCtx();
  const actor = publicUser((await app.store.users.findByEmail(OWNER.email))!);
  const pastatti = await createBusiness(app, actor, { name: "Pastatti", firstBranchName: "Sendero", color: "violeta" });
  const pirrus = await createBusiness(app, actor, { name: "Pirrus", firstBranchName: "Centro", color: "rojo" });
  const at = async (branchId: string) => {
    const client = new ApiClient();
    await client.call(login, "/api/auth/login", { body: { email: OWNER.email, password: OWNER.password } });
    expect((await client.call(selectBranch, "/api/session/branch", { method: "PUT", body: { branchId } })).status).toBe(200);
    return client;
  };
  return { owner, inPastatti: await at(pastatti.branch.id), inPirrus: await at(pirrus.branch.id) };
}

describe("spec 003 — API del catálogo", () => {
  it("test_s003_rf4_la_api_lista_solo_el_catalogo_del_negocio_de_la_sucursal_activa", async () => {
    const { inPastatti, inPirrus } = await world();
    expect((await inPastatti.call(createProduct, "/api/products", { body: { name: "Harina", baseUnit: "g" } })).status).toBe(201);
    expect((await inPirrus.call(createProduct, "/api/products", { body: { name: "Tortilla", baseUnit: "pz" } })).status).toBe(201);
    expect((await json(await inPastatti.call(listProducts, "/api/products"))).products.map((p: { name: string }) => p.name)).toEqual(["Harina"]);
    expect((await json(await inPirrus.call(listProducts, "/api/products"))).products.map((p: { name: string }) => p.name)).toEqual(["Tortilla"]);
  });

  it("test_s003_rf8_por_direccion_directa_lo_de_otro_negocio_responde_404", async () => {
    const { inPastatti, inPirrus } = await world();
    const { product } = await json(await inPastatti.call(createProduct, "/api/products", { body: { name: "Harina", baseUnit: "g" } }));
    const { supplier } = await json(await inPastatti.call(createSupplier, "/api/suppliers", { body: { name: "Molino" } }));
    const patch = await inPirrus.call((r) => patchProduct(r, ctx(product.id)), `/api/products/${product.id}`, { method: "PATCH", body: { name: "Otra" } });
    expect(patch.status).toBe(404);
    const missing = await inPirrus.call((r) => patchProduct(r, ctx("00000000-0000-0000-0000-000000000000")), "/api/products/x", { method: "PATCH", body: { name: "Otra" } });
    expect(await json(missing)).toEqual(await json(await inPirrus.call((r) => patchProduct(r, ctx(product.id)), `/api/products/${product.id}`, { method: "PATCH", body: { name: "Otra" } })));
    const archive = await inPirrus.call((r) => archiveAction(r, { params: Promise.resolve({ kind: "suppliers", id: supplier.id, action: "archive" }) }), "/x", { method: "POST" });
    expect(archive.status).toBe(404);
    expect((await json(await inPirrus.call(listSuppliers, "/api/suppliers"))).suppliers).toEqual([]);
  });

  it("test_s003_rf37_no_existe_ninguna_forma_de_borrar_el_catalogo", async () => {
    const { inPastatti } = await world();
    const { product } = await json(await inPastatti.call(createProduct, "/api/products", { body: { name: "Harina", baseUnit: "g" } }));
    const res = await inPastatti.call((r) => archiveAction(r, { params: Promise.resolve({ kind: "products", id: product.id, action: "delete" }) }), "/x", { method: "POST" });
    expect(res.status).toBe(404);
    const root = path.resolve(import.meta.dirname, "../../src/app/api");
    const routes: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = path.join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (f === "route.ts") routes.push(p);
      }
    };
    for (const d of ["products", "presentations", "suppliers", "warehouses", "areas", "catalog"]) walk(path.join(root, d));
    expect(routes.length).toBeGreaterThanOrEqual(10);
    for (const r of routes) expect(readFileSync(r, "utf8")).not.toMatch(/export const DELETE/);
  });

  it("test_s003_contrato_flujo_por_api_con_errores_en_espanol", async () => {
    const { inPastatti } = await world();
    const { product } = await json(await inPastatti.call(createProduct, "/api/products", { body: { name: "Aceite", baseUnit: "ml" } }));
    const caja = await inPastatti.call((r) => addPresentation(r, ctx(product.id)), "/x", { body: { name: "Caja", factor: "6000" } });
    expect(caja.status).toBe(201);
    const { presentation } = await json(caja);
    const bad = await inPastatti.call((r) => addPresentation(r, ctx(product.id)), "/x", { body: { name: "Bolsa", factor: "0" } });
    expect(bad.status).toBe(422);
    expect((await json(bad)).error.message).toMatch(/mayor que cero/);
    const locked = await inPastatti.call((r) => patchProduct(r, ctx(product.id)), "/x", { method: "PATCH", body: { baseUnit: "g" } });
    expect(locked.status).toBe(409);
    const { warehouse } = await json(await inPastatti.call(createWarehouse, "/api/warehouses", { body: { name: "Bodega", scope: "business" } }));
    const level = await inPastatti.call((r) => putLevel(r, ctx(product.id)), "/x", { method: "PUT", body: { warehouseId: warehouse.id, presentationId: presentation.id, min: "1", max: "2" } });
    expect(await json(level)).toEqual({ level: { warehouseId: warehouse.id, minBase: "6000.000000", maxBase: "12000.000000" } });
    const below = await inPastatti.call((r) => putLevel(r, ctx(product.id)), "/x", { method: "PUT", body: { warehouseId: warehouse.id, min: "3", max: "2" } });
    expect((await json(below)).error).toMatchObject({ code: "max_below_min", message: "El máximo debe ser igual o mayor que el mínimo." });
  });

  it("test_s003_contrato_sin_sesion_401_y_sin_sucursal_activa_409", async () => {
    await world();
    expect((await new ApiClient().call(listProducts, "/api/products")).status).toBe(401);
    // Un administrador sin sucursales no tiene sucursal activa.
    const app = appCtx();
    await app.store.users.insert({ name: "Admin", email: "admin@mando.test", passwordHash: await app.ports.hasher.hash("admin-123456"), role: "admin", createdAt: app.ports.clock.now() });
    const admin = new ApiClient();
    await admin.call(login, "/api/auth/login", { body: { email: "admin@mando.test", password: "admin-123456" } });
    const res = await admin.call(listProducts, "/api/products");
    expect(res.status).toBe(409);
    expect((await json(res)).error.code).toBe("no_branch");
  });
});
