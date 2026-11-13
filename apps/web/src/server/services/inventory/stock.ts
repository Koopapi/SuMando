// Existencias (spec 005, RF-2, RF-9, RF-21, RF-55 a RF-59): por almacén visible, en la presentación de conteo, con
// el mínimo y el máximo del catálogo y el área donde se cuenta.
import type { Product, Warehouse } from "@/db/schema";
import { dbToMicro, dbToMilli, formatMilli, fromBaseMicro } from "@/domain/catalog/units";
import { dbToSignedMicro, formatStock, stockStatus } from "@/domain/inventory/quantities";
import type { CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";
import { uuidOrNotFound, countFactor, inventoryAccess, loadBook, visibleWarehouse, type Book } from "./shared";
import type { PresentationOption, ProductOption, ProductStockView, StockRow, WarehouseOption } from "./views";

export const warehouseOption = (w: Warehouse): WarehouseOption => ({ id: w.id, name: w.name, scope: w.branchId ? "branch" : "business", archived: w.archivedAt !== null });

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, "es");

/** Presentaciones del producto: la unidad base primero (RF-7). */
export function presentationOptions(book: Book, product: Product): PresentationOption[] {
  const own = [...book.presentations.values()].filter((p) => p.productId === product.id).map((p) => ({ id: p.id, name: p.name, factor: formatMilli(dbToMilli(p.factor)) }));
  return [{ id: null, name: null, factor: "1" }, ...own.sort(byName)];
}

export function productOption(book: Book, product: Product): ProductOption {
  return { id: product.id, name: product.name, baseUnit: product.baseUnit, presentation: countFactor(book, product).name, presentations: presentationOptions(book, product), countPresentationId: product.countPresentationId };
}

/** Almacenes visibles desde la sucursal activa (RF-2). */
export async function inventoryWarehouses(ctx: Ctx, scope: CatalogScope): Promise<WarehouseOption[]> {
  const access = await inventoryAccess(ctx.store, scope);
  return access.visible.map(warehouseOption).sort(byName);
}

/** Productos activos del negocio para capturar movimientos (RF-6, RF-7). */
export async function movementProducts(ctx: Ctx, scope: CatalogScope): Promise<ProductOption[]> {
  const access = await inventoryAccess(ctx.store, scope);
  const book = await loadBook(ctx.store, access.businessId);
  return [...book.products.values()].filter((p) => !p.archivedAt).map((p) => productOption(book, p)).sort(byName);
}

export async function stockOfWarehouse(ctx: Ctx, scope: CatalogScope, warehouseId: string): Promise<{ warehouse: WarehouseOption; rows: StockRow[] }> {
  const access = await inventoryAccess(ctx.store, scope);
  const warehouse = visibleWarehouse(access, warehouseId);
  const [book, stock, levels, areas, areaProducts] = await Promise.all([
    loadBook(ctx.store, access.businessId),
    ctx.store.inventory.stock.listByWarehouses([warehouse.id]),
    ctx.store.catalog.levels.listByBusiness(access.businessId),
    ctx.store.catalog.areas.listByBusiness(access.businessId),
    ctx.store.inventory.areaProducts.listByBusiness(access.businessId),
  ]);
  const quantity = new Map(stock.map((s) => [s.productId, dbToSignedMicro(s.quantityBase)]));
  const level = new Map(levels.filter((l) => l.warehouseId === warehouse.id).map((l) => [l.productId, l]));
  const areaOf = new Map<string, string>();
  for (const ap of areaProducts) {
    const area = areas.find((a) => a.id === ap.areaId);
    if (area && !area.archivedAt && area.warehouseId === warehouse.id) areaOf.set(ap.productId, area.name);
  }
  const rows: StockRow[] = [];
  for (const product of book.products.values()) {
    const q = quantity.get(product.id) ?? 0n;
    // RF-59: un archivado solo aparece si su existencia no es cero.
    if (product.archivedAt && q === 0n) continue;
    const { name: presentation, factorMilli } = countFactor(book, product);
    const l = level.get(product.id);
    const minMicro = l?.minBase ? dbToMicro(l.minBase) : null;
    const show = (v: string | null | undefined) => (v ? formatMilli(fromBaseMicro(dbToMicro(v), factorMilli)) : null);
    rows.push({
      productId: product.id,
      name: product.name,
      archived: product.archivedAt !== null,
      baseUnit: product.baseUnit,
      presentation,
      quantity: formatStock(q, factorMilli),
      min: show(l?.minBase),
      max: show(l?.maxBase),
      status: stockStatus(q, minMicro),
      area: areaOf.get(product.id) ?? null,
    });
  }
  return { warehouse: warehouseOption(warehouse), rows: rows.sort(byName) };
}

/** RF-58: existencia del producto en cada almacén activo visible desde la sucursal activa. */
export async function productStock(ctx: Ctx, scope: CatalogScope, productId: string): Promise<ProductStockView[]> {
  const access = await inventoryAccess(ctx.store, scope);
  const product = await ctx.store.catalog.products.findById(uuidOrNotFound(productId));
  if (!product || product.businessId !== access.businessId) return [];
  const [book, stock, levels] = await Promise.all([loadBook(ctx.store, access.businessId), ctx.store.inventory.stock.listByProduct(productId), ctx.store.catalog.levels.listByBusiness(access.businessId)]);
  const { factorMilli } = countFactor(book, product);
  return access.visible
    .filter((w) => !w.archivedAt)
    .sort(byName)
    .map((w) => {
      const q = dbToSignedMicro(stock.find((s) => s.warehouseId === w.id)?.quantityBase ?? "0");
      const min = levels.find((l) => l.warehouseId === w.id && l.productId === productId)?.minBase;
      return { warehouseId: w.id, warehouseName: w.name, quantity: formatStock(q, factorMilli), status: stockStatus(q, min ? dbToMicro(min) : null) };
    });
}

/** Para el inicio: cuántos productos están en negativo o bajo mínimo en los almacenes activos visibles. */
export async function stockAlerts(ctx: Ctx, scope: CatalogScope): Promise<{ negative: number; belowMin: number }> {
  const access = await inventoryAccess(ctx.store, scope);
  const ids = access.visible.filter((w) => !w.archivedAt).map((w) => w.id);
  const [stock, levels] = await Promise.all([ctx.store.inventory.stock.listByWarehouses(ids), ctx.store.catalog.levels.listByBusiness(access.businessId)]);
  const minOf = new Map(levels.map((l) => [`${l.warehouseId}:${l.productId}`, l.minBase]));
  let negative = 0;
  let belowMin = 0;
  const seen = new Set<string>();
  for (const s of stock) {
    seen.add(`${s.warehouseId}:${s.productId}`);
    const min = minOf.get(`${s.warehouseId}:${s.productId}`);
    const status = stockStatus(dbToSignedMicro(s.quantityBase), min ? dbToMicro(min) : null);
    if (status === "negative") negative++;
    if (status === "below_min") belowMin++;
  }
  // Sin fila de existencia es cero: también puede estar bajo un mínimo mayor que cero.
  for (const l of levels) if (ids.includes(l.warehouseId) && !seen.has(`${l.warehouseId}:${l.productId}`) && l.minBase && dbToMicro(l.minBase) > 0n) belowMin++;
  return { negative, belowMin };
}
