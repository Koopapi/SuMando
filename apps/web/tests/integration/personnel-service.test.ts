// Spec 008: personal contra la BD de pruebas (expedientes, sueldo, documentos, bajas, permisos y registro).
import { describe, expect, it } from "vitest";
import { listDocumentTypes, reorderDocumentTypes, saveDocumentType, setDocumentTypeArchived } from "@/server/services/personnel/document-types";
import { createEmployee, employeeDetail, listEmployees, moveEmployee, personnelCounts, rehireEmployee, setEmployeePay, terminateEmployee, updateEmployee } from "@/server/services/personnel/employees";
import { openDocumentFile, retireDocumentFile, uploadDocument } from "@/server/services/personnel/files";
import { createPosition, listPositions, renamePosition, setPositionArchived } from "@/server/services/personnel/positions";
import { catalogWorld } from "./catalog-fixture";
import { code } from "./inventory-fixture";

const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const PDF = new TextEncoder().encode("%PDF-1.7 ...");

async function world() {
  const w = await catalogWorld();
  const mesero = await createPosition(w.ctx, w.ownerSendero, "Mesero");
  const hire = (name = "Empleado Uno", scope = w.adminSendero, extra: Record<string, unknown> = {}) => createEmployee(w.ctx, scope, { name, positionId: mesero.id, hiredOn: "2026-11-01", phone: "555 000 1111", ...extra });
  const types = await listDocumentTypes(w.ctx, w.ownerSendero);
  const typeOf = (name: string) => types.find((t) => t.name === name)!;
  return { ...w, mesero, hire, types, typeOf };
}

