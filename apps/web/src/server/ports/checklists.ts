// Repositorios de checklists (spec 010) como puertos; `server/adapters/drizzle/checklists.ts` los implementa.
import type { ChecklistItem, ChecklistSection, ChecklistSheet, ChecklistSheetItem, ChecklistSheetSection, ChecklistTemplate, ChecklistTemplateBranch, FloorDevice } from "@/db/schema";

export type NewChecklistTemplate = Pick<ChecklistTemplate, "businessId" | "name" | "nameKey" | "daysMask" | "createdBy"> & { createdAt: Date };
export type ChecklistTemplatePatch = Partial<Pick<ChecklistTemplate, "name" | "nameKey" | "daysMask" | "archivedAt">> & { updatedAt: Date };
export type SheetMark = Partial<Pick<ChecklistSheetItem, "done" | "comment" | "photoKey" | "photoType" | "markedAt" | "markedBy" | "markedUserId" | "markedEmployeeId" | "markedDeviceId">>;
export type SectionReady = Pick<ChecklistSheetSection, "readyAt" | "readyBy" | "readyUserId" | "readyEmployeeId" | "readyDeviceId">;

export interface ChecklistsRepo {
  templates: {
    listByBusiness(businessId: string): Promise<ChecklistTemplate[]>;
    findById(id: string): Promise<ChecklistTemplate | null>;
    insert(data: NewChecklistTemplate): Promise<ChecklistTemplate>;
    update(id: string, patch: ChecklistTemplatePatch): Promise<ChecklistTemplate>;
  };
  templateBranches: {
    listByTemplates(ids: string[]): Promise<ChecklistTemplateBranch[]>;
    replace(templateId: string, branchIds: string[]): Promise<void>;
  };
  sections: {
    listByTemplates(ids: string[]): Promise<ChecklistSection[]>;
    insert(data: Omit<ChecklistSection, "id" | "archivedAt">): Promise<ChecklistSection>;
    update(id: string, patch: Partial<Omit<ChecklistSection, "id" | "templateId">>): Promise<ChecklistSection>;
  };
  items: {
    listBySections(ids: string[]): Promise<ChecklistItem[]>;
    insert(data: Omit<ChecklistItem, "id" | "archivedAt">): Promise<ChecklistItem>;
    update(id: string, patch: Partial<Omit<ChecklistItem, "id">>): Promise<ChecklistItem>;
  };
  sheets: {
    find(templateId: string, branchId: string, date: string): Promise<ChecklistSheet | null>;
    findById(id: string): Promise<ChecklistSheet | null>;
    /** Inserta la hoja si no existe; `created` dice si la creó esta llamada. */
    ensure(data: Pick<ChecklistSheet, "templateId" | "businessId" | "branchId" | "date" | "templateName"> & { createdAt: Date }): Promise<{ sheet: ChecklistSheet; created: boolean }>;
    update(id: string, patch: Partial<Pick<ChecklistSheet, "status" | "closedAt" | "closedBy" | "pending">> & { updatedAt: Date }): Promise<ChecklistSheet>;
    listByBranch(branchId: string): Promise<ChecklistSheet[]>;
  };
  sheetSections: {
    listBySheets(ids: string[]): Promise<ChecklistSheetSection[]>;
    insert(data: Pick<ChecklistSheetSection, "sheetId" | "sectionId" | "name" | "positionId" | "sort">): Promise<ChecklistSheetSection>;
    update(id: string, patch: Partial<SectionReady>): Promise<ChecklistSheetSection>;
  };
  sheetItems: {
    listBySections(ids: string[]): Promise<ChecklistSheetItem[]>;
    findById(id: string): Promise<ChecklistSheetItem | null>;
    insert(data: Pick<ChecklistSheetItem, "sheetSectionId" | "itemId" | "text" | "kind" | "isKey" | "sort">): Promise<ChecklistSheetItem>;
    update(id: string, patch: SheetMark): Promise<ChecklistSheetItem>;
  };
  devices: {
    findByTokenHash(hash: string): Promise<FloorDevice | null>;
    findById(id: string): Promise<FloorDevice | null>;
    listByBranch(branchId: string): Promise<FloorDevice[]>;
    insert(data: Omit<FloorDevice, "id" | "lastUsedAt" | "disabledAt" | "disabledBy">): Promise<FloorDevice>;
    update(id: string, patch: Partial<Pick<FloorDevice, "lastUsedAt" | "disabledAt" | "disabledBy">>): Promise<FloorDevice>;
  };
}
