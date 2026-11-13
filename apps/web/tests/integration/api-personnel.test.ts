// Spec 008: handlers de personal con sesión, su contrato, el aislamiento y que un administrador no obtiene sueldos ni
// archivos por ninguna ruta.
import { describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as changePassword } from "@/app/api/auth/password/route";
import { PUT as docOrder } from "@/app/api/document-types/order/route";
import { GET as docTypes } from "@/app/api/document-types/route";
import { POST as fileRetire } from "@/app/api/employee-files/[id]/retire/route";
import { GET as fileGet } from "@/app/api/employee-files/[id]/route";
import { POST as empAction } from "@/app/api/employees/[id]/[action]/route";
import { POST as upload } from "@/app/api/employees/[id]/documents/[typeId]/route";
import { GET as empGet } from "@/app/api/employees/[id]/route";
import { GET as empList, POST as empPost } from "@/app/api/employees/route";
import { POST as posPost } from "@/app/api/positions/route";
import { PUT as selectBranch } from "@/app/api/session/branch/route";
import { POST as setupPost } from "@/app/api/setup/route";
import { appCtx } from "@/server/app-context";
import { addBranch, createBusiness } from "@/server/services/businesses";
import { createPerson } from "@/server/services/people";
import { publicUser } from "@/server/services/users-public";
import { ApiClient, json } from "./api";
import { OWNER } from "./helpers";

const p = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) });
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 9, 9, 9]);

async function world() {
  const owner = new ApiClient();
  await owner.call(setupPost, "/api/setup", { body: OWNER });
  const app = appCtx();
  const actor = publicUser((await app.store.users.findByEmail(OWNER.email))!);
  const pastatti = await createBusiness(app, actor, { name: "Pastatti", firstBranchName: "Sendero", color: "violeta" });
  const centro = await addBranch(app, actor, pastatti.business.id, { name: "Centro" });
  const { temporaryPassword } = await createPerson(app, actor, { name: "Admin Sendero", email: "admin@mando.test", role: "admin", branchIds: [pastatti.branch.id] });
  const at = async (email: string, password: string, branchId: string) => {
    const c = new ApiClient();
    await c.call(login, "/api/auth/login", { body: { email, password } });
    if (email !== OWNER.email) await c.call(changePassword, "/api/auth/password", { body: { currentPassword: password, newPassword: "admin-nueva-123" } });
    await c.call(selectBranch, "/api/session/branch", { method: "PUT", body: { branchId } });
    return c;
  };
  const sendero = await at(OWNER.email, OWNER.password, pastatti.branch.id);
  const inCentro = await at(OWNER.email, OWNER.password, centro.id);
  const admin = await at("admin@mando.test", temporaryPassword, pastatti.branch.id);
  const { position } = await json(await sendero.call(posPost, "/api/positions", { body: { name: "Mesero" } }));
  return { sendero, inCentro, admin, positionId: position.id as string };
}

