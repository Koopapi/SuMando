// Semana de nómina (spec 009): vista por rol, marcar días, montos, abonos, cerrar, reabrir e historial. El servidor
// calcula todo (constitución, principio 3); los montos solo llegan al dueño (RF-5 a RF-7).
import type { Employee, EmployeePeriod, Loan, LoanPayment, PayrollDay, PayrollLine, PayrollWeek } from "@/db/schema";
import { isOwner } from "@/domain/access/owner";
import { writtenReason } from "@/domain/inventory/movement";
import { lineTotals, weekTotals, type DayMark, type LineTotals } from "@/domain/payroll/calc";
import { applyPayment, proposedPayment, revertPayment } from "@/domain/payroll/loans";
import { addDays, dayIsFuture, dayWithinPeriods, isMonday, weekDates, weekOverlapsPeriods } from "@/domain/payroll/week";
import { todayInMexico } from "@/domain/personnel/documents";
import { parseMoney } from "@/domain/requisitions/money";
import { AppError } from "../../errors";
import type { Repos } from "../../ports";
import { recordAudit } from "../audit";
import { businessLock, type CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";
import { uuidOrNotFound } from "../inventory/shared";
import { ownerOnly, personnelAccess } from "../personnel/shared";
import type { DayView, PayrollRowView, PayrollWeekSummaryView, PayrollWeekView } from "./views";

export const BONUS_CONCEPT_MAX = 80;

/** Pesos con signo: 123450n → «1234.50», -5000n → «-50.00». */
export function moneyText(cents: bigint): string {
  const neg = cents < 0n;
  const abs = neg ? -cents : cents;
  return `${neg ? "-" : ""}${abs / 100n}.${String(abs % 100n).padStart(2, "0")}`;
}

export function mondayOrInvalid(raw: unknown): string {
  if (!isMonday(raw)) throw new AppError("invalid_week");
  return raw;
}

const weekLock = (branchId: string, monday: string) => businessLock(`${branchId}:${monday}`);

interface Person {
  employee: Employee;
  periods: EmployeePeriod[];
  line: PayrollLine | null;
  days: (DayMark | null)[];
  loans: { loan: Loan; payment: bigint }[];
  position: string;
  pay: bigint | null;
  totals: LineTotals;
}

interface Loaded {
  monday: string;
  dates: string[];
  week: PayrollWeek | null;
  people: Person[];
  payments: LoanPayment[];
}

/** RF-9: quién aparece en la semana y con qué; cerrada, sale de lo congelado (RF-35). */
async function loadWeek(repos: Repos, scope: CatalogScope, monday: string): Promise<Loaded> {
  const branchId = scope.active.branch.id;
  const dates = weekDates(monday);
  const week = await repos.payroll.weeks.find(branchId, monday);
  const lines = week ? await repos.payroll.lines.listByWeek(week.id) : [];
  const inBranch = await repos.personnel.employees.listByBranch(branchId);
  const extraIds = lines.map((l) => l.employeeId).filter((id) => !inBranch.some((e) => e.id === id));
  const extra = (await Promise.all(extraIds.map((id) => repos.personnel.employees.findById(id)))).filter((e): e is Employee => e !== null);
  const candidates = [...inBranch, ...extra];
  const periods = await repos.personnel.periods.listByEmployees(candidates.map((e) => e.id));
  const closed = week?.status === "closed";
  const shown = candidates.filter((e) => lines.some((l) => l.employeeId === e.id) || (!closed && weekOverlapsPeriods(monday, periods.filter((p) => p.employeeId === e.id))));
  const [days, positions, loans, payments] = await Promise.all([
    repos.payroll.days.listByLines(lines.map((l) => l.id)),
    repos.personnel.positions.listByBusiness(scope.active.business.id),
    repos.payroll.loans.listByEmployees(shown.map((e) => e.id)),
    week ? repos.payroll.payments.listByWeek(week.id) : Promise.resolve([] as LoanPayment[]),
  ]);
  const sunday = dates[6];
  const people = shown.map((employee): Person => {
    const line = lines.find((l) => l.employeeId === employee.id) ?? null;
    const marks: (DayMark | null)[] = dates.map((_, i) => {
      const d = line ? days.find((x: PayrollDay) => x.lineId === line.id && x.day === i) : undefined;
      return d ? { state: d.state, late: d.late } : null;
    });
    const mine = loans
      .filter((l) => l.employeeId === employee.id && l.lentOn <= sunday)
      .map((loan) => {
        const row = payments.find((p) => p.loanId === loan.id);
        return { loan, payment: row ? row.amountCents : proposedPayment({ weeklyCents: loan.weeklyCents, balanceCents: loan.balanceCents }) };
      })
      .filter((l) => l.payment > 0n || payments.some((p) => p.loanId === l.loan.id) || l.loan.balanceCents > 0n);
    const frozen = closed && line && line.netCents !== null;
    const pay = frozen ? line.dailyPayCents : employee.dailyPayCents;
    const position = frozen ? (line.positionName ?? "") : (positions.find((p) => p.id === employee.positionId)?.name ?? "");
    const loanCents = frozen ? (line.loanCents ?? 0n) : mine.reduce((a, l) => a + l.payment, 0n);
    const totals = lineTotals({ dailyPayCents: pay, days: marks, extrasCents: line?.extrasCents ?? 0n, bonusCents: line?.bonusCents ?? 0n, mealCents: line?.mealCents ?? 0n, loanCents });
    return { employee, periods: periods.filter((p) => p.employeeId === employee.id), line, days: marks, loans: mine, position, pay, totals };
  });
  return { monday, dates, week, people, payments };
}

function rowView(p: Person, dates: string[], today: string, open: boolean, owner: boolean): PayrollRowView {
  const days: DayView[] = p.days.map((d, i) => ({
    state: d ? d.state : "empty",
    late: d?.late ?? false,
    editable: open && !dayIsFuture(dates[i], today) && dayWithinPeriods(dates[i], p.periods),
  }));
  const row: PayrollRowView = { employeeId: p.employee.id, name: p.employee.name, position: p.position, days, counts: { days: p.totals.daysCount, half: p.totals.halfCount, late: p.totals.lateCount } };
  if (!owner) return row;
  const t = p.totals;
  row.money = {
    pay: p.pay === null ? null : moneyText(p.pay),
    missingPay: p.pay === null,
    days: moneyText(t.daysCents),
    extras: moneyText(t.extrasCents),
    bonus: moneyText(t.bonusCents),
    bonusConcept: p.line?.bonusConcept ?? null,
    late: moneyText(t.lateCents),
    meal: moneyText(t.mealCents),
    loans: moneyText(t.loanCents),
    loanLines: p.loans.map((l) => ({ id: l.loan.id, lentOn: l.loan.lentOn, amount: moneyText(l.loan.amountCents), balance: moneyText(l.loan.balanceCents), payment: moneyText(l.payment) })),
    gross: moneyText(t.grossCents),
    deductions: moneyText(t.deductionsCents),
    net: moneyText(t.netCents),
    negative: t.netCents < 0n,
  };
  return row;
}

function weekView(ctx: Ctx, scope: CatalogScope, w: Loaded): PayrollWeekView {
  const owner = isOwner(scope.actor);
  const today = todayInMexico(ctx.ports.clock.now());
  const open = w.week?.status !== "closed";
  const rows = w.people.map((p) => rowView(p, w.dates, today, open, owner)).sort((a, b) => a.position.localeCompare(b.position, "es") || a.name.localeCompare(b.name, "es"));
  const groups: PayrollWeekView["groups"] = [];
  for (const r of rows) {
    const g = groups.at(-1);
    if (g && g.position === r.position) g.rows.push(r);
    else groups.push({ position: r.position, rows: [r] });
  }
  const view: PayrollWeekView = {
    start: w.monday,
    end: w.dates[6],
    dates: w.dates,
    today,
    status: open ? "open" : "closed",
    closedAt: w.week?.closedAt?.toISOString() ?? null,
    owner,
    groups,
    prev: addDays(w.monday, -7),
    next: addDays(w.monday, 7),
  };
  if (owner) {
    const t = weekTotals(w.people.map((p) => p.totals));
    view.totals = { days: moneyText(t.daysCents), extrasBonus: moneyText(t.extrasBonusCents), late: moneyText(t.lateCents), meal: moneyText(t.mealCents), loans: moneyText(t.loanCents), net: moneyText(t.netCents) };
  }
  return view;
}

/** RF-1 a RF-5, RF-9 a RF-12, RF-17, RF-25: la semana de la sucursal activa según el rol. */
export async function payrollWeek(ctx: Ctx, scope: CatalogScope, rawMonday: unknown): Promise<PayrollWeekView> {
  await personnelAccess(ctx.store, scope);
  const monday = mondayOrInvalid(rawMonday);
  return weekView(ctx, scope, await loadWeek(ctx.store, scope, monday));
}

/** Para la hoja de pago y el Excel (solo el dueño). */
export async function payrollWeekForOwner(ctx: Ctx, scope: CatalogScope, rawMonday: unknown) {
  ownerOnly(scope);
  await personnelAccess(ctx.store, scope);
  const monday = mondayOrInvalid(rawMonday);
  const w = await loadWeek(ctx.store, scope, monday);
  return { view: weekView(ctx, scope, w), people: w.people };
}

async function openWeekFor(repos: Repos, ctx: Ctx, scope: CatalogScope, monday: string): Promise<PayrollWeek> {
  const week = await repos.payroll.weeks.ensure({ businessId: scope.active.business.id, branchId: scope.active.branch.id, weekStart: monday, createdBy: scope.actor.id, createdAt: ctx.ports.clock.now() });
  if (week.status === "closed") throw new AppError("week_closed");
  return week;
}

function personIn(w: Loaded, employeeId: unknown): Person {
  const id = uuidOrNotFound(employeeId);
  const p = w.people.find((x) => x.employee.id === id);
  if (!p) throw new AppError("not_found");
  return p;
}

const audit = (repos: Repos, now: Date, scope: CatalogScope, week: PayrollWeek, action: string, after: unknown, before?: unknown) =>
  recordAudit(repos.audit, now, { actorId: scope.actor.id, action, entityType: "payroll_week", entityId: week.id, businessId: week.businessId, branchId: week.branchId, before, after });

async function inWeek<T>(ctx: Ctx, scope: CatalogScope, rawMonday: unknown, fn: (repos: Repos, w: Loaded, week: PayrollWeek, now: Date) => Promise<T>): Promise<T> {
  await personnelAccess(ctx.store, scope);
  const monday = mondayOrInvalid(rawMonday);
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(
    async (repos) => {
      const week = await openWeekFor(repos, ctx, scope, monday);
      return fn(repos, await loadWeek(repos, scope, monday), week, now);
    },
    { lock: weekLock(scope.active.branch.id, monday) },
  );
}

export interface DayInput {
  employeeId: unknown;
  day: unknown;
  state: unknown;
  late?: unknown;
}

/** RF-4, RF-10, RF-13 a RF-16: marcar un día; el último en guardar el mismo día gana. */
export async function markDay(ctx: Ctx, scope: CatalogScope, rawMonday: unknown, input: DayInput): Promise<PayrollWeekView> {
  const day = Number(input.day);
  if (!Number.isInteger(day) || day < 0 || day > 6) throw new AppError("validation");
  if (input.state !== "empty" && input.state !== "worked" && input.state !== "half") throw new AppError("validation");
  const state: "empty" | "worked" | "half" = input.state;
  await inWeek(ctx, scope, rawMonday, async (repos, w, week, now) => {
    const p = personIn(w, input.employeeId);
    const date = w.dates[day];
    if (dayIsFuture(date, todayInMexico(now))) throw new AppError("future_day");
    if (!dayWithinPeriods(date, p.periods)) throw new AppError("outside_period");
    const mark: DayMark | null = state === "empty" ? null : { state, late: input.late === true };
    const line = await repos.payroll.lines.ensure(week.id, p.employee.id, now);
    await repos.payroll.days.set(line.id, day, mark, { by: scope.actor.id, at: now });
    await audit(repos, now, scope, week, "payroll.day", { employeeId: p.employee.id, date, mark }, { mark: p.days[day] });
  });
  return payrollWeek(ctx, scope, rawMonday);
}

function amount(raw: unknown): bigint {
  const cents = parseMoney(raw === undefined || raw === null ? "" : String(raw));
  if (cents === undefined) throw new AppError("invalid_amount");
  return cents ?? 0n;
}

export interface AmountsInput {
  extras?: unknown;
  bonus?: unknown;
  bonusConcept?: unknown;
  meal?: unknown;
}

/** RF-6, RF-20, RF-21: extras, bonos con concepto y comida (solo el dueño). */
export async function setAmounts(ctx: Ctx, scope: CatalogScope, rawMonday: unknown, employeeId: unknown, input: AmountsInput): Promise<PayrollWeekView> {
  ownerOnly(scope);
  const patch: { extrasCents?: bigint; bonusCents?: bigint; mealCents?: bigint; bonusConcept?: string | null } = {};
  if (input.extras !== undefined) patch.extrasCents = amount(input.extras);
  if (input.bonus !== undefined) patch.bonusCents = amount(input.bonus);
  if (input.meal !== undefined) patch.mealCents = amount(input.meal);
  if (input.bonusConcept !== undefined) {
    const text = typeof input.bonusConcept === "string" ? input.bonusConcept.trim() : "";
    if (text.length > BONUS_CONCEPT_MAX) throw new AppError("validation");
    patch.bonusConcept = text || null;
  }
  await inWeek(ctx, scope, rawMonday, async (repos, w, week, now) => {
    const p = personIn(w, employeeId);
    const line = await repos.payroll.lines.ensure(week.id, p.employee.id, now);
    const before = { extras: line.extrasCents.toString(), bonus: line.bonusCents.toString(), bonusConcept: line.bonusConcept, meal: line.mealCents.toString() };
    await repos.payroll.lines.update(line.id, { ...patch, updatedAt: now });
    await audit(repos, now, scope, week, "payroll.amounts", { employeeId: p.employee.id, ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, typeof v === "bigint" ? v.toString() : v])) }, before);
  });
  return payrollWeek(ctx, scope, rawMonday);
}

