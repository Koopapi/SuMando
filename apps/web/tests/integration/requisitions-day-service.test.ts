// Spec 013: requisiciones en el día a día contra la BD de pruebas (comprador habitual, requisición por comprador,
// lista por WhatsApp, datos de compra y armado).
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { requisitionGroups } from "@/db/schema";
import { auditEntriesFor } from "@/server/adapters/drizzle/store";
import { setArchived } from "@/server/services/catalog/archive";
import { setLevel } from "@/server/services/catalog/levels";
import { addPresentation, createProduct, updateProduct } from "@/server/services/catalog/products";
import { purchaseData, savePurchaseData } from "@/server/services/catalog/purchase-data";
import { listSupplierBuyers, setSupplierBuyer } from "@/server/services/catalog/supplier-buyers";
import { createSupplier } from "@/server/services/catalog/suppliers";
import { createEmployee, terminateEmployee } from "@/server/services/personnel/employees";
import { createPosition } from "@/server/services/personnel/positions";
import { approveRequisition, builderData, createRequisition, receiveRequisition, requisitionDetail, suggestLines, updateGroup } from "@/server/services/requisitions/requisitions";
import { eq } from "drizzle-orm";
import { code, inventoryWorld } from "./inventory-fixture";

async function world() {
  const w = await inventoryWorld();
  const sams = await createSupplier(w.ctx, w.ownerSendero, { name: "Sams" });
  const costco = await createSupplier(w.ctx, w.ownerSendero, { name: "Costco" });
  const plasticos = await createSupplier(w.ctx, w.ownerSendero, { name: "Plásticos" });
  const comprador = await createPosition(w.ctx, w.ownerSendero, "Comprador");
  const person = (name: string, phone: string | null, scope = w.ownerSendero) => createEmployee(w.ctx, scope, { name, positionId: comprador.id, hiredOn: "2026-01-05", phone });
  const ana = await person("Ana Compras", "55 1234 5678");
  const beto = await person("Beto Mandados", null);
  const deCentro = await person("Carla Centro", "5511112222", w.ownerCentro);
  const harina = await createProduct(w.ctx, w.ownerSendero, { name: "Harina", baseUnit: "g", supplierId: sams.id });
  const bolsa = await addPresentation(w.ctx, w.ownerSendero, harina.id, { name: "Bulto", factor: "20000" });
  await updateProduct(w.ctx, w.ownerSendero, harina.id, { purchasePresentationId: bolsa.id });
  const queso = w.queso;
  await updateProduct(w.ctx, w.ownerSendero, queso.id, { supplierId: costco.id });
  const vasos = await createProduct(w.ctx, w.ownerSendero, { name: "Vasos", baseUnit: "pz", supplierId: plasticos.id });
  const lines = [
    { productId: harina.id, quantity: "2", presentationId: bolsa.id, supplierId: sams.id },
    { productId: queso.id, quantity: "3", presentationId: w.pieza.id, supplierId: costco.id },
    { productId: vasos.id, quantity: "100", supplierId: plasticos.id },
    { productId: w.leche.id, quantity: "1000", supplierId: null },
  ];
  const request = (scope = w.adminSendero) => createRequisition(w.ctx, scope, { warehouseId: w.bodegaSendero.id, lines, note: "Antes de las 10" });
  return { ...w, sams, costco, plasticos, ana, beto, deCentro, harina, bolsa, vasos, lines, request, person };
}
type W = Awaited<ReturnType<typeof world>>;
const detail = (w: W, id: string, scope = w.ownerSendero) => requisitionDetail(w.ctx, scope, id);