describe("spec 008 — expedientes y permisos", () => {
  it("test_s008_rf1_rf2_el_empleado_es_de_la_sucursal_activa", async () => {
    const w = await world();
    await w.hire();
    expect((await listEmployees(w.ctx, w.ownerSendero)).map((e) => e.name)).toEqual(["Empleado Uno"]);
    expect(await listEmployees(w.ctx, w.ownerCentro)).toEqual([]);
  });

  it("test_s008_rf3_el_administrador_da_de_alta_edita_y_da_de_baja", async () => {
    const w = await world();
    const e = await w.hire();
    await updateEmployee(w.ctx, w.adminSendero, e.id, { phone: "555 222 3333" });
    await terminateEmployee(w.ctx, w.adminSendero, e.id, { leftOn: "2026-11-10", reason: "resignation" });
    await rehireEmployee(w.ctx, w.adminSendero, e.id, { hiredOn: "2026-12-01" });
    expect((await employeeDetail(w.ctx, w.adminSendero, e.id)).phone).toBe("555 222 3333");
  });

  it("test_s008_rf4_rf7_solo_el_dueno_ve_y_cambia_el_sueldo", async () => {
    const w = await world();
    const e = await w.hire();
    expect(await code(setEmployeePay(w.ctx, w.adminSendero, e.id, "400"))).toBe("owner_only");
    expect(await code(w.hire("Otra persona", w.adminSendero, { dailyPay: "500" }))).toBe("owner_only");
    await setEmployeePay(w.ctx, w.ownerSendero, e.id, "450.50");
    const [asAdmin] = await listEmployees(w.ctx, w.adminSendero);
    expect(asAdmin).not.toHaveProperty("pay");
    expect(await employeeDetail(w.ctx, w.adminSendero, e.id)).not.toHaveProperty("pay");
    expect((await listEmployees(w.ctx, w.ownerSendero))[0].pay).toBe("450.50");
  });

  it("test_s008_rf6_otra_sucursal_u_otro_negocio_no_existe", async () => {
    const w = await world();
    const e = await w.hire();
    expect(await code(employeeDetail(w.ctx, w.ownerCentro, e.id))).toBe("not_found");
    expect(await code(employeeDetail(w.ctx, w.adminPirrus, e.id))).toBe("not_found");
    expect(await code(updateEmployee(w.ctx, w.adminPirrus, e.id, { phone: "1" }))).toBe("not_found");
    expect(await code(employeeDetail(w.ctx, w.ownerSendero, "no-es-uuid"))).toBe("not_found");
  });

  it("test_s008_rf8_los_empleados_no_tienen_cuenta", async () => {
    const w = await world();
    await w.hire();
    expect((await w.ctx.store.users.list()).map((u) => u.name)).not.toContain("Empleado Uno");
  });

  it("test_s008_rf9_rf10_alta_con_puesto_de_la_lista_y_fecha", async () => {
    const w = await world();
    expect(await code(w.hire("", w.adminSendero))).toBe("name_invalid");
    expect(await code(w.hire("Sin fecha", w.adminSendero, { hiredOn: "31/11/2026" }))).toBe("invalid_date");
    const otro = await createPosition(w.ctx, w.ownerPirrus, "Cocinero");
    expect(await code(w.hire("De otro negocio", w.adminSendero, { positionId: otro.id }))).toBe("not_found");
    const e = await w.hire();
    expect(await employeeDetail(w.ctx, w.ownerSendero, e.id)).toMatchObject({ position: "Mesero", periods: [{ hiredOn: "2026-11-01", leftOn: null }] });
  });

  it("test_s008_rf11_puestos_del_negocio", async () => {
    const w = await world();
    expect(await code(createPosition(w.ctx, w.adminSendero, "mesero"))).toBe("duplicate_name");
    const cap = await createPosition(w.ctx, w.adminSendero, "Capitán");
    await renamePosition(w.ctx, w.adminSendero, cap.id, "Capitán de meseros");
    await setPositionArchived(w.ctx, w.adminSendero, cap.id, true);
    expect(await listPositions(w.ctx, w.ownerSendero)).toEqual([
      { id: cap.id, name: "Capitán de meseros", archived: true },
      { id: w.mesero.id, name: "Mesero", archived: false },
    ]);
    expect(await code(w.hire("Uno", w.adminSendero, { positionId: cap.id }))).toBe("archived_item");
    expect(await listPositions(w.ctx, w.ownerPirrus)).toEqual([]);
  });

  it("test_s008_rf12_avisa_de_un_homonimo_y_deja_continuar", async () => {
    const w = await world();
    await w.hire();
    expect(await code(w.hire("empleado  uno"))).toBe("employee_exists");
    expect(await code(w.hire("empleado uno", w.adminSendero, { confirmDuplicate: true }))).toBe("ok");
  });

  it("test_s008_rf13_rf14_sueldo_por_dia_y_sin_sueldo", async () => {
    const w = await world();
    const e = await w.hire();
    expect((await listEmployees(w.ctx, w.ownerSendero))[0].pay).toBeNull();
    expect(await code(setEmployeePay(w.ctx, w.ownerSendero, e.id, "0"))).toBe("invalid_pay");
    expect(await code(setEmployeePay(w.ctx, w.ownerSendero, e.id, "12.345"))).toBe("invalid_pay");
    await setEmployeePay(w.ctx, w.ownerSendero, e.id, "1,200");
    expect((await employeeDetail(w.ctx, w.ownerSendero, e.id)).pay).toBe("1200.00");
  });

  it("test_s008_rf15_se_edita_el_ingreso_solo_del_periodo_abierto", async () => {
    const w = await world();
    const e = await w.hire();
    await updateEmployee(w.ctx, w.adminSendero, e.id, { hiredOn: "2026-10-28" });
    await terminateEmployee(w.ctx, w.adminSendero, e.id, { leftOn: "2026-11-10", reason: "dismissal" });
    expect(await code(updateEmployee(w.ctx, w.adminSendero, e.id, { hiredOn: "2026-10-01" }))).toBe("employee_state");
    expect((await employeeDetail(w.ctx, w.ownerSendero, e.id)).periods[0].hiredOn).toBe("2026-10-28");
  });
});

