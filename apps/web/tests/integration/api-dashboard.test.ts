// Spec 012: handlers del tablero con sesión: secciones por rol, rango inválido, Excel y marca de revisado.
import { describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as changePassword } from "@/app/api/auth/password/route";
import { POST as cutAction } from "@/app/api/cash/cuts/[id]/[action]/route";
import { GET as sectionExcel } from "@/app/api/dashboard/[section]/excel/route";
import { GET as sectionGet } from "@/app/api/dashboard/[section]/route";
import { GET as summaryGet } from "@/app/api/dashboard/route";
import { PUT as selectBranch } from "@/app/api/session/branch/route";
import { POST as setupPost } from "@/app/api/setup/route";
import { readWorkbook } from "@/server/adapters/xlsx";
import { appCtx } from "@/server/app-context";
import { createBusiness } from "@/server/services/businesses";
import { capturePos, closeCut, deliverCount, openCut } from "@/server/services/cash/cuts";
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
  const pirrus = await createBusiness(app, actor, { name: "Pirrus", firstBranchName: "Centro", color: "rojo" });
  const { temporaryPassword } = await createPerson(app, actor, { name: "Admin Sendero", email: "admin@mando.test", role: "admin", branchIds: [pastatti.branch.id] });
  await owner.call(login, "/api/auth/login", { body: { email: OWNER.email, password: OWNER.password } });
  await owner.call(selectBranch, "/api/session/branch", { method: "PUT", body: { branchId: pirrus.branch.id } });
  const admin = new ApiClient();
  await admin.call(login, "/api/auth/login", { body: { email: "admin@mando.test", password: temporaryPassword } });
  await admin.call(changePassword, "/api/auth/password", { body: { currentPassword: temporaryPassword, newPassword: "admin-nueva-123" } });
  // Un corte de Pirrus con un peso de diferencia.
  const scope = { kind: "user" as const, scope: { actor, active: { branch: pirrus.branch, business: pirrus.business } } };
  const cut = await openCut(app, scope, "0");
  const cash = cut.methods[0].id;
  await deliverCount(app, scope, cut.id, { pieces: { "100000": 1 }, amounts: {} });
  await capturePos(app, scope, cut.id, { [cash]: "999" });
  await closeCut(app, scope, cut.id, "");
  return { owner, admin, cutId: cut.id };
}

describe("spec 012 — API del tablero", () => {
  it("test_s012_rf4_rf5_el_administrador_solo_alertas_y_ventas", async () => {
    const w = await world();
    const { dashboard } = await json(await w.admin.call(summaryGet, "/api/dashboard"));
    expect(dashboard.sections).toEqual(["alerts", "sales"]);
    expect(dashboard.alerts).toBe(0);
    for (const section of ["expenses", "payroll", "remaining"]) {
      expect((await w.admin.call((r) => sectionGet(r, p({ section })), `/api/dashboard/${section}`)).status).toBe(403);
      expect((await w.admin.call((r) => sectionExcel(r, p({ section })), `/api/dashboard/${section}/excel`)).status).toBe(403);
    }
    expect((await w.admin.call((r) => sectionGet(r, p({ section: "sales" })), "/api/dashboard/sales")).status).toBe(200);
    expect((await new ApiClient().call(summaryGet, "/api/dashboard")).status).toBe(401);
  });

  it("test_s012_rf2_rf16_el_dueno_ve_todo_con_hoy_por_omision", async () => {
    const w = await world();
    const { dashboard } = await json(await w.owner.call(summaryGet, "/api/dashboard"));
    expect(dashboard.sections).toEqual(["alerts", "sales", "expenses", "payroll", "remaining"]);
    expect(dashboard.period.kind).toBe("today");
    expect(dashboard.alerts).toBe(1);
    expect(dashboard.figures.sales.amount).toBe("1000.00");
  });

  it("test_s012_rf13_rf14_rf15_rango_invalido_responde_422", async () => {
    const w = await world();
    const bad = async (q: string) => {
      const res = await w.owner.call(summaryGet, `/api/dashboard?${q}`);
      return [res.status, (await json(res)).error.code];
    };
    expect(await bad("period=range&from=2026-11-10&to=2026-11-01")).toEqual([422, "range_order"]);
    expect(await bad("period=range&from=2020-01-01&to=2021-06-01")).toEqual([422, "range_too_long"]);
    expect(await bad("period=range&from=2020-01-01&to=2999-01-01")).toEqual([422, "range_future"]);
  });

  it("test_s012_rf51_rf53_el_excel_se_baja_sin_cache", async () => {
    const w = await world();
    const res = await w.owner.call((r) => sectionExcel(r, p({ section: "alerts" })), "/api/dashboard/alerts/excel");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toMatch(/tablero-alerts-\d{4}-\d{2}-\d{2}-a-\d{4}-\d{2}-\d{2}\.xlsx/);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const rows = readWorkbook(Buffer.from(await res.arrayBuffer())).sheets[0].rows;
    expect(rows.at(-1)!.slice(0, 3)).toEqual(["Cortes con diferencia", "Pirrus", "Centro"]);
  });

  it("test_s012_rf47_rf48_el_dueno_marca_revisado_por_la_api", async () => {
    const w = await world();
    const res = await w.owner.call((r) => cutAction(r, p({ id: w.cutId, action: "review" })), "/x", { body: {} });
    expect(res.status).toBe(200);
    expect((await json(res)).cut.reviewedBy).toBe(OWNER.name);
    expect((await json(await w.owner.call(summaryGet, "/api/dashboard"))).dashboard.alerts).toBe(0);
  });
});
