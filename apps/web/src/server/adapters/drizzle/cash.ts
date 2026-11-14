// Implementación con Drizzle de los repositorios del corte de caja (`server/ports/cash.ts`).
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { cashCutMethods, cashCuts, cashMovements, cashSettings, paymentMethods } from "@/db/schema";
import type { DbOrTx } from "@/db/client";
import type { CashRepo } from "@/server/ports/cash";

const first = <T>(rows: T[]): T | null => rows[0] ?? null;
const none = <T>(): Promise<T[]> => Promise.resolve([]);

export function cashRepo(db: DbOrTx): CashRepo {
  return {
    settings: {
      find: async (branchId) => first(await db.select().from(cashSettings).where(eq(cashSettings.branchId, branchId)).limit(1)),
      upsert: async ({ at, ...data }) =>
        (
          await db
            .insert(cashSettings)
            .values({ ...data, createdAt: at, updatedAt: at })
            .onConflictDoUpdate({ target: cashSettings.branchId, set: { mode: data.mode, floorEnabled: data.floorEnabled, updatedAt: at } })
            .returning()
        )[0],
    },
    methods: {
      listByBranch: (branchId) => db.select().from(paymentMethods).where(eq(paymentMethods.branchId, branchId)).orderBy(asc(paymentMethods.sort)),
      insert: async ({ at, ...data }) => (await db.insert(paymentMethods).values({ ...data, createdAt: at, updatedAt: at }).returning())[0],
      update: async (id, patch) => (await db.update(paymentMethods).set(patch).where(eq(paymentMethods.id, id)).returning())[0],
    },
    cuts: {
      findById: async (id) => first(await db.select().from(cashCuts).where(eq(cashCuts.id, id)).limit(1)),
      findOpen: async (branchId) => first(await db.select().from(cashCuts).where(and(eq(cashCuts.branchId, branchId), ne(cashCuts.status, "closed"))).limit(1)),
      listByBranch: (branchId) => db.select().from(cashCuts).where(eq(cashCuts.branchId, branchId)).orderBy(desc(cashCuts.openedAt)),
      insert: async (data) => (await db.insert(cashCuts).values({ ...data, status: "open", createdAt: data.openedAt, updatedAt: data.openedAt }).returning())[0],
      update: async (id, patch) => (await db.update(cashCuts).set(patch).where(eq(cashCuts.id, id)).returning())[0],
    },
    cutMethods: {
      listByCuts: (ids) => (ids.length ? db.select().from(cashCutMethods).where(inArray(cashCutMethods.cutId, ids)).orderBy(asc(cashCutMethods.sort)) : none()),
      insert: async (data) => (await db.insert(cashCutMethods).values(data).returning())[0],
      update: async (id, patch) => (await db.update(cashCutMethods).set(patch).where(eq(cashCutMethods.id, id)).returning())[0],
    },
    movements: {
      listByCuts: (ids) => (ids.length ? db.select().from(cashMovements).where(inArray(cashMovements.cutId, ids)).orderBy(asc(cashMovements.createdAt)) : none()),
      findById: async (id) => first(await db.select().from(cashMovements).where(eq(cashMovements.id, id)).limit(1)),
      insert: async (data) => (await db.insert(cashMovements).values(data).returning())[0],
      update: async (id, patch) => (await db.update(cashMovements).set(patch).where(eq(cashMovements.id, id)).returning())[0],
    },
  };
}
