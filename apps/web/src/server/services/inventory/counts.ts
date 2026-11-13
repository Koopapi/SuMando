// Áreas de conteo y conteo físico (spec 005, RF-39 a RF-54). La lista de cada área se cuenta en un almacén; al
// aplicar, la existencia queda en lo contado y la diferencia queda como movimiento de conteo.
import type { Area, InventoryCount } from "@/db/schema";
import { changedSinceOpened, countResult } from "@/domain/inventory/count";
import { dbToSignedMicro, formatStock, lineToBase, parseCountQuantity, signedMicroToDb } from "@/domain/inventory/quantities";
import { AppError } from "../../errors";
import type { Repos } from "../../ports";
import { recordAudit } from "../audit";
import { assertBranch, businessLock, type CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";
import { applyMovement } from "./movements";
import { productOption } from "./stock";
import { uuidOrNotFound, countFactor, inventoryAccess, loadBook, movableWarehouse, presentationFactor, visibleWarehouse, type InventoryAccess } from "./shared";
import type { AreaCountView, CountSheetLine, ProductOption } from "./views";

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, "es");

/** Un área de la sucursal activa; de otra, no existe (RF-5). */
async function ownArea(repos: Repos, scope: CatalogScope, access: InventoryAccess, id: string): Promise<Area> {
  const area = await repos.catalog.areas.findById(uuidOrNotFound(id));
  if (!area || area.businessId !== access.businessId || area.branchId !== scope.active.branch.id) throw new AppError("not_found");
  return area;
}

export interface AreaSetupView {
  area: { id: string; name: string; archived: boolean; warehouseId: string | null };
  warehouses: { id: string; name: string }[];
  products: ProductOption[];
  /** La lista actual, en orden. */
  productIds: string[];
  /** Productos que ya se cuentan en otra área activa, por almacén (RF-41). */
  taken: Record<string, Record<string, string>>;
}

export async function areaSetup(ctx: Ctx, scope: CatalogScope, id: string): Promise<AreaSetupView> {
  const access = await inventoryAccess(ctx.store, scope);
  const area = await ownArea(ctx.store, scope, access, id);
  const [book, areas, all] = await Promise.all([loadBook(ctx.store, access.businessId), ctx.store.catalog.areas.listByBusiness(access.businessId), ctx.store.inventory.areaProducts.listByBusiness(access.businessId)]);
  const taken: Record<string, Record<string, string>> = {};
  for (const ap of all) {
    const other = areas.find((a) => a.id === ap.areaId);
    if (!other || other.id === area.id || other.archivedAt || !other.warehouseId) continue;
    (taken[other.warehouseId] ??= {})[ap.productId] = other.name;
  }
  const productIds = all.filter((ap) => ap.areaId === area.id).map((ap) => ap.productId);
  return {
    area: { id: area.id, name: area.name, archived: area.archivedAt !== null, warehouseId: area.warehouseId },
    warehouses: access.visible.filter((w) => !w.archivedAt).sort(byName).map((w) => ({ id: w.id, name: w.name })),
    products: [...book.products.values()].filter((p) => !p.archivedAt || productIds.includes(p.id)).map((p) => productOption(book, p)).sort(byName),
    productIds,
    taken,
  };
}

