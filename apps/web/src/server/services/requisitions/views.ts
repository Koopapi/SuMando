// Vistas de requisiciones (spec 007) que reciben las pantallas y la API: textos listos para mostrar, sin `bigint`.
import type { BaseUnit } from "@/domain/catalog/units";
import type { GroupStatus, RequisitionStatus } from "@/domain/requisitions/state";

export interface DraftLine {
  productId: string;
  name: string;
  baseUnit: BaseUnit;
  presentationId: string | null;
  /** Cantidad en la presentación elegida. */
  quantity: string;
  supplierId: string | null;
}

export interface LineView {
  id: string;
  productId: string;
  name: string;
  baseUnit: BaseUnit;
  presentation: { id: string | null; name: string | null; factor: string };
  requested: string;
  quantity: string;
  received: string;
  pending: string;
  excess: string;
  supplierId: string | null;
  amount: string | null;
  closed: { at: string; by: string; reason: string | null } | null;
  archived: boolean;
}

export interface GroupView {
  /** Nulo antes de aprobar: el grupo sale de los renglones. */
  id: string | null;
  supplierId: string | null;
  supplierName: string | null;
  supplierArchived: boolean;
  buyer: string | null;
  status: GroupStatus;
  purchasedAt: string | null;
  purchasedBy: string | null;
  /** Total del grupo en pesos («1234.50»): la suma de los importes por renglón o el total anotado. */
  total: string | null;
  totalFromLines: boolean;
  anyReceived: boolean;
  lineIds: string[];
}

export interface EventItem {
  kind: string;
  at: string;
  actor: string;
  detail: Record<string, unknown> | null;
}

export interface RequisitionView {
  id: string;
  folio: number;
  status: RequisitionStatus;
  warehouse: { id: string; name: string; archived: boolean };
  note: string | null;
  createdAt: string;
  author: string;
  isOwner: boolean;
  canEdit: boolean;
  canDecide: boolean;
  canCancel: boolean;
  canOperate: boolean;
  total: string | null;
  lines: LineView[];
  groups: GroupView[];
  events: EventItem[];
}

export interface RequisitionSummaryView {
  id: string;
  folio: number;
  status: RequisitionStatus;
  createdAt: string;
  author: string;
  warehouseName: string;
  lines: number;
  pending: boolean;
  total: string | null;
}
