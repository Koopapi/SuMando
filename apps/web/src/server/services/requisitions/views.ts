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
  /** Nombre de quien compra: la persona de Personal o, antes de la spec 013, el texto escrito (RF-7). */
  buyer: string | null;
  buyerEmployeeId: string | null;
  /** Spec 013, RF-6: la persona se dio de baja. */
  buyerInactive: boolean;
  /** Spec 013, RF-10: el comprador habitual que tomará al aprobarse (solo mientras está solicitada). */
  habitualBuyer: string | null;
  status: GroupStatus;
  purchasedAt: string | null;
  purchasedBy: string | null;
  /** Total del grupo en pesos («1234.50»): la suma de los importes por renglón o el total anotado. */
  total: string | null;
  totalFromLines: boolean;
  anyReceived: boolean;
  lineIds: string[];
}

/** Spec 013, RF-8 a RF-15: un comprador con sus proveedores, sus cuentas y su lista para WhatsApp. */
export interface BuyerView {
  /** Nulo = «Sin comprador». */
  key: string | null;
  name: string | null;
  inactive: boolean;
  groupIds: string[];
  counts: { toBuy: number; purchased: number; received: number };
  /** Solo mientras está aprobada y tiene algo por comprar (RF-11). */
  message: string | null;
  link: string | null;
  /** RF-14: hay mensaje pero la persona no tiene un teléfono válido. */
  missingPhone: boolean;
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
  /** Vacío mientras no hay grupos fijos (antes de aprobar). */
  buyers: BuyerView[];
  /** Personal activo de la sucursal, para elegir comprador (RF-5); vacío si no se puede operar. */
  staff: { id: string; name: string }[];
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
