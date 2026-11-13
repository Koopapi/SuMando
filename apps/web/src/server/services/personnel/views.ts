// Vistas de personal (spec 008). El sueldo y los archivos solo van en las vistas del dueño (RF-4, RF-5).
import type { DocStatus } from "@/domain/personnel/documents";

export interface DocSummary {
  ok: number;
  total: number;
  missing: number;
  expired: number;
}

export interface EmployeeSummaryView {
  id: string;
  name: string;
  position: string;
  hiredOn: string | null;
  phone: string | null;
  active: boolean;
  leftOn: string | null;
  docs: DocSummary;
  /** Solo para el dueño: sueldo por día en pesos («400.00»); null = sin sueldo. */
  pay?: string | null;
}

export interface EmployeeFileView {
  id: string;
  name: string;
  contentType: string;
  size: number;
  issuedOn: string | null;
  uploadedAt: string;
  uploadedBy: string;
  replacedAt: string | null;
  retiredAt: string | null;
  retireReason: string | null;
}

export interface EmployeeDocumentView {
  typeId: string;
  name: string;
  required: boolean;
  validityMonths: number | null;
  status: DocStatus;
  issuedOn: string | null;
  /** Archivos vigentes (no reemplazados ni retirados). */
  count: number;
  /** Solo para el dueño: los vigentes y su historial (RF-24). */
  files?: EmployeeFileView[];
}

export interface PeriodView {
  hiredOn: string;
  leftOn: string | null;
  reason: string | null;
  note: string | null;
}

export interface EmployeeDetailView {
  id: string;
  name: string;
  positionId: string;
  position: string;
  phone: string | null;
  notes: string | null;
  active: boolean;
  branch: { id: string; name: string };
  periods: PeriodView[];
  documents: EmployeeDocumentView[];
  docs: DocSummary;
  owner: boolean;
  pay?: string | null;
  /** Sucursales del negocio a las que se puede mover (RF-34). */
  moveTo: { id: string; name: string }[];
  /** Solo para el dueño (RF-42). */
  history?: { action: string; at: string; actor: string; before: unknown; after: unknown }[];
}
