// Specs 007 y 013: handlers de requisiciones con sesión y sucursal activa, su contrato y el aislamiento.
import { describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as empPost } from "@/app/api/employees/route";
import { POST as posPost } from "@/app/api/positions/route";
import { GET as pdGet, POST as pdPost } from "@/app/api/purchase-data/route";
import { PUT as buyerPut } from "@/app/api/supplier-buyers/[supplierId]/route";
import { GET as buyersGet } from "@/app/api/supplier-buyers/route";
import { POST as supplierPost } from "@/app/api/suppliers/route";
import { POST as movePost } from "@/app/api/inventory/movements/route";
import { POST as productPost } from "@/app/api/products/route";
import { POST as tplAction } from "@/app/api/purchase-templates/[id]/[action]/route";
import { PATCH as tplPatch } from "@/app/api/purchase-templates/[id]/route";
import { GET as tplList, POST as tplPost } from "@/app/api/purchase-templates/route";
import { POST as reqAction } from "@/app/api/requisitions/[id]/[action]/route";
import { PATCH as groupPatch } from "@/app/api/requisitions/[id]/groups/[groupId]/route";
import { GET as reqGet, PUT as reqPut } from "@/app/api/requisitions/[id]/route";
import { GET as reqList, POST as reqPost } from "@/app/api/requisitions/route";
import { POST as suggest } from "@/app/api/requisitions/suggest/route";
import { PUT as selectBranch } from "@/app/api/session/branch/route";
import { POST as setupPost } from "@/app/api/setup/route";
import { POST as warehousePost } from "@/app/api/warehouses/route";
import { appCtx } from "@/server/app-context";
import { addBranch, createBusiness } from "@/server/services/businesses";
import { publicUser } from "@/server/services/users-public";
import { ApiClient, json } from "./api";
import { OWNER } from "./helpers";

const p = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) });

async function world() {
  const owner = new ApiClient();
  expect((await owner.call(setupPost, "/api/setup", { body: OWNER })).status).toBe(201);
  const app = appCtx();
  const actor = publicUser((await app.store.users.findByEmail(OWNER.email))!);
  const pastatti = await createBusiness(app, actor, { name: "Pastatti", firstBranchName: "Sendero", color: "violeta" });
  const centro = await addBranch(app, actor, pastatti.business.id, { name: "Centro" });
  const at = async (branchId: string) => {
    const c = new ApiClient();
    await c.call(login, "/api/auth/login", { body: { email: OWNER.email, password: OWNER.password } });
    await c.call(selectBranch, "/api/session/branch", { method: "PUT", body: { branchId } });
    return c;
  };
  const sendero = await at(pastatti.branch.id);
  const inCentro = await at(centro.id);
  const bodega = (await json(await sendero.call(warehousePost, "/api/warehouses", { body: { name: "Bodega", scope: "branch" } }))).warehouse.id as string;
  const leche = (await json(await sendero.call(productPost, "/api/products", { body: { name: "Leche", baseUnit: "ml" } }))).product.id as string;
  return { sendero, inCentro, bodega, leche };
}

describe("spec 007 — API de requisiciones", () => {
  it("test_s007_rf1_rf3_rf6_crear_listar_y_aislar_por_sucursal", async () => {
    const w = await world();
    const res = await w.sendero.call(reqPost, "/api/requisitions", { body: { warehouseId: w.bodega, lines: [{ productId: w.leche, quantity: "1000" }] } });
    expect(res.status).toBe(201);
    const { requisition } = await json(res);
    expect(requisition).toMatchObject({ folio: 1, status: "approved" });
    expect((await json(await w.sendero.call(reqList, "/api/requisitions?estado=approved"))).requisitions).toHaveLength(1);
    expect((await json(await w.inCentro.call(reqList, "/api/requisitions"))).requisitions).toEqual([]);
    expect((await w.inCentro.call((r) => reqGet(r, p({ id: requisition.id })), "/x")).status).toBe(404);
    expect((await w.sendero.call(reqList, "/api/requisitions?estado=x")).status).toBe(422);
  });

  it("test_s007_rf34_rf35_ciclo_completo_por_la_api", async () => {
    const w = await world();
    await w.sendero.call(movePost, "/api/inventory/movements", { body: { kind: "entry", warehouseId: w.bodega, lines: [{ productId: w.leche, quantity: "1" }] } });
    const { requisition } = await json(await w.sendero.call(reqPost, "/api/requisitions", { body: { warehouseId: w.bodega, lines: [{ productId: w.leche, quantity: "1000" }] } }));
    const d = (await json(await w.sendero.call((r) => reqGet(r, p({ id: requisition.id })), "/x"))).requisition;
    const group = d.groups[0];
    const bought = await w.sendero.call((r) => groupPatch(r, p({ id: requisition.id, groupId: group.id })), "/x", { method: "PATCH", body: { purchased: true, buyer: "Compras", total: "300" } });
    expect((await json(bought)).requisition.groups[0]).toMatchObject({ status: "purchased", buyer: "Compras", total: "300.00" });
    const recv = await w.sendero.call((r) => reqAction(r, p({ id: requisition.id, action: "receive" })), "/x", { body: { groupId: group.id, lines: [{ lineId: d.lines[0].id, quantity: "1000" }] } });
    expect((await json(recv)).requisition.status).toBe("closed");
    expect((await w.sendero.call((r) => reqAction(r, p({ id: requisition.id, action: "borrar" })), "/x", { body: {} })).status).toBe(404);
    expect((await w.sendero.call((r) => reqAction(r, p({ id: requisition.id, action: "cancel" })), "/x", { body: { reason: "tarde" } })).status).toBe(409);
    expect((await w.sendero.call((r) => reqPut(r, p({ id: requisition.id })), "/x", { method: "PUT", body: { lines: [{ productId: w.leche, quantity: "1" }] } })).status).toBe(409);
  });

  it("test_s007_rf14_rf18_sugerencias_y_plantillas_por_la_api", async () => {
    const w = await world();
    const sug = await w.sendero.call(suggest, "/api/requisitions/suggest", { body: { warehouseId: w.bodega, source: "minimums" } });
    expect(await json(sug)).toEqual({ lines: [], skipped: [], withoutMax: 0 });
    expect((await w.sendero.call(suggest, "/api/requisitions/suggest", { body: { warehouseId: w.bodega, source: "otro" } })).status).toBe(422);
    const t = await w.sendero.call(tplPost, "/api/purchase-templates", { body: { name: "Lunes", lines: [{ productId: w.leche, quantity: "500" }] } });
    expect(t.status).toBe(201);
    const { template } = await json(t);
    expect((await w.sendero.call(tplPost, "/api/purchase-templates", { body: { name: "lunes", lines: [{ productId: w.leche, quantity: "500" }] } })).status).toBe(409);
    await w.sendero.call((r) => tplPatch(r, p({ id: template.id })), "/x", { method: "PATCH", body: { name: "Lunes temprano" } });
    await w.sendero.call((r) => tplAction(r, p({ id: template.id, action: "archive" })), "/x", { body: {} });
    expect((await json(await w.sendero.call(tplList, "/api/purchase-templates"))).templates).toEqual([{ id: template.id, name: "Lunes temprano", archived: true, lines: 1 }]);
    expect((await json(await w.inCentro.call(tplList, "/api/purchase-templates"))).templates).toEqual([]);
  });
});

