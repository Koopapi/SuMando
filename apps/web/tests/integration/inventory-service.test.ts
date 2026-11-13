// Spec 005: servicios del inventario contra la BD de pruebas (existencias, movimientos, traspasos, áreas, conteos).
import { describe, expect, it } from "vitest";
import { setArchived } from "@/server/services/catalog/archive";
import { setLevel } from "@/server/services/catalog/levels";
import { createSupplier } from "@/server/services/catalog/suppliers";
import { applyCount, areaSetup, countBoard, countSheet, setAreaProducts } from "@/server/services/inventory/counts";
import { cancelMovement, listMovements, movementDetail, parseCursor, productHistory, recordMovement } from "@/server/services/inventory/movements";
import { inventoryWarehouses, productStock, stockAlerts, stockOfWarehouse } from "@/server/services/inventory/stock";
import { cancelTransfer, listTransfers, pendingIncoming, receiveTransfer, sendTransfer, transferDestinations, transferDetail } from "@/server/services/inventory/transfers";
import { code, inventoryWorld } from "./inventory-fixture";

type World = Awaited<ReturnType<typeof inventoryWorld>>;
const row = async (w: World, scope: World["ownerSendero"], warehouseId: string, productId: string) => (await stockOfWarehouse(w.ctx, scope, warehouseId)).rows.find((r) => r.productId === productId);

describe("spec 005 — existencias", () => {
  it("test_s005_rf2_la_sucursal_ve_sus_almacenes_y_los_del_negocio", async () => {
    const w = await inventoryWorld();
    expect((await inventoryWarehouses(w.ctx, w.ownerSendero)).map((x) => x.name)).toEqual(["Bodega Sendero", "Central"]);
    expect((await inventoryWarehouses(w.ctx, w.ownerCentro)).map((x) => x.name)).toEqual(["Bodega Centro", "Central"]);
    expect((await inventoryWarehouses(w.ctx, w.ownerPirrus)).map((x) => x.name)).toEqual(["Bodega Pirrus"]);
  });

  it("test_s005_rf5_un_almacen_de_otra_sucursal_o_negocio_no_existe", async () => {
    const w = await inventoryWorld();
    expect(await code(stockOfWarehouse(w.ctx, w.ownerSendero, w.bodegaCentro.id))).toBe("not_found");
    expect(await code(stockOfWarehouse(w.ctx, w.ownerSendero, w.bodegaPirrus.id))).toBe("not_found");
    expect(await code(w.entry(w.adminSendero, w.bodegaPirrus.id, [{ productId: w.queso.id, quantity: "1" }]))).toBe("not_found");
  });

  it("test_s005_rf55_rf56_la_tabla_muestra_existencia_minimo_maximo_y_bajo_minimo", async () => {
    const w = await inventoryWorld();
    await setLevel(w.ctx, w.ownerSendero, w.queso.id, { warehouseId: w.bodegaSendero.id, presentationId: w.pieza.id, min: "3", max: "10" });
    await w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.queso.id, quantity: "2500" }]);
    const r = await row(w, w.ownerSendero, w.bodegaSendero.id, w.queso.id);
    expect(r).toMatchObject({ name: "Queso manchego", quantity: "2.5", presentation: "Pieza", min: "3", max: "10", status: "below_min" });
    expect((await row(w, w.ownerSendero, w.bodegaSendero.id, w.leche.id))?.quantity).toBe("0");
  });

  it("test_s005_rf57_el_area_aparece_en_la_tabla", async () => {
    const w = await inventoryWorld();
    const cocina = await w.area(w.ownerSendero, "Lácteos");
    await setAreaProducts(w.ctx, w.ownerSendero, cocina.id, { warehouseId: w.bodegaSendero.id, productIds: [w.queso.id] });
    expect((await row(w, w.ownerSendero, w.bodegaSendero.id, w.queso.id))?.area).toBe("Lácteos");
    expect((await row(w, w.ownerSendero, w.central.id, w.queso.id))?.area).toBeNull();
  });

  it("test_s005_rf58_el_detalle_del_producto_muestra_su_existencia_por_almacen", async () => {
    const w = await inventoryWorld();
    await w.entry(w.ownerSendero, w.central.id, [{ productId: w.queso.id, quantity: "4", presentationId: w.pieza.id }]);
    expect(await productStock(w.ctx, w.ownerSendero, w.queso.id)).toEqual([
      { warehouseId: w.bodegaSendero.id, warehouseName: "Bodega Sendero", quantity: "0", status: "ok" },
      { warehouseId: w.central.id, warehouseName: "Central", quantity: "4", status: "ok" },
    ]);
  });

  it("test_s005_rf59_un_producto_archivado_solo_aparece_si_tiene_existencia", async () => {
    const w = await inventoryWorld();
    await w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.queso.id, quantity: "1" }]);
    await setArchived(w.ctx, w.ownerSendero, "products", w.queso.id, true);
    await setArchived(w.ctx, w.ownerSendero, "products", w.leche.id, true);
    const rows = (await stockOfWarehouse(w.ctx, w.ownerSendero, w.bodegaSendero.id)).rows;
    expect(rows.map((r) => [r.name, r.archived])).toEqual([["Queso manchego", true]]);
  });

  it("test_s005_rf6_no_se_mueve_un_producto_ni_un_almacen_archivado", async () => {
    const w = await inventoryWorld();
    await setArchived(w.ctx, w.ownerSendero, "products", w.leche.id, true);
    expect(await code(w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.leche.id, quantity: "1" }]))).toBe("archived_item");
    await setArchived(w.ctx, w.ownerSendero, "warehouses", w.central.id, true);
    expect(await code(w.entry(w.ownerSendero, w.central.id, [{ productId: w.queso.id, quantity: "1" }]))).toBe("archived_item");
  });

  it("test_s005_rf21_negativos_y_bajo_minimo_se_cuentan_para_el_inicio", async () => {
    const w = await inventoryWorld();
    await setLevel(w.ctx, w.ownerSendero, w.leche.id, { warehouseId: w.central.id, min: "1000" });
    await recordMovement(w.ctx, w.ownerSendero, { kind: "exit", warehouseId: w.bodegaSendero.id, reason: "waste", lines: [{ productId: w.queso.id, quantity: "5" }] });
    expect(await stockAlerts(w.ctx, w.ownerSendero)).toEqual({ negative: 1, belowMin: 1 });
    expect((await row(w, w.ownerSendero, w.bodegaSendero.id, w.queso.id))?.status).toBe("negative");
  });
});

