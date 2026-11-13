// Repositorios del catálogo (spec 003) como puertos; `server/adapters/drizzle/catalog.ts` los implementa.
import type { Area, Product, ProductPresentation, StockLevel, Supplier, Warehouse } from "@/db/schema";

type Meta = { createdBy: string | null; createdAt: Date };

export type NewSupplier = Meta & { businessId: string; name: string; nameKey: string; phone: string | null; notes: string | null };
export type SupplierPatch = Partial<Pick<Supplier, "name" | "nameKey" | "phone" | "notes" | "archivedAt">> & { updatedAt: Date };

export type NewProduct = Meta & { businessId: string; name: string; nameKey: string; baseUnit: Product["baseUnit"]; supplierId: string | null; notes: string | null };
export type ProductPatch = Partial<Pick<Product, "name" | "nameKey" | "supplierId" | "notes" | "purchasePresentationId" | "countPresentationId" | "archivedAt">> & { updatedAt: Date };

export type NewPresentation = Meta & { productId: string; name: string; nameKey: string; factor: string };
export type PresentationPatch = Partial<Pick<ProductPresentation, "name" | "nameKey" | "factor">> & { updatedAt: Date };

export type NewWarehouse = Meta & { businessId: string; branchId: string | null; name: string; nameKey: string };
export type WarehousePatch = Partial<Pick<Warehouse, "name" | "nameKey" | "archivedAt">> & { updatedAt: Date };

export type NewArea = Meta & { businessId: string; branchId: string; name: string; nameKey: string; responsibleId: string };
export type AreaPatch = Partial<Pick<Area, "name" | "nameKey" | "responsibleId" | "archivedAt">> & { updatedAt: Date };

export type LevelValues = { businessId: string; productId: string; warehouseId: string; minBase: string | null; maxBase: string | null; updatedBy: string; at: Date };

interface EntityRepo<T, New, Patch> {
  listByBusiness(businessId: string): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  insert(data: New): Promise<T>;
  update(id: string, patch: Patch): Promise<T>;
}

export interface CatalogRepo {
  suppliers: EntityRepo<Supplier, NewSupplier, SupplierPatch>;
  products: EntityRepo<Product, NewProduct, ProductPatch>;
  presentations: {
    listByProduct(productId: string): Promise<ProductPresentation[]>;
    listByBusiness(businessId: string): Promise<ProductPresentation[]>;
    findById(id: string): Promise<ProductPresentation | null>;
    insert(data: NewPresentation): Promise<ProductPresentation>;
    update(id: string, patch: PresentationPatch): Promise<ProductPresentation>;
  };
  warehouses: EntityRepo<Warehouse, NewWarehouse, WarehousePatch>;
  areas: EntityRepo<Area, NewArea, AreaPatch>;
  levels: {
    listByBusiness(businessId: string): Promise<StockLevel[]>;
    find(productId: string, warehouseId: string): Promise<StockLevel | null>;
    upsert(values: LevelValues): Promise<StockLevel>;
  };
}
