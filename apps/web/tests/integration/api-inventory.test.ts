// Spec 005: handlers del inventario con sesión y sucursal activa (RF-1 a RF-6), su contrato y el aislamiento.
import { describe, expect, it } from "vitest";
import { GET as areaGet, PUT as areaPut } from "@/app/api/areas/[id]/products/route";
import { POST as areaPost } from "@/app/api/areas/route";
import { POST as login } from "@/app/api/auth/login/route";
import { GET as countSheet } from "@/app/api/inventory/counts/[areaId]/route";
import { POST as countPost } from "@/app/api/inventory/counts/route";
import { GET as destinations } from "@/app/api/inventory/destinations/route";
import { GET as history } from "@/app/api/inventory/history/route";
import { POST as cancelMove } from "@/app/api/inventory/movements/[id]/cancel/route";
import { GET as moveGet } from "@/app/api/inventory/movements/[id]/route";
import { GET as movesList, POST as movePost } from "@/app/api/inventory/movements/route";
import { GET as invProducts } from "@/app/api/inventory/products/route";
import { GET as stockGet } from "@/app/api/inventory/stock/route";
import { POST as transferAction } from "@/app/api/inventory/transfers/[id]/[action]/route";
import { GET as transferGet } from "@/app/api/inventory/transfers/[id]/route";
import { GET as transfersList, POST as transferPost } from "@/app/api/inventory/transfers/route";
import { POST as productPost } from "@/app/api/products/route";
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
  const pirrus = await createBusiness(app, actor, { name: "Pirrus", firstBranchName: "Centro", color: "rojo" });
  const at = async (branchId: string) => {
    const client = new ApiClient();
    await client.call(login, "/api/auth/login", { body: { email: OWNER.email, password: OWNER.password } });
    expect((await client.call(selectBranch, "/api/session/branch", { method: "PUT", body: { branchId } })).status).toBe(200);
    return client;
  };
  const sendero = await at(pastatti.branch.id);
  const inCentro = await at(centro.id);
  const inPirrus = await at(pirrus.branch.id);
  const wh = async (client: ApiClient, name: string, scope: "branch" | "business") => (await json(await client.call(warehousePost, "/api/warehouses", { body: { name, scope } }))).warehouse.id as string;
  const prod = async (client: ApiClient, name: string, baseUnit = "g") => (await json(await client.call(productPost, "/api/products", { body: { name, baseUnit } }))).product.id as string;
  return {
    sendero,
    inCentro,
    inPirrus,
    bodega: await wh(sendero, "Bodega", "branch"),
    centroWh: await wh(inCentro, "Bodega Centro", "branch"),
    pirrusWh: await wh(inPirrus, "Bodega Pirrus", "branch"),
    queso: await prod(sendero, "Queso"),
    quesoPirrus: await prod(inPirrus, "Queso"),
    actorId: actor.id,
  };
}

