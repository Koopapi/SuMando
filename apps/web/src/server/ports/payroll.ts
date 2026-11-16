// Repositorios de nómina (spec 009) como puertos; `server/adapters/drizzle/payroll.ts` los implementa.
import type { Loan, LoanPayment, PayrollDay, PayrollLine, PayrollWeek } from "@/db/schema";

export type NewPayrollWeek = Pick<PayrollWeek, "businessId" | "branchId" | "weekStart" | "createdBy"> & { createdAt: Date };
export type PayrollWeekPatch = Partial<Pick<PayrollWeek, "status" | "totalCents" | "closedAt" | "closedBy">> & { updatedAt: Date };
export type PayrollLineAmounts = Pick<PayrollLine, "extrasCents" | "bonusCents" | "bonusConcept" | "mealCents">;
export type PayrollLineFrozen = Pick<PayrollLine, "dailyPayCents" | "positionName" | "daysCount" | "halfCount" | "lateCount" | "daysCents" | "lateCents" | "loanCents" | "netCents">;
export type NewLoan = Pick<Loan, "businessId" | "employeeId" | "lentOn" | "amountCents" | "weeklyCents" | "balanceCents" | "createdBy"> & { createdAt: Date };

export interface PayrollRepo {
  weeks: {
    find(branchId: string, weekStart: string): Promise<PayrollWeek | null>;
    /** Crea la semana si no existe (abierta) y la devuelve. */
    ensure(data: NewPayrollWeek): Promise<PayrollWeek>;
    listByBranch(branchId: string): Promise<PayrollWeek[]>;
    update(id: string, patch: PayrollWeekPatch): Promise<PayrollWeek>;
  };
  lines: {
    listByWeek(weekId: string): Promise<PayrollLine[]>;
    /** Crea el renglón del empleado si no existe y lo devuelve. */
    ensure(weekId: string, employeeId: string, now: Date): Promise<PayrollLine>;
    update(id: string, patch: Partial<PayrollLineAmounts & PayrollLineFrozen> & { updatedAt: Date }): Promise<PayrollLine>;
  };
  days: {
    listByLines(lineIds: string[]): Promise<PayrollDay[]>;
    /** Deja el día como se pide; `null` lo vacía. */
    set(lineId: string, day: number, mark: { state: "worked" | "half"; late: boolean } | null, meta: { by: string; at: Date }): Promise<void>;
  };
  loans: {
    listByEmployees(employeeIds: string[]): Promise<Loan[]>;
    findById(id: string): Promise<Loan | null>;
    insert(data: NewLoan): Promise<Loan>;
    update(id: string, patch: Partial<Pick<Loan, "balanceCents" | "settledAt">> & { updatedAt: Date }): Promise<Loan>;
  };
  payments: {
    listByWeek(weekId: string): Promise<LoanPayment[]>;
    listByLoans(loanIds: string[]): Promise<LoanPayment[]>;
    /** Fija el abono de un préstamo en una semana. */
    set(loanId: string, weekId: string, amountCents: bigint, applied: boolean, now: Date): Promise<LoanPayment>;
  };
}
