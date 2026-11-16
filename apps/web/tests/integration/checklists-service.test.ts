// Spec 010: checklists contra la BD de pruebas (plantillas, hoja del día, palomitas, fotos, lista, cierre, teléfono
// de piso, permisos y registro). El reloj de pruebas está en el miércoles 11 de noviembre de 2026.
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { auditEntriesFor } from "@/server/adapters/drizzle/store";
import { deviceActor, type ChecklistActor } from "@/server/services/checklists/actor";
import { disableFloorDevice, enableFloorDevice, floorDeviceFromToken, floorEmployees, listFloorDevices } from "@/server/services/checklists/floor";
import { allOk, checkItem, checklistPhoto, closeSheet, commentItem, photoItem, reopenSection, sectionReady, sheetHistory, sheetView, todayChecklists } from "@/server/services/checklists/sheets";
import { createTemplate, getTemplate, listTemplates, saveTemplate, setTemplateArchived } from "@/server/services/checklists/templates";
import { createEmployee, terminateEmployee } from "@/server/services/personnel/employees";
import { createPosition } from "@/server/services/personnel/positions";
import { catalogWorld } from "./catalog-fixture";
import { code } from "./inventory-fixture";

const TODAY = "2026-11-11";
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const PDF = new TextEncoder().encode("%PDF-1.7");
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

async function world() {
  const w = await catalogWorld();
  const cocina = await createPosition(w.ctx, w.ownerSendero, "Cocina");
  const caja = await createPosition(w.ctx, w.ownerSendero, "Caja");
  const input = (extra: Record<string, unknown> = {}) => ({
    name: "Apertura",
    days: ALL_DAYS,
    branchIds: [w.sendero.id],
    sections: [
      { name: "Caja", positionId: caja.id, items: [{ text: "Fondo de caja contado", kind: "check", isKey: true }, { text: "Terminal encendida", kind: "check" }] },
      {
        name: "Cocina",
        positionId: cocina.id,
        items: [
          { text: "Gas abierto", kind: "check", isKey: true },
          { text: "Refrigerador a temperatura", kind: "photo", isKey: true },
          { text: "Mesas limpias", kind: "check" },
          { text: "Observaciones", kind: "comment" },
        ],
      },
    ],
    ...extra,
  });
  const t = await createTemplate(w.ctx, w.ownerSendero, input());
  const user = (scope = w.adminSendero): ChecklistActor => ({ kind: "user", scope });
  const item = (text: string) => t.sections.flatMap((s) => s.items).find((i) => i.text === text)!.id;
  const section = (name: string) => t.sections.find((s) => s.name === name)!.id;
  const employee = await createEmployee(w.ctx, w.ownerSendero, { name: "Cocinera Uno", positionId: cocina.id, hiredOn: "2026-10-01" });
  const phone = async () => {
    const { token, device } = await enableFloorDevice(w.ctx, w.adminSendero, "Tablet de cocina");
    const base = await floorDeviceFromToken(w.ctx, token);
    return { token, device, as: (employeeId: string | null = employee.id) => deviceActor(w.ctx, base, employeeId) };
  };
  return { ...w, cocina, caja, input, t, user, item, section, employee, phone };
}

