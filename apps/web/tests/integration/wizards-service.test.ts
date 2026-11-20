// Spec 015: borradores de los asistentes y vista elegida, contra la BD de pruebas.
import { describe, expect, it } from "vitest";
import { createPosition } from "@/server/services/personnel/positions";
import { createEmployee } from "@/server/services/personnel/employees";
import { deviceActor, type ChecklistActor } from "@/server/services/checklists/actor";
import { enableFloorDevice, floorDeviceFromToken } from "@/server/services/checklists/floor";
import { discardDraft, getDraft, saveDraft } from "@/server/services/wizards/drafts";
import { wizardExamples } from "@/server/services/wizards/examples";
import { setWizardView, wizardViews } from "@/server/services/wizards/preferences";
import { updateProduct } from "@/server/services/catalog/products";
import { createSupplier } from "@/server/services/catalog/suppliers";
import { catalogWorld } from "./catalog-fixture";
import { code, inventoryWorld } from "./inventory-fixture";

const day = 24 * 60 * 60 * 1000;

async function world() {
  const w = await catalogWorld();
  const user = (scope = w.adminSendero): ChecklistActor => ({ kind: "user", scope });
  const cocina = await createPosition(w.ctx, w.ownerSendero, "Cocina");
  const employee = await createEmployee(w.ctx, w.ownerSendero, { name: "Cocinera Uno", positionId: cocina.id, hiredOn: "2026-10-01" });
  const other = await createEmployee(w.ctx, w.ownerSendero, { name: "Cocinero Dos", positionId: cocina.id, hiredOn: "2026-10-01" });
  const phone = async () => {
    const { token } = await enableFloorDevice(w.ctx, w.adminSendero, "Tablet de cocina");
    const base = await floorDeviceFromToken(w.ctx, token);
    return (employeeId: string | null) => deviceActor(w.ctx, base, employeeId);
  };
  return { ...w, user, employee, other, phone };
}

describe("spec 015 — borradores", () => {
  it("test_s015_rf17_se_guarda_y_se_lee_con_su_paso", async () => {
    const w = await world();
    expect(await getDraft(w.ctx, w.user(), "req-new", "")).toBeNull();
    await saveDraft(w.ctx, w.user(), "req-new", "", { step: "products", data: { warehouseId: "a", lines: [1, 2] } });
    const draft = await getDraft(w.ctx, w.user(), "req-new", "");
    expect(draft).toMatchObject({ step: "products", data: { warehouseId: "a", lines: [1, 2] } });
    // Guardar otra vez reemplaza lo anterior.
    await saveDraft(w.ctx, w.user(), "req-new", "", { step: "note", data: { note: "x" } });
    expect(await getDraft(w.ctx, w.user(), "req-new", "")).toMatchObject({ step: "note", data: { note: "x" } });
  });

  it("test_s015_rf19_se_retoma_desde_otra_sesion_de_la_misma_persona", async () => {
    const w = await world();
    await saveDraft(w.ctx, w.user(), "inv-count", "", { step: "count", data: { n: 1 } });
    // Otro dispositivo = otra sesión, misma persona y sucursal: el servicio no depende de la sesión.
    expect(await getDraft(w.ctx, { kind: "user", scope: { ...w.adminSendero } }, "inv-count", "")).toMatchObject({ step: "count" });
  });

  it("test_s015_rf17_es_por_persona_sucursal_tarea_y_objetivo", async () => {
    const w = await world();
    await saveDraft(w.ctx, w.user(w.ownerSendero), "req-approve", "r1", { step: "review", data: { a: 1 } });
    expect(await getDraft(w.ctx, w.user(w.ownerSendero), "req-approve", "r2")).toBeNull();
    expect(await getDraft(w.ctx, w.user(w.ownerCentro), "req-approve", "r1")).toBeNull();
    expect(await getDraft(w.ctx, w.user(w.adminSendero), "req-approve", "r1")).toBeNull();
    expect(await getDraft(w.ctx, w.user(w.ownerPirrus), "req-approve", "r1")).toBeNull();
    expect(await getDraft(w.ctx, w.user(w.ownerSendero), "req-receive", "r1")).toBeNull();
  });

  it("test_s015_rf20_se_descarta", async () => {
    const w = await world();
    await saveDraft(w.ctx, w.user(), "inv-entry", "", { step: "lines", data: {} });
    await discardDraft(w.ctx, w.user(), "inv-entry", "");
    expect(await getDraft(w.ctx, w.user(), "inv-entry", "")).toBeNull();
    // Descartar lo que no existe no falla.
    await discardDraft(w.ctx, w.user(), "inv-entry", "");
  });

  it("test_s015_rf51_a_los_7_dias_sin_cambios_ya_no_se_ofrece", async () => {
    const w = await world();
    await saveDraft(w.ctx, w.user(), "inv-exit", "", { step: "lines", data: {} });
    w.ctx.clock.advance(7 * day);
    expect(await getDraft(w.ctx, w.user(), "inv-exit", "")).not.toBeNull();
    w.ctx.clock.advance(1000);
    expect(await getDraft(w.ctx, w.user(), "inv-exit", "")).toBeNull();
    // Se descartó: aunque el reloj regresara, ya no está.
    w.ctx.clock.advance(-2 * day);
    expect(await getDraft(w.ctx, w.user(), "inv-exit", "")).toBeNull();
  });

  it("test_s015_rf17_rechaza_tareas_desconocidas_objetivos_mal_puestos_y_lo_muy_grande", async () => {
    const w = await world();
    expect(await code(saveDraft(w.ctx, w.user(), "no-existe", "", { step: "a", data: {} }))).toBe("wizard_unknown");
    expect(await code(getDraft(w.ctx, w.user(), "no-existe", ""))).toBe("wizard_unknown");
    expect(await code(saveDraft(w.ctx, w.user(), "req-approve", "", { step: "a", data: {} }))).toBe("validation");
    expect(await code(saveDraft(w.ctx, w.user(), "req-new", "r1", { step: "a", data: {} }))).toBe("validation");
    expect(await code(saveDraft(w.ctx, w.user(), "req-new", "", { step: "", data: {} }))).toBe("validation");
    expect(await code(saveDraft(w.ctx, w.user(), "req-new", "", { step: "a", data: { big: "x".repeat(256 * 1024) } }))).toBe("draft_too_large");
  });

  it("test_s015_rf22_el_telefono_de_piso_guarda_por_empleado", async () => {
    const w = await world();
    const as = await w.phone();
    await saveDraft(w.ctx, await as(w.employee.id), "floor-checklist", "t1", { step: "s1", data: { done: ["a"] } });
    expect(await getDraft(w.ctx, await as(w.employee.id), "floor-checklist", "t1")).toMatchObject({ step: "s1" });
    expect(await getDraft(w.ctx, await as(w.other.id), "floor-checklist", "t1")).toBeNull();
    // Sin elegir empleado no se guarda nada, y el teléfono solo tiene asistentes de piso.
    expect(await code(saveDraft(w.ctx, await as(null), "floor-checklist", "t1", { step: "s1", data: {} }))).toBe("employee_required");
    expect(await code(saveDraft(w.ctx, await as(w.employee.id), "req-new", "", { step: "a", data: {} }))).toBe("forbidden");
    // Otro teléfono de la misma sucursal no ve lo de este.
    const otherPhone = await w.phone();
    expect(await getDraft(w.ctx, await otherPhone(w.employee.id), "floor-checklist", "t1")).toBeNull();
  });
});