/** RF-39 a RF-41: almacén y lista ordenada del área; un producto solo en un área activa por almacén. */
export async function setAreaProducts(ctx: Ctx, scope: CatalogScope, id: string, input: { warehouseId: unknown; productIds: unknown }): Promise<Area> {
  if (!Array.isArray(input.productIds) || input.productIds.some((p) => typeof p !== "string") || input.productIds.length > 1000) throw new AppError("validation");
  const productIds = input.productIds as string[];
  if (new Set(productIds).size !== productIds.length) throw new AppError("validation");
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(
    async (repos) => {
      const access = await inventoryAccess(repos, scope);
      const area = await ownArea(repos, scope, access, id);
      assertBranch(scope, access, area.branchId);
      if (area.archivedAt) throw new AppError("archived_item", { name: area.name });
      const wh = visibleWarehouse(access, input.warehouseId);
      if (wh.archivedAt) throw new AppError("archived_item", { name: wh.name });
      const [book, areas, all] = await Promise.all([loadBook(repos, access.businessId), repos.catalog.areas.listByBusiness(access.businessId), repos.inventory.areaProducts.listByBusiness(access.businessId)]);
      const before = all.filter((ap) => ap.areaId === area.id).map((ap) => ap.productId);
      for (const pid of productIds) {
        const product = book.products.get(pid);
        if (!product) throw new AppError("not_found");
        if (product.archivedAt && !before.includes(pid)) throw new AppError("archived_item", { name: product.name });
        const clash = all.find((ap) => ap.productId === pid && ap.areaId !== area.id && areas.some((a) => a.id === ap.areaId && !a.archivedAt && a.warehouseId === wh.id));
        if (clash) throw new AppError("product_in_area", { product: product.name, area: areas.find((a) => a.id === clash.areaId)!.name });
      }
      const after = await repos.catalog.areas.update(area.id, { warehouseId: wh.id, updatedAt: now });
      await repos.inventory.areaProducts.replace(area.id, productIds);
      await recordAudit(repos.audit, now, {
        actorId: scope.actor.id,
        action: "area.products_set",
        entityType: "area",
        entityId: area.id,
        businessId: access.businessId,
        branchId: area.branchId,
        before: { warehouseId: area.warehouseId, productIds: before },
        after: { warehouseId: wh.id, productIds },
      });
      return after;
    },
    { lock: businessLock(scope.active.business.id) },
  );
}

export interface CountBoardView {
  areas: AreaCountView[];
  /** RF-42: productos activos sin área activa, por almacén activo visible. */
  withoutArea: { warehouseId: string; warehouseName: string; products: string[] }[];
}

/** RF-54 y RF-42: áreas de la sucursal con su almacén, cuántos productos, último conteo, y lo que no tiene área. */
export async function countBoard(ctx: Ctx, scope: CatalogScope): Promise<CountBoardView> {
  const access = await inventoryAccess(ctx.store, scope);
  const [book, areas, all, users] = await Promise.all([loadBook(ctx.store, access.businessId), ctx.store.catalog.areas.listByBusiness(access.businessId), ctx.store.inventory.areaProducts.listByBusiness(access.businessId), ctx.store.users.list()]);
  const mine = areas.filter((a) => a.branchId === scope.active.branch.id && !a.archivedAt).sort(byName);
  const lastCounts = await ctx.store.inventory.counts.lastByAreas(mine.map((a) => a.id));
  const active = [...book.products.values()].filter((p) => !p.archivedAt);
  const views: AreaCountView[] = mine.map((a) => {
    const wh = a.warehouseId ? access.visible.find((w) => w.id === a.warehouseId) : undefined;
    const lc = lastCounts.find((c) => c.areaId === a.id);
    return {
      id: a.id,
      name: a.name,
      responsible: users.find((u) => u.id === a.responsibleId)?.name ?? "",
      warehouse: wh ? { id: wh.id, name: wh.name } : null,
      products: all.filter((ap) => ap.areaId === a.id && active.some((p) => p.id === ap.productId)).length,
      lastCount: lc ? { at: lc.createdAt.toISOString(), author: lc.authorName } : null,
    };
  });
  const withoutArea = access.visible
    .filter((w) => !w.archivedAt)
    .sort(byName)
    .map((w) => {
      const counted = new Set(all.filter((ap) => areas.some((a) => a.id === ap.areaId && !a.archivedAt && a.warehouseId === w.id)).map((ap) => ap.productId));
      return { warehouseId: w.id, warehouseName: w.name, products: active.filter((p) => !counted.has(p.id)).map((p) => p.name).sort((x, y) => x.localeCompare(y, "es")) };
    });
  return { areas: views, withoutArea };
}

export interface CountSheetView {
  area: { id: string; name: string };
  warehouse: { id: string; name: string };
  lines: CountSheetLine[];
}