describe("spec 010 — plantillas", () => {
  it("test_s010_rf1_rf2_plantillas_del_negocio", async () => {
    const w = await world();
    expect((await listTemplates(w.ctx, w.adminSendero)).map((t) => t.name)).toEqual(["Apertura"]);
    expect(await listTemplates(w.ctx, w.ownerPirrus)).toEqual([]);
    expect(await code(getTemplate(w.ctx, w.adminPirrus, w.t.id))).toBe("not_found");
  });

  it("test_s010_rf6_rf7_sucursales_y_dias_obligatorios", async () => {
    const w = await world();
    expect(await code(createTemplate(w.ctx, w.ownerSendero, w.input({ name: "Cierre", days: [] })))).toBe("template_scope");
    expect(await code(createTemplate(w.ctx, w.ownerSendero, w.input({ name: "Cierre", branchIds: [] })))).toBe("template_scope");
    expect(await code(createTemplate(w.ctx, w.ownerSendero, w.input({ name: "Cierre", branchIds: [w.pirrusCentro.id] })))).toBe("not_found");
    const c = await createTemplate(w.ctx, w.ownerSendero, w.input({ name: "Cierre", days: [4, 5, 6], branchIds: [w.sendero.id, w.centro.id] }));
    expect([c.days, c.branchIds.length]).toEqual([[4, 5, 6], 2]);
  });

  it("test_s010_rf8_nombre_unico_entre_activas", async () => {
    const w = await world();
    expect(await code(createTemplate(w.ctx, w.ownerSendero, w.input({ name: "apertura " })))).toBe("duplicate_name");
    await setTemplateArchived(w.ctx, w.ownerSendero, w.t.id, true);
    await createTemplate(w.ctx, w.ownerSendero, w.input());
    expect(await code(setTemplateArchived(w.ctx, w.ownerSendero, w.t.id, false))).toBe("duplicate_name");
  });

  it("test_s010_rf9_rf10_rf11_secciones_puntos_tipos_y_clave", async () => {
    const w = await world();
    expect(w.t.sections.map((s) => [s.name, s.positionId])).toEqual([
      ["Caja", w.caja.id],
      ["Cocina", w.cocina.id],
    ]);
    expect(w.t.sections[1].items.map((i) => [i.kind, i.isKey])).toEqual([
      ["check", true],
      ["photo", true],
      ["check", false],
      ["comment", false],
    ]);
    const bad = (items: unknown[]) => code(createTemplate(w.ctx, w.ownerSendero, w.input({ name: "Otra", sections: [{ name: "S", items }] })));
    expect(await bad([{ text: "x", kind: "numero" }])).toBe("validation");
    expect(await bad([{ text: "Notas", kind: "comment", isKey: true }])).toBe("validation");
    expect(await bad([{ text: "x".repeat(201), kind: "check" }])).toBe("validation");
  });

  it("test_s010_rf12_rf13_orden_y_archivado_al_guardar", async () => {
    const w = await world();
    const [caja, cocina] = w.t.sections;
    const saved = await saveTemplate(w.ctx, w.ownerSendero, w.t.id, { ...w.input(), sections: [{ ...cocina, items: cocina.items.slice(1) }, caja] });
    expect(saved.sections.map((s) => s.name)).toEqual(["Cocina", "Caja"]);
    expect(saved.sections[0].items.map((i) => i.text)).toEqual(["Refrigerador a temperatura", "Mesas limpias", "Observaciones"]);
    expect(saved.sections[0].id).toBe(cocina.id);
  });

  it("test_s010_rf14_cambiar_la_plantilla_no_toca_la_hoja_abierta", async () => {
    const w = await world();
    await checkItem(w.ctx, w.user(), w.t.id, TODAY, w.item("Terminal encendida"), true);
    const [caja] = w.t.sections;
    await saveTemplate(w.ctx, w.ownerSendero, w.t.id, { ...w.input(), sections: [{ ...caja, name: "Caja registradora" }] });
    const v = await sheetView(w.ctx, w.user(), w.t.id, TODAY);
    expect(v.sections.map((s) => s.name)).toEqual(["Caja", "Cocina"]);
  });
});