describe("spec 005 — API del inventario", () => {
  it("test_s005_rf1_rf2_existencias_por_almacen_de_la_sucursal_activa", async () => {
    const w = await world();
    const entry = await w.sendero.call(movePost, "/api/inventory/movements", { body: { kind: "entry", warehouseId: w.bodega, lines: [{ productId: w.queso, quantity: "250" }] } });
    expect(entry.status).toBe(201);
    const stock = await json(await w.sendero.call(stockGet, `/api/inventory/stock?warehouseId=${w.bodega}`));
    expect(stock.warehouses.map((x: { name: string }) => x.name)).toEqual(["Bodega"]);
    expect(stock.rows).toEqual([expect.objectContaining({ name: "Queso", quantity: "250", status: "ok" })]);
    expect((await json(await w.sendero.call(invProducts, "/api/inventory/products"))).products.map((x: { name: string }) => x.name)).toEqual(["Queso"]);
  });

  it("test_s005_rf3_rf5_otra_sucursal_u_otro_negocio_responde_404", async () => {
    const w = await world();
    const { movement } = await json(await w.sendero.call(movePost, "/api/inventory/movements", { body: { kind: "entry", warehouseId: w.bodega, lines: [{ productId: w.queso, quantity: "1" }] } }));
    expect((await w.inCentro.call(stockGet, `/api/inventory/stock?warehouseId=${w.bodega}`)).status).toBe(404);
    expect((await w.inPirrus.call((r) => moveGet(r, p({ id: movement.id })), "/x")).status).toBe(404);
    expect((await w.inCentro.call((r) => moveGet(r, p({ id: movement.id })), "/x")).status).toBe(404);
    expect((await w.inCentro.call((r) => movePost(r), "/api/inventory/movements", { body: { kind: "entry", warehouseId: w.bodega, lines: [{ productId: w.queso, quantity: "1" }] } })).status).toBe(404);
    expect((await w.inPirrus.call((r) => cancelMove(r, p({ id: movement.id })), "/x", { body: { reason: "ajeno" } })).status).toBe(404);
    expect((await w.sendero.call((r) => moveGet(r, p({ id: "no-es-uuid" })), "/x")).status).toBe(404);
    expect((await w.inPirrus.call(history, `/api/inventory/history?warehouseId=${w.bodega}&productId=${w.queso}`)).status).toBe(404);
  });

  it("test_s005_rf4_la_lista_de_movimientos_y_el_historial_responden_con_su_contrato", async () => {
    const w = await world();
    const { movement } = await json(await w.sendero.call(movePost, "/api/inventory/movements", { body: { kind: "entry", warehouseId: w.bodega, lines: [{ productId: w.queso, quantity: "5" }] } }));
    const list = await json(await w.sendero.call(movesList, "/api/inventory/movements?kind=entry"));
    expect(list).toMatchObject({ movements: [{ id: movement.id, kind: "entry", warehouseName: "Bodega", lines: 1, cancelled: false }], next: null });
    expect((await w.sendero.call(movesList, "/api/inventory/movements?kind=robo")).status).toBe(422);
    expect((await w.sendero.call(movesList, "/api/inventory/movements?from=ayer")).status).toBe(422);
    const h = await json(await w.sendero.call(history, `/api/inventory/history?warehouseId=${w.bodega}&productId=${w.queso}`));
    expect(h.entries).toEqual([expect.objectContaining({ kind: "entry", delta: "5", balance: "5" })]);
    const cancel = await w.sendero.call((r) => cancelMove(r, p({ id: movement.id })), "/x", { body: { reason: "duplicada" } });
    expect(cancel.status).toBe(201);
    expect((await json(await w.sendero.call((r) => moveGet(r, p({ id: movement.id })), "/x"))).movement.reversal.reason).toBe("duplicada");
    expect((await w.sendero.call((r) => cancelMove(r, p({ id: movement.id })), "/x", { body: { reason: "otra vez" } })).status).toBe(409);
  });

  it("test_s005_rf6_errores_de_captura_con_su_codigo", async () => {
    const w = await world();
    const post = (body: unknown) => w.sendero.call(movePost, "/api/inventory/movements", { body });
    const err = async (body: unknown) => {
      const r = await post(body);
      return [r.status, (await r.json()).error.code];
    };
    expect(await err({ kind: "entry", warehouseId: w.bodega, lines: [] })).toEqual([422, "movement_empty"]);
    expect(await err({ kind: "entry", warehouseId: w.bodega, lines: [{ productId: w.queso, quantity: "0" }] })).toEqual([422, "invalid_line_quantity"]);
    expect(await err({ kind: "exit", warehouseId: w.bodega, reason: "other", lines: [{ productId: w.queso, quantity: "1" }] })).toEqual([422, "reason_required"]);
    expect(await err({ kind: "transfer_in", warehouseId: w.bodega, lines: [] })).toEqual([422, "validation"]);
    expect(await err({ kind: "entry", warehouseId: w.bodega, lines: [{ productId: w.quesoPirrus, quantity: "1" }] })).toEqual([404, "not_found"]);
  });

  it("test_s005_rf1_traspaso_entre_negocios_por_la_api", async () => {
    const w = await world();
    const dest = await json(await w.sendero.call(destinations, "/api/inventory/destinations"));
    expect(dest.businesses.map((b: { name: string; own: boolean }) => [b.name, b.own])).toEqual([["Pastatti", true], ["Pirrus", false]]);
    const sent = await w.sendero.call(transferPost, "/api/inventory/transfers", { body: { fromWarehouseId: w.bodega, toWarehouseId: w.pirrusWh, lines: [{ productId: w.queso, quantity: "100" }] } });
    expect(sent.status).toBe(201);
    const { transfer } = await json(sent);
    expect(transfer.status).toBe("in_transit");
    const incoming = await json(await w.inPirrus.call(transfersList, "/api/inventory/transfers"));
    expect(incoming.incoming.map((t: { id: string }) => t.id)).toEqual([transfer.id]);
    const detail = (await json(await w.inPirrus.call((r) => transferGet(r, p({ id: transfer.id })), "/x"))).transfer;
    expect(detail.lines[0].proposedProductId).toBe(w.quesoPirrus);
    const recv = await w.inPirrus.call((r) => transferAction(r, p({ id: transfer.id, action: "receive" })), "/x", { body: { lines: [{ lineId: detail.lines[0].id, productId: w.quesoPirrus, quantity: "90" }] } });
    expect(recv.status).toBe(200);
    expect((await json(recv)).transfer).toMatchObject({ status: "received", hasDifference: true });
    expect((await w.inCentro.call((r) => transferGet(r, p({ id: transfer.id })), "/x")).status).toBe(404);
    expect((await w.sendero.call((r) => transferAction(r, p({ id: transfer.id, action: "borrar" })), "/x", { body: {} })).status).toBe(404);
    expect((await w.sendero.call((r) => transferAction(r, p({ id: transfer.id, action: "cancel" })), "/x", { body: { reason: "tarde" } })).status).toBe(409);
  });

  it("test_s005_rf1_area_y_conteo_por_la_api", async () => {
    const w = await world();
    const { area } = await json(await w.sendero.call(areaPost, "/api/areas", { body: { name: "Lácteos", responsibleId: w.actorId } }));
    const put = await w.sendero.call((r) => areaPut(r, p({ id: area.id })), "/x", { method: "PUT", body: { warehouseId: w.bodega, productIds: [w.queso] } });
    expect(put.status).toBe(200);
    expect((await json(await w.sendero.call((r) => areaGet(r, p({ id: area.id })), "/x"))).productIds).toEqual([w.queso]);
    expect((await w.inCentro.call((r) => areaGet(r, p({ id: area.id })), "/x")).status).toBe(404);
    const sheet = await json(await w.sendero.call((r) => countSheet(r, p({ areaId: area.id })), "/x"));
    expect(sheet.lines).toEqual([expect.objectContaining({ name: "Queso", expected: "0", seen: "0.000000" })]);
    const applied = await w.sendero.call(countPost, "/api/inventory/counts", { body: { areaId: area.id, lines: [{ productId: w.queso, quantity: "12", seen: "0.000000" }] } });
    expect(applied.status).toBe(201);
    const stale = await w.sendero.call(countPost, "/api/inventory/counts", { body: { areaId: area.id, lines: [{ productId: w.queso, quantity: "10", seen: "0.000000" }] } });
    expect(stale.status).toBe(409);
    expect((await stale.json()).error).toMatchObject({ code: "count_changed", params: { products: "Queso" } });
    const big = await w.sendero.call(countPost, "/api/inventory/counts", { body: { areaId: area.id, lines: Array.from({ length: 300 }, (_, i) => ({ productId: `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`, quantity: "1", seen: "0.000000" })) } });
    expect(big.status).toBe(404);
  });
});
