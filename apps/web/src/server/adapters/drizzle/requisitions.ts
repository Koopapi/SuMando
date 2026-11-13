// Implementación con Drizzle de los repositorios de requisiciones (`server/ports/requisitions.ts`).
import { and, asc, count, desc, eq, inArray, max } from "drizzle-orm";
import { purchaseTemplateItems, purchaseTemplates, requisitionEvents, requisitionGroups, requisitionLines, requisitions, users } from "@/db/schema";
import type { DbOrTx } from "@/db/client";
import type { RequisitionsRepo } from "@/server/ports/requisitions";

const first = <T>(rows: T[]): T | null => rows[0] ?? null;

export function requisitionsRepo(db: DbOrTx): RequisitionsRepo {
  return {
    requisitions: {
      insert: async (data) => (await db.insert(requisitions).values({ ...data, updatedAt: data.createdAt }).returning())[0],
      findById: async (id) => first(await db.select().from(requisitions).where(eq(requisitions.id, id)).limit(1)),
      lockById: async (id) => first(await db.select().from(requisitions).where(eq(requisitions.id, id)).limit(1).for("update")),
      update: async (id, patch) => (await db.update(requisitions).set(patch).where(eq(requisitions.id, id)).returning())[0],
      listByBranch: async (branchId, status, limit) =>
        (
          await db
            .select({ r: requisitions, authorName: users.name })
            .from(requisitions)
            .innerJoin(users, eq(users.id, requisitions.createdBy))
            .where(status ? and(eq(requisitions.branchId, branchId), eq(requisitions.status, status)) : eq(requisitions.branchId, branchId))
            .orderBy(desc(requisitions.folio))
            .limit(limit)
        ).map((x) => ({ ...x.r, authorName: x.authorName })),
      nextFolio: async (businessId) => Number((await db.select({ n: max(requisitions.folio) }).from(requisitions).where(eq(requisitions.businessId, businessId)))[0].n ?? 0) + 1,
      countByStatus: async (branchId) =>
        Object.fromEntries((await db.select({ status: requisitions.status, n: count() }).from(requisitions).where(eq(requisitions.branchId, branchId)).groupBy(requisitions.status)).map((r) => [r.status, Number(r.n)])),
    },
    lines: {
      listByRequisitions: (ids) => (ids.length ? db.select().from(requisitionLines).where(inArray(requisitionLines.requisitionId, ids)).orderBy(asc(requisitionLines.requisitionId), asc(requisitionLines.position)) : Promise.resolve([])),
      replace: async (requisitionId, rows) => {
        await db.delete(requisitionLines).where(eq(requisitionLines.requisitionId, requisitionId));
        if (!rows.length) return [];
        return db
          .insert(requisitionLines)
          .values(rows.map((r, position) => ({ ...r, requisitionId, position })))
          .returning();
      },
      update: async (id, patch) => (await db.update(requisitionLines).set(patch).where(eq(requisitionLines.id, id)).returning())[0],
    },
    groups: {
      listByRequisitions: (ids) => (ids.length ? db.select().from(requisitionGroups).where(inArray(requisitionGroups.requisitionId, ids)) : Promise.resolve([])),
      insert: async (requisitionId, supplierIds) => (supplierIds.length ? db.insert(requisitionGroups).values(supplierIds.map((supplierId) => ({ requisitionId, supplierId }))).returning() : []),
      update: async (id, patch) => (await db.update(requisitionGroups).set(patch).where(eq(requisitionGroups.id, id)).returning())[0],
    },
    events: {
      insert: async (e) => {
        await db.insert(requisitionEvents).values(e);
      },
      listByRequisition: async (id) =>
        (await db.select({ e: requisitionEvents, actorName: users.name }).from(requisitionEvents).innerJoin(users, eq(users.id, requisitionEvents.actorId)).where(eq(requisitionEvents.requisitionId, id)).orderBy(asc(requisitionEvents.id))).map((x) => ({
          ...x.e,
          actorName: x.actorName,
        })),
    },
    templates: {
      listByBranch: (branchId) => db.select().from(purchaseTemplates).where(eq(purchaseTemplates.branchId, branchId)).orderBy(asc(purchaseTemplates.nameKey)),
      findById: async (id) => first(await db.select().from(purchaseTemplates).where(eq(purchaseTemplates.id, id)).limit(1)),
      insert: async (data) => (await db.insert(purchaseTemplates).values({ ...data, updatedAt: data.createdAt }).returning())[0],
      update: async (id, patch) => (await db.update(purchaseTemplates).set(patch).where(eq(purchaseTemplates.id, id)).returning())[0],
      items: (templateId) => db.select().from(purchaseTemplateItems).where(eq(purchaseTemplateItems.templateId, templateId)).orderBy(asc(purchaseTemplateItems.position)),
      replaceItems: async (templateId, rows) => {
        await db.delete(purchaseTemplateItems).where(eq(purchaseTemplateItems.templateId, templateId));
        if (!rows.length) return [];
        return db
          .insert(purchaseTemplateItems)
          .values(rows.map((r, position) => ({ ...r, templateId, position })))
          .returning();
      },
    },
  };
}