describe("spec 015 — vista elegida", () => {
  it("test_s015_rf23_por_defecto_es_el_asistente", async () => {
    const w = await world();
    expect(await wizardViews(w.ctx, w.senderoAdmin)).toEqual({});
  });

  it("test_s015_rf26_se_recuerda_por_persona_y_tarea", async () => {
    const w = await world();
    await setWizardView(w.ctx, w.senderoAdmin, "req-new", "full");
    await setWizardView(w.ctx, w.senderoAdmin, "inv-count", "wizard");
    await setWizardView(w.ctx, w.senderoAdmin, "inv-count", "full");
    expect(await wizardViews(w.ctx, w.senderoAdmin)).toEqual({ "req-new": "full", "inv-count": "full" });
    expect(await wizardViews(w.ctx, w.owner)).toEqual({});
    expect(await code(setWizardView(w.ctx, w.senderoAdmin, "req-new", "otra"))).toBe("validation");
    expect(await code(setWizardView(w.ctx, w.senderoAdmin, "no-existe", "full"))).toBe("wizard_unknown");
  });
});

describe("spec 015 — ejemplos con datos del negocio", () => {
  it("test_s015_rf3_los_ejemplos_salen_del_negocio_activo", async () => {
    const w = await inventoryWorld();
    const sams = await createSupplier(w.ctx, w.ownerSendero, { name: "Sams" });
    await updateProduct(w.ctx, w.ownerSendero, w.queso.id, { supplierId: sams.id, purchasePresentationId: w.pieza.id });
    await w.area(w.ownerSendero, "Barra fría");
    const ex = await wizardExamples(w.ctx, w.adminSendero);
    expect(ex.product).toEqual({ name: "Queso manchego", presentation: "Pieza", supplier: "Sams" });
    expect(ex.supplier).toBe("Sams");
    expect(ex.area).toBe("Barra fría");
    // Pirrus no ve nada de Pastatti: su producto es el suyo y no tiene proveedor ni área.
    const pirrus = await wizardExamples(w.ctx, w.adminPirrus);
    expect(pirrus.product?.supplier).toBeNull();
    expect(pirrus.supplier).toBeNull();
    expect(pirrus.area).toBeNull();
  });

  it("test_s015_rf3_sin_datos_todo_queda_vacio_para_el_ejemplo_generico", async () => {
    const w = await world();
    expect(await wizardExamples(w.ctx, w.ownerPirrus)).toEqual({ product: null, supplier: null, area: null, position: null, employee: null });
  });
});
