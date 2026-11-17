// «Datos de compra» de un almacén (spec 013, RF-17 a RF-24): proveedor habitual, presentación de compra, mínimo y
// máximo de muchos productos en una tabla. Lo que se guarda pasa por las mismas reglas del catálogo (spec 003) y
// queda en el registro; una fila con error no impide guardar las demás.
import type { Product, StockLevel } from "@/db/schema";
import { levelsProblem } from "@/domain/catalog/levels";
import { dbToMicro, dbToMilli, formatMilli, fromBaseMicro, microToDb, parseMilli, toBaseMicro, type BaseUnit } from "@/domain/catalog/units";
import { AppError, isAppError } from "../../errors";
import type { Repos } from "../../ports";
import { recordAudit } from "../audit";
import type { Ctx } from "../context";
import { inventoryAccess, movableWarehouse } from "../inventory/shared";
import type { CatalogScope } from "./shared";

export const PURCHASE_DATA_MAX_CHANGES = 1000;

export interface PurchaseRow {
  productId: string;
  name: string;
  baseUnit: BaseUnit;
  area: { id: string; name: string } | null;
  supplierId: string | null;
  /** Presentaciones del producto; `id` nulo = la unidad base. */
  presentations: { id: string | null; name: string | null; factor: string }[];
  purchasePresentationId: string | null;
  /** Existencia, mínimo y máximo en la presentación de compra (o en unidad base), RF-19. */
  stock: string;
  min: string | null;
  max: string | null;
}

export interface PurchaseDataView {
  warehouse: { id: string; name: string };
  rows: PurchaseRow[];
  suppliers: { id: string; name: string }[];
  areas: { id: string; name: string }[];
}

const show = (micro: bigint | null, factorMilli: bigint) => (micro === null ? null : formatMilli(fromBaseMicro(micro, factorMilli)));

async function context(repos: Repos, scope: CatalogScope, warehouseId: unknown) {
  // RF-23: administra el catálogo (inventoryAccess lo exige) y puede mover en el almacén.
  const access = await inventoryAccess(repos, scope);
  const wh = movableWarehouse(scope, access, warehouseId);
  const [products, presentations, suppliers, levels, areas, areaProducts, stock] = await Promise.all([
    repos.catalog.products.listByBusiness(access.businessId),
    repos.catalog.presentations.listByBusiness(access.businessId),
    repos.catalog.suppliers.listByBusiness(access.businessId),
    repos.catalog.levels.listByBusiness(access.businessId),
    repos.catalog.areas.listByBusiness(access.businessId),
    repos.inventory.areaProducts.listByBusiness(access.businessId),
    repos.inventory.stock.listByWarehouses([wh.id]),
  ]);
  return { access, wh, products, presentations, suppliers, levels: levels.filter((l) => l.warehouseId === wh.id), areas: areas.filter((a) => a.warehouseId === wh.id && !a.archivedAt), areaProducts, stock };
}

