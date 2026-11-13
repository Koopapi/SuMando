// Repositorios de requisiciones (spec 007) como puertos; `server/adapters/drizzle/requisitions.ts` los implementa.
import type { PurchaseTemplate, PurchaseTemplateItem, Requisition, RequisitionEvent, RequisitionGroup, RequisitionLine } from "@/db/schema";

export type NewRequisition = Pick<Requisition, "businessId" | "branchId" | "warehouseId" | "folio" | "status" | "note" | "createdBy" | "createdAt">;
export type RequisitionPatch = Partial<Pick<Requisition, "status" | "note">> & { updatedAt: Date };
export type LineRow = Pick<RequisitionLine, "productId" | "supplierId" | "presentationId" | "requestedBase" | "quantityBase">;
export type LinePatch = Partial<Pick<RequisitionLine, "quantityBase" | "receivedBase" | "amountCents" | "closedAt" | "closedBy" | "closeReason">>;
export type GroupPatch = Partial<Pick<RequisitionGroup, "buyer" | "purchasedAt" | "purchasedBy" | "totalCents">>;
export type EventView = RequisitionEvent & { actorName: string };
export type TemplateItemRow = Pick<PurchaseTemplateItem, "productId" | "presentationId" | "supplierId" | "quantityBase">;

export interface RequisitionsRepo {
  requisitions: {
    insert(data: NewRequisition): Promise<Requisition>;
    findById(id: string): Promise<Requisition | null>;
    /** Bloquea la requisición hasta el fin de la transacción (recepciones simultáneas). */
    lockById(id: string): Promise<Requisition | null>;
    update(id: string, patch: RequisitionPatch): Promise<Requisition>;
    listByBranch(branchId: string, status: Requisition["status"] | null, limit: number): Promise<(Requisition & { authorName: string })[]>;
    /** Siguiente folio del negocio (se llama con el cerrojo del negocio tomado). */
    nextFolio(businessId: string): Promise<number>;
    countByStatus(branchId: string): Promise<Record<string, number>>;
  };
  lines: {
    listByRequisitions(ids: string[]): Promise<RequisitionLine[]>;
    /** Sustituye todos los renglones, en el orden dado. */
    replace(requisitionId: string, rows: LineRow[]): Promise<RequisitionLine[]>;
    update(id: string, patch: LinePatch): Promise<RequisitionLine>;
  };
  groups: {
    listByRequisitions(ids: string[]): Promise<RequisitionGroup[]>;
    insert(requisitionId: string, supplierIds: (string | null)[]): Promise<RequisitionGroup[]>;
    update(id: string, patch: GroupPatch): Promise<RequisitionGroup>;
  };
  events: {
    insert(e: Omit<RequisitionEvent, "id">): Promise<void>;
    listByRequisition(id: string): Promise<EventView[]>;
  };
  templates: {
    listByBranch(branchId: string): Promise<PurchaseTemplate[]>;
    findById(id: string): Promise<PurchaseTemplate | null>;
    insert(data: Pick<PurchaseTemplate, "businessId" | "branchId" | "name" | "nameKey" | "createdBy"> & { createdAt: Date }): Promise<PurchaseTemplate>;
    update(id: string, patch: Partial<Pick<PurchaseTemplate, "name" | "nameKey" | "archivedAt">> & { updatedAt: Date }): Promise<PurchaseTemplate>;
    items(templateId: string): Promise<PurchaseTemplateItem[]>;
    replaceItems(templateId: string, rows: TemplateItemRow[]): Promise<PurchaseTemplateItem[]>;
  };
}