describe("spec 005 — entradas, salidas y ajustes", () => {
  it("test_s005_rf11_rf13_una_entrada_suma_cada_renglon", async () => {
    const w = await inventoryWorld();
    await w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.queso.id, quantity: "2", presentationId: w.pieza.id }, { productId: w.leche.id, quantity: "500" }]);
    await w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.queso.id, quantity: "500" }]);
    expect((await row(w, w.ownerSendero, w.bodegaSendero.id, w.queso.id))?.quantity).toBe("2.5");
    expect((await row(w, w.ownerSendero, w.bodegaSendero.id, w.leche.id))?.quantity).toBe("500");
  });

  it("test_s005_rf12_la_entrada_lleva_proveedor_referencia_y_nota_opcionales", async () => {
    const w = await inventoryWorld();
    const sams = await createSupplier(w.ctx, w.ownerSendero, { name: "Sams" });
    const otro = await createSupplier(w.ctx, w.ownerPirrus, { name: "Heineken" });
    const m = await recordMovement(w.ctx, w.ownerSendero, { kind: "entry", warehouseId: w.bodegaSendero.id, supplierId: sams.id, reference: "F-123", note: "llegó tarde", lines: [{ productId: w.leche.id, quantity: "1" }] });
    expect(await movementDetail(w.ctx, w.ownerSendero, m.id)).toMatchObject({ supplier: "Sams", reference: "F-123", note: "llegó tarde" });
    expect(await code(recordMovement(w.ctx, w.ownerSendero, { kind: "entry", warehouseId: w.bodegaSendero.id, supplierId: otro.id, lines: [{ productId: w.leche.id, quantity: "1" }] }))).toBe("not_found");
    expect(await code(recordMovement(w.ctx, w.ownerSendero, { kind: "entry", warehouseId: w.bodegaSendero.id, reference: "x".repeat(41), lines: [{ productId: w.leche.id, quantity: "1" }] }))).toBe("validation");
  });

  it("test_s005_rf14_rf17_una_salida_resta_con_su_motivo", async () => {
    const w = await inventoryWorld();
    await w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.leche.id, quantity: "1000" }]);
    const m = await recordMovement(w.ctx, w.ownerSendero, { kind: "exit", warehouseId: w.bodegaSendero.id, reason: "expired", lines: [{ productId: w.leche.id, quantity: "400" }] });
    expect((await row(w, w.ownerSendero, w.bodegaSendero.id, w.leche.id))?.quantity).toBe("600");
    expect((await movementDetail(w.ctx, w.ownerSendero, m.id)).reason).toBe("expired");
    expect(await code(recordMovement(w.ctx, w.ownerSendero, { kind: "exit", warehouseId: w.bodegaSendero.id, lines: [{ productId: w.leche.id, quantity: "1" }] }))).toBe("validation");
  });

  it("test_s005_rf15_rf16_motivo_de_lista_y_otro_con_nota", async () => {
    const w = await inventoryWorld();
    const exit = (reason: string, note?: string) => recordMovement(w.ctx, w.ownerSendero, { kind: "exit", warehouseId: w.bodegaSendero.id, reason, note, lines: [{ productId: w.leche.id, quantity: "1" }] });
    expect(await code(exit("robo"))).toBe("validation");
    expect(await code(exit("other"))).toBe("reason_required");
    expect(await code(exit("other", "se derramó"))).toBe("ok");
    for (const r of ["waste", "staff", "courtesy"]) expect(await code(exit(r))).toBe("ok");
  });

  it("test_s005_rf18_rf19_el_ajuste_suma_o_resta_con_motivo", async () => {
    const w = await inventoryWorld();
    const adjust = (quantity: string, note?: string) => recordMovement(w.ctx, w.ownerSendero, { kind: "adjustment", warehouseId: w.bodegaSendero.id, note, lines: [{ productId: w.queso.id, quantity }] });
    await adjust("3000", "faltó registrar la entrada");
    await adjust("-500", "pieza abierta");
    expect((await row(w, w.ownerSendero, w.bodegaSendero.id, w.queso.id))?.quantity).toBe("2.5");
    expect(await code(adjust("0", "nada"))).toBe("invalid_adjustment");
    expect(await code(adjust("1"))).toBe("reason_required");
    expect(await code(recordMovement(w.ctx, w.ownerSendero, { kind: "adjustment", warehouseId: w.bodegaSendero.id, note: "dos", lines: [{ productId: w.queso.id, quantity: "1" }, { productId: w.leche.id, quantity: "1" }] }))).toBe("validation");
  });

  it("test_s005_rf20_una_salida_mayor_deja_la_existencia_en_negativo", async () => {
    const w = await inventoryWorld();
    await w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.queso.id, quantity: "2", presentationId: w.pieza.id }]);
    await recordMovement(w.ctx, w.ownerSendero, { kind: "exit", warehouseId: w.bodegaSendero.id, reason: "waste", lines: [{ productId: w.queso.id, quantity: "3", presentationId: w.pieza.id }] });
    expect(await row(w, w.ownerSendero, w.bodegaSendero.id, w.queso.id)).toMatchObject({ quantity: "-1", status: "negative" });
  });

  it("test_s005_rf3_en_almacen_de_otra_sucursal_no_se_registra", async () => {
    const w = await inventoryWorld();
    expect(await code(w.entry(w.adminSendero, w.bodegaCentro.id, [{ productId: w.queso.id, quantity: "1" }]))).toBe("not_found");
    expect(await code(w.entry(w.adminSendero, w.bodegaSendero.id, [{ productId: w.queso.id, quantity: "1" }]))).toBe("ok");
  });

  it("test_s005_rf4_en_almacen_del_negocio_registra_cualquier_administrador_del_negocio", async () => {
    const w = await inventoryWorld();
    expect(await code(w.entry(w.adminSendero, w.central.id, [{ productId: w.queso.id, quantity: "1" }]))).toBe("ok");
    expect(await code(w.entry(w.adminPirrus, w.central.id, [{ productId: w.queso.id, quantity: "1" }]))).toBe("not_found");
  });

  it("test_s005_rf7_rf8_rf10_cantidades_y_renglones", async () => {
    const w = await inventoryWorld();
    expect(await code(w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.queso.id, quantity: "0" }]))).toBe("invalid_line_quantity");
    expect(await code(w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.queso.id, quantity: "1.0001" }]))).toBe("invalid_line_quantity");
    expect(await code(w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.queso.id, quantity: "1" }, { productId: w.queso.id, quantity: "2" }]))).toBe("duplicate_line");
    expect(await code(w.entry(w.ownerSendero, w.bodegaSendero.id, []))).toBe("movement_empty");
    expect(await code(w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.quesoPirrus.id, quantity: "1" }]))).toBe("not_found");
    expect(await code(w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.queso.id, quantity: "1", presentationId: "00000000-0000-0000-0000-000000000000" }]))).toBe("not_found");
    await w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.queso.id, quantity: "1,5", presentationId: w.pieza.id }]);
    expect((await row(w, w.ownerSendero, w.bodegaSendero.id, w.queso.id))?.quantity).toBe("1.5");
  });

  it("test_s005_rf60_cada_movimiento_guarda_tipo_almacen_autor_y_hora_del_servidor", async () => {
    const w = await inventoryWorld();
    const m = await w.entry(w.adminSendero, w.bodegaSendero.id, [{ productId: w.leche.id, quantity: "1" }]);
    const d = await movementDetail(w.ctx, w.ownerSendero, m.id);
    expect(d).toMatchObject({ kind: "entry", warehouse: { name: "Bodega Sendero" }, author: w.senderoAdmin.name, createdAt: w.ctx.clock.now().toISOString() });
  });
});

