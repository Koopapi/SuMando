// Lo que ven las pantallas y la API del catálogo (spec 003): siempre el negocio de la sucursal activa (RF-4), los
// almacenes de esa sucursal más los del negocio (RF-5) y los mínimos en la presentación de conteo (RF-26).
import type { Area, Product, ProductPresentation, StockLevel, Supplier, Warehouse } from "@/db/schema";
import { dbToMicro, dbToMilli, formatMilli, fromBaseMicro, type BaseUnit } from "@/domain/catalog/units";
import type { Ctx } from "../context";
import { responsibleCandidates } from "./places";
import { catalogAccess, type CatalogScope } from "./shared";

export interface PresentationView {
  /** Nulo = la presentación implícita de unidad base, con equivalencia 1 (RF-12). */
  id: string | null;
  name: string | null;
  factor: string;
}
export interface LevelView {
  min: string | null;
  max: string | null;
}
export interface ProductView {
  id: string;
  name: string;
  baseUnit: BaseUnit;
  notes: string | null;
  archived: boolean;
  supplier: { id: string; name: string; archived: boolean } | null;
  presentations: PresentationView[];
  purchasePresentationId: string | null;
  countPresentationId: string | null;
  /** Mínimo y máximo por almacén visible y activo, en la presentación de conteo (RF-26, RF-36). */
  levels: Record<string, LevelView>;
}
export interface SupplierView {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  archived: boolean;
  products: { id: string; name: string }[];
}
export interface WarehouseView {
  id: string;
  name: string;
  scope: "branch" | "business";
  archived: boolean;
}
export interface AreaView {
  id: string;
  name: string;
  archived: boolean;
  responsible: { id: string; name: string; hasAccess: boolean };
}
export interface CatalogView {
  products: ProductView[];
  suppliers: SupplierView[];
  warehouses: WarehouseView[];
  areas: AreaView[];
  candidates: { id: string; name: string }[];
}

export const presentationView = (p: ProductPresentation): PresentationView => ({ id: p.id, name: p.name, factor: formatMilli(dbToMilli(p.factor)) });
export const warehouseView = (w: Warehouse): WarehouseView => ({ id: w.id, name: w.name, scope: w.branchId ? "branch" : "business", archived: w.archivedAt !== null });

function shown(base: string | null, factorMilli: bigint): string | null {
  return base === null ? null : formatMilli(fromBaseMicro(dbToMicro(base), factorMilli));
}

export function productView(p: Product, presentations: ProductPresentation[], suppliers: Map<string, Supplier>, levels: StockLevel[], visibleWarehouses: Set<string>): ProductView {
  const own = presentations.filter((x) => x.productId === p.id);
  const count = own.find((x) => x.id === p.countPresentationId);
  const factor = count ? dbToMilli(count.factor) : 1000n;
  const supplier = p.supplierId ? suppliers.get(p.supplierId) : undefined;
  return {
    id: p.id,
    name: p.name,
    baseUnit: p.baseUnit,
    notes: p.notes,
    archived: p.archivedAt !== null,
    supplier: supplier ? { id: supplier.id, name: supplier.name, archived: supplier.archivedAt !== null } : null,
    presentations: [{ id: null, name: null, factor: "1" }, ...own.map(presentationView)],
    purchasePresentationId: p.purchasePresentationId,
    countPresentationId: p.countPresentationId,
    levels: Object.fromEntries(levels.filter((l) => l.productId === p.id && visibleWarehouses.has(l.warehouseId)).map((l) => [l.warehouseId, { min: shown(l.minBase, factor), max: shown(l.maxBase, factor) }])),
  };
}

export async function catalogView(ctx: Ctx, scope: CatalogScope): Promise<CatalogView> {
  const access = await catalogAccess(ctx.store, scope);
  const c = ctx.store.catalog;
  const branchId = scope.active.branch.id;
  const [products, presentations, suppliers, warehouses, areas, levels, users, candidates] = await Promise.all([
    c.products.listByBusiness(access.businessId),
    c.presentations.listByBusiness(access.businessId),
    c.suppliers.listByBusiness(access.businessId),
    c.warehouses.listByBusiness(access.businessId),
    c.areas.listByBusiness(access.businessId),
    c.levels.listByBusiness(access.businessId),
    ctx.store.users.list(),
    responsibleCandidates(ctx.store, branchId),
  ]);
  const visible = warehouses.filter((w) => w.branchId === null || w.branchId === branchId);
  const activeWarehouses = new Set(visible.filter((w) => !w.archivedAt).map((w) => w.id));
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));
  const names = new Map(users.map((u) => [u.id, u.name]));
  const allowed = new Set(candidates.map((u) => u.id));
  return {
    products: products.map((p) => productView(p, presentations, supplierMap, levels, activeWarehouses)),
    suppliers: suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      notes: s.notes,
      archived: s.archivedAt !== null,
      products: products.filter((p) => p.supplierId === s.id).map((p) => ({ id: p.id, name: p.name })),
    })),
    warehouses: visible.map(warehouseView),
    areas: areas
      .filter((a: Area) => a.branchId === branchId)
      .map((a) => ({ id: a.id, name: a.name, archived: a.archivedAt !== null, responsible: { id: a.responsibleId, name: names.get(a.responsibleId) ?? "", hasAccess: allowed.has(a.responsibleId) } })),
    candidates,
  };
}

export async function productDetail(ctx: Ctx, scope: CatalogScope, id: string): Promise<{ product: ProductView; catalog: CatalogView } | null> {
  const catalog = await catalogView(ctx, scope);
  const product = catalog.products.find((p) => p.id === id);
  return product ? { product, catalog } : null;
}