describe("spec 008 — API de personal", () => {
  it("test_s008_rf2_rf6_alta_lista_y_aislamiento", async () => {
    const w = await world();
    const res = await w.sendero.call(empPost, "/api/employees", { body: { name: "Empleado Uno", positionId: w.positionId, hiredOn: "2026-11-01", dailyPay: "400" } });
    expect(res.status).toBe(201);
    const { employee } = await json(res);
    expect((await json(await w.sendero.call(empList, "/api/employees"))).employees[0]).toMatchObject({ name: "Empleado Uno", pay: "400.00" });
    expect((await json(await w.inCentro.call(empList, "/api/employees"))).employees).toEqual([]);
    expect((await w.inCentro.call((r) => empGet(r, p({ id: employee.id })), "/x")).status).toBe(404);
    const dup = await w.sendero.call(empPost, "/api/employees", { body: { name: "empleado uno", positionId: w.positionId, hiredOn: "2026-11-01" } });
    expect(dup.status).toBe(409);
    expect((await dup.json()).error.code).toBe("employee_exists");
  });

  it("test_s008_rf7_el_administrador_no_obtiene_sueldo_ni_archivos", async () => {
    const w = await world();
    const { employee } = await json(await w.sendero.call(empPost, "/api/employees", { body: { name: "Empleado Uno", positionId: w.positionId, hiredOn: "2026-11-01", dailyPay: "400" } }));
    const types = (await json(await w.admin.call(docTypes, "/api/document-types"))).documentTypes;
    const form = new FormData();
    form.append("file", new Blob([JPG]), "ine.jpg");
    const up = await w.admin.form((r) => upload(r, p({ id: employee.id, typeId: types[2].id })), "/x", form);
    expect(up.status).toBe(201);
    const asAdmin = (await json(up)).employee;
    expect(asAdmin).not.toHaveProperty("pay");
    expect(asAdmin.documents[2]).toMatchObject({ status: "delivered", count: 1 });
    expect(asAdmin.documents[2]).not.toHaveProperty("files");
    expect(JSON.stringify(await json(await w.admin.call(empList, "/api/employees")))).not.toContain("400");
    expect((await w.admin.call((r) => empAction(r, p({ id: employee.id, action: "pay" })), "/x", { body: { dailyPay: "999" } })).status).toBe(403);
    const fileId = (await json(await w.sendero.call((r) => empGet(r, p({ id: employee.id })), "/x"))).employee.documents[2].files[0].id;
    expect((await w.admin.call((r) => fileGet(r, p({ id: fileId })), "/x")).status).toBe(403);
    expect((await w.admin.call((r) => fileRetire(r, p({ id: fileId })), "/x", { body: { reason: "borrosa" } })).status).toBe(403);
    expect((await w.admin.call(docOrder, "/api/document-types/order", { method: "PUT", body: { ids: [] } })).status).toBe(403);
  });

  it("test_s008_rf27_el_archivo_se_sirve_al_dueno_sin_cache", async () => {
    const w = await world();
    const { employee } = await json(await w.sendero.call(empPost, "/api/employees", { body: { name: "Empleado Uno", positionId: w.positionId, hiredOn: "2026-11-01" } }));
    const types = (await json(await w.sendero.call(docTypes, "/api/document-types"))).documentTypes;
    const form = new FormData();
    form.append("file", new Blob([JPG]), "acta.jpg");
    await w.sendero.form((r) => upload(r, p({ id: employee.id, typeId: types[0].id })), "/x", form);
    const fileId = (await json(await w.sendero.call((r) => empGet(r, p({ id: employee.id })), "/x"))).employee.documents[0].files[0].id;
    const res = await w.sendero.call((r) => fileGet(r, p({ id: fileId })), "/x");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(JPG);
    expect((await w.inCentro.call((r) => fileGet(r, p({ id: fileId })), "/x")).status).toBe(404);
    const bad = new FormData();
    bad.append("file", new Blob([new TextEncoder().encode("GIF89a")]), "x.gif");
    expect((await w.sendero.form((r) => upload(r, p({ id: employee.id, typeId: types[0].id })), "/x", bad)).status).toBe(422);
  });

  it("test_s008_rf28_rf32_baja_y_reingreso_por_la_api", async () => {
    const w = await world();
    const { employee } = await json(await w.sendero.call(empPost, "/api/employees", { body: { name: "Empleado Uno", positionId: w.positionId, hiredOn: "2026-11-01" } }));
    const off = await w.admin.call((r) => empAction(r, p({ id: employee.id, action: "terminate" })), "/x", { body: { leftOn: "2026-11-05", reason: "resignation" } });
    expect((await json(off)).employee.active).toBe(false);
    const back = await w.admin.call((r) => empAction(r, p({ id: employee.id, action: "rehire" })), "/x", { body: { hiredOn: "2026-11-20" } });
    expect((await json(back)).employee.periods).toHaveLength(2);
    expect((await w.admin.call((r) => empAction(r, p({ id: employee.id, action: "borrar" })), "/x", { body: {} })).status).toBe(404);
  });
});
