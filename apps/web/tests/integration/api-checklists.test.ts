// Spec 010: handlers de checklists con sesión y con el teléfono de piso: habilitarlo cierra la sesión de la persona,
// el teléfono solo llena las hojas de hoy de su sucursal y cualquier otra ruta lo rechaza (RF-37 a RF-45).
import { describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as changePassword } from "@/app/api/auth/password/route";
import { POST as sheetAction } from "@/app/api/checklists/[templateId]/[date]/[action]/route";
import { POST as photoPost } from "@/app/api/checklists/[templateId]/[date]/photo/[itemId]/route";
import { GET as sheetGet } from "@/app/api/checklists/[templateId]/[date]/route";
import { GET as historyGet } from "@/app/api/checklists/history/route";
import { GET as todayGet } from "@/app/api/checklists/route";
import { GET as photoGet } from "@/app/api/checklist-photos/[id]/route";
import { POST as templatePost } from "@/app/api/checklist-templates/route";
import { GET as employeesList, POST as empPost } from "@/app/api/employees/route";
import { POST as deviceDisable } from "@/app/api/floor-devices/[id]/disable/route";
import { GET as devicesGet, POST as devicePost } from "@/app/api/floor-devices/route";
import { GET as floorEmployeesGet } from "@/app/api/floor/employees/route";
import { GET as weeksGet } from "@/app/api/payroll/weeks/route";
import { POST as posPost } from "@/app/api/positions/route";
import { GET as productsGet } from "@/app/api/products/route";
import { PUT as selectBranch } from "@/app/api/session/branch/route";
import { POST as setupPost } from "@/app/api/setup/route";
import { todayInMexico } from "@/domain/personnel/documents";
import { appCtx } from "@/server/app-context";
import { now } from "@/server/clock";
import { createBusiness } from "@/server/services/businesses";
import { createPerson } from "@/server/services/people";
import { publicUser } from "@/server/services/users-public";
import { ApiClient, json } from "./api";
import { OWNER } from "./helpers";

const p = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) });
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

async function world() {
  const owner = new ApiClient();
  await owner.call(setupPost, "/api/setup", { body: OWNER });
  const app = appCtx();
  const actor = publicUser((await app.store.users.findByEmail(OWNER.email))!);
  const pastatti = await createBusiness(app, actor, { name: "Pastatti", firstBranchName: "Sendero", color: "violeta" });
  const { temporaryPassword } = await createPerson(app, actor, { name: "Admin Sendero", email: "admin@mando.test", role: "admin", branchIds: [pastatti.branch.id] });
  const at = async (email: string, password: string) => {
    const c = new ApiClient();
    await c.call(login, "/api/auth/login", { body: { email, password } });
    if (email !== OWNER.email) await c.call(changePassword, "/api/auth/password", { body: { currentPassword: password, newPassword: "admin-nueva-123" } });
    await c.call(selectBranch, "/api/session/branch", { method: "PUT", body: { branchId: pastatti.branch.id } });
    return c;
  };
  const sendero = await at(OWNER.email, OWNER.password);
  const { position } = await json(await sendero.call(posPost, "/api/positions", { body: { name: "Cocina" } }));
  const { employee } = await json(await sendero.call(empPost, "/api/employees", { body: { name: "Cocinera Uno", positionId: position.id, hiredOn: "2026-01-01" } }));
  const { template } = await json(
    await sendero.call(templatePost, "/api/checklist-templates", {
      body: { name: "Apertura", days: [0, 1, 2, 3, 4, 5, 6], branchIds: [pastatti.branch.id], sections: [{ name: "Cocina", positionId: position.id, items: [{ text: "Gas", kind: "check", isKey: true }, { text: "Refri", kind: "photo" }] }] },
    }),
  );
  const phone = await at("admin@mando.test", temporaryPassword);
  const today = todayInMexico(now());
  return { sendero, phone, template, employeeId: employee.id as string, today, item: (i: number) => template.sections[0].items[i].id as string, sectionId: template.sections[0].id as string };
}