/** RF-44: productos activos del área en su orden, con lo esperado en la presentación de conteo. */
export async function countSheet(ctx: Ctx, scope: CatalogScope, areaId: string): Promise<CountSheetView> {
  const access = await inventoryAccess(ctx.store, scope);
  const area = await ownArea(ctx.store, scope, access, areaId);
  if (area.archivedAt) throw new AppError("archived_item", { name: area.name });
  if (!area.warehouseId) throw new AppError("area_without_warehouse");
  const wh = movableWarehouse(scope, access, area.warehouseId);
  const [book, list, stock] = await Promise.all([loadBook(ctx.store, access.businessId), ctx.store.inventory.areaProducts.listByArea(area.id), ctx.store.inventory.stock.listByWarehouses([wh.id])]);
  const lines: CountSheetLine[] = [];
  for (const ap of list) {
    const p = book.products.get(ap.productId);
    if (!p || p.archivedAt) continue;
    const q = dbToSignedMicro(stock.find((s) => s.productId === p.id)?.quantityBase ?? "0");
    const opt = productOption(book, p);
    lines.push({ productId: p.id, name: p.name, baseUnit: p.baseUnit, presentation: opt.presentation, presentations: opt.presentations, countPresentationId: p.countPresentationId, expected: formatStock(q, countFactor(book, p).factorMilli), seen: signedMicroToDb(q) });
  }
  return { area: { id: area.id, name: area.name }, warehouse: { id: wh.id, name: wh.name }, lines };
}

export interface CountLineInput {
  productId: string;
  presentationId?: string | null;
  quantity: string;
  seen: string;
}

/** RF-43, RF-49 a RF-53: aplica lo capturado; si la existencia cambió desde que se abrió, pide confirmar (RF-51). */
export async function applyCount(ctx: Ctx, scope: CatalogScope, input: { areaId: unknown; lines: unknown; confirm?: unknown }): Promise<InventoryCount> {
  if (typeof input.areaId !== "string" || !Array.isArray(input.lines)) throw new AppError("validation");
  const raw = input.lines as CountLineInput[];
  if (raw.length === 0) throw new AppError("movement_empty");
  if (raw.length > 1000 || raw.some((l) => !l || typeof l.productId !== "string" || typeof l.quantity !== "string" || typeof l.seen !== "string")) throw new AppError("validation");
  if (new Set(raw.map((l) => l.productId)).size !== raw.length) throw new AppError("validation");
  const areaId = input.areaId;
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const access = await inventoryAccess(repos, scope);
    const area = await ownArea(repos, scope, access, areaId);
    if (area.archivedAt) throw new AppError("archived_item", { name: area.name });
    if (!area.warehouseId) throw new AppError("area_without_warehouse");
    const wh = movableWarehouse(scope, access, area.warehouseId);
    const [book, list] = await Promise.all([loadBook(repos, access.businessId), repos.inventory.areaProducts.listByArea(area.id)]);
    const inArea = new Set(list.map((ap) => ap.productId));
    const counted = raw.map((l) => {
      const product = book.products.get(l.productId);
      if (!product || !inArea.has(product.id)) throw new AppError("not_found");
      if (product.archivedAt) throw new AppError("archived_item", { name: product.name });
      const qty = parseCountQuantity(l.quantity);
      if (qty === null) throw new AppError("invalid_quantity");
      if (!/^-?\d+(\.\d{1,6})?$/.test(l.seen)) throw new AppError("validation");
      return { productId: product.id, countedMicro: lineToBase(qty, presentationFactor(book, product, l.presentationId)), seenMicro: dbToSignedMicro(l.seen) };
    });
    const locked = await repos.inventory.stock.lock(access.businessId, wh.id, counted.map((c) => c.productId), now);
    const current = new Map([...locked].map(([k, v]) => [k, dbToSignedMicro(v)]));
    const changed = changedSinceOpened(counted, current);
    if (changed.length && input.confirm !== true) throw new AppError("count_changed", { products: changed.map((c) => book.products.get(c.productId)!.name).join(", ") });
    const result = countResult(counted, current);
    const count = await repos.inventory.counts.insert({
      businessId: access.businessId,
      branchId: area.branchId,
      areaId: area.id,
      warehouseId: wh.id,
      createdBy: scope.actor.id,
      createdAt: now,
      lines: result.map((r) => ({ productId: r.productId, expectedBase: signedMicroToDb(r.expectedMicro), countedBase: signedMicroToDb(r.countedMicro), differenceBase: signedMicroToDb(r.differenceMicro) })),
    });
    const diffs = result.filter((r) => r.differenceMicro !== 0n);
    if (diffs.length) await applyMovement(repos, wh, { kind: "count", countId: count.id, createdBy: scope.actor.id, createdAt: now }, diffs.map((r) => ({ productId: r.productId, deltaMicro: r.differenceMicro })));
    return count;
  });
}
