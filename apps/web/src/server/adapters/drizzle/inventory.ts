// Implementación con Drizzle de los repositorios del inventario (`server/ports/inventory.ts`).
import { and, asc, desc, eq, gte, inArray, lt, lte, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { areaProducts, areas, inventoryCountLines, inventoryCounts, inventoryMovementLines, inventoryMovements, inventoryTransferLines, inventoryTransfers, productLinks, stock, users, warehouses } from "@/db/schema";
import type { DbOrTx } from "@/db/client";
import type { InventoryRepo } from "@/server/ports/inventory";

const first = <T>(rows: T[]): T | null => rows[0] ?? null;
const byProduct = <T extends { productId: string }>(rows: T[]) => [...rows].sort((a, b) => (a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0));

export function inventoryRepo(db: DbOrTx): InventoryRepo {
  return {
    stock: {
      listByWarehouses: (ids) => (ids.length ? db.select().from(stock).where(inArray(stock.warehouseId, ids)) : Promise.resolve([])),
      listByProduct: (productId) => db.select().from(stock).where(eq(stock.productId, productId)),
      apply: async (businessId, warehouseId, deltas, at) => {
        if (deltas.length === 0) return new Map();
        // En orden de producto, para que dos transacciones no se bloqueen en cruz.
        const rows = await db
          .insert(stock)
          .values(byProduct(deltas).map((d) => ({ businessId, warehouseId, productId: d.productId, quantityBase: d.deltaBase, updatedAt: at })))
          .onConflictDoUpdate({ target: [stock.warehouseId, stock.productId], set: { quantityBase: sql`${stock.quantityBase} + excluded.quantity_base`, updatedAt: sql`excluded.updated_at` } })
          .returning({ productId: stock.productId, quantityBase: stock.quantityBase });
        return new Map(rows.map((r) => [r.productId, r.quantityBase]));
      },
      lock: async (businessId, warehouseId, productIds, at) => {
        if (productIds.length === 0) return new Map();
        const ids = [...new Set(productIds)].sort();
        await db
          .insert(stock)
          .values(ids.map((productId) => ({ businessId, warehouseId, productId, quantityBase: "0", updatedAt: at })))
          .onConflictDoNothing({ target: [stock.warehouseId, stock.productId] });
        const rows = await db
          .select({ productId: stock.productId, quantityBase: stock.quantityBase })
          .from(stock)
          .where(and(eq(stock.warehouseId, warehouseId), inArray(stock.productId, ids)))
          .orderBy(asc(stock.productId))
          .for("update");
        return new Map(rows.map((r) => [r.productId, r.quantityBase]));
      },
    },
    movements: {
      insert: async ({ lines, ...data }) => {
        const [row] = await db.insert(inventoryMovements).values(data).returning();
        if (lines.length) await db.insert(inventoryMovementLines).values(lines.map((l, position) => ({ ...l, movementId: row.id, position })));
        return row;
      },
      findById: async (id) => first(await db.select().from(inventoryMovements).where(eq(inventoryMovements.id, id)).limit(1)),
      lines: (movementId) => db.select().from(inventoryMovementLines).where(eq(inventoryMovementLines.movementId, movementId)).orderBy(asc(inventoryMovementLines.position)),
      reversalOf: async (movementId) => first(await db.select().from(inventoryMovements).where(eq(inventoryMovements.reversesId, movementId)).limit(1)),
      byTransfer: (transferId) => db.select().from(inventoryMovements).where(eq(inventoryMovements.transferId, transferId)).orderBy(asc(inventoryMovements.createdAt)),
      list: async (f) => {
        if (f.warehouseIds.length === 0) return [];
        const reversal = alias(inventoryMovements, "reversal");
        const conds = [inArray(inventoryMovements.warehouseId, f.warehouseIds)];
        if (f.kind) conds.push(eq(inventoryMovements.kind, f.kind));
        if (f.from) conds.push(gte(inventoryMovements.createdAt, f.from));
        if (f.to) conds.push(lte(inventoryMovements.createdAt, f.to));
        if (f.before) conds.push(or(lt(inventoryMovements.createdAt, f.before.createdAt), and(eq(inventoryMovements.createdAt, f.before.createdAt), lt(inventoryMovements.id, f.before.id)))!);
        const rows = await db
          .select({
            m: inventoryMovements,
            authorName: users.name,
            warehouseName: warehouses.name,
            lineCount: sql<number>`(select count(*) from ${inventoryMovementLines} l where l.movement_id = ${inventoryMovements.id})::int`,
            reversedBy: reversal.id,
          })
          .from(inventoryMovements)
          .innerJoin(users, eq(users.id, inventoryMovements.createdBy))
          .innerJoin(warehouses, eq(warehouses.id, inventoryMovements.warehouseId))
          .leftJoin(reversal, eq(reversal.reversesId, inventoryMovements.id))
          .where(and(...conds))
          .orderBy(desc(inventoryMovements.createdAt), desc(inventoryMovements.id))
          .limit(f.limit);
        return rows.map((r) => ({ ...r.m, authorName: r.authorName, warehouseName: r.warehouseName, lineCount: r.lineCount, reversedBy: r.reversedBy }));
      },
      history: async (warehouseId, productId, beforeLineId, limit) => {
        const conds = [eq(inventoryMovements.warehouseId, warehouseId), eq(inventoryMovementLines.productId, productId)];
        if (beforeLineId !== null) conds.push(lt(inventoryMovementLines.id, beforeLineId));
        const rows = await db
          .select({ l: inventoryMovementLines, m: inventoryMovements, authorName: users.name })
          .from(inventoryMovementLines)
          .innerJoin(inventoryMovements, eq(inventoryMovements.id, inventoryMovementLines.movementId))
          .innerJoin(users, eq(users.id, inventoryMovements.createdBy))
          .where(and(...conds))
          .orderBy(desc(inventoryMovementLines.id))
          .limit(limit);
        return rows.map((r) => ({ ...r.l, movement: r.m, authorName: r.authorName }));
      },
    },
    transfers: {
      insert: async ({ lines, ...data }) => {
        const [row] = await db.insert(inventoryTransfers).values(data).returning();
        await db.insert(inventoryTransferLines).values(lines.map((l, position) => ({ ...l, transferId: row.id, position })));
        return row;
      },
      findById: async (id) => first(await db.select().from(inventoryTransfers).where(eq(inventoryTransfers.id, id)).limit(1)),
      lockById: async (id) => first(await db.select().from(inventoryTransfers).where(eq(inventoryTransfers.id, id)).limit(1).for("update")),
      update: async (id, patch) => (await db.update(inventoryTransfers).set(patch).where(eq(inventoryTransfers.id, id)).returning())[0],
      lines: (transferId) => db.select().from(inventoryTransferLines).where(eq(inventoryTransferLines.transferId, transferId)).orderBy(asc(inventoryTransferLines.position)),
      receiveLine: async (lineId, toProductId, quantityReceived) => {
        await db.update(inventoryTransferLines).set({ toProductId, quantityReceived }).where(eq(inventoryTransferLines.id, lineId));
      },
      listForWarehouses: (ids, limit) =>
        ids.length
          ? db
              .select()
              .from(inventoryTransfers)
              .where(or(inArray(inventoryTransfers.fromWarehouseId, ids), inArray(inventoryTransfers.toWarehouseId, ids)))
              .orderBy(desc(inventoryTransfers.sentAt))
              .limit(limit)
          : Promise.resolve([]),
    },
    links: {
      find: (fromProductIds, toBusinessId) =>
        fromProductIds.length ? db.select().from(productLinks).where(and(inArray(productLinks.fromProductId, fromProductIds), eq(productLinks.toBusinessId, toBusinessId))) : Promise.resolve([]),
      upsert: async (fromProductId, toBusinessId, toProductId, by, at) => {
        await db
          .insert(productLinks)
          .values({ fromProductId, toBusinessId, toProductId, updatedBy: by, updatedAt: at })
          .onConflictDoUpdate({ target: [productLinks.fromProductId, productLinks.toBusinessId], set: { toProductId, updatedBy: by, updatedAt: at } });
      },
    },
    areaProducts: {
      listByArea: (areaId) => db.select().from(areaProducts).where(eq(areaProducts.areaId, areaId)).orderBy(asc(areaProducts.position)),
      listByBusiness: async (businessId) =>
        (await db.select({ ap: areaProducts }).from(areaProducts).innerJoin(areas, eq(areas.id, areaProducts.areaId)).where(eq(areas.businessId, businessId)).orderBy(asc(areaProducts.areaId), asc(areaProducts.position))).map(
          (r) => r.ap,
        ),
      replace: async (areaId, productIds) => {
        await db.delete(areaProducts).where(eq(areaProducts.areaId, areaId));
        if (productIds.length === 0) return [];
        return db
          .insert(areaProducts)
          .values(productIds.map((productId, position) => ({ areaId, productId, position })))
          .returning();
      },
    },
    counts: {
      insert: async ({ lines, ...data }) => {
        const [row] = await db.insert(inventoryCounts).values(data).returning();
        if (lines.length) await db.insert(inventoryCountLines).values(lines.map((l, position) => ({ ...l, countId: row.id, position })));
        return row;
      },
      lastByAreas: async (areaIds) => {
        if (areaIds.length === 0) return [];
        const rows = await db
          .selectDistinctOn([inventoryCounts.areaId], { areaId: inventoryCounts.areaId, countId: inventoryCounts.id, createdAt: inventoryCounts.createdAt, authorName: users.name })
          .from(inventoryCounts)
          .innerJoin(users, eq(users.id, inventoryCounts.createdBy))
          .where(inArray(inventoryCounts.areaId, areaIds))
          .orderBy(inventoryCounts.areaId, desc(inventoryCounts.createdAt));
        return rows;
      },
    },
  };
}
