// Expedientes de empleados (spec 008, RF-1 a RF-15, RF-28 a RF-42). El sueldo, los archivos y el registro solo van en
// las vistas del dueño; todo cambio queda en el registro con el valor anterior.
import type { DocumentType, Employee, EmployeeFile, EmployeePeriod } from "@/db/schema";
import { canAccessBranch } from "@/domain/access/branch-access";
import { isOwner } from "@/domain/access/owner";
import { catalogKey } from "@/domain/catalog/names";
import { writtenReason } from "@/domain/inventory/movement";
import { docStatus, isDate, requiredSummary, todayInMexico } from "@/domain/personnel/documents";
import { leaveBeforeHire, leaveProblem, NAME_MAX, NOTES_MAX, payProblem, PHONE_MAX } from "@/domain/personnel/employee";
import { centsToText, parseMoney } from "@/domain/requisitions/money";
import { normalizeName } from "@/domain/text";
import { AppError } from "../../errors";
import type { Repos } from "../../ports";
import { recordAudit } from "../audit";
import type { CatalogAccess, CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";
import { optionalText, uuidOrNotFound } from "../inventory/shared";
import { documentTypesOf, ownEmployee, ownerOnly, personnelAccess } from "./shared";
import type { DocSummary, EmployeeDetailView, EmployeeDocumentView, EmployeeSummaryView } from "./views";

const snapshot = (e: Employee) => ({ name: e.name, positionId: e.positionId, phone: e.phone, notes: e.notes, branchId: e.branchId, active: e.active });
const STATE: Record<string, string> = { active: "activo", inactive: "dado de baja" };

function employeeName(raw: unknown): { name: string; nameKey: string } {
  const name = normalizeName(typeof raw === "string" ? raw : "");
  if (!name || name.length > NAME_MAX) throw new AppError("name_invalid", { max: NAME_MAX });
  return { name, nameKey: catalogKey(name) };
}

async function activePosition(repos: Repos, access: CatalogAccess, id: unknown) {
  const p = await repos.personnel.positions.findById(uuidOrNotFound(id));
  if (!p || p.businessId !== access.businessId) throw new AppError("not_found");
  if (p.archivedAt) throw new AppError("archived_item", { name: p.name });
  return p;
}

function date(raw: unknown): string {
  if (!isDate(raw)) throw new AppError("invalid_date");
  return raw;
}

function pay(raw: unknown): bigint {
  const cents = parseMoney(typeof raw === "string" ? raw : raw === undefined || raw === null ? null : String(raw));
  if (cents === undefined || payProblem(cents)) throw new AppError("invalid_pay");
  return cents!;
}

const audit = (repos: Repos, now: Date, scope: CatalogScope, e: Employee, action: string, after: unknown, before?: unknown) =>
  recordAudit(repos.audit, now, { actorId: scope.actor.id, action, entityType: "employee", entityId: e.id, businessId: e.businessId, branchId: e.branchId, before, after });

const openPeriod = (periods: EmployeePeriod[], id: string) => periods.find((p) => p.employeeId === id && p.leftOn === null);
const lastPeriod = (periods: EmployeePeriod[], id: string) => periods.filter((p) => p.employeeId === id).sort((a, b) => (a.hiredOn < b.hiredOn ? -1 : 1)).at(-1);
const current = (f: EmployeeFile) => !f.replacedAt && !f.retiredAt;

function documentsOf(types: DocumentType[], files: EmployeeFile[], today: string) {
  return types
    .filter((t) => !t.archivedAt)
    .map((t) => {
      const mine = files.filter((f) => f.documentTypeId === t.id && current(f));
      return { type: t, files: mine, status: docStatus(t.validityMonths, mine, today), issuedOn: mine.map((f) => f.issuedOn).filter((d): d is string => !!d).sort().at(-1) ?? null };
    });
}

function summary(docs: ReturnType<typeof documentsOf>): DocSummary {
  const { ok, total } = requiredSummary(docs.map((d) => ({ required: d.type.required, status: d.status })));
  const required = docs.filter((d) => d.type.required);
  return { ok, total, missing: required.filter((d) => d.status === "missing").length, expired: required.filter((d) => d.status === "expired").length };
}

const payText = (cents: bigint | null) => (cents === null ? null : centsToText(cents));

/** RF-36 y RF-37: empleados de la sucursal activa; el sueldo solo para el dueño. */
export async function listEmployees(ctx: Ctx, scope: CatalogScope): Promise<EmployeeSummaryView[]> {
  const access = await personnelAccess(ctx.store, scope);
  const types = await documentTypesOf(ctx, access.businessId);
  const list = await ctx.store.personnel.employees.listByBranch(scope.active.branch.id);
  const ids = list.map((e) => e.id);
  const [periods, files, positions] = await Promise.all([ctx.store.personnel.periods.listByEmployees(ids), ctx.store.personnel.files.listByEmployees(ids), ctx.store.personnel.positions.listByBusiness(access.businessId)]);
  const today = todayInMexico(ctx.ports.clock.now());
  const owner = isOwner(scope.actor);
  return list.map((e) => {
    const last = lastPeriod(periods, e.id);
    const docs = summary(documentsOf(types, files.filter((f) => f.employeeId === e.id), today));
    return {
      id: e.id,
      name: e.name,
      position: positions.find((p) => p.id === e.positionId)?.name ?? "",
      hiredOn: last?.hiredOn ?? null,
      phone: e.phone,
      active: e.active,
      leftOn: e.active ? null : (last?.leftOn ?? null),
      docs,
      ...(owner ? { pay: payText(e.dailyPayCents) } : {}),
    };
  });
}

export async function employeeDetail(ctx: Ctx, scope: CatalogScope, id: string): Promise<EmployeeDetailView> {
  const access = await personnelAccess(ctx.store, scope);
  const e = await ownEmployee(ctx.store, scope, id);
  const [types, periods, files, position, users, branches] = await Promise.all([
    documentTypesOf(ctx, access.businessId),
    ctx.store.personnel.periods.listByEmployees([e.id]),
    ctx.store.personnel.files.listByEmployees([e.id]),
    ctx.store.personnel.positions.findById(e.positionId),
    ctx.store.users.list(),
    ctx.store.branches.listByBusiness(access.businessId),
  ]);
  const owner = isOwner(scope.actor);
  const nameOf = (uid: string | null) => users.find((u) => u.id === uid)?.name ?? "";
  const docs = documentsOf(types, files, todayInMexico(ctx.ports.clock.now()));
  const documents: EmployeeDocumentView[] = docs.map((d) => ({
    typeId: d.type.id,
    name: d.type.name,
    required: d.type.required,
    validityMonths: d.type.validityMonths,
    status: d.status,
    issuedOn: d.issuedOn,
    count: d.files.length,
    ...(owner
      ? {
          files: files
            .filter((f) => f.documentTypeId === d.type.id)
            .map((f) => ({ id: f.id, name: f.originalName, contentType: f.contentType, size: f.sizeBytes, issuedOn: f.issuedOn, uploadedAt: f.uploadedAt.toISOString(), uploadedBy: nameOf(f.uploadedBy), replacedAt: f.replacedAt?.toISOString() ?? null, retiredAt: f.retiredAt?.toISOString() ?? null, retireReason: f.retireReason })),
        }
      : {}),
  }));
  const history = owner ? (await ctx.store.audit.listByEntity("employee", e.id)).map((a) => ({ action: a.action, at: a.createdAt.toISOString(), actor: a.actorName ?? "", before: a.before, after: a.after })) : undefined;
  return {
    id: e.id,
    name: e.name,
    positionId: e.positionId,
    position: position?.name ?? "",
    phone: e.phone,
    notes: e.notes,
    active: e.active,
    branch: { id: e.branchId, name: branches.find((b) => b.id === e.branchId)?.name ?? "" },
    periods: periods.map((p) => ({ hiredOn: p.hiredOn, leftOn: p.leftOn, reason: p.leaveReason, note: p.leaveNote })),
    documents,
    docs: summary(docs),
    owner,
    ...(owner ? { pay: payText(e.dailyPayCents), history } : {}),
    moveTo: branches.filter((b) => b.id !== e.branchId && !b.archivedAt && canAccessBranch(scope.actor, access.memberships, b)).map((b) => ({ id: b.id, name: b.name })),
  };
}

export interface EmployeeInput {
  name: unknown;
  positionId: unknown;
  hiredOn: unknown;
  phone?: unknown;
  notes?: unknown;
  dailyPay?: unknown;
  confirmDuplicate?: unknown;
}

/** RF-9 a RF-13: alta con puesto y fecha de ingreso; el sueldo solo lo pone el dueño. */
export async function createEmployee(ctx: Ctx, scope: CatalogScope, input: EmployeeInput): Promise<Employee> {
  const { name, nameKey } = employeeName(input.name);
  const hiredOn = date(input.hiredOn);
  const phone = optionalText(input.phone, PHONE_MAX);
  const notes = optionalText(input.notes, NOTES_MAX);
  const hasPay = input.dailyPay !== undefined && input.dailyPay !== null && input.dailyPay !== "";
  if (hasPay) ownerOnly(scope);
  const cents = hasPay ? pay(input.dailyPay) : null;
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const access = await personnelAccess(repos, scope);
    const position = await activePosition(repos, access, input.positionId);
    const others = await repos.personnel.employees.listByBranch(scope.active.branch.id);
    // RF-12: avisa de un homónimo activo y deja continuar si se confirma.
    if (input.confirmDuplicate !== true && others.some((o) => o.active && o.nameKey === nameKey)) throw new AppError("employee_exists", { name });
    const e = await repos.personnel.employees.insert({ businessId: access.businessId, branchId: scope.active.branch.id, name, nameKey, positionId: position.id, phone, notes, dailyPayCents: cents, createdBy: scope.actor.id, createdAt: now });
    await repos.personnel.periods.insert({ employeeId: e.id, hiredOn });
    await audit(repos, now, scope, e, "employee.created", { ...snapshot(e), hiredOn, pay: cents === null ? null : "set" });
    return e;
  });
}