describe("spec 013 — comprador habitual", () => {
  it("test_s013_rf1_rf3_se_asigna_y_quita_el_comprador_habitual_por_sucursal", async () => {
    const w = await world();
    await setSupplierBuyer(w.ctx, w.adminSendero, w.sams.id, w.ana.id);
    await setSupplierBuyer(w.ctx, w.adminSendero, w.costco.id, w.ana.id);
    await setSupplierBuyer(w.ctx, w.adminSendero, w.plasticos.id, w.beto.id);
    const view = await listSupplierBuyers(w.ctx, w.adminSendero);
    expect(view.buyers.map((b) => [b.supplierId, b.name]).sort()).toEqual([[w.costco.id, "Ana Compras"], [w.plasticos.id, "Beto Mandados"], [w.sams.id, "Ana Compras"]].sort());
    expect(view.employees.map((e) => e.name)).toEqual(["Ana Compras", "Beto Mandados"]);
    // En otra sucursal del mismo negocio no hay asignación.
    expect((await listSupplierBuyers(w.ctx, w.ownerCentro)).buyers).toEqual([]);
    await setSupplierBuyer(w.ctx, w.adminSendero, w.plasticos.id, null);
    expect((await listSupplierBuyers(w.ctx, w.adminSendero)).buyers).toHaveLength(2);
  });

  it("test_s013_rf1_solo_personal_activo_de_la_sucursal", async () => {
    const w = await world();
    expect(await code(setSupplierBuyer(w.ctx, w.ownerSendero, w.sams.id, w.deCentro.id))).toBe("buyer_not_in_branch");
    await terminateEmployee(w.ctx, w.ownerSendero, w.beto.id, { leftOn: "2026-11-10", reason: "resignation" });
    expect(await code(setSupplierBuyer(w.ctx, w.ownerSendero, w.sams.id, w.beto.id))).toBe("buyer_not_in_branch");
    await setArchived(w.ctx, w.ownerSendero, "suppliers", w.costco.id, true);
    expect(await code(setSupplierBuyer(w.ctx, w.ownerSendero, w.costco.id, w.ana.id))).toBe("supplier_archived");
  });

  it("test_s013_rf2_permisos_y_aislamiento", async () => {
    const w = await world();
    // Un administrador de otro negocio no ve el proveedor; el de Sendero no administra Centro.
    expect(await code(setSupplierBuyer(w.ctx, w.adminPirrus, w.sams.id, w.ana.id))).toBe("not_found");
    expect(await code(listSupplierBuyers(w.ctx, { ...w.adminSendero, active: w.ownerCentro.active }))).toBe("forbidden");
    await setSupplierBuyer(w.ctx, w.adminSendero, w.sams.id, w.ana.id);
    const [entry] = (await auditEntriesFor(db, "supplier", w.sams.id)).filter((e) => e.action === "supplier.buyer_set");
    expect(entry.after).toEqual({ employeeId: w.ana.id });
  });
});

describe("spec 013 — comprador en la requisición", () => {
  it("test_s013_rf4_al_aprobar_cada_proveedor_toma_su_comprador_habitual", async () => {
    const w = await world();
    await setSupplierBuyer(w.ctx, w.ownerSendero, w.sams.id, w.ana.id);
    await setSupplierBuyer(w.ctx, w.ownerSendero, w.plasticos.id, w.beto.id);
    const r = await w.request();
    await approveRequisition(w.ctx, w.ownerSendero, r.id);
    const groups = (await detail(w, r.id)).groups;
    expect(groups.map((g) => [g.supplierName, g.buyer]).sort()).toEqual([["Costco", null], ["Plásticos", "Beto Mandados"], ["Sams", "Ana Compras"], [null, null]].sort());
  });

  it("test_s013_rf4_lo_que_envia_el_dueno_nace_con_sus_compradores", async () => {
    const w = await world();
    await setSupplierBuyer(w.ctx, w.ownerSendero, w.costco.id, w.ana.id);
    const r = await w.request(w.ownerSendero);
    expect((await detail(w, r.id)).groups.find((g) => g.supplierName === "Costco")?.buyer).toBe("Ana Compras");
  });

  it("test_s013_rf10_mientras_esta_solicitada_se_ve_el_comprador_habitual", async () => {
    const w = await world();
    await setSupplierBuyer(w.ctx, w.ownerSendero, w.sams.id, w.ana.id);
    const r = await w.request();
    const d = await detail(w, r.id);
    expect(d.groups.find((g) => g.supplierName === "Sams")).toMatchObject({ buyer: null, habitualBuyer: "Ana Compras" });
    expect(d.buyers).toEqual([]);
  });

  it("test_s013_rf5_se_cambia_o_quita_el_comprador_mientras_no_se_reciba", async () => {
    const w = await world();
    const r = await w.request();
    await approveRequisition(w.ctx, w.ownerSendero, r.id);
    const sams = (await detail(w, r.id)).groups.find((g) => g.supplierName === "Sams")!;
    await updateGroup(w.ctx, w.adminSendero, r.id, sams.id!, { buyerEmployeeId: w.beto.id });
    expect((await detail(w, r.id)).groups.find((g) => g.id === sams.id)).toMatchObject({ buyer: "Beto Mandados", buyerEmployeeId: w.beto.id });
    expect(await code(updateGroup(w.ctx, w.adminSendero, r.id, sams.id!, { buyerEmployeeId: w.deCentro.id }))).toBe("buyer_not_in_branch");
    await updateGroup(w.ctx, w.adminSendero, r.id, sams.id!, { buyerEmployeeId: null });
    expect((await detail(w, r.id)).groups.find((g) => g.id === sams.id)?.buyer).toBeNull();
    await updateGroup(w.ctx, w.adminSendero, r.id, sams.id!, { purchased: true });
    await receiveRequisition(w.ctx, w.adminSendero, r.id, { groupId: sams.id, lines: [{ lineId: sams.lineIds[0], quantity: "1", presentationId: w.bolsa.id }] });
    expect(await code(updateGroup(w.ctx, w.adminSendero, r.id, sams.id!, { buyerEmployeeId: w.ana.id }))).toBe("requisition_state");
  });

  it("test_s013_rf6_si_el_comprador_se_da_de_baja_conserva_su_nombre_marcado", async () => {
    const w = await world();
    await setSupplierBuyer(w.ctx, w.ownerSendero, w.plasticos.id, w.beto.id);
    const r = await w.request();
    await approveRequisition(w.ctx, w.ownerSendero, r.id);
    await terminateEmployee(w.ctx, w.ownerSendero, w.beto.id, { leftOn: "2026-11-10", reason: "resignation" });
    const d = await detail(w, r.id);
    expect(d.groups.find((g) => g.supplierName === "Plásticos")).toMatchObject({ buyer: "Beto Mandados", buyerInactive: true });
    expect(d.buyers.find((b) => b.name === "Beto Mandados")?.inactive).toBe(true);
    expect(d.staff.map((s) => s.name)).toEqual(["Ana Compras"]);
  });

  it("test_s013_rf7_el_comprador_escrito_antes_se_conserva", async () => {
    const w = await world();
    const r = await w.request();
    await approveRequisition(w.ctx, w.ownerSendero, r.id);
    const costco = (await detail(w, r.id)).groups.find((g) => g.supplierName === "Costco")!;
    // Así quedaron las requisiciones de la spec 007: un nombre escrito a mano.
    await db.update(requisitionGroups).set({ buyer: "Don Pepe" }).where(eq(requisitionGroups.id, costco.id!));
    const d = await detail(w, r.id);
    expect(d.groups.find((g) => g.id === costco.id)).toMatchObject({ buyer: "Don Pepe", buyerEmployeeId: null, buyerInactive: false });
    expect(d.buyers.map((b) => b.name)).toContain("Don Pepe");
  });
});

