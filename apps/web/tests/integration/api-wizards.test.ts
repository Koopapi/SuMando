// Spec 015: rutas de los borradores y de la vista elegida (persona y teléfono de piso).
import { describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as changePassword } from "@/app/api/auth/password/route";
import { POST as empPost } from "@/app/api/employees/route";
import { POST as devicePost } from "@/app/api/floor-devices/route";
import { POST as posPost } from "@/app/api/positions/route";
import { PUT as selectBranch } from "@/app/api/session/branch/route";
import { POST as setupPost } from "@/app/api/setup/route";
import { DELETE as draftDelete, GET as draftGet, PUT as draftPut } from "@/app/api/wizards/[kind]/draft/route";
import { PUT as viewPut } from "@/app/api/wizards/[kind]/view/route";
import { appCtx } from "@/server/app-context";
import { createBusiness } from "@/server/services/businesses";
import { createPerson } from "@/server/services/people";
import { publicUser } from "@/server/services/users-public";
import { wizardViews } from "@/server/services/wizards/preferences";
import { ApiClient, json } from "./api";
import { OWNER } from "./helpers";

const p = (kind: string) => ({ params: Promise.resolve({ kind }) });
const get = (c: ApiClient, kind: string, query = "") => c.call((r) => draftGet(r, p(kind)), `/api/wizards/${kind}/draft${query}`);
const put = (c: ApiClient, kind: string, body: unknown, query = "") => c.call((r) => draftPut(r, p(kind)), `/api/wizards/${kind}/draft${query}`, { method: "PUT", body });
const del = (c: ApiClient, kind: string, query = "") => c.call((r) => draftDelete(r, p(kind)), `/api/wizards/${kind}/draft${query}`, { method: "DELETE" });

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
  return { sendero, at, temporaryPassword, employeeId: employee.id as string, actor };
}

describe("spec 015 — API de los asistentes", () => {
  it("test_s015_rf17_rf18_rf20_guardar_retomar_y_descartar", async () => {
    const w = await world();
    expect(await json(await get(w.sendero, "req-new"))).toEqual({ draft: null });
    const saved = await put(w.sendero, "req-new", { step: "products", data: { warehouseId: "w1" } });
    expect(saved.status).toBe(200);
    expect((await json(await get(w.sendero, "req-new"))).draft).toMatchObject({ step: "products", data: { warehouseId: "w1" } });
    expect((await del(w.sendero, "req-new")).status).toBe(204);
    expect(await json(await get(w.sendero, "req-new"))).toEqual({ draft: null });
  });

  it("test_s015_rf17_objetivo_tareas_desconocidas_y_tamano", async () => {
    const w = await world();
    await put(w.sendero, "req-approve", { step: "review", data: {} }, "?target=r1");
    expect((await json(await get(w.sendero, "req-approve", "?target=r1"))).draft.step).toBe("review");
    expect((await get(w.sendero, "req-approve")).status).toBe(422);
    expect((await get(w.sendero, "otra-cosa")).status).toBe(404);
    expect((await json(await get(w.sendero, "otra-cosa"))).error.code).toBe("wizard_unknown");
    const big = await put(w.sendero, "req-new", { step: "a", data: "x".repeat(300 * 1024) });
    expect(big.status).toBe(413);
    expect((await json(big)).error.message).toBe("Lo capturado es demasiado grande para guardarlo.");
    expect((await get(new ApiClient(), "req-new")).status).toBe(401);
  });

  it("test_s015_rf22_el_telefono_de_piso_guarda_por_empleado", async () => {
    const w = await world();
    const phone = await w.at("admin@mando.test", w.temporaryPassword);
    await phone.call(devicePost, "/api/floor-devices", { body: { name: "Tablet de cocina" } });
    const q = `?target=t1&employee=${w.employeeId}`;
    expect((await put(phone, "floor-checklist", { step: "s1", data: { done: 1 } }, q)).status).toBe(200);
    expect((await json(await get(phone, "floor-checklist", q))).draft.step).toBe("s1");
    expect((await get(phone, "floor-checklist", "?target=t1")).status).toBe(422);
    expect((await get(phone, "req-new", `?employee=${w.employeeId}`)).status).toBe(403);
  });

  it("test_s015_rf26_la_vista_elegida_se_guarda", async () => {
    const w = await world();
    const res = await w.sendero.call((r) => viewPut(r, p("req-new")), "/api/wizards/req-new/view", { method: "PUT", body: { view: "full" } });
    expect(await json(res)).toEqual({ view: "full" });
    expect(await wizardViews(appCtx(), w.actor)).toEqual({ "req-new": "full" });
    expect((await w.sendero.call((r) => viewPut(r, p("req-new")), "/x", { method: "PUT", body: { view: "rara" } })).status).toBe(422);
  });
});