/** RF-15: se editan los datos y la fecha de ingreso del periodo abierto. */
export async function updateEmployee(ctx: Ctx, scope: CatalogScope, id: string, input: Partial<EmployeeInput>): Promise<Employee> {
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const access = await personnelAccess(repos, scope);
    const before = await ownEmployee(repos, scope, id);
    const patch: Parameters<Repos["personnel"]["employees"]["update"]>[1] = { updatedAt: now };
    if (input.name !== undefined) Object.assign(patch, employeeName(input.name));
    if (input.positionId !== undefined) patch.positionId = (await activePosition(repos, access, input.positionId)).id;
    if (input.phone !== undefined) patch.phone = optionalText(input.phone, PHONE_MAX);
    if (input.notes !== undefined) patch.notes = optionalText(input.notes, NOTES_MAX);
    let hired: { before: string; after: string } | null = null;
    if (input.hiredOn !== undefined) {
      const periods = await repos.personnel.periods.listByEmployees([before.id]);
      const open = openPeriod(periods, before.id);
      if (!open) throw new AppError("employee_state", { state: STATE.inactive });
      const hiredOn = date(input.hiredOn);
      const previous = periods.filter((p) => p.leftOn !== null).map((p) => p.leftOn!).sort().at(-1);
      if (previous && hiredOn < previous) throw new AppError("invalid_date");
      await repos.personnel.periods.update(open.id, { hiredOn });
      hired = { before: open.hiredOn, after: hiredOn };
    }
    const after = await repos.personnel.employees.update(before.id, patch);
    await audit(repos, now, scope, after, "employee.updated", { ...snapshot(after), ...(hired ? { hiredOn: hired.after } : {}) }, { ...snapshot(before), ...(hired ? { hiredOn: hired.before } : {}) });
    return after;
  });
}

