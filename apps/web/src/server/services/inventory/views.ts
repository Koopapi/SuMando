// Vistas del inventario (spec 005) que reciben las pantallas y la API: textos listos para mostrar, sin `bigint`.
import type { MovementKind } from "@/db/schema";
import type { BaseUnit } from "@/domain/catalog/units";
import type { StockStatus } from "@/domain/inventory/quantities";

export interface WarehouseOption {
  id: string;
  name: string;
  scope: "branch" | "business";
  archived: boolean;
}

export interface Measure {
  /** Presentación de conteo; nulo = la unidad base. */
  presentation: string | null;
  baseUnit: BaseUnit;
}

export interface StockRow extends Measure {
  productId: string;
  name: string;
  archived: boolean;
  /** Existencia en la presentación de conteo, con signo y hasta 3 decimales (RF-9). */
  quantity: string;
  min: string | null;
  max: string | null;
  status: StockStatus;
  area: string | null;
}

export interface ProductStockView {
  warehouseId: string;
  warehouseName: string;
  quantity: string;
  status: StockStatus;
}

export interface PresentationOption {
  id: string | null;
  name: string | null;
  factor: string;
}

export interface ProductOption extends Measure {
  id: string;
  name: string;
  presentations: PresentationOption[];
  countPresentationId: string | null;
}

export interface MovementLineView extends Measure {
  productId: string;
  name: string;
  /** Cambio con signo en la presentación de conteo. */
  delta: string;
  /** Existencia que dejó (RF-61). */
  balance: string;
}

export interface MovementView {
  id: string;
  kind: MovementKind;
  warehouse: { id: string; name: string };
  reason: string | null;
  supplier: string | null;
  reference: string | null;
  note: string | null;
  createdAt: string;
  author: string;
  transferId: string | null;
  countId: string | null;
  reverses: string | null;
  /** RF-66: la cancelación, si la hubo. */
  reversal: { id: string; createdAt: string; author: string; reason: string | null } | null;
  cancellable: boolean;
  lines: MovementLineView[];
}

export interface MovementSummaryView {
  id: string;
  kind: MovementKind;
  warehouseName: string;
  reason: string | null;
  createdAt: string;
  author: string;
  lines: number;
  cancelled: boolean;
}

export interface HistoryEntryView {
  lineId: number;
  movementId: string;
  kind: MovementKind;
  createdAt: string;
  author: string;
  delta: string;
  balance: string;
  cancelled: boolean;
}

export interface TransferLineView {
  id: string;
  name: string;
  baseUnit: BaseUnit;
  /** En la unidad base. */
  sent: string;
  received: string | null;
  difference: string | null;
  toProduct: { id: string; name: string } | null;
  /** Solo para quien recibe (RF-31): producto propuesto del negocio que recibe. */
  proposedProductId: string | null;
}

export interface TransferView {
  id: string;
  crossBusiness: boolean;
  status: "done" | "in_transit" | "received" | "cancelled";
  from: { business: string; warehouse: string };
  to: { business: string; warehouse: string };
  note: string | null;
  sentAt: string;
  sentBy: string;
  receivedAt: string | null;
  receivedBy: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  /** Qué puede hacer quien mira: recibir (destino) o cancelar (origen). */
  canReceive: boolean;
  canCancel: boolean;
  hasDifference: boolean;
  lines: TransferLineView[];
}

export interface DestinationView {
  id: string;
  name: string;
  own: boolean;
  warehouses: { id: string; name: string }[];
}

export interface CountSheetLine extends Measure {
  productId: string;
  name: string;
  /** Lo esperado en la presentación de conteo, para mostrar. */
  expected: string;
  /** Lo esperado exacto en unidad base: lo que el cliente devuelve como `seen` (RF-51). */
  seen: string;
  presentations: PresentationOption[];
  countPresentationId: string | null;
}

export interface AreaCountView {
  id: string;
  name: string;
  responsible: string;
  warehouse: { id: string; name: string } | null;
  products: number;
  lastCount: { at: string; author: string } | null;
}
