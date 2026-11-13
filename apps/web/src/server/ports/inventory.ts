// Repositorios del inventario (spec 005) como puertos; `server/adapters/drizzle/inventory.ts` los implementa.
import type { AreaProduct, InventoryCount, InventoryMovement, InventoryMovementLine, InventoryTransfer, InventoryTransferLine, MovementKind, ProductLink, Stock } from "@/db/schema";

/** Cambio de existencia de un producto, en unidad base con signo (texto `numeric`). */
export type StockDelta = { productId: string; deltaBase: string };

export type NewMovement = {
  businessId: string;
  branchId: string | null;
  warehouseId: string;
  kind: MovementKind;
  reason?: string | null;
  supplierId?: string | null;
  reference?: string | null;
  note?: string | null;
  transferId?: string | null;
  countId?: string | null;
  reversesId?: string | null;
  requisitionId?: string | null;
  createdBy: string;
  createdAt: Date;
  lines: { productId: string; deltaBase: string; balanceAfter: string }[];
};

export type MovementSummary = InventoryMovement & { authorName: string; warehouseName: string; lineCount: number; reversedBy: string | null };
export type MovementCursor = { createdAt: Date; id: string };
export type MovementFilter = { warehouseIds: string[]; kind?: MovementKind; from?: Date; to?: Date; before?: MovementCursor; limit: number };

export type HistoryEntry = InventoryMovementLine & { movement: InventoryMovement; authorName: string };

export type NewTransfer = Omit<InventoryTransfer, "id" | "receivedBy" | "receivedAt" | "cancelledBy" | "cancelledAt" | "cancelReason"> & {
  lines: Pick<InventoryTransferLine, "fromProductId" | "productName" | "baseUnit" | "quantitySent">[];
};
export type TransferPatch = Partial<Pick<InventoryTransfer, "status" | "receivedBy" | "receivedAt" | "cancelledBy" | "cancelledAt" | "cancelReason">>;

export type NewCount = Omit<InventoryCount, "id"> & { lines: { productId: string; expectedBase: string; countedBase: string; differenceBase: string }[] };
export type LastCount = { areaId: string; countId: string; createdAt: Date; authorName: string };

export interface InventoryRepo {
  stock: {
    listByWarehouses(warehouseIds: string[]): Promise<Stock[]>;
    listByProduct(productId: string): Promise<Stock[]>;
    /** Suma cada cambio a la existencia de forma atómica y devuelve la existencia resultante por producto. */
    apply(businessId: string, warehouseId: string, deltas: StockDelta[], at: Date): Promise<Map<string, string>>;
    /** Bloquea hasta el fin de la transacción las existencias (creando en cero las que falten) y las devuelve. */
    lock(businessId: string, warehouseId: string, productIds: string[], at: Date): Promise<Map<string, string>>;
  };
  movements: {
    insert(data: NewMovement): Promise<InventoryMovement>;
    findById(id: string): Promise<InventoryMovement | null>;
    lines(movementId: string): Promise<InventoryMovementLine[]>;
    /** El movimiento que cancela a este, si existe. */
    reversalOf(movementId: string): Promise<InventoryMovement | null>;
    byTransfer(transferId: string): Promise<InventoryMovement[]>;
    list(filter: MovementFilter): Promise<MovementSummary[]>;
    history(warehouseId: string, productId: string, beforeLineId: number | null, limit: number): Promise<HistoryEntry[]>;
  };
  transfers: {
    insert(data: NewTransfer): Promise<InventoryTransfer>;
    findById(id: string): Promise<InventoryTransfer | null>;
    /** Bloquea el traspaso hasta el fin de la transacción (recibir y cancelar a la vez, RF-37). */
    lockById(id: string): Promise<InventoryTransfer | null>;
    update(id: string, patch: TransferPatch): Promise<InventoryTransfer>;
    lines(transferId: string): Promise<InventoryTransferLine[]>;
    receiveLine(lineId: string, toProductId: string, quantityReceived: string): Promise<void>;
    /** Traspasos que salen de o llegan a esos almacenes, del más reciente al más antiguo. */
    listForWarehouses(warehouseIds: string[], limit: number): Promise<InventoryTransfer[]>;
  };
  links: {
    find(fromProductIds: string[], toBusinessId: string): Promise<ProductLink[]>;
    upsert(fromProductId: string, toBusinessId: string, toProductId: string, by: string, at: Date): Promise<void>;
  };
  areaProducts: {
    listByArea(areaId: string): Promise<AreaProduct[]>;
    listByBusiness(businessId: string): Promise<AreaProduct[]>;
    replace(areaId: string, productIds: string[]): Promise<AreaProduct[]>;
  };
  counts: {
    insert(data: NewCount): Promise<InventoryCount>;
    lastByAreas(areaIds: string[]): Promise<LastCount[]>;
  };
}