/** RF-13: el dueño fija o cambia el sueldo por día. */
export async function setEmployeePay(ctx: Ctx, scope: CatalogScope, id: string, raw: unknown): Promise<Employee> {
  ownerOnly(scope);
  const cents = pay(raw);
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    await personnelAccess(repos, scope);
    const before = await ownEmployee(repos, scope, id);
    const after = await repos.personnel.employees.update(before.id, { dailyPayCents: cents, updatedAt: now });
    await audit(repos, now, scope, after, "employee.pay_set", { pay: centsToText(cents) }, { pay: payText(before.dailyPayCents) });
    return after;
  });
}

/** RF-28 a RF-31: baja con fecha y motivo. */
export async function terminateEmployee(ctx: Ctx, scope: CatalogScope, id: string, input: { leftOn: unknown; reason: unknown; note?: unknown }): Promise<Employee> {
  const leftOn = date(input.leftOn);
  const note = typeof input.note === "string" && input.note.trim() ? writtenReason(input.note) : null;
  if (typeof input.note === "string" && input.note.trim() && !note) throw new AppError("reason_required");
  const problem = leaveProblem(input.reason, note);
  if (problem) throw new AppError(problem);
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    await personnelAccess(repos, scope);
    const e = await ownEmployee(repos, scope, id);
    const open = openPeriod(await repos.personnel.periods.listByEmployees([e.id]), e.id);
    if (!e.active || !open) throw new AppError("employee_state", { state: STATE.inactive });
    if (leaveBeforeHire(open.hiredOn, leftOn)) throw new AppError("leave_before_hire");
    await repos.personnel.periods.update(open.id, { leftOn, leaveReason: input.reason as string, leaveNote: note });
    const after = await repos.personnel.employees.update(e.id, { active: false, updatedAt: now });
    await audit(repos, now, scope, after, "employee.terminated", { leftOn, reason: input.reason, note });
    return after;
  });
}