/** RF-17 y RF-19: productos activos con existencia, nivel o lugar en un área del almacén. */
export async function purchaseData(ctx: Ctx, scope: CatalogScope, warehouseId: unknown): Promise<PurchaseDataView> {
  const c = await context(ctx.store, scope, warehouseId);
  const areaOf = new Map<string, { id: string; name: string }>();
  for (const ap of c.areaProducts) {
    const area = c.areas.find((a) => a.id === ap.areaId);
    if (area && !areaOf.has(ap.productId)) areaOf.set(ap.productId, { id: area.id, name: area.name });
  }
  const level = new Map(c.levels.map((l) => [l.productId, l]));
  const stock = new Map(c.stock.map((s) => [s.productId, s.quantityBase]));
  const rows = c.products
    .filter((p) => !p.archivedAt && (areaOf.has(p.id) || level.has(p.id) || stock.has(p.id)))
    .map((p): PurchaseRow => {
      const presentations = c.presentations.filter((x) => x.productId === p.id);
      const purchase = presentations.find((x) => x.id === p.purchasePresentationId);
      const factor = purchase ? dbToMilli(purchase.factor) : 1000n;
      const l = level.get(p.id);
      return {
        productId: p.id,
        name: p.name,
        baseUnit: p.baseUnit,
        area: areaOf.get(p.id) ?? null,
        supplierId: p.supplierId,
        presentations: [{ id: null, name: null, factor: "1" }, ...presentations.map((x) => ({ id: x.id, name: x.name, factor: formatMilli(dbToMilli(x.factor)) }))],
        purchasePresentationId: purchase?.id ?? null,
        stock: formatMilli(fromBaseMicro(dbToMicro(stock.get(p.id) ?? "0"), factor)),
        min: show(l?.minBase ? dbToMicro(l.minBase) : null, factor),
        max: show(l?.maxBase ? dbToMicro(l.maxBase) : null, factor),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, "es");
  return {
    warehouse: { id: c.wh.id, name: c.wh.name },
    rows,
    suppliers: c.suppliers.filter((s) => !s.archivedAt).map((s) => ({ id: s.id, name: s.name })).sort(byName),
    areas: c.areas.map((a) => ({ id: a.id, name: a.name })).sort(byName),
  };
}

export interface PurchaseChange {
  productId: unknown;
  supplierId?: unknown;
  purchasePresentationId?: unknown;
  min?: unknown;
  max?: unknown;
}

export interface SaveResult {
  saved: number;
  errors: { productId: string; code: string; message: string }[];
}

function amount(raw: unknown): bigint | null {
  if (raw === null || raw === "") return null;
  if (typeof raw !== "string") throw new AppError("invalid_quantity");
  const v = parseMilli(raw);
  if (v === null) throw new AppError("invalid_quantity");
  return v;
}

const optionalId = (raw: unknown): string | null | undefined => {
  if (raw === undefined) return undefined;
  if (raw === null || raw === "") return null;
  if (typeof raw !== "string") throw new AppError("validation");
  return raw;
};

/** RF-18 a RF-21 y RF-24: valida cada fila; guarda las válidas en una transacción y devuelve los errores por fila. */
export async function savePurchaseData(ctx: Ctx, scope: CatalogScope, input: { warehouseId: unknown; changes: unknown }): Promise<SaveResult> {
  if (!Array.isArray(input.changes) || input.changes.length > PURCHASE_DATA_MAX_CHANGES) throw new AppError("validation");
  const changes = input.changes as PurchaseChange[];
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const c = await context(repos, scope, input.warehouseId);
    const products = new Map(c.products.map((p) => [p.id, p]));
    const suppliers = new Map(c.suppliers.map((s) => [s.id, s]));
    const levels = new Map(c.levels.map((l) => [l.productId, l]));
    const errors: SaveResult["errors"] = [];
    let saved = 0;
    for (const change of changes) {
      const productId = typeof change?.productId === "string" ? change.productId : "";
      try {
        const plan = planChange(change, products.get(productId), suppliers, c.presentations, levels.get(productId) ?? null);
        const done = await apply(repos, scope, c.access.businessId, c.wh.id, plan, now);
        // Un mismo producto puede venir dos veces: la siguiente fila parte de lo ya guardado.
        if (done.product) products.set(productId, done.product);
        if (done.level) levels.set(productId, done.level);
        if (done.product || done.level) saved++;
      } catch (e) {
        if (!isAppError(e)) throw e;
        errors.push({ productId, code: e.code, message: e.message });
      }
    }
    return { saved, errors };
  });
}

interface Plan {
  product: Product;
  productPatch: { supplierId?: string | null; purchasePresentationId?: string | null };
  level: StockLevel | null;
  minBase: string | null;
  maxBase: string | null;
  levelChanged: boolean;
}

