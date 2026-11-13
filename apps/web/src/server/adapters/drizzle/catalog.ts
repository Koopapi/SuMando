// Implementación con Drizzle de los repositorios del catálogo (`server/ports/catalog.ts`).
import { asc, eq, and } from "drizzle-orm";
import { areas, productPresentations, products, stockLevels, suppliers, warehouses } from "@/db/schema";
import type { DbOrTx } from "@/db/client";
import type { CatalogRepo } from "@/server/ports/catalog";

const first = <T>(rows: T[]): T | null => rows[0] ?? null;

export function catalogRepo(db: DbOrTx): CatalogRepo {
  return {
    suppliers: {
      listByBusiness: (businessId) => db.select().from(suppliers).where(eq(suppliers.businessId, businessId)).orderBy(asc(suppliers.nameKey)),
      findById: async (id) => first(await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1)),
      insert: async (data) => (await db.insert(suppliers).values({ ...data, updatedAt: data.createdAt }).returning())[0],
      update: async (id, patch) => (await db.update(suppliers).set(patch).where(eq(suppliers.id, id)).returning())[0],
    },
    products: {
      listByBusiness: (businessId) => db.select().from(products).where(eq(products.businessId, businessId)).orderBy(asc(products.nameKey)),
      findById: async (id) => first(await db.select().from(products).where(eq(products.id, id)).limit(1)),
      insert: async (data) => (await db.insert(products).values({ ...data, updatedAt: data.createdAt }).returning())[0],
      update: async (id, patch) => (await db.update(products).set(patch).where(eq(products.id, id)).returning())[0],
    },
    presentations: {
      listByProduct: (productId) => db.select().from(productPresentations).where(eq(productPresentations.productId, productId)).orderBy(asc(productPresentations.factor)),
      listByBusiness: async (businessId) =>
        (
          await db
            .select({ p: productPresentations })
            .from(productPresentations)
            .innerJoin(products, eq(products.id, productPresentations.productId))
            .where(eq(products.businessId, businessId))
            .orderBy(asc(productPresentations.factor))
        ).map((r) => r.p),
      findById: async (id) => first(await db.select().from(productPresentations).where(eq(productPresentations.id, id)).limit(1)),
      insert: async (data) => (await db.insert(productPresentations).values({ ...data, updatedAt: data.createdAt }).returning())[0],
      update: async (id, patch) => (await db.update(productPresentations).set(patch).where(eq(productPresentations.id, id)).returning())[0],
    },
    warehouses: {
      listByBusiness: (businessId) => db.select().from(warehouses).where(eq(warehouses.businessId, businessId)).orderBy(asc(warehouses.nameKey)),
      findById: async (id) => first(await db.select().from(warehouses).where(eq(warehouses.id, id)).limit(1)),
      insert: async (data) => (await db.insert(warehouses).values({ ...data, updatedAt: data.createdAt }).returning())[0],
      update: async (id, patch) => (await db.update(warehouses).set(patch).where(eq(warehouses.id, id)).returning())[0],
    },
    areas: {
      listByBusiness: (businessId) => db.select().from(areas).where(eq(areas.businessId, businessId)).orderBy(asc(areas.nameKey)),
      findById: async (id) => first(await db.select().from(areas).where(eq(areas.id, id)).limit(1)),
      insert: async (data) => (await db.insert(areas).values({ ...data, updatedAt: data.createdAt }).returning())[0],
      update: async (id, patch) => (await db.update(areas).set(patch).where(eq(areas.id, id)).returning())[0],
    },
    levels: {
      listByBusiness: (businessId) => db.select().from(stockLevels).where(eq(stockLevels.businessId, businessId)),
      find: async (productId, warehouseId) => first(await db.select().from(stockLevels).where(and(eq(stockLevels.productId, productId), eq(stockLevels.warehouseId, warehouseId))).limit(1)),
      upsert: async ({ at, ...v }) =>
        (
          await db
            .insert(stockLevels)
            .values({ ...v, createdAt: at, updatedAt: at })
            .onConflictDoUpdate({ target: [stockLevels.productId, stockLevels.warehouseId], set: { minBase: v.minBase, maxBase: v.maxBase, updatedBy: v.updatedBy, updatedAt: at } })
            .returning()
        )[0],
    },
  };
}