/** RF-32: el reingreso reactiva el mismo expediente con un periodo nuevo. */
export async function rehireEmployee(ctx: Ctx, scope: CatalogScope, id: string, input: { hiredOn: unknown }): Promise<Employee> {
  const hiredOn = date(input.hiredOn);
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    await personnelAccess(repos, scope);
    const e = await ownEmployee(repos, scope, id);
    if (e.active) throw new AppError("employee_state", { state: STATE.active });
    const last = lastPeriod(await repos.personnel.periods.listByEmployees([e.id]), e.id);
    if (last?.leftOn && hiredOn < last.leftOn) throw new AppError("invalid_date");
    await repos.personnel.periods.insert({ employeeId: e.id, hiredOn });
    const after = await repos.personnel.employees.update(e.id, { active: true, updatedAt: now });
    await audit(repos, now, scope, after, "employee.rehired", { hiredOn });
    return after;
  });
}

/** RF-34 y RF-35: cambio a otra sucursal del negocio a la que tiene acceso quien lo hace. */
export async function moveEmployee(ctx: Ctx, scope: CatalogScope, id: string, input: { branchId: unknown; on?: unknown }): Promise<Employee> {
  const on = input.on === undefined || input.on === null || input.on === "" ? todayInMexico(ctx.ports.clock.now()) : date(input.on);
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const access = await personnelAccess(repos, scope);
    const e = await ownEmployee(repos, scope, id);
    if (!e.active) throw new AppError("employee_state", { state: STATE.inactive });
    const target = access.branches.find((b) => b.id === input.branchId);
    if (!target || target.archivedAt || target.id === e.branchId || !canAccessBranch(scope.actor, access.memberships, target)) throw new AppError("not_found");
    const after = await repos.personnel.employees.update(e.id, { branchId: target.id, updatedAt: now });
    await audit(repos, now, scope, after, "employee.moved", { branchId: target.id, on }, { branchId: e.branchId });
    return after;
  });
}

/** RF-38: para el inicio, activos y cuántos tienen documentos faltantes o vencidos. */
export async function personnelCounts(ctx: Ctx, scope: CatalogScope): Promise<{ active: number; incomplete: number }> {
  const list = await listEmployees(ctx, scope);
  const active = list.filter((e) => e.active);
  return { active: active.length, incomplete: active.filter((e) => e.docs.missing + e.docs.expired > 0).length };
}

