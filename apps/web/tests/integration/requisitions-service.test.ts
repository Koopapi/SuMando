// Spec 007: requisiciones contra la BD de pruebas (armado, aprobación, compra, recepción, cierre, plantillas).
import { describe, expect, it } from "vitest";
import { setArchived } from "@/server/services/catalog/archive";
import { setLevel } from "@/server/services/catalog/levels";
import { addPresentation, createProduct, updateProduct } from "@/server/services/catalog/products";
import { createSupplier } from "@/server/services/catalog/suppliers";
import { listMovements, movementDetail } from "@/server/services/inventory/movements";
import { stockOfWarehouse } from "@/server/services/inventory/stock";
import { saveCalculation } from "@/server/services/recipes/calculations";
import { createRecipe } from "@/server/services/recipes/recipes";
import { approveRequisition, cancelRequisition, closeLines, createRequisition, listRequisitions, receiveRequisition, rejectRequisition, requisitionCounts, requisitionDetail, suggestLines, updateGroup, updateRequisition } from "@/server/services/requisitions/requisitions";
import { listPurchaseTemplates, renamePurchaseTemplate, savePurchaseTemplate, setPurchaseTemplateArchived } from "@/server/services/requisitions/templates";
import { code, inventoryWorld } from "./inventory-fixture";

async function world() {
  const w = await inventoryWorld();
  const heineken = await createSupplier(w.ctx, w.ownerSendero, { name: "Heineken" });
  const sams = await createSupplier(w.ctx, w.ownerSendero, { name: "Sams" });
  const cerveza = await createProduct(w.ctx, w.ownerSendero, { name: "Cerveza", baseUnit: "pz", supplierId: heineken.id });
  const carton = await addPresentation(w.ctx, w.ownerSendero, cerveza.id, { name: "Cartón", factor: "24" });
  await updateProduct(w.ctx, w.ownerSendero, cerveza.id, { purchasePresentationId: carton.id });
  await updateProduct(w.ctx, w.ownerSendero, w.leche.id, { supplierId: sams.id });
  await setLevel(w.ctx, w.ownerSendero, cerveza.id, { warehouseId: w.bodegaSendero.id, presentationId: carton.id, min: "3", max: "6" });
  await w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: cerveza.id, quantity: "30" }]);
  const lines = [
    { productId: cerveza.id, quantity: "5", presentationId: carton.id, supplierId: heineken.id },
    { productId: w.leche.id, quantity: "2000", supplierId: sams.id },
  ];
  const request = (scope = w.adminSendero, l: unknown = lines) => createRequisition(w.ctx, scope, { warehouseId: w.bodegaSendero.id, lines: l, note: "Para el fin de semana" });
  return { ...w, heineken, sams, cerveza, carton, lines, request };
}
type W = Awaited<ReturnType<typeof world>>;
const detail = (w: W, id: string, scope = w.ownerSendero) => requisitionDetail(w.ctx, scope, id);
const groupOf = async (w: W, id: string, supplier: string) => (await detail(w, id)).groups.find((g) => g.supplierName === supplier)!;

async function approved(w: W) {
  const r = await w.request();
  await approveRequisition(w.ctx, w.ownerSendero, r.id);
  return r;
}

