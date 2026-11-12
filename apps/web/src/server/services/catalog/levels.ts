// Mínimo y máximo de un producto en un almacén (spec 003, RF-22 a RF-26, RF-36, RF-38).
import type { StockLevel } from "@/db/schema";
import { levelsProblem } from "@/domain/catalog/levels";
import { microToDb, parseMilli, toBaseMicro, dbToMilli } from "@/domain/catalog/units";
import { AppError } from "../../errors";
import { recordAudit } from "../audit";
import type { Ctx } from "../context";
import { assertBranch, catalogAccess, inBusiness, type CatalogScope } from "./shared";

export interface LevelInput {
  warehouseId: string;
  /** Presentación en la que se capturó; nulo o ausente = la unidad base (RF-23). */
  presentationId?: string | null;
  min?: string | null;
  max?: string | null;
}

function quantity(raw: string | null | undefined): bigint | null {
  if (raw === null || raw === undefined || raw.trim() === "") return null;
  const v = parseMilli(raw);
  if (v === null) throw new AppError("invalid_quantity");
  return v;
}

export async function setLevel(ctx: Ctx, scope: CatalogScope, productId: string, input: LevelInput): Promise<StockLevel> {
  const min = quantity(input.min);
  const max = quantity(input.max);
  const problem = levelsProblem(min, max);
  if (problem === "max_below_min") throw new AppError("max_below_min");
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const access = await catalogAccess(repos, scope);
    const product = inBusiness(await repos.catalog.products.findById(productId), access);
    const warehouse = inBusiness(await repos.catalog.warehouses.findById(input.warehouseId), access);
    assertBranch(scope, access, warehouse.branchId);
    // RF-22 y RF-33: solo en almacenes activos.
    if (warehouse.archivedAt) throw new AppError("not_found");
    let factor = 1000n;
    if (input.presentationId) {
      const presentation = await repos.catalog.presentations.findById(input.presentationId);
      if (!presentation || presentation.productId !== product.id) throw new AppError("not_found");
      factor = dbToMilli(presentation.factor);
    }
    const toDb = (v: bigint | null) => (v === null ? null : microToDb(toBaseMicro(v, factor)));
    const before = await repos.catalog.levels.find(product.id, warehouse.id);
    const level = await repos.catalog.levels.upsert({ businessId: access.businessId, productId: product.id, warehouseId: warehouse.id, minBase: toDb(min), maxBase: toDb(max), updatedBy: scope.actor.id, at: now });
    await recordAudit(repos.audit, now, {
      actorId: scope.actor.id,
      action: "stock_level.set",
      entityType: "stock_level",
      entityId: level.id,
      businessId: access.businessId,
      branchId: warehouse.branchId,
      before: before ? { minBase: before.minBase, maxBase: before.maxBase } : null,
      after: { productId: product.id, warehouseId: warehouse.id, minBase: level.minBase, maxBase: level.maxBase },
    });
    return level;
  });
}
