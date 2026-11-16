// Préstamos al personal (spec 009, RF-27, RF-28, RF-34): solo el dueño los registra y los ve.
import { isDate } from "@/domain/personnel/documents";
import { loanProblem } from "@/domain/payroll/loans";
import { parseMoney } from "@/domain/requisitions/money";
import { AppError } from "../../errors";
import { recordAudit } from "../audit";
import type { CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";
import { ownEmployee, ownerOnly, personnelAccess } from "../personnel/shared";
import { moneyText } from "./weeks";

export interface LoanView {
  id: string;
  lentOn: string;
  amount: string;
  weekly: string;
  balance: string;
  settled: boolean;
  payments: { week: string; amount: string; applied: boolean }[];
}

function positive(raw: unknown): bigint {
  const cents = parseMoney(raw === undefined || raw === null ? "" : String(raw));
  if (cents === undefined || cents === null) throw new AppError("invalid_amount");
  return cents;
}

/** RF-34: préstamos del empleado con su saldo y cada abono con su semana. */
export async function employeeLoans(ctx: Ctx, scope: CatalogScope, employeeId: string): Promise<LoanView[]> {
  ownerOnly(scope);
  await personnelAccess(ctx.store, scope);
  const e = await ownEmployee(ctx.store, scope, employeeId);
  const loans = await ctx.store.payroll.loans.listByEmployees([e.id]);
  const payments = await ctx.store.payroll.payments.listByLoans(loans.map((l) => l.id));
  const weeks = await ctx.store.payroll.weeks.listByBranch(e.branchId);
  const startOf = (weekId: string) => weeks.find((w) => w.id === weekId)?.weekStart ?? "";
  return loans
    .map((l) => ({
      id: l.id,
      lentOn: l.lentOn,
      amount: moneyText(l.amountCents),
      weekly: moneyText(l.weeklyCents),
      balance: moneyText(l.balanceCents),
      settled: l.settledAt !== null,
      payments: payments
        .filter((p) => p.loanId === l.id && p.applied)
        .map((p) => ({ week: startOf(p.weekId), amount: moneyText(p.amountCents), applied: p.applied }))
        .sort((a, b) => (a.week < b.week ? -1 : 1)),
    }))
    .reverse();
}

/** RF-27, RF-28: monto y abono semanal mayores que cero; el abono no pasa del monto. */
export async function createLoan(ctx: Ctx, scope: CatalogScope, employeeId: string, input: { lentOn: unknown; amount: unknown; weekly: unknown }): Promise<LoanView[]> {
  ownerOnly(scope);
  await personnelAccess(ctx.store, scope);
  const e = await ownEmployee(ctx.store, scope, employeeId);
  if (!isDate(input.lentOn)) throw new AppError("invalid_date");
  const amountCents = positive(input.amount);
  const weeklyCents = positive(input.weekly);
  const problem = loanProblem(amountCents, weeklyCents);
  if (problem) throw new AppError(problem);
  const now = ctx.ports.clock.now();
  await ctx.store.transaction(async (repos) => {
    const loan = await repos.payroll.loans.insert({ businessId: e.businessId, employeeId: e.id, lentOn: input.lentOn as string, amountCents, weeklyCents, balanceCents: amountCents, createdBy: scope.actor.id, createdAt: now });
    await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "loan.created", entityType: "loan", entityId: loan.id, businessId: e.businessId, branchId: e.branchId, after: { employeeId: e.id, lentOn: loan.lentOn, amount: amountCents.toString(), weekly: weeklyCents.toString() } });
  });
  return employeeLoans(ctx, scope, employeeId);
}