describe("spec 005 — historial y cancelaciones", () => {
  it("test_s005_rf61_el_historial_muestra_cada_movimiento_y_la_existencia_que_dejo", async () => {
    const w = await inventoryWorld();
    await w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.leche.id, quantity: "1000" }]);
    w.ctx.clock.advanceMinutes(5);
    await recordMovement(w.ctx, w.ownerSendero, { kind: "exit", warehouseId: w.bodegaSendero.id, reason: "staff", lines: [{ productId: w.leche.id, quantity: "250" }] });
    const h = await productHistory(w.ctx, w.ownerSendero, w.bodegaSendero.id, w.leche.id, null);
    expect(h.entries.map((e) => [e.kind, e.delta, e.balance])).toEqual([
      ["exit", "-250", "750"],
      ["entry", "1000", "1000"],
    ]);
    expect(h.next).toBeNull();
  });

  it("test_s005_rf62_la_lista_filtra_por_tipo_almacen_y_fechas_y_pagina", async () => {
    const w = await inventoryWorld();
    for (let i = 0; i < 52; i++) await w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.leche.id, quantity: "1" }]);
    await recordMovement(w.ctx, w.ownerSendero, { kind: "exit", warehouseId: w.central.id, reason: "waste", lines: [{ productId: w.leche.id, quantity: "1" }] });
    await w.entry(w.ownerCentro, w.bodegaCentro.id, [{ productId: w.leche.id, quantity: "1" }]);
    const first = await listMovements(w.ctx, w.ownerSendero, {});
    expect(first.movements).toHaveLength(50);
    const second = await listMovements(w.ctx, w.ownerSendero, { before: parseCursor(first.next) });
    expect(second.movements).toHaveLength(3);
    expect(new Set([...first.movements, ...second.movements].map((m) => m.id)).size).toBe(53);
    expect((await listMovements(w.ctx, w.ownerSendero, { kind: "exit" })).movements.map((m) => m.warehouseName)).toEqual(["Central"]);
    expect((await listMovements(w.ctx, w.ownerSendero, { warehouseId: w.central.id })).movements).toHaveLength(1);
    expect((await listMovements(w.ctx, w.ownerSendero, { from: new Date(w.ctx.clock.now().getTime() + 1) })).movements).toHaveLength(0);
    expect(await code(listMovements(w.ctx, w.ownerSendero, { warehouseId: w.bodegaCentro.id }))).toBe("not_found");
  });

  it("test_s005_rf63_los_movimientos_no_tienen_cambio_ni_borrado", async () => {
    const w = await inventoryWorld();
    expect(Object.keys(w.ctx.store.inventory.movements).sort()).toEqual(["byTransfer", "findById", "history", "insert", "lines", "list", "reversalOf"]);
  });

  it("test_s005_rf64_rf66_cancelar_registra_el_inverso_con_motivo", async () => {
    const w = await inventoryWorld();
    const m = await w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.leche.id, quantity: "300" }]);
    expect(await code(cancelMovement(w.ctx, w.ownerSendero, m.id, ""))).toBe("reason_required");
    const reversal = await cancelMovement(w.ctx, w.ownerSendero, m.id, "Entrada duplicada");
    expect((await row(w, w.ownerSendero, w.bodegaSendero.id, w.leche.id))?.quantity).toBe("0");
    const d = await movementDetail(w.ctx, w.ownerSendero, m.id);
    expect(d.reversal).toMatchObject({ id: reversal.id, reason: "Entrada duplicada", author: w.owner.name });
    expect(d.cancellable).toBe(false);
    expect((await movementDetail(w.ctx, w.ownerSendero, reversal.id)).reverses).toBe(m.id);
  });

  it("test_s005_rf65_no_se_cancela_dos_veces_ni_un_conteo", async () => {
    const w = await inventoryWorld();
    const m = await w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.leche.id, quantity: "300" }]);
    const results = await Promise.all([code(cancelMovement(w.ctx, w.ownerSendero, m.id, "duplicada")), code(cancelMovement(w.ctx, w.ownerSendero, m.id, "duplicada"))]);
    expect(results.sort()).toEqual(["not_cancellable", "ok"]);
    expect((await row(w, w.ownerSendero, w.bodegaSendero.id, w.leche.id))?.quantity).toBe("0");
    const area = await w.area(w.ownerSendero, "Lácteos");
    await setAreaProducts(w.ctx, w.ownerSendero, area.id, { warehouseId: w.bodegaSendero.id, productIds: [w.leche.id] });
    await applyCount(w.ctx, w.ownerSendero, { areaId: area.id, lines: [{ productId: w.leche.id, quantity: "5", seen: "0" }] });
    const [countMove] = (await listMovements(w.ctx, w.ownerSendero, { kind: "count" })).movements;
    expect(await code(cancelMovement(w.ctx, w.ownerSendero, countMove.id, "me equivoqué"))).toBe("not_cancellable");
  });
});