/** RF-30: el dueño cambia el abono de un préstamo en una semana abierta, incluso a cero. */
export async function setLoanPayment(ctx: Ctx, scope: CatalogScope, rawMonday: unknown, loanId: unknown, raw: unknown): Promise<PayrollWeekView> {
  ownerOnly(scope);
  const cents = amount(raw);
  await inWeek(ctx, scope, rawMonday, async (repos, w, week, now) => {
    const id = uuidOrNotFound(loanId);
    const owner = w.people.find((p) => p.loans.some((l) => l.loan.id === id));
    const entry = owner?.loans.find((l) => l.loan.id === id);
    if (!owner || !entry) throw new AppError("not_found");
    await repos.payroll.payments.set(id, week.id, cents, false, now);
    await audit(repos, now, scope, week, "payroll.loan_payment", { loanId: id, employeeId: owner.employee.id, amount: cents.toString() }, { amount: entry.payment.toString() });
  });
  return payrollWeek(ctx, scope, rawMonday);
}

const names = (list: Person[]) => list.map((p) => p.employee.name).join(", ");

/** RF-31 a RF-37: cerrar congela todo y aplica los abonos (solo el dueño). */
export async function closeWeek(ctx: Ctx, scope: CatalogScope, rawMonday: unknown): Promise<PayrollWeekView> {
  ownerOnly(scope);
  await inWeek(ctx, scope, rawMonday, async (repos, w, week, now) => {
    const missing = w.people.filter((p) => p.totals.missingPay);
    if (missing.length) throw new AppError("close_missing_pay", { names: names(missing) });
    const negative = w.people.filter((p) => p.totals.netCents < 0n);
    if (negative.length) throw new AppError("close_negative", { names: names(negative) });
    const over = w.people.filter((p) => p.loans.some((l) => l.payment > l.loan.balanceCents));
    if (over.length) throw new AppError("close_loan_over", { names: names(over) });
    for (const p of w.people) {
      const line = await repos.payroll.lines.ensure(week.id, p.employee.id, now);
      const t = p.totals;
      await repos.payroll.lines.update(line.id, {
        dailyPayCents: p.pay,
        positionName: p.position,
        daysCount: t.daysCount,
        halfCount: t.halfCount,
        lateCount: t.lateCount,
        daysCents: t.daysCents,
        lateCents: t.lateCents,
        loanCents: t.loanCents,
        netCents: t.netCents,
        updatedAt: now,
      });
      for (const l of p.loans) {
        const hasRow = w.payments.some((x) => x.loanId === l.loan.id);
        if (l.payment === 0n && !hasRow) continue;
        await repos.payroll.payments.set(l.loan.id, week.id, l.payment, true, now);
        const r = applyPayment(l.loan.balanceCents, l.payment);
        await repos.payroll.loans.update(l.loan.id, { balanceCents: r.balanceCents, settledAt: r.settled ? now : null, updatedAt: now });
      }
    }
    const total = w.people.reduce((a, p) => a + p.totals.netCents, 0n);
    await repos.payroll.weeks.update(week.id, { status: "closed", totalCents: total, closedAt: now, closedBy: scope.actor.id, updatedAt: now });
    await audit(repos, now, scope, week, "payroll.closed", { total: total.toString(), people: w.people.length });
  });
  return payrollWeek(ctx, scope, rawMonday);
}

