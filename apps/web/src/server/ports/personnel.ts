// Repositorios de personal (spec 008) como puertos; `server/adapters/drizzle/personnel.ts` los implementa.
import type { DocumentType, Employee, EmployeeFile, EmployeePeriod, Position } from "@/db/schema";

type Meta = { createdAt: Date };
export type NewPosition = Meta & Pick<Position, "businessId" | "name" | "nameKey" | "createdBy">;
export type NewEmployee = Meta & Pick<Employee, "businessId" | "branchId" | "name" | "nameKey" | "positionId" | "phone" | "notes" | "dailyPayCents" | "createdBy">;
export type EmployeePatch = Partial<Pick<Employee, "branchId" | "name" | "nameKey" | "positionId" | "phone" | "notes" | "dailyPayCents" | "active">> & { updatedAt: Date };
export type NewDocumentType = Meta & Pick<DocumentType, "businessId" | "name" | "nameKey" | "required" | "validityMonths" | "position">;
export type DocumentTypePatch = Partial<Pick<DocumentType, "name" | "nameKey" | "required" | "validityMonths" | "position" | "archivedAt">> & { updatedAt: Date };
export type NewEmployeeFile = Omit<EmployeeFile, "id" | "replacedAt" | "replacedBy" | "retiredAt" | "retiredBy" | "retireReason">;
export type EmployeeFilePatch = Partial<Pick<EmployeeFile, "replacedAt" | "replacedBy" | "retiredAt" | "retiredBy" | "retireReason">>;

export interface PersonnelRepo {
  positions: {
    listByBusiness(businessId: string): Promise<Position[]>;
    findById(id: string): Promise<Position | null>;
    insert(data: NewPosition): Promise<Position>;
    update(id: string, patch: Partial<Pick<Position, "name" | "nameKey" | "archivedAt">> & { updatedAt: Date }): Promise<Position>;
  };
  employees: {
    listByBranch(branchId: string): Promise<Employee[]>;
    findById(id: string): Promise<Employee | null>;
    insert(data: NewEmployee): Promise<Employee>;
    update(id: string, patch: EmployeePatch): Promise<Employee>;
  };
  periods: {
    listByEmployees(ids: string[]): Promise<EmployeePeriod[]>;
    insert(data: Omit<EmployeePeriod, "id" | "leftOn" | "leaveReason" | "leaveNote">): Promise<EmployeePeriod>;
    update(id: string, patch: Partial<Pick<EmployeePeriod, "hiredOn" | "leftOn" | "leaveReason" | "leaveNote">>): Promise<EmployeePeriod>;
  };
  documentTypes: {
    listByBusiness(businessId: string): Promise<DocumentType[]>;
    findById(id: string): Promise<DocumentType | null>;
    insert(data: NewDocumentType): Promise<DocumentType>;
    update(id: string, patch: DocumentTypePatch): Promise<DocumentType>;
  };
  files: {
    listByEmployees(ids: string[]): Promise<EmployeeFile[]>;
    findById(id: string): Promise<EmployeeFile | null>;
    insert(data: NewEmployeeFile): Promise<EmployeeFile>;
    update(id: string, patch: EmployeeFilePatch): Promise<EmployeeFile>;
  };
}
