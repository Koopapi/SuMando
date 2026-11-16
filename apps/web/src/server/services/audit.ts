// RF-42: cada alta, cambio, archivo, reactivación, desactivación y restablecimiento deja quién, cuándo y el valor
// anterior. Se escribe con los mismos repositorios de la transacción del cambio, así nunca queda a medias.
import type { AuditRepo } from "../ports/repos";

export interface AuditInput {
  actorId: string | null;
  action: string;
  entityType: "user" | "business" | "branch" | "membership" | "product" | "presentation" | "supplier" | "warehouse" | "area" | "stock_level" | "recipe" | "recipe_template" | "transfer" | "inventory_import" | "purchase_template" | "employee" | "position" | "document_type" | "employee_file" | "payroll_week" | "loan" | "checklist_template" | "checklist_sheet" | "floor_device" | "cash_cut" | "cash_settings";
  entityId: string;
  businessId?: string | null;
  branchId?: string | null;
  before?: unknown;
  after?: unknown;
}

export function recordAudit(audit: AuditRepo, now: Date, input: AuditInput) {
  return audit.insert({ ...input, createdAt: now });
}