describe("spec 005 — traspasos", () => {
  it("test_s005_rf22_rf24_un_traspaso_interno_sale_y_entra_a_la_vez", async () => {
    const w = await inventoryWorld();
    await w.entry(w.ownerSendero, w.central.id, [{ productId: w.leche.id, quantity: "1000" }]);
    const t = await sendTransfer(w.ctx, w.ownerSendero, { fromWarehouseId: w.central.id, toWarehouseId: w.bodegaSendero.id, lines: [{ productId: w.leche.id, quantity: "400" }] });
    expect(t.status).toBe("done");
    expect((await row(w, w.ownerSendero, w.central.id, w.leche.id))?.quantity).toBe("600");
    expect((await row(w, w.ownerSendero, w.bodegaSendero.id, w.leche.id))?.quantity).toBe("400");
  });

  it("test_s005_rf23_origen_y_destino_distintos", async () => {
    const w = await inventoryWorld();
    expect(await code(sendTransfer(w.ctx, w.ownerSendero, { fromWarehouseId: w.central.id, toWarehouseId: w.central.id, lines: [{ productId: w.leche.id, quantity: "1" }] }))).toBe("same_warehouse");
  });

  it("test_s005_rf25_el_destino_interno_puede_ser_de_otra_sucursal", async () => {
    const w = await inventoryWorld();
    const dest = await transferDestinations(w.ctx, w.adminSendero);
    expect(dest[0]).toMatchObject({ name: "Pastatti", own: true });
    expect(dest[0].warehouses.map((x) => x.name)).toEqual(["Bodega Centro", "Bodega Sendero", "Central"]);
    await sendTransfer(w.ctx, w.adminSendero, { fromWarehouseId: w.bodegaSendero.id, toWarehouseId: w.bodegaCentro.id, lines: [{ productId: w.leche.id, quantity: "5" }] });
    expect((await row(w, w.ownerCentro, w.bodegaCentro.id, w.leche.id))?.quantity).toBe("5");
  });

  it("test_s005_rf26_rf27_rf28_entre_negocios_sale_y_queda_en_camino_por_recibir", async () => {
    const w = await inventoryWorld();
    await w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.queso.id, quantity: "3", presentationId: w.pieza.id }]);
    const t = await sendTransfer(w.ctx, w.adminSendero, { fromWarehouseId: w.bodegaSendero.id, toWarehouseId: w.bodegaPirrus.id, lines: [{ productId: w.queso.id, quantity: "2", presentationId: w.pieza.id }] });
    expect(t.status).toBe("in_transit");
    expect((await row(w, w.ownerSendero, w.bodegaSendero.id, w.queso.id))?.quantity).toBe("1");
    expect((await row(w, w.ownerPirrus, w.bodegaPirrus.id, w.quesoPirrus.id))?.quantity).toBe("0");
    const pirrus = await listTransfers(w.ctx, w.adminPirrus);
    expect(pirrus.incoming.map((x) => x.id)).toEqual([t.id]);
    expect(await pendingIncoming(w.ctx, w.adminPirrus)).toBe(1);
    expect((await listTransfers(w.ctx, w.adminSendero)).outgoing.map((x) => x.id)).toEqual([t.id]);
  });

  it("test_s005_rf29_solo_recibe_quien_puede_mover_en_el_destino", async () => {
    const w = await inventoryWorld();
    const t = await sendTransfer(w.ctx, w.ownerSendero, { fromWarehouseId: w.bodegaSendero.id, toWarehouseId: w.bodegaPirrus.id, lines: [{ productId: w.leche.id, quantity: "1" }] });
    expect(await code(receiveTransfer(w.ctx, w.adminSendero, t.id, []))).toBe("not_found");
  });

  it("test_s005_rf30_rf31_rf34_rf35_se_recibe_con_lo_que_llego_y_la_diferencia_queda", async () => {
    const w = await inventoryWorld();
    const t = await sendTransfer(w.ctx, w.ownerSendero, { fromWarehouseId: w.bodegaSendero.id, toWarehouseId: w.bodegaPirrus.id, lines: [{ productId: w.queso.id, quantity: "2000" }] });
    const d = await transferDetail(w.ctx, w.adminPirrus, t.id);
    expect(d.canReceive).toBe(true);
    expect(d.lines[0]).toMatchObject({ name: "Queso manchego", sent: "2000", proposedProductId: w.quesoPirrus.id });
    await receiveTransfer(w.ctx, w.adminPirrus, t.id, [{ lineId: d.lines[0].id, productId: d.lines[0].proposedProductId, quantity: "1800" }]);
    expect((await row(w, w.ownerPirrus, w.bodegaPirrus.id, w.quesoPirrus.id))?.quantity).toBe("1800");
    const pirrusView = await transferDetail(w.ctx, w.adminPirrus, t.id);
    const senderView = await transferDetail(w.ctx, w.adminSendero, t.id);
    for (const v of [pirrusView, senderView]) expect(v).toMatchObject({ status: "received", hasDifference: true, lines: [{ received: "1800", difference: "-200" }] });
    expect(pirrusView.receivedBy).toBe(w.pirrusAdmin.name);
  });

  it("test_s005_rf32_sin_producto_igual_hay_que_elegir_uno_con_la_misma_unidad", async () => {
    const w = await inventoryWorld();
    const t = await sendTransfer(w.ctx, w.ownerSendero, { fromWarehouseId: w.bodegaSendero.id, toWarehouseId: w.bodegaPirrus.id, lines: [{ productId: w.leche.id, quantity: "500" }] });
    const d = await transferDetail(w.ctx, w.adminPirrus, t.id);
    expect(d.lines[0].proposedProductId).toBeNull();
    const lineId = d.lines[0].id;
    expect(await code(receiveTransfer(w.ctx, w.adminPirrus, t.id, [{ lineId, productId: null, quantity: "500" }]))).toBe("product_required");
    expect(await code(receiveTransfer(w.ctx, w.adminPirrus, t.id, [{ lineId, productId: w.lechePirrus.id, quantity: "500" }]))).toBe("unit_mismatch");
    expect(await code(receiveTransfer(w.ctx, w.adminPirrus, t.id, [{ lineId, productId: w.cremaPirrus.id, quantity: "500" }]))).toBe("ok");
  });

  it("test_s005_rf33_la_eleccion_se_recuerda_para_el_siguiente_traspaso", async () => {
    const w = await inventoryWorld();
    const send = () => sendTransfer(w.ctx, w.ownerSendero, { fromWarehouseId: w.bodegaSendero.id, toWarehouseId: w.bodegaPirrus.id, lines: [{ productId: w.leche.id, quantity: "1" }] });
    const t1 = await send();
    const d1 = await transferDetail(w.ctx, w.adminPirrus, t1.id);
    await receiveTransfer(w.ctx, w.adminPirrus, t1.id, [{ lineId: d1.lines[0].id, productId: w.cremaPirrus.id, quantity: "1" }]);
    const t2 = await send();
    expect((await transferDetail(w.ctx, w.adminPirrus, t2.id)).lines[0].proposedProductId).toBe(w.cremaPirrus.id);
  });

  it("test_s005_rf36_cancelar_en_camino_devuelve_al_origen", async () => {
    const w = await inventoryWorld();
    await w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.leche.id, quantity: "10" }]);
    const t = await sendTransfer(w.ctx, w.ownerSendero, { fromWarehouseId: w.bodegaSendero.id, toWarehouseId: w.bodegaPirrus.id, lines: [{ productId: w.leche.id, quantity: "4" }] });
    expect(await code(cancelTransfer(w.ctx, w.adminPirrus, t.id, "no lo pedimos"))).toBe("not_found");
    await cancelTransfer(w.ctx, w.adminSendero, t.id, "se equivocó de negocio");
    expect((await row(w, w.ownerSendero, w.bodegaSendero.id, w.leche.id))?.quantity).toBe("10");
    expect((await transferDetail(w.ctx, w.ownerSendero, t.id)).cancelReason).toBe("se equivocó de negocio");
  });

  it("test_s005_rf37_no_se_recibe_lo_cancelado_ni_se_cancela_lo_recibido", async () => {
    const w = await inventoryWorld();
    const send = () => sendTransfer(w.ctx, w.ownerSendero, { fromWarehouseId: w.bodegaSendero.id, toWarehouseId: w.bodegaPirrus.id, lines: [{ productId: w.queso.id, quantity: "1" }] });
    const a = await send();
    const lineA = (await transferDetail(w.ctx, w.adminPirrus, a.id)).lines[0].id;
    await cancelTransfer(w.ctx, w.ownerSendero, a.id, "cancelado");
    expect(await code(receiveTransfer(w.ctx, w.adminPirrus, a.id, [{ lineId: lineA, productId: w.quesoPirrus.id, quantity: "1" }]))).toBe("transfer_state");
    const b = await send();
    const lineB = (await transferDetail(w.ctx, w.adminPirrus, b.id)).lines[0].id;
    await receiveTransfer(w.ctx, w.adminPirrus, b.id, [{ lineId: lineB, productId: w.quesoPirrus.id, quantity: "1" }]);
    expect(await code(cancelTransfer(w.ctx, w.ownerSendero, b.id, "tarde"))).toBe("transfer_state");
    expect(await code(receiveTransfer(w.ctx, w.adminPirrus, b.id, [{ lineId: lineB, productId: w.quesoPirrus.id, quantity: "1" }]))).toBe("transfer_state");
  });

  it("test_s005_rf38_quien_envia_solo_ve_nombres_del_destino", async () => {
    const w = await inventoryWorld();
    const t = await sendTransfer(w.ctx, w.adminSendero, { fromWarehouseId: w.bodegaSendero.id, toWarehouseId: w.bodegaPirrus.id, lines: [{ productId: w.queso.id, quantity: "1" }] });
    const v = await transferDetail(w.ctx, w.adminSendero, t.id);
    expect(v.to).toEqual({ business: "Pirrus", warehouse: "Bodega Pirrus" });
    expect(v.lines[0].proposedProductId).toBeNull();
    expect(v.canReceive).toBe(false);
    const dest = await transferDestinations(w.ctx, w.adminSendero);
    expect(dest.find((d) => d.name === "Pirrus")).toEqual({ id: w.pirrus.id, name: "Pirrus", own: false, warehouses: [{ id: w.bodegaPirrus.id, name: "Bodega Pirrus" }] });
  });

  it("test_s005_rf64_cancelar_un_traspaso_interno_revierte_salida_y_entrada", async () => {
    const w = await inventoryWorld();
    const t = await sendTransfer(w.ctx, w.ownerSendero, { fromWarehouseId: w.central.id, toWarehouseId: w.bodegaSendero.id, lines: [{ productId: w.leche.id, quantity: "7" }] });
    await cancelTransfer(w.ctx, w.ownerSendero, t.id, "no se movió");
    expect((await row(w, w.ownerSendero, w.central.id, w.leche.id))?.quantity).toBe("0");
    expect((await row(w, w.ownerSendero, w.bodegaSendero.id, w.leche.id))?.quantity).toBe("0");
    expect(await code(cancelTransfer(w.ctx, w.ownerSendero, t.id, "otra vez"))).toBe("transfer_state");
  });
});