describe("spec 007 — armar y solicitar", () => {
  it("test_s007_rf1_rf2_rf3_la_requisicion_es_de_la_sucursal_con_folio_por_negocio", async () => {
    const w = await world();
    const a = await w.request();
    const b = await w.request(w.ownerSendero);
    expect([a.folio, b.folio]).toEqual([1, 2]);
    expect((await listRequisitions(w.ctx, w.ownerSendero)).map((r) => r.folio)).toEqual([2, 1]);
    expect(await listRequisitions(w.ctx, w.ownerCentro)).toEqual([]);
  });

  it("test_s007_rf4_rf6_permisos_y_aislamiento", async () => {
    const w = await world();
    expect(await code(createRequisition(w.ctx, w.adminSendero, { warehouseId: w.bodegaCentro.id, lines: w.lines }))).toBe("not_found");
    const r = await w.request();
    expect(await code(detail(w, r.id, w.ownerCentro))).toBe("not_found");
    expect(await code(detail(w, r.id, w.adminPirrus))).toBe("not_found");
    expect(await code(detail(w, "no-es-uuid"))).toBe("not_found");
  });

  it("test_s007_rf5_solo_el_dueno_aprueba_o_rechaza", async () => {
    const w = await world();
    const r = await w.request();
    expect(await code(approveRequisition(w.ctx, w.adminSendero, r.id))).toBe("forbidden");
    expect(await code(rejectRequisition(w.ctx, w.adminSendero, r.id, "no"))).toBe("forbidden");
  });

  it("test_s007_rf7_rf8_rf9_renglones_con_presentacion_y_proveedor", async () => {
    const w = await world();
    const r = await w.request();
    const d = await detail(w, r.id);
    expect(d.lines.map((l) => [l.name, l.quantity, l.presentation.name, l.supplierId])).toEqual([
      ["Cerveza", "5", "Cartón", w.heineken.id],
      ["Leche", "2000", null, w.sams.id],
    ]);
    expect(await code(w.request(w.adminSendero, [{ productId: w.leche.id, quantity: "0" }]))).toBe("invalid_line_quantity");
    expect(await code(w.request(w.adminSendero, [{ productId: w.quesoPirrus.id, quantity: "1" }]))).toBe("not_found");
  });

  it("test_s007_rf10_rf11_repetidos_se_suman_y_vacia_no_se_envia", async () => {
    const w = await world();
    const r = await w.request(w.adminSendero, [{ productId: w.leche.id, quantity: "500" }, { productId: w.leche.id, quantity: "250" }]);
    expect((await detail(w, r.id)).lines.map((l) => l.quantity)).toEqual(["750"]);
    expect(await code(w.request(w.adminSendero, []))).toBe("requisition_empty");
  });

  it("test_s007_rf12_se_agrupa_por_proveedor_con_sin_proveedor", async () => {
    const w = await world();
    const r = await w.request(w.adminSendero, [...w.lines, { productId: w.queso.id, quantity: "1" }]);
    expect((await detail(w, r.id)).groups.map((g) => [g.supplierName, g.lineIds.length])).toEqual([["Heineken", 1], ["Sams", 1], [null, 1]]);
  });

  it("test_s007_rf13_rf24_mientras_esta_solicitada_se_edita", async () => {
    const w = await world();
    const r = await w.request();
    await updateRequisition(w.ctx, w.adminSendero, r.id, { lines: [{ productId: w.leche.id, quantity: "100" }], note: "solo leche" });
    const d = await detail(w, r.id);
    expect(d.lines.map((l) => l.name)).toEqual(["Leche"]);
    expect(d.note).toBe("solo leche");
    await approveRequisition(w.ctx, w.ownerSendero, r.id);
    expect(await code(updateRequisition(w.ctx, w.adminSendero, r.id, { lines: w.lines }))).toBe("requisition_state");
  });

  it("test_s007_rf14_rf15_desde_minimos_lo_que_falta_al_maximo_en_cartones", async () => {
    const w = await world();
    const { lines } = await suggestLines(w.ctx, w.adminSendero, { warehouseId: w.bodegaSendero.id, source: "minimums" });
    // Hay 30 piezas (1.25 cartones), máximo 6: faltan 114 piezas → 5 cartones.
    expect(lines).toEqual([{ productId: w.cerveza.id, name: "Cerveza", baseUnit: "pz", presentationId: w.carton.id, quantity: "5", supplierId: w.heineken.id }]);
  });

  it("test_s007_rf16_rf17_desde_un_calculo_de_insumos", async () => {
    const w = await world();
    const recipe = await createRecipe(w.ctx, w.ownerSendero, { name: "Michelada", ingredients: [{ productId: w.cerveza.id, quantity: "1" }, { productId: w.leche.id, quantity: "10" }] });
    const calc = await saveCalculation(w.ctx, w.ownerSendero, [{ recipeId: recipe.id, full: 30, half: 0 }]);
    await setArchived(w.ctx, w.ownerSendero, "products", w.leche.id, true);
    const { lines, skipped } = await suggestLines(w.ctx, w.adminSendero, { warehouseId: w.bodegaSendero.id, source: "calculation", id: calc.id });
    expect(lines.map((l) => [l.name, l.quantity])).toEqual([["Cerveza", "2"]]);
    expect(skipped).toEqual(["Leche"]);
    expect(await code(suggestLines(w.ctx, w.ownerCentro, { warehouseId: w.bodegaCentro.id, source: "calculation", id: calc.id }))).toBe("not_found");
  });

  it("test_s007_rf18_rf19_rf20_plantillas_de_compra", async () => {
    const w = await world();
    const t = await savePurchaseTemplate(w.ctx, w.adminSendero, { name: "Sábado Sams", lines: w.lines });
    expect(await code(savePurchaseTemplate(w.ctx, w.adminSendero, { name: "sabado sams", lines: w.lines }))).toBe("template_exists");
    await savePurchaseTemplate(w.ctx, w.adminSendero, { name: "sabado sams", lines: [{ productId: w.leche.id, quantity: "1000" }], replace: true });
    const { lines } = await suggestLines(w.ctx, w.adminSendero, { warehouseId: w.bodegaSendero.id, source: "template", id: t.id });
    expect(lines.map((l) => [l.name, l.quantity, l.supplierId])).toEqual([["Leche", "1000", w.sams.id]]);
    await renamePurchaseTemplate(w.ctx, w.adminSendero, t.id, "Compra de leche");
    await setPurchaseTemplateArchived(w.ctx, w.adminSendero, t.id, true);
    expect(await listPurchaseTemplates(w.ctx, w.adminSendero)).toEqual([{ id: t.id, name: "Compra de leche", archived: true, lines: 1 }]);
    expect(await listPurchaseTemplates(w.ctx, w.ownerCentro)).toEqual([]);
  });

  it("test_s007_rf21_rf22_rf23_estado_al_enviar_segun_quien_la_envia", async () => {
    const w = await world();
    const a = await w.request();
    const b = await w.request(w.ownerSendero);
    expect((await detail(w, a.id)).status).toBe("requested");
    expect((await detail(w, a.id)).note).toBe("Para el fin de semana");
    expect((await detail(w, b.id)).status).toBe("approved");
    expect(await code(createRequisition(w.ctx, w.adminSendero, { warehouseId: w.bodegaSendero.id, lines: w.lines, note: "x".repeat(201) }))).toBe("validation");
  });
});