describe("spec 010 — hoja del día", () => {
  it("test_s010_rf3_rf4_rf5_la_hoja_es_de_la_sucursal_activa", async () => {
    const w = await world();
    await checkItem(w.ctx, w.user(), w.t.id, TODAY, w.item("Terminal encendida"), true);
    expect(await code(sheetView(w.ctx, w.user(w.ownerCentro), w.t.id, TODAY))).toBe("not_found");
    expect(await code(sheetView(w.ctx, w.user(w.adminPirrus), w.t.id, TODAY))).toBe("not_found");
    expect((await sheetHistory(w.ctx, w.user(w.ownerCentro))).length).toBe(0);
  });

  it("test_s010_rf15_rf17_la_primera_marca_abre_una_sola_hoja", async () => {
    const w = await world();
    expect((await sheetView(w.ctx, w.user(), w.t.id, TODAY)).status).toBe("new");
    await Promise.all([checkItem(w.ctx, w.user(), w.t.id, TODAY, w.item("Terminal encendida"), true), checkItem(w.ctx, w.user(w.ownerSendero), w.t.id, TODAY, w.item("Mesas limpias"), true)]);
    const v = await sheetView(w.ctx, w.user(), w.t.id, TODAY);
    expect(v.status).toBe("open");
    expect(v.sections.flatMap((s) => s.items).filter((i) => i.done).length).toBe(2);
    expect((await sheetHistory(w.ctx, w.user())).length).toBe(1);
  });

  it("test_s010_rf16_rf18_hoy_muestra_lo_que_aplica", async () => {
    const w = await world();
    await createTemplate(w.ctx, w.ownerSendero, w.input({ name: "Fin de semana", days: [4, 5, 6] }));
    await createTemplate(w.ctx, w.ownerSendero, w.input({ name: "Solo Centro", branchIds: [w.centro.id] }));
    expect((await todayChecklists(w.ctx, w.user())).map((t) => [t.name, t.status, t.sections])).toEqual([["Apertura", "new", 2]]);
    w.ctx.clock.advanceDays(2);
    expect((await todayChecklists(w.ctx, w.user())).map((t) => t.name)).toEqual(["Apertura", "Fin de semana"]);
  });

  it("test_s010_rf19_primero_las_secciones_del_puesto_de_quien_llena", async () => {
    const w = await world();
    const p = await w.phone();
    expect((await sheetView(w.ctx, await p.as(), w.t.id, TODAY)).sections.map((s) => [s.name, s.mine])).toEqual([
      ["Cocina", true],
      ["Caja", false],
    ]);
  });

  it("test_s010_rf20_rf21_palomita_con_quien_y_hora_y_se_puede_quitar", async () => {
    const w = await world();
    let v = await checkItem(w.ctx, w.user(), w.t.id, TODAY, w.item("Gas abierto"), true);
    const gas = v.sections.flatMap((s) => s.items).find((i) => i.text === "Gas abierto")!;
    expect([gas.done, gas.markedBy, gas.markedAt]).toEqual([true, "Admin sendero@mando.test", "2026-11-11T12:00:00.000Z"]);
    v = await checkItem(w.ctx, w.user(), w.t.id, TODAY, w.item("Gas abierto"), false);
    expect(v.sections.flatMap((s) => s.items).find((i) => i.text === "Gas abierto")!.done).toBe(false);
  });

  it("test_s010_rf22_rf23_la_foto_es_obligatoria_y_se_valida", async () => {
    const w = await world();
    const fridge = w.item("Refrigerador a temperatura");
    expect(await code(checkItem(w.ctx, w.user(), w.t.id, TODAY, fridge, true))).toBe("photo_required");
    expect(await code(photoItem(w.ctx, w.user(), w.t.id, TODAY, fridge, PDF))).toBe("file_type");
    expect(await code(photoItem(w.ctx, w.user(), w.t.id, TODAY, fridge, new Uint8Array(10 * 1024 * 1024 + 1).fill(0xff)))).toBe("file_size");
    const v = await photoItem(w.ctx, w.user(), w.t.id, TODAY, fridge, JPG);
    const i = v.sections.flatMap((s) => s.items).find((x) => x.itemId === fridge)!;
    expect(i.done).toBe(true);
    expect((await checklistPhoto(w.ctx, w.user(), i.photoId)).contentType).toBe("image/jpeg");
  });

  it("test_s010_rf24_comentario_de_hasta_500", async () => {
    const w = await world();
    const obs = w.item("Observaciones");
    expect(await code(commentItem(w.ctx, w.user(), w.t.id, TODAY, obs, "x".repeat(501)))).toBe("validation");
    const v = await commentItem(w.ctx, w.user(), w.t.id, TODAY, obs, "Faltó hielo");
    expect(v.sections.flatMap((s) => s.items).find((i) => i.itemId === obs)!.comment).toBe("Faltó hielo");
  });

  it("test_s010_rf25_rf26_todo_en_orden_no_toca_clave_ni_foto", async () => {
    const w = await world();
    const v = await allOk(w.ctx, w.user(), w.t.id, TODAY, w.section("Cocina"));
    const cocina = v.sections.find((s) => s.name === "Cocina")!;
    expect(cocina.items.map((i) => [i.text, i.done])).toEqual([
      ["Gas abierto", false],
      ["Refrigerador a temperatura", false],
      ["Mesas limpias", true],
      ["Observaciones", false],
    ]);
  });

  it("test_s010_rf27_rf28_rf29_lista_exige_clave_y_bloquea", async () => {
    const w = await world();
    expect(await code(sectionReady(w.ctx, w.user(), w.t.id, TODAY, w.section("Cocina")))).toBe("key_pending");
    await checkItem(w.ctx, w.user(), w.t.id, TODAY, w.item("Gas abierto"), true);
    await photoItem(w.ctx, w.user(), w.t.id, TODAY, w.item("Refrigerador a temperatura"), JPG);
    const v = await sectionReady(w.ctx, w.user(), w.t.id, TODAY, w.section("Cocina"));
    expect(v.sections.find((s) => s.name === "Cocina")).toMatchObject({ ready: true, readyBy: "Admin sendero@mando.test" });
    expect(await code(checkItem(w.ctx, w.user(), w.t.id, TODAY, w.item("Mesas limpias"), true))).toBe("section_ready");
  });

  it("test_s010_rf30_rf35_reabrir_seccion_reabre_la_hoja", async () => {
    const w = await world();
    await checkItem(w.ctx, w.user(), w.t.id, TODAY, w.item("Fondo de caja contado"), true);
    await sectionReady(w.ctx, w.user(), w.t.id, TODAY, w.section("Caja"));
    await checkItem(w.ctx, w.user(), w.t.id, TODAY, w.item("Gas abierto"), true);
    await photoItem(w.ctx, w.user(), w.t.id, TODAY, w.item("Refrigerador a temperatura"), JPG);
    const closed = await sectionReady(w.ctx, w.user(), w.t.id, TODAY, w.section("Cocina"));
    expect(closed.status).toBe("closed");
    const v = await reopenSection(w.ctx, w.user(), w.t.id, TODAY, w.section("Caja"));
    expect([v.status, v.sections.find((s) => s.name === "Caja")!.ready]).toEqual(["open", false]);
  });

  it("test_s010_rf31_la_ultima_seccion_lista_cierra_la_hoja", async () => {
    const w = await world();
    await checkItem(w.ctx, w.user(), w.t.id, TODAY, w.item("Fondo de caja contado"), true);
    await sectionReady(w.ctx, w.user(), w.t.id, TODAY, w.section("Caja"));
    await checkItem(w.ctx, w.user(), w.t.id, TODAY, w.item("Gas abierto"), true);
    await photoItem(w.ctx, w.user(), w.t.id, TODAY, w.item("Refrigerador a temperatura"), JPG);
    const v = await sectionReady(w.ctx, w.user(), w.t.id, TODAY, w.section("Cocina"));
    expect([v.status, v.pending]).toEqual(["closed", []]);
  });

  it("test_s010_rf32_rf33_rf34_cerrar_con_pendientes", async () => {
    const w = await world();
    await checkItem(w.ctx, w.user(), w.t.id, TODAY, w.item("Fondo de caja contado"), true);
    await sectionReady(w.ctx, w.user(), w.t.id, TODAY, w.section("Caja"));
    const v = await closeSheet(w.ctx, w.user(), w.t.id, TODAY);
    expect(v.status).toBe("closed");
    expect(v.closedBy).toBe("Admin sendero@mando.test");
    expect(v.pending).toEqual([{ sectionId: w.section("Cocina"), name: "Cocina", keyItems: ["Gas abierto", "Refrigerador a temperatura"] }]);
    expect(await code(checkItem(w.ctx, w.user(), w.t.id, TODAY, w.item("Mesas limpias"), true))).toBe("sheet_closed");
    expect(await code(closeSheet(w.ctx, w.user(), w.t.id, TODAY))).toBe("sheet_closed");
  });

  it("test_s010_rf36_la_hoja_de_ayer_solo_se_cierra", async () => {
    const w = await world();
    await checkItem(w.ctx, w.user(), w.t.id, TODAY, w.item("Terminal encendida"), true);
    w.ctx.clock.advanceDays(1);
    expect(await code(checkItem(w.ctx, w.user(), w.t.id, TODAY, w.item("Mesas limpias"), true))).toBe("sheet_past");
    expect((await sheetView(w.ctx, w.user(), w.t.id, TODAY)).editable).toBe(false);
    expect((await closeSheet(w.ctx, w.user(), w.t.id, TODAY)).status).toBe("closed");
  });

  it("test_s010_rf46_rf47_historial_con_pendientes_y_quien", async () => {
    const w = await world();
    await checkItem(w.ctx, w.user(), w.t.id, TODAY, w.item("Fondo de caja contado"), true);
    await sectionReady(w.ctx, w.user(), w.t.id, TODAY, w.section("Caja"));
    await closeSheet(w.ctx, w.user(w.ownerSendero), w.t.id, TODAY);
    expect(await sheetHistory(w.ctx, w.user())).toEqual([{ templateId: w.t.id, templateName: "Apertura", date: TODAY, status: "closed", pending: 1, closedBy: "Dueño de prueba" }]);
    const v = await sheetView(w.ctx, w.user(), w.t.id, TODAY);
    expect(v.sections.find((s) => s.name === "Caja")).toMatchObject({ readyBy: "Admin sendero@mando.test" });
  });

  it("test_s010_rf49_cambios_en_el_registro", async () => {
    const w = await world();
    await checkItem(w.ctx, w.user(), w.t.id, TODAY, w.item("Terminal encendida"), true);
    await closeSheet(w.ctx, w.user(), w.t.id, TODAY);
    await saveTemplate(w.ctx, w.ownerSendero, w.t.id, w.input({ name: "Apertura diaria" }));
    expect((await auditEntriesFor(db, "checklist_template", w.t.id)).map((a) => a.action).reverse()).toEqual(["checklist_template.created", "checklist_template.updated"]);
    const sheet = (await w.ctx.store.checklists.sheets.find(w.t.id, w.sendero.id, TODAY))!;
    expect((await auditEntriesFor(db, "checklist_sheet", sheet.id)).map((a) => a.action).reverse()).toEqual(["checklist_sheet.opened", "checklist_sheet.closed"]);
  });
});