describe("spec 010 — API del teléfono de piso", () => {
  it("test_s010_rf37_habilitar_deja_solo_la_cookie_de_piso", async () => {
    const w = await world();
    const res = await w.phone.call(devicePost, "/api/floor-devices", { body: { name: "Tablet de cocina" } });
    expect(res.status).toBe(201);
    expect(w.phone.cookies.mando_floor).toBeTruthy();
    expect(w.phone.cookies.mando_session).toBeUndefined();
    expect((await json(await w.sendero.call(devicesGet, "/api/floor-devices"))).devices.map((d: { name: string }) => d.name)).toEqual(["Tablet de cocina"]);
  });

  it("test_s010_rf39_el_telefono_no_abre_ninguna_otra_ruta", async () => {
    const w = await world();
    await w.phone.call(devicePost, "/api/floor-devices", { body: { name: "Tablet de cocina" } });
    for (const [fn, path] of [
      [productsGet, "/api/products"],
      [employeesList, "/api/employees"],
      [weeksGet, "/api/payroll/weeks"],
      [devicesGet, "/api/floor-devices"],
      [historyGet, "/api/checklists/history"],
    ] as const) {
      expect((await w.phone.call(fn as (r: Request) => Promise<Response>, path)).status).toBe(401);
    }
  });

  it("test_s010_rf38_rf40_rf41_el_telefono_llena_la_hoja_de_hoy_con_el_empleado", async () => {
    const w = await world();
    await w.phone.call(devicePost, "/api/floor-devices", { body: { name: "Tablet de cocina" } });
    expect((await json(await w.phone.call(floorEmployeesGet, "/api/floor/employees"))).employees.map((e: { name: string }) => e.name)).toEqual(["Cocinera Uno"]);
    expect((await json(await w.phone.call(todayGet, "/api/checklists"))).checklists.map((c: { name: string }) => c.name)).toEqual(["Apertura"]);
    const at = (action: string) => (r: Request) => sheetAction(r, p({ templateId: w.template.id, date: w.today, action }));
    expect((await w.phone.call(at("check"), "/x", { body: { itemId: w.item(0) } })).status).toBe(422);
    const ok = await w.phone.call(at("check"), "/x", { body: { itemId: w.item(0), employeeId: w.employeeId } });
    expect((await json(ok)).sheet.sections[0].items[0]).toMatchObject({ done: true, markedBy: "Cocinera Uno", device: "Tablet de cocina" });
    const form = new FormData();
    form.set("file", new File([JPG], "refri.jpg", { type: "image/jpeg" }));
    form.set("employeeId", w.employeeId);
    const photo = await w.phone.form((r) => photoPost(r, p({ templateId: w.template.id, date: w.today, itemId: w.item(1) })), "/x", form);
    expect(photo.status).toBe(201);
    const photoId = (await json(photo)).sheet.sections[0].items[1].photoId;
    expect((await w.phone.call((r) => photoGet(r, p({ id: photoId })), "/x")).headers.get("cache-control")).toBe("private, no-store");
    expect((await w.phone.call(at("close"), "/x", { body: { employeeId: w.employeeId } })).status).toBe(403);
    expect((await w.phone.call((r) => sheetGet(r, p({ templateId: w.template.id, date: "2026-01-01" })), "/x")).status).toBe(422);
  });

  it("test_s010_rf44_deshabilitado_deja_de_funcionar_al_instante", async () => {
    const w = await world();
    const { device } = await json(await w.phone.call(devicePost, "/api/floor-devices", { body: { name: "Tablet de cocina" } }));
    expect((await w.phone.call(todayGet, "/api/checklists")).status).toBe(200);
    await w.sendero.call((r) => deviceDisable(r, p({ id: device.id })), "/x", { body: {} });
    expect((await w.phone.call(todayGet, "/api/checklists")).status).toBe(401);
  });
});
