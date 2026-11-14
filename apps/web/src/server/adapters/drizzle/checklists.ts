// Implementación con Drizzle de los repositorios de checklists (`server/ports/checklists.ts`).
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { checklistItems, checklistSections, checklistSheetItems, checklistSheetSections, checklistSheets, checklistTemplateBranches, checklistTemplates, floorDevices } from "@/db/schema";
import type { DbOrTx } from "@/db/client";
import type { ChecklistsRepo } from "@/server/ports/checklists";

const first = <T>(rows: T[]): T | null => rows[0] ?? null;
const none = <T>(): Promise<T[]> => Promise.resolve([]);

export function checklistsRepo(db: DbOrTx): ChecklistsRepo {
  const findSheet = async (templateId: string, branchId: string, date: string) =>
    first(await db.select().from(checklistSheets).where(and(eq(checklistSheets.templateId, templateId), eq(checklistSheets.branchId, branchId), eq(checklistSheets.date, date))).limit(1));
  return {
    templates: {
      listByBusiness: (businessId) => db.select().from(checklistTemplates).where(eq(checklistTemplates.businessId, businessId)).orderBy(asc(checklistTemplates.nameKey)),
      findById: async (id) => first(await db.select().from(checklistTemplates).where(eq(checklistTemplates.id, id)).limit(1)),
      insert: async (data) => (await db.insert(checklistTemplates).values({ ...data, updatedAt: data.createdAt }).returning())[0],
      update: async (id, patch) => (await db.update(checklistTemplates).set(patch).where(eq(checklistTemplates.id, id)).returning())[0],
    },
    templateBranches: {
      listByTemplates: (ids) => (ids.length ? db.select().from(checklistTemplateBranches).where(inArray(checklistTemplateBranches.templateId, ids)) : none()),
      replace: async (templateId, branchIds) => {
        await db.delete(checklistTemplateBranches).where(eq(checklistTemplateBranches.templateId, templateId));
        if (branchIds.length) await db.insert(checklistTemplateBranches).values(branchIds.map((branchId) => ({ templateId, branchId })));
      },
    },
    sections: {
      listByTemplates: (ids) => (ids.length ? db.select().from(checklistSections).where(inArray(checklistSections.templateId, ids)).orderBy(asc(checklistSections.sort)) : none()),
      insert: async (data) => (await db.insert(checklistSections).values(data).returning())[0],
      update: async (id, patch) => (await db.update(checklistSections).set(patch).where(eq(checklistSections.id, id)).returning())[0],
    },
    items: {
      listBySections: (ids) => (ids.length ? db.select().from(checklistItems).where(inArray(checklistItems.sectionId, ids)).orderBy(asc(checklistItems.sort)) : none()),
      insert: async (data) => (await db.insert(checklistItems).values(data).returning())[0],
      update: async (id, patch) => (await db.update(checklistItems).set(patch).where(eq(checklistItems.id, id)).returning())[0],
    },
    sheets: {
      find: findSheet,
      findById: async (id) => first(await db.select().from(checklistSheets).where(eq(checklistSheets.id, id)).limit(1)),
      ensure: async (data) => {
        const inserted = await db
          .insert(checklistSheets)
          .values({ ...data, status: "open", updatedAt: data.createdAt })
          .onConflictDoNothing({ target: [checklistSheets.templateId, checklistSheets.branchId, checklistSheets.date] })
          .returning();
        if (inserted[0]) return { sheet: inserted[0], created: true };
        return { sheet: (await findSheet(data.templateId, data.branchId, data.date))!, created: false };
      },
      update: async (id, patch) => (await db.update(checklistSheets).set(patch).where(eq(checklistSheets.id, id)).returning())[0],
      listByBranch: (branchId) => db.select().from(checklistSheets).where(eq(checklistSheets.branchId, branchId)).orderBy(desc(checklistSheets.date), asc(checklistSheets.templateName)),
    },
    sheetSections: {
      listBySheets: (ids) => (ids.length ? db.select().from(checklistSheetSections).where(inArray(checklistSheetSections.sheetId, ids)).orderBy(asc(checklistSheetSections.sort)) : none()),
      insert: async (data) => (await db.insert(checklistSheetSections).values(data).returning())[0],
      update: async (id, patch) => (await db.update(checklistSheetSections).set(patch).where(eq(checklistSheetSections.id, id)).returning())[0],
    },
    sheetItems: {
      listBySections: (ids) => (ids.length ? db.select().from(checklistSheetItems).where(inArray(checklistSheetItems.sheetSectionId, ids)).orderBy(asc(checklistSheetItems.sort)) : none()),
      findById: async (id) => first(await db.select().from(checklistSheetItems).where(eq(checklistSheetItems.id, id)).limit(1)),
      insert: async (data) => (await db.insert(checklistSheetItems).values(data).returning())[0],
      update: async (id, patch) => (await db.update(checklistSheetItems).set(patch).where(eq(checklistSheetItems.id, id)).returning())[0],
    },
    devices: {
      findByTokenHash: async (hash) => first(await db.select().from(floorDevices).where(eq(floorDevices.tokenHash, hash)).limit(1)),
      findById: async (id) => first(await db.select().from(floorDevices).where(eq(floorDevices.id, id)).limit(1)),
      listByBranch: (branchId) => db.select().from(floorDevices).where(eq(floorDevices.branchId, branchId)).orderBy(desc(floorDevices.createdAt)),
      insert: async (data) => (await db.insert(floorDevices).values(data).returning())[0],
      update: async (id, patch) => (await db.update(floorDevices).set(patch).where(eq(floorDevices.id, id)).returning())[0],
    },
  };
}