describe("spec 013 — requisición por comprador y lista por WhatsApp", () => {
  async function split(w: W) {
    await setSupplierBuyer(w.ctx, w.ownerSendero, w.sams.id, w.ana.id);
    await setSupplierBuyer(w.ctx, w.ownerSendero, w.costco.id, w.ana.id);
    await setSupplierBuyer(w.ctx, w.ownerSendero, w.plasticos.id, w.beto.id);
    const r = await w.request();
    await approveRequisition(w.ctx, w.ownerSendero, r.id);
    return r;
  }

  it("test_s013_rf8_rf9_la_aprobada_se_divide_por_comprador", async () => {
    const w = await world();
    const r = await split(w);
    const costco = (await detail(w, r.id)).groups.find((g) => g.supplierName === "Costco")!;
    await updateGroup(w.ctx, w.adminSendero, r.id, costco.id!, { purchased: true });
    const d = await detail(w, r.id);
    expect(d.buyers.map((b) => [b.name, b.groupIds.length, b.counts])).toEqual([
      ["Ana Compras", 2, { toBuy: 1, purchased: 1, received: 0 }],
      ["Beto Mandados", 1, { toBuy: 1, purchased: 0, received: 0 }],
      [null, 1, { toBuy: 1, purchased: 0, received: 0 }],
    ]);
  });

  it("test_s013_rf11_rf12_rf13_el_mensaje_lleva_lo_que_falta_por_comprar_al_telefono_del_comprador", async () => {
    const w = await world();
    const r = await split(w);
    const costco = (await detail(w, r.id)).groups.find((g) => g.supplierName === "Costco")!;
    await updateGroup(w.ctx, w.adminSendero, r.id, costco.id!, { purchased: true });
    const ana = (await detail(w, r.id)).buyers[0];
    expect(ana.message).toBe(["Compra de Pastatti · Sendero · REQ-" + r.folio, "", "*Sams*", "• Harina: 2 Bulto", "", "Nota: Antes de las 10"].join("\n"));
    expect(ana.link).toBe(`https://wa.me/525512345678?text=${encodeURIComponent(ana.message!)}`);
    expect(ana.missingPhone).toBe(false);
  });

  it("test_s013_rf14_sin_telefono_el_enlace_no_lleva_destinatario", async () => {
    const w = await world();
    const r = await split(w);
    const beto = (await detail(w, r.id)).buyers.find((b) => b.name === "Beto Mandados")!;
    expect(beto.link?.startsWith("https://wa.me/?text=")).toBe(true);
    expect(beto.missingPhone).toBe(true);
    expect(beto.message).toContain("• Vasos: 100 pz");
  });

  it("test_s013_rf11_rf15_sin_nada_por_comprar_o_fuera_de_aprobada_no_hay_mensaje", async () => {
    const w = await world();
    const r = await split(w);
    const d = await detail(w, r.id);
    for (const g of d.groups) await updateGroup(w.ctx, w.adminSendero, r.id, g.id!, { purchased: true });
    expect((await detail(w, r.id)).buyers.every((b) => b.message === null && b.link === null)).toBe(true);
  });
});