describe("spec 013 — API de compradores y datos de compra", () => {
  it("test_s013_rf1_rf5_rf11_comprador_habitual_y_mensaje_por_la_api", async () => {
    const w = await world();
    const { supplier } = await json(await w.sendero.call(supplierPost, "/api/suppliers", { body: { name: "Sams" } }));
    const { position } = await json(await w.sendero.call(posPost, "/api/positions", { body: { name: "Comprador" } }));
    const { employee } = await json(await w.sendero.call(empPost, "/api/employees", { body: { name: "Ana Compras", positionId: position.id, hiredOn: "2026-11-01", phone: "5512345678" } }));
    const put = await w.sendero.call((r) => buyerPut(r, p({ supplierId: supplier.id })), "/x", { method: "PUT", body: { employeeId: employee.id } });
    expect(await json(put)).toEqual({ supplierId: supplier.id, employeeId: employee.id });
    expect((await json(await w.sendero.call(buyersGet, "/api/supplier-buyers"))).buyers).toEqual([{ supplierId: supplier.id, employeeId: employee.id, name: "Ana Compras", active: true }]);
    // En Centro, la persona de Sendero no se puede asignar.
    expect((await w.inCentro.call((r) => buyerPut(r, p({ supplierId: supplier.id })), "/x", { method: "PUT", body: { employeeId: employee.id } })).status).toBe(422);
    expect((await w.sendero.call((r) => buyerPut(r, p({ supplierId: supplier.id })), "/x", { method: "PUT", body: { employeeId: 3 } })).status).toBe(422);
    const { requisition } = await json(await w.sendero.call(reqPost, "/api/requisitions", { body: { warehouseId: w.bodega, lines: [{ productId: w.leche, quantity: "1000", supplierId: supplier.id }] } }));
    const d = (await json(await w.sendero.call((r) => reqGet(r, p({ id: requisition.id })), "/x"))).requisition;
    expect(d.buyers[0]).toMatchObject({ name: "Ana Compras", missingPhone: false, link: expect.stringMatching(/^https:\/\/wa\.me\/525512345678\?text=/) });
    const cleared = await w.sendero.call((r) => groupPatch(r, p({ id: requisition.id, groupId: d.groups[0].id })), "/x", { method: "PATCH", body: { buyerEmployeeId: null } });
    expect((await json(cleared)).requisition.buyers[0].name).toBeNull();
  });

  it("test_s013_rf18_rf21_rf23_datos_de_compra_por_la_api", async () => {
    const w = await world();
    await w.sendero.call(movePost, "/api/inventory/movements", { body: { kind: "entry", warehouseId: w.bodega, lines: [{ productId: w.leche, quantity: "500" }] } });
    const view = await json(await w.sendero.call(pdGet, `/api/purchase-data?almacen=${w.bodega}`));
    expect(view.rows.map((r: { name: string; stock: string }) => [r.name, r.stock])).toEqual([["Leche", "500"]]);
    const saved = await json(await w.sendero.call(pdPost, "/api/purchase-data", { body: { warehouseId: w.bodega, changes: [{ productId: w.leche, min: "1000", max: "2000" }, { productId: w.leche, max: "1" }] } }));
    expect(saved.saved).toBe(1);
    expect(saved.errors).toEqual([{ productId: w.leche, code: "max_below_min", message: expect.any(String) }]);
    expect((await w.inCentro.call(pdGet, `/api/purchase-data?almacen=${w.bodega}`)).status).toBe(404);
    expect((await w.sendero.call(pdPost, "/api/purchase-data", { body: { warehouseId: w.bodega, changes: "x" } })).status).toBe(422);
  });
});
