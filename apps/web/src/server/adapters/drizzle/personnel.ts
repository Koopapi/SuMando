// Implementación con Drizzle de los repositorios de personal (`server/ports/personnel.ts`).
import { asc, eq, inArray } from "drizzle-orm";
import { documentTypes, employeeFiles, employeePeriods, employees, positions } from "@/db/schema";
import type { DbOrTx } from "@/db/client";
import type { PersonnelRepo } from "@/server/ports/personnel";

const first = <T>(rows: T[]): T | null => rows[0] ?? null;

export function personnelRepo(db: DbOrTx): PersonnelRepo {
  return {
    positions: {
      listByBusiness: (businessId) => db.select().from(positions).where(eq(positions.businessId, businessId)).orderBy(asc(positions.nameKey)),
      findById: async (id) => first(await db.select().from(positions).where(eq(positions.id, id)).limit(1)),
      insert: async (data) => (await db.insert(positions).values({ ...data, updatedAt: data.createdAt }).returning())[0],
      update: async (id, patch) => (await db.update(positions).set(patch).where(eq(positions.id, id)).returning())[0],
    },
    employees: {
      listByBranch: (branchId) => db.select().from(employees).where(eq(employees.branchId, branchId)).orderBy(asc(employees.nameKey)),
      findById: async (id) => first(await db.select().from(employees).where(eq(employees.id, id)).limit(1)),
      insert: async (data) => (await db.insert(employees).values({ ...data, updatedAt: data.createdAt }).returning())[0],
      update: async (id, patch) => (await db.update(employees).set(patch).where(eq(employees.id, id)).returning())[0],
    },
    periods: {
      listByEmployees: (ids) => (ids.length ? db.select().from(employeePeriods).where(inArray(employeePeriods.employeeId, ids)).orderBy(asc(employeePeriods.hiredOn)) : Promise.resolve([])),
      insert: async (data) => (await db.insert(employeePeriods).values(data).returning())[0],
      update: async (id, patch) => (await db.update(employeePeriods).set(patch).where(eq(employeePeriods.id, id)).returning())[0],
    },
    documentTypes: {
      listByBusiness: (businessId) => db.select().from(documentTypes).where(eq(documentTypes.businessId, businessId)).orderBy(asc(documentTypes.position)),
      findById: async (id) => first(await db.select().from(documentTypes).where(eq(documentTypes.id, id)).limit(1)),
      insert: async (data) => (await db.insert(documentTypes).values({ ...data, updatedAt: data.createdAt }).returning())[0],
      update: async (id, patch) => (await db.update(documentTypes).set(patch).where(eq(documentTypes.id, id)).returning())[0],
    },
    files: {
      listByEmployees: (ids) => (ids.length ? db.select().from(employeeFiles).where(inArray(employeeFiles.employeeId, ids)).orderBy(asc(employeeFiles.uploadedAt)) : Promise.resolve([])),
      findById: async (id) => first(await db.select().from(employeeFiles).where(eq(employeeFiles.id, id)).limit(1)),
      insert: async (data) => (await db.insert(employeeFiles).values(data).returning())[0],
      update: async (id, patch) => (await db.update(employeeFiles).set(patch).where(eq(employeeFiles.id, id)).returning())[0],
    },
  };
}