describe("spec 013 — datos de compra", () => {
  async function stocked(w: W) {
    await setLevel(w.ctx, w.ownerSendero, w.harina.id, { warehouseId: w.bodegaSendero.id, presentationId: w.bolsa.id, min: "2", max: "5" });
    await w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.vasos.id, quantity: "150" }]);
    const sinUso = await createProduct(w.ctx, w.ownerSendero, { name: "Sin uso", baseUnit: "pz" });
    return { sinUso };
  }
  const save = (w: W, changes: unknown[], scope = w.ownerSendero, warehouseId: string = w.bodegaSendero.id) => savePurchaseData(w.ctx, scope, { warehouseId, changes });
  const rowOf = async (w: W, id: string) => (await purchaseData(w.ctx, w.ownerSendero, w.bodegaSendero.id)).rows.find((r) => r.productId === id);

  it("test_s013_rf17_rf19_filas_del_almacen_en_su_presentacion_de_compra", async () => {
    const w = await world();
    const { sinUso } = await stocked(w);
    const view = await purchaseData(w.ctx, w.adminSendero, w.bodegaSendero.id);
    const ids = view.rows.map((r) => r.productId);
    expect(ids).toEqual(expect.arrayContaining([w.harina.id, w.vasos.id]));
    expect(ids).not.toContain(sinUso.id);
    expect(view.rows.find((r) => r.productId === w.harina.id)).toMatchObject({ supplierId: w.sams.id, purchasePresentationId: w.bolsa.id, min: "2", max: "5", stock: "0" });
    expect(view.rows.find((r) => r.productId === w.vasos.id)).toMatchObject({ purchasePresentationId: null, min: null, max: null, stock: "150" });
    expect(view.suppliers.map((s) => s.name)).toEqual(["Costco", "Plásticos", "Sams"]);
  });

  it("test_s013_rf18_rf20_se_guardan_varios_cambios_juntos_con_presentacion_nueva", async () => {
    const w = await world();
    await stocked(w);
    // RF-20: la presentación nueva se crea con el catálogo (spec 003) y se elige en la fila.
    const caja = await addPresentation(w.ctx, w.ownerSendero, w.vasos.id, { name: "Caja", factor: "50" });
    const result = await save(w, [
      { productId: w.vasos.id, purchasePresentationId: caja.id, supplierId: w.costco.id, min: "2", max: "4" },
      { productId: w.harina.id, max: "6" },
    ]);
    expect(result).toEqual({ saved: 2, errors: [] });
    expect(await rowOf(w, w.vasos.id)).toMatchObject({ supplierId: w.costco.id, purchasePresentationId: caja.id, min: "2", max: "4", stock: "3" });
    expect((await w.ctx.store.catalog.levels.find(w.vasos.id, w.bodegaSendero.id))?.minBase).toMatch(/^100(\.0+)?$/);
    expect(await rowOf(w, w.harina.id)).toMatchObject({ min: "2", max: "6" });
  });

  it("test_s013_rf19_sin_presentacion_de_compra_se_captura_en_unidad_base", async () => {
    const w = await world();
    await stocked(w);
    await save(w, [{ productId: w.vasos.id, min: "40", max: "" }]);
    expect(await rowOf(w, w.vasos.id)).toMatchObject({ min: "40", max: null });
  });

  it("test_s013_rf21_una_fila_con_error_no_impide_guardar_las_demas", async () => {
    const w = await world();
    await stocked(w);
    const result = await save(w, [
      { productId: w.harina.id, max: "1" },
      { productId: w.vasos.id, min: "abc" },
      { productId: w.vasos.id, min: "10" },
      { productId: "00000000-0000-0000-0000-000000000000", min: "1" },
    ]);
    expect(result.saved).toBe(1);
    expect(result.errors.map((e) => e.code)).toEqual(["max_below_min", "invalid_quantity", "not_found"]);
    expect(result.errors[0]).toMatchObject({ productId: w.harina.id, message: expect.any(String) });
    expect(await rowOf(w, w.harina.id)).toMatchObject({ min: "2", max: "5" });
    expect((await rowOf(w, w.vasos.id))?.min).toBe("10");
  });

  it("test_s013_rf23_solo_con_catalogo_y_movimientos_en_el_almacen", async () => {
    const w = await world();
    await stocked(w);
    expect(await code(purchaseData(w.ctx, w.adminSendero, w.bodegaCentro.id))).toBe("not_found");
    expect(await code(save(w, [{ productId: w.harina.id, min: "1" }], w.adminPirrus))).toBe("not_found");
    expect(await code(save(w, [{ productId: w.harina.id, min: "1" }], w.adminSendero, w.bodegaCentro.id))).toBe("not_found");
    // Un producto de otro negocio no existe aquí.
    expect((await save(w, [{ productId: w.quesoPirrus.id, min: "1" }])).errors[0].code).toBe("not_found");
  });

  it("test_s013_rf24_cada_cambio_queda_en_el_registro", async () => {
    const w = await world();
    await stocked(w);
    await save(w, [{ productId: w.vasos.id, supplierId: null, min: "5" }], w.adminSendero);
    const entries = await auditEntriesFor(db, "product", w.vasos.id);
    expect(entries.find((e) => e.action === "product.updated")).toMatchObject({ actorId: w.senderoAdmin.id, after: expect.objectContaining({ supplierId: null, via: "purchase_data" }) });
    const level = await w.ctx.store.catalog.levels.find(w.vasos.id, w.bodegaSendero.id);
    expect((await auditEntriesFor(db, "stock_level", level!.id))[0]).toMatchObject({ action: "stock_level.set", actorId: w.senderoAdmin.id });
  });

  it("test_s013_rf18_volumen_300_cambios_en_menos_de_2_segundos", async () => {
    const w = await world();
    const ids: string[] = [];
    for (let i = 0; i < 300; i++) ids.push((await createProduct(w.ctx, w.ownerSendero, { name: `Producto ${i}`, baseUnit: "pz" })).id);
    const started = performance.now();
    const result = await save(w, ids.map((productId, i) => ({ productId, supplierId: w.sams.id, min: String(i + 1), max: String(i + 10) })));
    const saveMs = performance.now() - started;
    const t2 = performance.now();
    const view = await purchaseData(w.ctx, w.ownerSendero, w.bodegaSendero.id);
    const readMs = performance.now() - t2;
    expect(result).toEqual({ saved: 300, errors: [] });
    expect(view.rows.length).toBeGreaterThanOrEqual(300);
    expect(saveMs).toBeLessThan(2000);
    expect(readMs).toBeLessThan(2000);
  });
});