/** RF-39, RF-40: reabrir con motivo devuelve cada abono a su préstamo. */
export async function reopenWeek(ctx: Ctx, scope: CatalogScope, rawMonday: unknown, rawReason: unknown): Promise<PayrollWeekView> {
  ownerOnly(scope);
  const reason = writtenReason(typeof rawReason === "string" ? rawReason : "");
  if (reason === null) throw new AppError("reason_required");
  await personnelAccess(ctx.store, scope);
  const monday = mondayOrInvalid(rawMonday);
  const now = ctx.ports.clock.now();
  await ctx.store.transaction(
    async (repos) => {
      const week = await repos.payroll.weeks.find(scope.active.branch.id, monday);
      if (!week || week.status !== "closed") throw new AppError("week_not_closed");
      for (const pay of await repos.payroll.payments.listByWeek(week.id)) {
        if (!pay.applied) continue;
        const loan = (await repos.payroll.loans.findById(pay.loanId))!;
        await repos.payroll.loans.update(loan.id, { balanceCents: revertPayment(loan.balanceCents, pay.amountCents), settledAt: null, updatedAt: now });
        await repos.payroll.payments.set(pay.loanId, week.id, pay.amountCents, false, now);
      }
      for (const line of await repos.payroll.lines.listByWeek(week.id)) {
        await repos.payroll.lines.update(line.id, { dailyPayCents: null, positionName: null, daysCount: null, halfCount: null, lateCount: null, daysCents: null, lateCents: null, loanCents: null, netCents: null, updatedAt: now });
      }
      await repos.payroll.weeks.update(week.id, { status: "open", totalCents: null, closedAt: null, closedBy: null, updatedAt: now });
      await audit(repos, now, scope, week, "payroll.reopened", { reason }, { total: week.totalCents?.toString() ?? null });
    },
    { lock: weekLock(scope.active.branch.id, monday) },
  );
  return payrollWeek(ctx, scope, monday);
}

/** RF-46: semanas de la sucursal, de la más reciente a la más antigua; el total solo para el dueño. */
export async function listPayrollWeeks(ctx: Ctx, scope: CatalogScope): Promise<PayrollWeekSummaryView[]> {
  await personnelAccess(ctx.store, scope);
  const owner = isOwner(scope.actor);
  const weeks = await ctx.store.payroll.weeks.listByBranch(scope.active.branch.id);
  const out: PayrollWeekSummaryView[] = [];
  for (const w of weeks) {
    const loaded = await loadWeek(ctx.store, scope, w.weekStart);
    const total = w.status === "closed" ? (w.totalCents ?? 0n) : loaded.people.reduce((a, p) => a + p.totals.netCents, 0n);
    out.push({ start: w.weekStart, end: addDays(w.weekStart, 6), status: w.status, people: loaded.people.length, ...(owner ? { total: moneyText(total) } : {}) });
  }
  return out;
}