describe("spec 005 — áreas y conteos", () => {
  it("test_s005_rf39_rf40_el_area_tiene_almacen_y_lista_ordenada", async () => {
    const w = await inventoryWorld();
    const a = await w.area(w.ownerSendero, "Lácteos");
    await setAreaProducts(w.ctx, w.ownerSendero, a.id, { warehouseId: w.bodegaSendero.id, productIds: [w.leche.id, w.queso.id] });
    const s = await areaSetup(w.ctx, w.ownerSendero, a.id);
    expect(s.area.warehouseId).toBe(w.bodegaSendero.id);
    expect(s.productIds).toEqual([w.leche.id, w.queso.id]);
    expect((await countSheet(w.ctx, w.ownerSendero, a.id)).lines.map((l) => l.name)).toEqual(["Leche", "Queso manchego"]);
    expect(await code(setAreaProducts(w.ctx, w.ownerSendero, a.id, { warehouseId: w.bodegaCentro.id, productIds: [] }))).toBe("not_found");
  });

  it("test_s005_rf41_un_producto_va_en_una_sola_area_por_almacen", async () => {
    const w = await inventoryWorld();
    const a = await w.area(w.ownerSendero, "Lácteos");
    const b = await w.area(w.ownerSendero, "Quesos");
    await setAreaProducts(w.ctx, w.ownerSendero, a.id, { warehouseId: w.bodegaSendero.id, productIds: [w.queso.id] });
    const e = await setAreaProducts(w.ctx, w.ownerSendero, b.id, { warehouseId: w.bodegaSendero.id, productIds: [w.queso.id] }).catch((x) => x);
    expect(e).toMatchObject({ code: "product_in_area", params: { product: "Queso manchego", area: "Lácteos" } });
    expect(await code(setAreaProducts(w.ctx, w.ownerSendero, b.id, { warehouseId: w.central.id, productIds: [w.queso.id] }))).toBe("ok");
  });

  it("test_s005_rf42_se_muestran_los_productos_sin_area_por_almacen", async () => {
    const w = await inventoryWorld();
    const a = await w.area(w.ownerSendero, "Lácteos");
    await setAreaProducts(w.ctx, w.ownerSendero, a.id, { warehouseId: w.bodegaSendero.id, productIds: [w.queso.id] });
    const board = await countBoard(w.ctx, w.ownerSendero);
    expect(board.withoutArea).toEqual([
      { warehouseId: w.bodegaSendero.id, warehouseName: "Bodega Sendero", products: ["Leche"] },
      { warehouseId: w.central.id, warehouseName: "Central", products: ["Leche", "Queso manchego"] },
    ]);
    await setArchived(w.ctx, w.ownerSendero, "areas", a.id, true);
    expect((await countBoard(w.ctx, w.ownerSendero)).withoutArea[0].products).toEqual(["Leche", "Queso manchego"]);
  });

  it("test_s005_rf43_cuenta_quien_puede_mover_en_el_almacen_del_area", async () => {
    const w = await inventoryWorld();
    const a = await w.area(w.ownerSendero, "Lácteos");
    await setAreaProducts(w.ctx, w.ownerSendero, a.id, { warehouseId: w.bodegaSendero.id, productIds: [w.leche.id] });
    expect(await code(countSheet(w.ctx, w.adminSendero, a.id))).toBe("ok");
    expect(await code(countSheet(w.ctx, w.adminPirrus, a.id))).toBe("not_found");
    expect(await code(countSheet(w.ctx, w.ownerCentro, a.id))).toBe("not_found");
    const sinLista = await w.area(w.ownerSendero, "Bebidas");
    expect(await code(countSheet(w.ctx, w.ownerSendero, sinLista.id))).toBe("area_without_warehouse");
  });

  it("test_s005_rf44_el_conteo_muestra_lo_esperado_en_presentacion_de_conteo", async () => {
    const w = await inventoryWorld();
    const a = await w.area(w.ownerSendero, "Lácteos");
    await setAreaProducts(w.ctx, w.ownerSendero, a.id, { warehouseId: w.bodegaSendero.id, productIds: [w.queso.id] });
    await w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.queso.id, quantity: "2500" }]);
    expect((await countSheet(w.ctx, w.ownerSendero, a.id)).lines[0]).toMatchObject({ expected: "2.5", presentation: "Pieza", seen: "2500.000000" });
  });

  it("test_s005_rf45_rf49_rf53_aplicar_deja_lo_contado_y_registra_la_diferencia", async () => {
    const w = await inventoryWorld();
    const a = await w.area(w.ownerSendero, "Lácteos");
    await setAreaProducts(w.ctx, w.ownerSendero, a.id, { warehouseId: w.bodegaSendero.id, productIds: [w.queso.id, w.leche.id] });
    await w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.queso.id, quantity: "3000" }, { productId: w.leche.id, quantity: "800" }]);
    const sheet = await countSheet(w.ctx, w.ownerSendero, a.id);
    const seen = (id: string) => sheet.lines.find((l) => l.productId === id)!.seen;
    await applyCount(w.ctx, w.ownerSendero, { areaId: a.id, lines: [{ productId: w.queso.id, quantity: "2", presentationId: w.pieza.id, seen: seen(w.queso.id) }, { productId: w.leche.id, quantity: "0", seen: seen(w.leche.id) }] });
    expect((await row(w, w.ownerSendero, w.bodegaSendero.id, w.queso.id))?.quantity).toBe("2");
    expect((await row(w, w.ownerSendero, w.bodegaSendero.id, w.leche.id))?.quantity).toBe("0");
    const h = await productHistory(w.ctx, w.ownerSendero, w.bodegaSendero.id, w.queso.id, null);
    expect(h.entries[0]).toMatchObject({ kind: "count", delta: "-1", balance: "2" });
  });

  it("test_s005_rf50_lo_no_capturado_no_cambia", async () => {
    const w = await inventoryWorld();
    const a = await w.area(w.ownerSendero, "Lácteos");
    await setAreaProducts(w.ctx, w.ownerSendero, a.id, { warehouseId: w.bodegaSendero.id, productIds: [w.queso.id, w.leche.id] });
    await w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.leche.id, quantity: "800" }]);
    await applyCount(w.ctx, w.ownerSendero, { areaId: a.id, lines: [{ productId: w.queso.id, quantity: "1", seen: "0" }] });
    expect((await row(w, w.ownerSendero, w.bodegaSendero.id, w.leche.id))?.quantity).toBe("800");
  });

  it("test_s005_rf51_rf52_si_cambio_mientras_contaba_pide_confirmar_y_compara_con_lo_actual", async () => {
    const w = await inventoryWorld();
    const a = await w.area(w.ownerSendero, "Lácteos");
    await setAreaProducts(w.ctx, w.ownerSendero, a.id, { warehouseId: w.bodegaSendero.id, productIds: [w.leche.id] });
    await w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.leche.id, quantity: "500" }]);
    const sheet = await countSheet(w.ctx, w.ownerSendero, a.id);
    await w.entry(w.adminSendero, w.bodegaSendero.id, [{ productId: w.leche.id, quantity: "300" }]);
    const lines = [{ productId: w.leche.id, quantity: "600", seen: sheet.lines[0].seen }];
    const e = await applyCount(w.ctx, w.ownerSendero, { areaId: a.id, lines }).catch((x) => x);
    expect(e).toMatchObject({ code: "count_changed", params: { products: "Leche" } });
    expect((await row(w, w.ownerSendero, w.bodegaSendero.id, w.leche.id))?.quantity).toBe("800");
    await applyCount(w.ctx, w.ownerSendero, { areaId: a.id, lines, confirm: true });
    const h = await productHistory(w.ctx, w.ownerSendero, w.bodegaSendero.id, w.leche.id, null);
    expect(h.entries[0]).toMatchObject({ kind: "count", delta: "-200", balance: "600" });
  });

  it("test_s005_rf54_el_area_muestra_su_ultimo_conteo", async () => {
    const w = await inventoryWorld();
    const a = await w.area(w.ownerSendero, "Lácteos");
    await setAreaProducts(w.ctx, w.ownerSendero, a.id, { warehouseId: w.bodegaSendero.id, productIds: [w.leche.id] });
    expect((await countBoard(w.ctx, w.ownerSendero)).areas[0].lastCount).toBeNull();
    await applyCount(w.ctx, w.adminSendero, { areaId: a.id, lines: [{ productId: w.leche.id, quantity: "1", seen: "0" }] });
    w.ctx.clock.advanceMinutes(10);
    await applyCount(w.ctx, w.ownerSendero, { areaId: a.id, lines: [{ productId: w.leche.id, quantity: "2", seen: "1.000000" }] });
    expect((await countBoard(w.ctx, w.ownerSendero)).areas[0]).toMatchObject({ name: "Lácteos", products: 1, warehouse: { name: "Bodega Sendero" }, lastCount: { author: w.owner.name, at: w.ctx.clock.now().toISOString() } });
  });
});