describe("spec 010 — teléfono de piso", () => {
  it("test_s010_rf37_rf43_habilitar_y_listar", async () => {
    const w = await world();
    const p = await w.phone();
    expect(await code(enableFloorDevice(w.ctx, w.adminSendero, ""))).toBe("name_invalid");
    expect((await listFloorDevices(w.ctx, w.ownerSendero)).map((d) => [d.name, d.enabledBy, d.disabledAt])).toEqual([["Tablet de cocina", "Admin sendero@mando.test", null]]);
    expect((await listFloorDevices(w.ctx, w.ownerSendero))[0].lastUsedAt).not.toBeNull();
    expect(p.device.tokenHash).not.toBe(p.token);
    expect(await listFloorDevices(w.ctx, w.ownerCentro)).toEqual([]);
  });

  it("test_s010_rf38_solo_hojas_de_hoy_de_su_sucursal", async () => {
    const w = await world();
    const p = await w.phone();
    const actor = await p.as();
    expect((await todayChecklists(w.ctx, actor)).map((t) => t.name)).toEqual(["Apertura"]);
    expect(await code(sheetView(w.ctx, actor, w.t.id, "2026-11-10"))).toBe("not_today");
    const other = await createTemplate(w.ctx, w.ownerPirrus, { ...w.input(), branchIds: [w.pirrusCentro.id], sections: [] });
    expect(await code(sheetView(w.ctx, actor, other.id, TODAY))).toBe("not_found");
  });

  it("test_s010_rf40_rf41_el_empleado_elige_su_nombre_y_queda_con_el_telefono", async () => {
    const w = await world();
    const p = await w.phone();
    expect(await code(checkItem(w.ctx, await p.as(null), w.t.id, TODAY, w.item("Gas abierto"), true))).toBe("employee_required");
    const out = await createEmployee(w.ctx, w.ownerSendero, { name: "Ya se fue", positionId: w.cocina.id, hiredOn: "2026-01-01" });
    await terminateEmployee(w.ctx, w.ownerSendero, out.id, { leftOn: "2026-11-01", reason: "resignation" });
    expect(await code(p.as(out.id))).toBe("employee_required");
    expect((await floorEmployees(w.ctx, w.sendero.id, w.pastatti.id)).map((e) => e.name)).toEqual(["Cocinera Uno"]);
    const v = await checkItem(w.ctx, await p.as(), w.t.id, TODAY, w.item("Gas abierto"), true);
    expect(v.sections[0].items[0]).toMatchObject({ markedBy: "Cocinera Uno", device: "Tablet de cocina" });
  });

  it("test_s010_rf42_rf44_queda_habilitado_hasta_que_lo_deshabilitan", async () => {
    const w = await world();
    const p = await w.phone();
    w.ctx.clock.advanceDays(400);
    expect((await floorDeviceFromToken(w.ctx, p.token)).device.id).toBe(p.device.id);
    await disableFloorDevice(w.ctx, w.adminSendero, p.device.id);
    expect(await code(floorDeviceFromToken(w.ctx, p.token))).toBe("device_disabled");
    expect(await code(disableFloorDevice(w.ctx, w.ownerCentro, p.device.id))).toBe("not_found");
  });

  it("test_s010_rf45_el_telefono_no_cierra_ni_reabre", async () => {
    const w = await world();
    const p = await w.phone();
    expect(await code(closeSheet(w.ctx, await p.as(), w.t.id, TODAY))).toBe("forbidden");
    expect(await code(reopenSection(w.ctx, await p.as(), w.t.id, TODAY, w.section("Caja")))).toBe("forbidden");
    expect(await code(sheetHistory(w.ctx, await p.as()))).toBe("forbidden");
  });

  it("test_s010_rf48_fotos_para_el_telefono_solo_con_la_hoja_abierta", async () => {
    const w = await world();
    const p = await w.phone();
    const v = await photoItem(w.ctx, await p.as(), w.t.id, TODAY, w.item("Refrigerador a temperatura"), JPG);
    const photoId = v.sections.flatMap((s) => s.items).find((i) => i.photoId)!.photoId;
    expect((await checklistPhoto(w.ctx, await p.as(), photoId)).bytes.length).toBe(JPG.length);
    await closeSheet(w.ctx, w.user(), w.t.id, TODAY);
    expect(await code(checklistPhoto(w.ctx, await p.as(), photoId))).toBe("not_found");
    expect((await checklistPhoto(w.ctx, w.user(), photoId)).bytes.length).toBe(JPG.length);
    expect(await code(checklistPhoto(w.ctx, w.user(w.ownerCentro), photoId))).toBe("not_found");
    expect((await auditEntriesFor(db, "floor_device", p.device.id)).map((a) => a.action)).toEqual(["floor_device.enabled"]);
  });
});