describe("spec 007 — aprobación, compra y recepción", () => {
  it("test_s007_rf25_el_dueno_aprueba_con_cambios_y_queda_lo_solicitado", async () => {
    const w = await world();
    const r = await w.request();
    await approveRequisition(w.ctx, w.ownerSendero, r.id, { lines: [{ productId: w.cerveza.id, quantity: "3", presentationId: w.carton.id, supplierId: w.heineken.id }] });
    const d = await detail(w, r.id);
    expect(d.status).toBe("approved");
    expect(d.lines.map((l) => [l.name, l.requested, l.quantity])).toEqual([["Cerveza", "5", "3"]]);
    expect(d.events.find((e) => e.kind === "approved")?.detail).toMatchObject({ changes: expect.arrayContaining([expect.objectContaining({ productId: w.leche.id, to: null })]) });
  });

  it("test_s007_rf26_se_rechaza_con_motivo", async () => {
    const w = await world();
    const r = await w.request();
    expect(await code(rejectRequisition(w.ctx, w.ownerSendero, r.id, ""))).toBe("reason_required");
    await rejectRequisition(w.ctx, w.ownerSendero, r.id, "Todavía hay suficiente");
    const d = await detail(w, r.id);
    expect(d.status).toBe("rejected");
    expect(d.events.at(-1)).toMatchObject({ kind: "rejected", detail: { reason: "Todavía hay suficiente" } });
  });

  it("test_s007_rf27_se_anota_quien_compra_por_proveedor", async () => {
    const w = await world();
    const r = await approved(w);
    const g = await groupOf(w, r.id, "Sams");
    await updateGroup(w.ctx, w.adminSendero, r.id, g.id!, { buyer: "  Encargado de compras " });
    expect((await groupOf(w, r.id, "Sams")).buyer).toBe("Encargado de compras");
    expect(await code(updateGroup(w.ctx, w.adminSendero, r.id, g.id!, { buyer: "x".repeat(61) }))).toBe("buyer_too_long");
  });

  it("test_s007_rf28_se_cancela_si_no_se_ha_recibido_nada", async () => {
    const w = await world();
    const a = await approved(w);
    await cancelRequisition(w.ctx, w.adminSendero, a.id, "Se compró por otro lado");
    expect((await detail(w, a.id)).status).toBe("cancelled");
    const b = await approved(w);
    const g = await groupOf(w, b.id, "Sams");
    await updateGroup(w.ctx, w.adminSendero, b.id, g.id!, { purchased: true });
    await receiveRequisition(w.ctx, w.adminSendero, b.id, { groupId: g.id, lines: [{ lineId: g.lineIds[0], quantity: "100" }] });
    expect(await code(cancelRequisition(w.ctx, w.adminSendero, b.id, "tarde"))).toBe("requisition_state");
  });

  it("test_s007_rf29_rf30_rf31_rf32_rf33_compra_con_importes_opcionales", async () => {
    const w = await world();
    const r = await approved(w);
    const sams = await groupOf(w, r.id, "Sams");
    expect(sams.status).toBe("to_buy");
    await updateGroup(w.ctx, w.adminSendero, r.id, sams.id!, { purchased: true, total: "1,250.50" });
    expect(await groupOf(w, r.id, "Sams")).toMatchObject({ status: "purchased", total: "1250.50", totalFromLines: false, purchasedBy: w.senderoAdmin.name });
    await updateGroup(w.ctx, w.adminSendero, r.id, sams.id!, { amounts: [{ lineId: sams.lineIds[0], amount: "980" }] });
    expect(await groupOf(w, r.id, "Sams")).toMatchObject({ total: "980.00", totalFromLines: true });
    expect(await code(updateGroup(w.ctx, w.adminSendero, r.id, sams.id!, { total: "-5" }))).toBe("invalid_amount");
    expect((await detail(w, r.id)).total).toBe("980.00");
    await receiveRequisition(w.ctx, w.adminSendero, r.id, { groupId: sams.id, lines: [{ lineId: sams.lineIds[0], quantity: "100" }] });
    expect(await code(updateGroup(w.ctx, w.adminSendero, r.id, sams.id!, { total: "10" }))).toBe("requisition_state");
  });

  it("test_s007_rf34_rf35_rf36_recibir_genera_la_entrada_con_el_folio", async () => {
    const w = await world();
    const r = await approved(w);
    const g = await groupOf(w, r.id, "Heineken");
    expect(await code(receiveRequisition(w.ctx, w.adminSendero, r.id, { groupId: g.id, lines: [{ lineId: g.lineIds[0], quantity: "1" }] }))).toBe("not_purchased");
    await updateGroup(w.ctx, w.adminSendero, r.id, g.id!, { purchased: true });
    w.ctx.clock.advanceMinutes(1);
    await receiveRequisition(w.ctx, w.adminSendero, r.id, { groupId: g.id, lines: [{ lineId: g.lineIds[0], quantity: "4", presentationId: w.carton.id }] });
    const stock = (await stockOfWarehouse(w.ctx, w.ownerSendero, w.bodegaSendero.id)).rows.find((x) => x.name === "Cerveza");
    expect(stock?.quantity).toBe("126");
    const [m] = (await listMovements(w.ctx, w.ownerSendero, { kind: "entry" })).movements;
    expect(await movementDetail(w.ctx, w.ownerSendero, m.id)).toMatchObject({ reference: `REQ-${r.folio}`, supplier: "Heineken" });
  });

  it("test_s007_rf37_rf38_parcial_pendiente_y_excedente", async () => {
    const w = await world();
    const r = await approved(w);
    const g = await groupOf(w, r.id, "Sams");
    await updateGroup(w.ctx, w.adminSendero, r.id, g.id!, { purchased: true });
    await receiveRequisition(w.ctx, w.adminSendero, r.id, { groupId: g.id, lines: [{ lineId: g.lineIds[0], quantity: "1500" }] });
    let line = (await detail(w, r.id)).lines.find((l) => l.name === "Leche")!;
    expect([line.received, line.pending, line.excess]).toEqual(["1500", "500", "0"]);
    expect((await groupOf(w, r.id, "Sams")).status).toBe("partial");
    await receiveRequisition(w.ctx, w.adminSendero, r.id, { groupId: g.id, lines: [{ lineId: g.lineIds[0], quantity: "700" }] });
    line = (await detail(w, r.id)).lines.find((l) => l.name === "Leche")!;
    expect([line.received, line.pending, line.excess]).toEqual(["2200", "0", "200"]);
  });

  it("test_s007_rf39_rf40_cerrar_lo_pendiente_y_cerrar_la_requisicion", async () => {
    const w = await world();
    const r = await approved(w);
    const sams = await groupOf(w, r.id, "Sams");
    const hk = await groupOf(w, r.id, "Heineken");
    await updateGroup(w.ctx, w.adminSendero, r.id, sams.id!, { purchased: true });
    await receiveRequisition(w.ctx, w.adminSendero, r.id, { groupId: sams.id, lines: [{ lineId: sams.lineIds[0], quantity: "2000" }] });
    expect((await detail(w, r.id)).status).toBe("approved");
    expect(await code(closeLines(w.ctx, w.adminSendero, r.id, { lineIds: hk.lineIds, reason: "" }))).toBe("reason_required");
    await closeLines(w.ctx, w.adminSendero, r.id, { lineIds: hk.lineIds, reason: "No había en existencia" });
    const d = await detail(w, r.id);
    expect(d.status).toBe("closed");
    expect(d.lines.find((l) => l.name === "Cerveza")?.closed).toMatchObject({ reason: "No había en existencia" });
    expect(d.events.map((e) => e.kind)).toEqual(["requested", "approved", "purchased", "received", "lines_closed", "closed"]);
  });

  it("test_s007_rf41_no_se_recibe_en_almacen_o_producto_archivado", async () => {
    const w = await world();
    const r = await approved(w);
    const g = await groupOf(w, r.id, "Sams");
    await updateGroup(w.ctx, w.adminSendero, r.id, g.id!, { purchased: true });
    await setArchived(w.ctx, w.ownerSendero, "products", w.leche.id, true);
    expect(await code(receiveRequisition(w.ctx, w.adminSendero, r.id, { groupId: g.id, lines: [{ lineId: g.lineIds[0], quantity: "1" }] }))).toBe("archived_item");
  });

  it("test_s007_rf34_dos_recepciones_simultaneas_no_se_pisan", async () => {
    const w = await world();
    const r = await approved(w);
    const g = await groupOf(w, r.id, "Sams");
    await updateGroup(w.ctx, w.adminSendero, r.id, g.id!, { purchased: true });
    await Promise.all([1, 2, 3].map(() => receiveRequisition(w.ctx, w.adminSendero, r.id, { groupId: g.id, lines: [{ lineId: g.lineIds[0], quantity: "100" }] })));
    expect((await detail(w, r.id)).lines.find((l) => l.name === "Leche")?.received).toBe("300");
  });
});

