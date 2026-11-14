// Spec 009: handlers de nómina con sesión, su contrato, el aislamiento y que un administrador no obtiene montos,
// préstamos, hoja de pago ni Excel por ninguna ruta.
import { describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as changePassword } from "@/app/api/auth/password/route";
import { GET as loansGet, POST as loansPost } from "@/app/api/employees/[id]/loans/route";
import { POST as empPost } from "@/app/api/employees/route";
import { POST as weekAction } from "@/app/api/payroll/weeks/[start]/[action]/route";
import { PUT as dayPut } from "@/app/api/payroll/weeks/[start]/days/route";
import { GET as excelGet } from "@/app/api/payroll/weeks/[start]/excel/route";
import { PATCH as linePatch } from "@/app/api/payroll/weeks/[start]/lines/[employeeId]/route";
import { PUT as loanPut } from "@/app/api/payroll/weeks/[start]/loans/[loanId]/route";
import { GET as weekGet } from "@/app/api/payroll/weeks/[start]/route";
import { GET as weeksGet } from "@/app/api/payroll/weeks/route";
import { POST as posPost } from "@/app/api/positions/route";
import { PUT as selectBranch } from "@/app/api/session/branch/route";
import { POST as setupPost } from "@/app/api/setup/route";
import { addDays, weekOf } from "@/domain/payroll/week";
import { todayInMexico } from "@/domain/personnel/documents";
import { readWorkbook } from "@/server/adapters/xlsx";
import { appCtx } from "@/server/app-context";
import { now } from "@/server/clock";
import { addBranch, createBusiness } from "@/server/services/businesses";
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
  const week = addDays(weekOf(todayInMexico(now())), -7);
  const { employee } = await json(await sendero.call(empPost, "/api/employees", { body: { name: "Empleado Uno", positionId: position.id, hiredOn: addDays(week, -30), dailyPay: "400" } }));
  return { sendero, inCentro, admin, week, employeeId: employee.id as string };
}

describe("spec 009 — API de nómina", () => {
  it("test_s009_rf4_rf5_el_administrador_marca_y_no_ve_montos", async () => {
    const w = await world();
    const res = await w.admin.call((r) => dayPut(r, p({ start: w.week })), "/x", { method: "PUT", body: { employeeId: w.employeeId, day: 0, state: "worked", late: true } });
    expect(res.status).toBe(200);
    const { week } = await json(res);
    expect(week.groups[0].rows[0].counts).toEqual({ days: 1, half: 0, late: 1 });
    expect(week.totals).toBeUndefined();
    const text = JSON.stringify(await json(await w.admin.call((r) => weekGet(r, p({ start: w.week })), "/x")));
    expect(text).not.toMatch(/"money"|"totals"|400/);
    expect(JSON.stringify(await json(await w.admin.call(weeksGet, "/api/payroll/weeks")))).not.toMatch(/"total"/);
  });

  it("test_s009_rf7_el_administrador_no_obtiene_montos_prestamos_ni_excel", async () => {
    const w = await world();
    expect((await w.admin.call((r) => linePatch(r, p({ start: w.week, employeeId: w.employeeId })), "/x", { method: "PATCH", body: { extras: "100" } })).status).toBe(403);
    expect((await w.admin.call((r) => loansGet(r, p({ id: w.employeeId })), "/x")).status).toBe(403);
    expect((await w.admin.call((r) => loansPost(r, p({ id: w.employeeId })), "/x", { body: { lentOn: w.week, amount: "100", weekly: "50" } })).status).toBe(403);
    expect((await w.admin.call((r) => excelGet(r, p({ start: w.week })), "/x")).status).toBe(403);
    expect((await w.admin.call((r) => weekAction(r, p({ start: w.week, action: "close" })), "/x", { body: {} })).status).toBe(403);
  });

  it("test_s009_rf8_otra_sucursal_no_existe_y_la_semana_es_lunes", async () => {
    const w = await world();
    expect((await w.inCentro.call((r) => dayPut(r, p({ start: w.week })), "/x", { method: "PUT", body: { employeeId: w.employeeId, day: 0, state: "worked" } })).status).toBe(404);
    expect((await w.sendero.call((r) => weekGet(r, p({ start: addDays(w.week, 1) })), "/x")).status).toBe(422);
  });

  it("test_s009_rf45_el_dueno_baja_la_semana_en_excel", async () => {
    const w = await world();
    for (const day of [0, 1, 2]) await w.sendero.call((r) => dayPut(r, p({ start: w.week })), "/x", { method: "PUT", body: { employeeId: w.employeeId, day, state: "worked" } });
    await w.sendero.call((r) => linePatch(r, p({ start: w.week, employeeId: w.employeeId })), "/x", { method: "PATCH", body: { bonus: "550", bonusConcept: "Camarón", meal: "50" } });
    const res = await w.sendero.call((r) => excelGet(r, p({ start: w.week })), "/x");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain(`nomina-sendero-${w.week}.xlsx`);
    const [sheet] = readWorkbook(Buffer.from(await res.arrayBuffer())).sheets;
    expect(sheet.rows[0]).toEqual(["Empleado", "Puesto", "Días", "Medias jornadas", "Retardos", "Sueldo por día", "Pago de días", "Extras", "Bonos", "Concepto del bono", "Descuento por retardos", "Comida", "Abono de préstamos", "Neto"]);
    expect(sheet.rows[1]).toEqual(["Empleado Uno", "Mesero", "3", "0", "0", "400", "1200", "0", "550", "Camarón", "0", "50", "0", "1700"]);
    expect(sheet.rows[2][0]).toBe("Total");
    expect(sheet.rows[2].at(-1)).toBe("1700");
  });

  it("test_s009_rf27_rf30_rf39_prestamo_abono_cierre_y_reapertura", async () => {
    const w = await world();
    await w.sendero.call((r) => dayPut(r, p({ start: w.week })), "/x", { method: "PUT", body: { employeeId: w.employeeId, day: 0, state: "worked" } });
    const created = await w.sendero.call((r) => loansPost(r, p({ id: w.employeeId })), "/x", { body: { lentOn: w.week, amount: "1000", weekly: "300" } });
    expect(created.status).toBe(201);
    const [loan] = (await json(created)).loans;
    const { week } = await json(await w.sendero.call((r) => loanPut(r, p({ start: w.week, loanId: loan.id })), "/x", { method: "PUT", body: { amount: "100" } }));
    expect(week.totals.net).toBe("300.00");
    expect((await w.sendero.call((r) => weekAction(r, p({ start: w.week, action: "close" })), "/x", { body: {} })).status).toBe(200);
    expect((await json(await w.sendero.call((r) => loansGet(r, p({ id: w.employeeId })), "/x"))).loans[0].balance).toBe("900.00");
    expect((await w.sendero.call((r) => weekAction(r, p({ start: w.week, action: "reopen" })), "/x", { body: { reason: "" } })).status).toBe(422);
    expect((await w.sendero.call((r) => weekAction(r, p({ start: w.week, action: "reopen" })), "/x", { body: { reason: "faltó un día" } })).status).toBe(200);
    expect((await json(await w.sendero.call((r) => loansGet(r, p({ id: w.employeeId })), "/x"))).loans[0].balance).toBe("1000.00");
  });
});