describe("spec 008 — documentos", () => {
  it("test_s008_rf16_la_lista_empieza_con_los_13_una_sola_vez", async () => {
    const w = await world();
    await Promise.all([listDocumentTypes(w.ctx, w.ownerSendero), listDocumentTypes(w.ctx, w.adminSendero)]);
    const list = await listDocumentTypes(w.ctx, w.ownerSendero);
    expect(list).toHaveLength(13);
    expect(list[3]).toMatchObject({ name: "Comprobante de domicilio", validityMonths: 3, required: true });
    expect(await listDocumentTypes(w.ctx, w.ownerPirrus)).toHaveLength(13);
  });

  it("test_s008_rf17_el_dueno_cambia_la_lista", async () => {
    const w = await world();
    expect(await code(saveDocumentType(w.ctx, w.adminSendero, null, { name: "Licencia" }))).toBe("owner_only");
    const lic = await saveDocumentType(w.ctx, w.ownerSendero, null, { name: "Licencia de manejo", required: false, validityMonths: 24 });
    await saveDocumentType(w.ctx, w.ownerSendero, lic.id, { name: "Licencia", required: true });
    await setDocumentTypeArchived(w.ctx, w.ownerSendero, w.typeOf("CV o solicitud").id, true);
    const ids = (await listDocumentTypes(w.ctx, w.ownerSendero)).map((t) => t.id);
    await reorderDocumentTypes(w.ctx, w.ownerSendero, [lic.id, ...ids.filter((x) => x !== lic.id)]);
    const list = await listDocumentTypes(w.ctx, w.ownerSendero);
    expect(list[0]).toMatchObject({ name: "Licencia", required: true, validityMonths: 24 });
    expect(list.find((t) => t.name === "CV o solicitud")?.archived).toBe(true);
  });

  it("test_s008_rf18_rf19_se_suben_varios_archivos_y_la_vigencia_pide_fecha", async () => {
    const w = await world();
    const e = await w.hire();
    const fotos = w.typeOf("Fotos del domicilio");
    await uploadDocument(w.ctx, w.adminSendero, e.id, fotos.id, { files: [{ name: "fachada.jpg", bytes: JPG }, { name: "interior.jpg", bytes: JPG }] });
    expect(await code(uploadDocument(w.ctx, w.adminSendero, e.id, w.typeOf("Comprobante de domicilio").id, { files: [{ name: "luz.pdf", bytes: PDF }] }))).toBe("invalid_date");
    await uploadDocument(w.ctx, w.adminSendero, e.id, w.typeOf("Comprobante de domicilio").id, { files: [{ name: "luz.pdf", bytes: PDF }], issuedOn: "2026-10-20" });
    const d = await employeeDetail(w.ctx, w.ownerSendero, e.id);
    expect(d.documents.find((x) => x.name === "Fotos del domicilio")).toMatchObject({ status: "delivered", count: 2 });
  });

  it("test_s008_rf20_tipo_o_tamano_no_aceptado_se_rechaza", async () => {
    const w = await world();
    const e = await w.hire();
    const ine = w.typeOf("INE").id;
    expect(await code(uploadDocument(w.ctx, w.adminSendero, e.id, ine, { files: [{ name: "x.gif", bytes: new TextEncoder().encode("GIF89a") }] }))).toBe("file_type");
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    big.set([0xff, 0xd8, 0xff]);
    expect(await code(uploadDocument(w.ctx, w.adminSendero, e.id, ine, { files: [{ name: "x.jpg", bytes: big }] }))).toBe("file_size");
  });

  it("test_s008_rf21_rf22_rf23_estado_y_resumen_de_documentos", async () => {
    const w = await world();
    const e = await w.hire();
    await uploadDocument(w.ctx, w.adminSendero, e.id, w.typeOf("INE").id, { files: [{ name: "ine.jpg", bytes: JPG }] });
    // El reloj de pruebas está en el 11 de noviembre de 2026: expedido el 10 de agosto, ya venció.
    await uploadDocument(w.ctx, w.adminSendero, e.id, w.typeOf("Comprobante de domicilio").id, { files: [{ name: "luz.pdf", bytes: PDF }], issuedOn: "2026-08-10" });
    const d = await employeeDetail(w.ctx, w.adminSendero, e.id);
    expect(d.documents.find((x) => x.name === "INE")?.status).toBe("delivered");
    expect(d.documents.find((x) => x.name === "Comprobante de domicilio")?.status).toBe("expired");
    expect(d.documents.find((x) => x.name === "CURP")?.status).toBe("missing");
    expect(d.docs).toEqual({ ok: 1, total: 13, missing: 11, expired: 1 });
  });

  it("test_s008_rf24_reemplazar_conserva_el_anterior_en_el_historial", async () => {
    const w = await world();
    const e = await w.hire();
    const dom = w.typeOf("Comprobante de domicilio").id;
    await uploadDocument(w.ctx, w.adminSendero, e.id, dom, { files: [{ name: "agosto.pdf", bytes: PDF }], issuedOn: "2026-08-10" });
    await uploadDocument(w.ctx, w.adminSendero, e.id, dom, { files: [{ name: "noviembre.pdf", bytes: PDF }], issuedOn: "2026-11-05", replace: true });
    const doc = (await employeeDetail(w.ctx, w.ownerSendero, e.id)).documents.find((x) => x.typeId === dom)!;
    expect(doc).toMatchObject({ status: "delivered", count: 1 });
    expect(doc.files?.map((f) => [f.name, f.replacedAt !== null])).toEqual([["agosto.pdf", true], ["noviembre.pdf", false]]);
    expect((await employeeDetail(w.ctx, w.adminSendero, e.id)).documents.find((x) => x.typeId === dom)).not.toHaveProperty("files");
  });

  it("test_s008_rf25_rf26_el_dueno_retira_un_archivo_con_motivo", async () => {
    const w = await world();
    const e = await w.hire();
    const [f] = await uploadDocument(w.ctx, w.adminSendero, e.id, w.typeOf("INE").id, { files: [{ name: "ine.jpg", bytes: JPG }] });
    expect(await code(retireDocumentFile(w.ctx, w.adminSendero, f.id, "borrosa"))).toBe("owner_only");
    expect(await code(retireDocumentFile(w.ctx, w.ownerSendero, f.id, ""))).toBe("reason_required");
    await retireDocumentFile(w.ctx, w.ownerSendero, f.id, "La foto salió borrosa");
    const doc = (await employeeDetail(w.ctx, w.ownerSendero, e.id)).documents.find((x) => x.name === "INE")!;
    expect(doc.status).toBe("missing");
    expect(doc.files?.[0]).toMatchObject({ retireReason: "La foto salió borrosa" });
    expect(Object.keys(w.ctx.store.personnel.files)).not.toContain("delete");
  });

  it("test_s008_rf5_rf27_rf41_solo_el_dueno_abre_y_queda_registrado", async () => {
    const w = await world();
    const e = await w.hire();
    const [f] = await uploadDocument(w.ctx, w.adminSendero, e.id, w.typeOf("INE").id, { files: [{ name: "ine.jpg", bytes: JPG }] });
    expect(await code(openDocumentFile(w.ctx, w.adminSendero, f.id))).toBe("owner_only");
    expect(await code(openDocumentFile(w.ctx, w.ownerCentro, f.id))).toBe("not_found");
    const opened = await openDocumentFile(w.ctx, w.ownerSendero, f.id);
    expect(opened).toEqual({ bytes: JPG, contentType: "image/jpeg", name: "ine.jpg" });
    expect(f.storageKey).not.toContain("Empleado");
    const history = (await employeeDetail(w.ctx, w.ownerSendero, e.id)).history!;
    expect(history[0]).toMatchObject({ action: "employee_file.opened", actor: w.owner.name, after: { file: "ine.jpg" } });
  });
});

