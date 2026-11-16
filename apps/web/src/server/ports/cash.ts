// Repositorios del corte de caja (spec 011) como puertos; `server/adapters/drizzle/cash.ts` los implementa.
import type { CashCut, CashCutMethod, CashMovement, CashSettings, PaymentMethod } from "@/db/schema";

export type CashCutPatch = Partial<Omit<CashCut, "id" | "businessId" | "branchId" | "createdAt">> & { updatedAt: Date };

export interface CashRepo {
  settings: {
    find(branchId: string): Promise<CashSettings | null>;
    upsert(data: Pick<CashSettings, "businessId" | "branchId" | "mode" | "floorEnabled"> & { at: Date }): Promise<CashSettings>;
  };
  methods: {
    listByBranch(branchId: string): Promise<PaymentMethod[]>;
    insert(data: Pick<PaymentMethod, "businessId" | "branchId" | "name" | "nameKey" | "isCash" | "sort"> & { at: Date }): Promise<PaymentMethod>;
    update(id: string, patch: Partial<Pick<PaymentMethod, "name" | "nameKey" | "sort" | "archivedAt">> & { updatedAt: Date }): Promise<PaymentMethod>;
  };
  cuts: {
    findById(id: string): Promise<CashCut | null>;
    findOpen(branchId: string): Promise<CashCut | null>;
    listByBranch(branchId: string): Promise<CashCut[]>;
    insert(data: Pick<CashCut, "businessId" | "branchId" | "date" | "openingFundCents" | "openedAt" | "openedBy" | "openedUserId" | "openedEmployeeId" | "openedDeviceId">): Promise<CashCut>;
    update(id: string, patch: CashCutPatch): Promise<CashCut>;
  };
  cutMethods: {
    listByCuts(ids: string[]): Promise<CashCutMethod[]>;
    insert(data: Pick<CashCutMethod, "cutId" | "methodId" | "name" | "isCash" | "sort">): Promise<CashCutMethod>;
    update(id: string, patch: Partial<Pick<CashCutMethod, "countedCents" | "posCents">>): Promise<CashCutMethod>;
  };
  movements: {
    listByCuts(ids: string[]): Promise<CashMovement[]>;
    findById(id: string): Promise<CashMovement | null>;
    insert(data: Omit<CashMovement, "id" | "cancelledAt" | "cancelledBy" | "cancelReason">): Promise<CashMovement>;
    update(id: string, patch: Partial<Pick<CashMovement, "cancelledAt" | "cancelledBy" | "cancelReason">>): Promise<CashMovement>;
  };
}
