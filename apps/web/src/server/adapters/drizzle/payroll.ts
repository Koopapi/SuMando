// Implementación con Drizzle de los repositorios de nómina (`server/ports/payroll.ts`).
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { loanPayments, loans, payrollDays, payrollLines, payrollWeeks } from "@/db/schema";
import type { DbOrTx } from "@/db/client";
import type { PayrollRepo } from "@/server/ports/payroll";

const first = <T>(rows: T[]): T | null => rows[0] ?? null;

export function payrollRepo(db: DbOrTx): PayrollRepo {
  const findWeek = async (branchId: string, weekStart: string) => first(await db.select().from(payrollWeeks).where(and(eq(payrollWeeks.branchId, branchId), eq(payrollWeeks.weekStart, weekStart))).limit(1));
  return {
    weeks: {
      find: findWeek,
      ensure: async (data) => {
        await db
          .insert(payrollWeeks)
          .values({ ...data, status: "open", updatedAt: data.createdAt })
          .onConflictDoNothing({ target: [payrollWeeks.branchId, payrollWeeks.weekStart] });
        return (await findWeek(data.branchId, data.weekStart))!;
      },
      listByBranch: (branchId) => db.select().from(payrollWeeks).where(eq(payrollWeeks.branchId, branchId)).orderBy(desc(payrollWeeks.weekStart)),
      update: async (id, patch) => (await db.update(payrollWeeks).set(patch).where(eq(payrollWeeks.id, id)).returning())[0],
    },
    lines: {
      listByWeek: (weekId) => db.select().from(payrollLines).where(eq(payrollLines.weekId, weekId)),
      ensure: async (weekId, employeeId, now) => {
        await db.insert(payrollLines).values({ weekId, employeeId, createdAt: now, updatedAt: now }).onConflictDoNothing({ target: [payrollLines.weekId, payrollLines.employeeId] });
        return (await db.select().from(payrollLines).where(and(eq(payrollLines.weekId, weekId), eq(payrollLines.employeeId, employeeId))).limit(1))[0];
      },
      update: async (id, patch) => (await db.update(payrollLines).set(patch).where(eq(payrollLines.id, id)).returning())[0],
    },
    days: {
      listByLines: (ids) => (ids.length ? db.select().from(payrollDays).where(inArray(payrollDays.lineId, ids)).orderBy(asc(payrollDays.day)) : Promise.resolve([])),
      set: async (lineId, day, mark, meta) => {
        if (!mark) {
          await db.delete(payrollDays).where(and(eq(payrollDays.lineId, lineId), eq(payrollDays.day, day)));
          return;
        }
        await db
          .insert(payrollDays)
          .values({ lineId, day, state: mark.state, late: mark.late, updatedBy: meta.by, updatedAt: meta.at })
          .onConflictDoUpdate({ target: [payrollDays.lineId, payrollDays.day], set: { state: mark.state, late: mark.late, updatedBy: meta.by, updatedAt: meta.at } });
      },
    },
    loans: {
      listByEmployees: (ids) => (ids.length ? db.select().from(loans).where(inArray(loans.employeeId, ids)).orderBy(asc(loans.lentOn), asc(loans.createdAt)) : Promise.resolve([])),
      findById: async (id) => first(await db.select().from(loans).where(eq(loans.id, id)).limit(1)),
      insert: async (data) => (await db.insert(loans).values({ ...data, updatedAt: data.createdAt }).returning())[0],
      update: async (id, patch) => (await db.update(loans).set(patch).where(eq(loans.id, id)).returning())[0],
    },
    payments: {
      listByWeek: (weekId) => db.select().from(loanPayments).where(eq(loanPayments.weekId, weekId)),
      listByLoans: (ids) => (ids.length ? db.select().from(loanPayments).where(inArray(loanPayments.loanId, ids)) : Promise.resolve([])),
      set: async (loanId, weekId, amountCents, applied, now) =>
        (
          await db
            .insert(loanPayments)
            .values({ loanId, weekId, amountCents, applied, createdAt: now, updatedAt: now })
            .onConflictDoUpdate({ target: [loanPayments.loanId, loanPayments.weekId], set: { amountCents, applied, updatedAt: now } })
            .returning()
        )[0],
    },
  };
}