describe("spec 008 — bajas, reingresos y cambios", () => {
  it("test_s008_rf28_rf29_rf30_baja_con_fecha_y_motivo", async () => {
    const w = await world();
    const e = await w.hire();
    expect(await code(terminateEmployee(w.ctx, w.adminSendero, e.id, { leftOn: "2026-10-31", reason: "resignation" }))).toBe("leave_before_hire");
    expect(await code(terminateEmployee(w.ctx, w.adminSendero, e.id, { leftOn: "2026-11-05", reason: "other" }))).toBe("reason_required");
    expect(await code(terminateEmployee(w.ctx, w.adminSendero, e.id, { leftOn: "2026-11-05", reason: "vacaciones" }))).toBe("validation");
    await terminateEmployee(w.ctx, w.adminSendero, e.id, { leftOn: "2026-11-01", reason: "other", note: "Se cambió de ciudad" });
    expect((await employeeDetail(w.ctx, w.ownerSendero, e.id)).periods).toEqual([{ hiredOn: "2026-11-01", leftOn: "2026-11-01", reason: "other", note: "Se cambió de ciudad" }]);
  });

  it("test_s008_rf31_la_baja_queda_fuera_de_los_activos", async () => {
    const w = await world();
    const e = await w.hire();
    await terminateEmployee(w.ctx, w.adminSendero, e.id, { leftOn: "2026-11-05", reason: "abandonment" });
    const [row] = await listEmployees(w.ctx, w.ownerSendero);
    expect(row).toMatchObject({ active: false, leftOn: "2026-11-05" });
    expect(await personnelCounts(w.ctx, w.ownerSendero)).toEqual({ active: 0, incomplete: 0 });
  });

  it("test_s008_rf32_rf33_el_reingreso_reactiva_el_mismo_expediente", async () => {
    const w = await world();
    const e = await w.hire();
    await setEmployeePay(w.ctx, w.ownerSendero, e.id, "400");
    await uploadDocument(w.ctx, w.adminSendero, e.id, w.typeOf("INE").id, { files: [{ name: "ine.jpg", bytes: JPG }] });
    await terminateEmployee(w.ctx, w.adminSendero, e.id, { leftOn: "2026-11-05", reason: "season_end" });
    expect(await code(rehireEmployee(w.ctx, w.adminSendero, e.id, { hiredOn: "2026-11-04" }))).toBe("invalid_date");
    await rehireEmployee(w.ctx, w.adminSendero, e.id, { hiredOn: "2026-12-01" });
    expect(await code(rehireEmployee(w.ctx, w.adminSendero, e.id, { hiredOn: "2026-12-02" }))).toBe("employee_state");
    const d = await employeeDetail(w.ctx, w.ownerSendero, e.id);
    expect(d).toMatchObject({ active: true, pay: "400.00" });
    expect(d.periods.map((p) => [p.hiredOn, p.leftOn])).toEqual([["2026-11-01", "2026-11-05"], ["2026-12-01", null]]);
    expect(d.documents.find((x) => x.name === "INE")?.status).toBe("delivered");
  });

  it("test_s008_rf34_rf35_cambio_de_sucursal", async () => {
    const w = await world();
    const e = await w.hire();
    expect(await code(moveEmployee(w.ctx, w.adminSendero, e.id, { branchId: w.centro.id }))).toBe("not_found");
    expect((await employeeDetail(w.ctx, w.ownerSendero, e.id)).moveTo.map((b) => b.name)).toEqual(["Centro"]);
    await moveEmployee(w.ctx, w.ownerSendero, e.id, { branchId: w.centro.id, on: "2026-11-11" });
    expect(await listEmployees(w.ctx, w.ownerSendero)).toEqual([]);
    expect((await listEmployees(w.ctx, w.ownerCentro)).map((x) => x.name)).toEqual(["Empleado Uno"]);
    expect(await code(employeeDetail(w.ctx, w.adminSendero, e.id))).toBe("not_found");
  });
});