function planChange(change: PurchaseChange, product: Product | undefined, suppliers: Map<string, { archivedAt: Date | null }>, presentations: { id: string; productId: string; factor: string }[], level: StockLevel | null): Plan {
  if (!product || product.archivedAt) throw new AppError("not_found");
  const productPatch: Plan["productPatch"] = {};
  const supplierId = optionalId(change.supplierId);
  if (supplierId !== undefined && supplierId !== product.supplierId) {
    if (supplierId !== null) {
      const s = suppliers.get(supplierId);
      if (!s) throw new AppError("not_found");
      if (s.archivedAt) throw new AppError("supplier_archived");
    }
    productPatch.supplierId = supplierId;
  }
  const presentationId = optionalId(change.purchasePresentationId);
  if (presentationId !== undefined && presentationId !== product.purchasePresentationId) {
    if (presentationId !== null && !presentations.some((x) => x.id === presentationId && x.productId === product.id)) throw new AppError("not_found");
    productPatch.purchasePresentationId = presentationId;
  }
  // RF-19: mínimo y máximo en la presentación de compra que queda en la fila.
  const finalPresentation = presentationId !== undefined ? presentationId : product.purchasePresentationId;
  const factor = finalPresentation ? dbToMilli(presentations.find((x) => x.id === finalPresentation)!.factor) : 1000n;
  const toDb = (v: bigint | null) => (v === null ? null : microToDb(toBaseMicro(v, factor)));
  let minBase = level?.minBase ?? null;
  let maxBase = level?.maxBase ?? null;
  let levelChanged = false;
  if (change.min !== undefined) {
    const next = toDb(amount(change.min));
    if (!sameQty(next, minBase)) {
      minBase = next;
      levelChanged = true;
    }
  }
  if (change.max !== undefined) {
    const next = toDb(amount(change.max));
    if (!sameQty(next, maxBase)) {
      maxBase = next;
      levelChanged = true;
    }
  }
  // RF-21: el máximo no queda por debajo del mínimo.
  if (levelsProblem(minBase === null ? null : dbToMicro(minBase), maxBase === null ? null : dbToMicro(maxBase)) === "max_below_min") throw new AppError("max_below_min");
  return { product, productPatch, level, minBase, maxBase, levelChanged };
}

const sameQty = (a: string | null, b: string | null) => (a === null || b === null ? a === b : dbToMicro(a) === dbToMicro(b));

async function apply(repos: Repos, scope: CatalogScope, businessId: string, warehouseId: string, plan: Plan, now: Date): Promise<{ product: Product | null; level: StockLevel | null }> {
  const { product, productPatch, level } = plan;
  let after: Product | null = null;
  let saved: StockLevel | null = null;
  if (Object.keys(productPatch).length) {
    after = await repos.catalog.products.update(product.id, { ...productPatch, updatedAt: now });
    await recordAudit(repos.audit, now, {
      actorId: scope.actor.id,
      action: "product.updated",
      entityType: "product",
      entityId: product.id,
      businessId,
      before: { supplierId: product.supplierId, purchasePresentationId: product.purchasePresentationId },
      after: { supplierId: after.supplierId, purchasePresentationId: after.purchasePresentationId, via: "purchase_data" },
    });
  }
  if (plan.levelChanged) {
    saved = await repos.catalog.levels.upsert({ businessId, productId: product.id, warehouseId, minBase: plan.minBase, maxBase: plan.maxBase, updatedBy: scope.actor.id, at: now });
    await recordAudit(repos.audit, now, {
      actorId: scope.actor.id,
      action: "stock_level.set",
      entityType: "stock_level",
      entityId: saved.id,
      businessId,
      before: level ? { minBase: level.minBase, maxBase: level.maxBase } : null,
      after: { productId: product.id, warehouseId, minBase: saved.minBase, maxBase: saved.maxBase, via: "purchase_data" },
    });
  }
  return { product: after, level: saved };
}
