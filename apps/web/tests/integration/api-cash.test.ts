// Spec 011: handlers del corte con sesión y con el teléfono de piso: el teléfono cuenta a ciegas y no llega al
// reporte, al cierre ni al historial (RF-30 a RF-33).
import { describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as changePassword } from "@/app/api/auth/password/route";
import { GET as currentGet } from "@/app/api/cash/current/route";
import { POST as cutAction } from "@/app/api/cash/cuts/[id]/[action]/route";
import { GET as cutGet } from "@/app/api/cash/cuts/[id]/route";
import { GET as cutsGet, POST as cutsPost } from "@/app/api/cash/cuts/route";
import { PUT as settingsPut } from "@/app/api/cash/settings/route";
import { POST as empPost } from "@/app/api/employees/route";
import { POST as devicePost } from "@/app/api/floor-devices/route";
import { POST as posPost } from "@/app/api/positions/route";
import { PUT as selectBranch } from "@/app/api/session/branch/route";
import { POST as setupPost } from "@/app/api/setup/route";
import { appCtx } from "@/server/app-context";
import { createBusiness } from "@/server/services/businesses";
import { createPerson } from "@/server/services/people";
import { publicUser } from "@/server/services/users-public";
import { ApiClient, json } from "./api";
import { OWNER } from "./helpers";

const p = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) });

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
  await sendero.call(settingsPut, "/api/cash/settings", { method: "PUT", body: { mode: "multiple", floorEnabled: true, methods: [{ name: "BBVA 1" }] } });
  const { position } = await json(await sendero.call(posPost, "/api/positions", { body: { name: "Caja" } }));
  const { employee } = await json(await sendero.call(empPost, "/api/employees", { body: { name: "Cajero Uno", positionId: position.id, hiredOn: "2026-01-01" } }));
  const phone = await at("admin@mando.test", temporaryPassword);
  await phone.call(devicePost, "/api/floor-devices", { body: { name: "Tablet de caja" } });
  return { sendero, phone, employeeId: employee.id as string };
}

describe("spec 011 — API del corte", () => {
  it("test_s011_rf30_rf32_el_telefono_cuenta_a_ciegas_por_la_api", async () => {
    const w = await world();
    const opened = await w.phone.call(cutsPost, "/api/cash/cuts", { body: { fund: "500", employeeId: w.employeeId } });
    expect(opened.status).toBe(201);
    const { cut } = await json(opened);
    const act = (action: string) => (r: Request) => cutAction(r, p({ id: cut.id, action }));
    const amounts = Object.fromEntries(cut.methods.filter((m: { isCash: boolean }) => !m.isCash).map((m: { id: string }) => [m.id, "200"]));
    expect((await w.phone.call(act("deliver"), "/x", { body: { employeeId: w.employeeId, pieces: { "50000": 2 }, amounts } })).status).toBe(200);
    const pos = Object.fromEntries(cut.methods.map((m: { id: string }) => [m.id, "777"]));
    expect((await w.sendero.call(act("pos"), "/x", { body: { amounts: pos } })).status).toBe(200);
    const blind = JSON.stringify(await json(await w.phone.call(currentGet, `/api/cash/current?employee=${w.employeeId}`)));
    expect(blind).not.toMatch(/777|"pos"|difference|figures/);
    expect((await w.phone.call(act("pos"), "/x", { body: { amounts: pos } })).status).toBe(403);
    expect((await w.phone.call(act("close"), "/x", { body: {} })).status).toBe(403);
    expect((await w.phone.call(cutsGet, "/api/cash/cuts")).status).toBe(401);
    expect((await w.phone.call((r) => cutGet(r, p({ id: cut.id })), "/x")).status).toBe(401);
    const closed = await w.sendero.call(act("close"), "/x", { body: { note: "" } });
    expect((await json(closed)).cut.figures.posTotal).toBe("1554.00");
  });

  it("test_s011_rf33_sin_permiso_el_telefono_no_hace_cortes", async () => {
    const w = await world();
    await w.sendero.call(settingsPut, "/api/cash/settings", { method: "PUT", body: { mode: "multiple", floorEnabled: false, methods: [] } });
    expect((await w.phone.call(cutsPost, "/api/cash/cuts", { body: { fund: "500", employeeId: w.employeeId } })).status).toBe(403);
  });
});