describe("spec 008 — consulta y registro", () => {
  it("test_s008_rf36_rf37_la_tabla_trae_lo_necesario_para_filtrar", async () => {
    const w = await world();
    const e = await w.hire();
    const [row] = await listEmployees(w.ctx, w.adminSendero);
    expect(row).toEqual({ id: e.id, name: "Empleado Uno", position: "Mesero", hiredOn: "2026-11-01", phone: "555 000 1111", active: true, leftOn: null, docs: { ok: 0, total: 13, missing: 13, expired: 0 } });
  });

  it("test_s008_rf38_conteos_del_inicio", async () => {
    const w = await world();
    await w.hire();
    await w.hire("Empleado Dos");
    expect(await personnelCounts(w.ctx, w.adminSendero)).toEqual({ active: 2, incomplete: 2 });
  });

  it("test_s008_rf40_rf42_cada_cambio_queda_con_quien_cuando_y_valor_anterior", async () => {
    const w = await world();
    const e = await w.hire();
    await setEmployeePay(w.ctx, w.ownerSendero, e.id, "400");
    await setEmployeePay(w.ctx, w.ownerSendero, e.id, "450");
    await updateEmployee(w.ctx, w.adminSendero, e.id, { name: "Empleado Uno Pérez" });
    const history = (await employeeDetail(w.ctx, w.ownerSendero, e.id)).history!;
    expect(history.map((h) => h.action)).toEqual(["employee.updated", "employee.pay_set", "employee.pay_set", "employee.created"]);
    expect(history[1]).toMatchObject({ before: { pay: "400.00" }, after: { pay: "450.00" }, actor: w.owner.name });
    expect(history[0]).toMatchObject({ before: { name: "Empleado Uno" }, after: { name: "Empleado Uno Pérez" }, actor: w.senderoAdmin.name });
    expect(await employeeDetail(w.ctx, w.adminSendero, e.id)).not.toHaveProperty("history");
  });
});