describe("spec 007 — consulta", () => {
  it("test_s007_rf42_rf43_lista_con_filtro_por_estado_y_total", async () => {
    const w = await world();
    const a = await approved(w);
    const b = await w.request();
    const g = await groupOf(w, a.id, "Sams");
    await updateGroup(w.ctx, w.adminSendero, a.id, g.id!, { purchased: true, total: "500" });
    const all = await listRequisitions(w.ctx, w.ownerSendero);
    expect(all.map((x) => [x.folio, x.status, x.total, x.pending, x.lines])).toEqual([
      [b.folio, "requested", null, false, 2],
      [a.folio, "approved", "500.00", true, 2],
    ]);
    expect((await listRequisitions(w.ctx, w.ownerSendero, "requested")).map((x) => x.folio)).toEqual([b.folio]);
    expect(await code(listRequisitions(w.ctx, w.ownerSendero, "perdida"))).toBe("validation");
  });

  it("test_s007_rf44_el_historial_dice_quien_y_cuando", async () => {
    const w = await world();
    const r = await w.request();
    w.ctx.clock.advanceMinutes(30);
    await approveRequisition(w.ctx, w.ownerSendero, r.id);
    const d = await detail(w, r.id);
    expect(d.events.map((e) => [e.kind, e.actor])).toEqual([["requested", w.senderoAdmin.name], ["approved", w.owner.name]]);
    expect(d.events[1].at).toBe(w.ctx.clock.now().toISOString());
  });

  it("test_s007_rf45_la_entrada_lleva_el_enlace_a_su_requisicion", async () => {
    const w = await world();
    const r = await approved(w);
    const g = await groupOf(w, r.id, "Sams");
    await updateGroup(w.ctx, w.adminSendero, r.id, g.id!, { purchased: true });
    w.ctx.clock.advanceMinutes(1);
    await receiveRequisition(w.ctx, w.adminSendero, r.id, { groupId: g.id, lines: [{ lineId: g.lineIds[0], quantity: "10" }] });
    const [m] = (await listMovements(w.ctx, w.ownerSendero, { kind: "entry" })).movements;
    expect((await movementDetail(w.ctx, w.ownerSendero, m.id)).requisition).toEqual({ id: r.id, folio: r.folio });
  });

  it("test_s007_rf46_no_hay_borrado", async () => {
    const w = await world();
    expect(Object.keys(w.ctx.store.requisitions.requisitions)).not.toContain("delete");
  });

  it("test_s007_rf47_conteos_para_el_inicio", async () => {
    const w = await world();
    await w.request();
    await approved(w);
    expect(await requisitionCounts(w.ctx, w.ownerSendero)).toEqual({ toApprove: 1, toReceive: 1 });
    expect(await requisitionCounts(w.ctx, w.adminSendero)).toEqual({ toApprove: null, toReceive: 1 });
  });
});