describe("spec 013 — armar la requisición", () => {
  it("test_s013_rf32_desde_los_minimos_se_cuentan_los_que_entran_sin_maximo", async () => {
    const w = await world();
    await setLevel(w.ctx, w.ownerSendero, w.harina.id, { warehouseId: w.bodegaSendero.id, presentationId: w.bolsa.id, min: "2", max: "5" });
    await setLevel(w.ctx, w.ownerSendero, w.vasos.id, { warehouseId: w.bodegaSendero.id, min: "100" });
    const s = await suggestLines(w.ctx, w.adminSendero, { warehouseId: w.bodegaSendero.id, source: "minimums" });
    expect(s.lines.map((l) => [l.name, l.quantity])).toEqual([["Harina", "5"], ["Vasos", "100"]]);
    expect(s.withoutMax).toBe(1);
  });

  it("test_s013_rf30_existencia_minimo_y_maximo_en_cada_presentacion", async () => {
    const w = await world();
    await setLevel(w.ctx, w.ownerSendero, w.harina.id, { warehouseId: w.bodegaSendero.id, presentationId: w.bolsa.id, min: "2", max: "5" });
    await w.entry(w.ownerSendero, w.bodegaSendero.id, [{ productId: w.harina.id, quantity: "30000" }]);
    const data = await builderData(w.ctx, w.adminSendero);
    const harina = data.levels[w.bodegaSendero.id][w.harina.id];
    expect(harina[w.bolsa.id]).toEqual({ stock: "1.5", min: "2", max: "5" });
    expect(harina[""]).toEqual({ stock: "30000", min: "40000", max: "100000" });
    expect(data.levels[w.bodegaSendero.id][w.vasos.id]).toBeUndefined();
  });
});
