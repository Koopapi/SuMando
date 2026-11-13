// Productos y presentaciones (spec 003, RF-9 a RF-17, RF-28, RF-35, RF-38).
import type { Product, ProductPresentation } from "@/db/schema";
import { isBaseUnit, milliToDb, parseFactor, type BaseUnit } from "@/domain/catalog/units";
import { AppError } from "../../errors";
import type { Repos } from "../../ports";
import { recordAudit } from "../audit";
import type { Ctx } from "../context";
import { catalogAccess, catalogName, inBusiness, optionalText, withDuplicateGuard, type CatalogAccess, type CatalogScope } from "./shared";

export interface ProductInput {
  name: string;
  baseUnit: unknown;
  supplierId?: string | null;
  notes?: string | null;
}

export interface ProductPatchInput {
  name?: string;
  baseUnit?: unknown;
  supplierId?: string | null;
  notes?: string | null;
  purchasePresentationId?: string | null;
  countPresentationId?: string | null;
}

/** Nombres que ya usa la presentación implícita de unidad base (RF-12): no se repiten (RF-14). */
const BASE_NAMES: Record<BaseUnit, string[]> = { g: ["g", "gramo", "gramos"], ml: ["ml", "mililitro", "mililitros"], pz: ["pz", "pieza", "piezas"] };

const snapshot = (p: Product) => ({
  id: p.id,
  name: p.name,
  baseUnit: p.baseUnit,
  supplierId: p.supplierId,
  notes: p.notes,
  purchasePresentationId: p.purchasePresentationId,
  countPresentationId: p.countPresentationId,
  archivedAt: p.archivedAt,
});
const presentationSnapshot = (p: ProductPresentation) => ({ id: p.id, productId: p.productId, name: p.name, factor: p.factor });

/** Proveedor habitual: del mismo negocio (RF-28) y activo para una asignación nueva (RF-35). */
async function checkSupplier(repos: Repos, access: CatalogAccess, supplierId: string | null | undefined): Promise<string | null> {
  if (!supplierId) return null;
  const supplier = inBusiness(await repos.catalog.suppliers.findById(supplierId), access);
  if (supplier.archivedAt) throw new AppError("supplier_archived");
  return supplier.id;
}

export async function createProduct(ctx: Ctx, scope: CatalogScope, input: ProductInput): Promise<Product> {
  const { name, nameKey } = catalogName(input.name);
  if (!isBaseUnit(input.baseUnit)) throw new AppError("invalid_unit");
  const baseUnit = input.baseUnit;
  const notes = optionalText(input.notes, 500);
  const now = ctx.ports.clock.now();
  return withDuplicateGuard(() =>
    ctx.store.transaction(async (repos) => {
      const access = await catalogAccess(repos, scope);
      const supplierId = await checkSupplier(repos, access, input.supplierId);
      const all = await repos.catalog.products.listByBusiness(access.businessId);
      if (all.some((p) => !p.archivedAt && p.nameKey === nameKey)) throw new AppError("duplicate_name");
      const product = await repos.catalog.products.insert({ businessId: access.businessId, name, nameKey, baseUnit, supplierId, notes, createdBy: scope.actor.id, createdAt: now });
      await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "product.created", entityType: "product", entityId: product.id, businessId: access.businessId, after: snapshot(product) });
      return product;
    }),
  );
}

export async function updateProduct(ctx: Ctx, scope: CatalogScope, id: string, input: ProductPatchInput): Promise<Product> {
  const named = input.name === undefined ? undefined : catalogName(input.name);
  const now = ctx.ports.clock.now();
  return withDuplicateGuard(() =>
    ctx.store.transaction(async (repos) => {
      const access = await catalogAccess(repos, scope);
      const before = inBusiness(await repos.catalog.products.findById(id), access);
      // RF-16: la unidad base no cambia; se archiva el producto y se da de alta otro.
      if (input.baseUnit !== undefined && input.baseUnit !== before.baseUnit) throw new AppError("base_unit_locked");
      const patch: Parameters<Repos["catalog"]["products"]["update"]>[1] = { updatedAt: now };
      if (named) {
        if (!before.archivedAt) {
          const all = await repos.catalog.products.listByBusiness(access.businessId);
          if (all.some((p) => p.id !== id && !p.archivedAt && p.nameKey === named.nameKey)) throw new AppError("duplicate_name");
        }
        Object.assign(patch, named);
      }
      if (input.notes !== undefined) patch.notes = optionalText(input.notes, 500);
      // RF-35: conservar el proveedor archivado que ya tenía no es una asignación nueva.
      if (input.supplierId !== undefined && input.supplierId !== before.supplierId) patch.supplierId = await checkSupplier(repos, access, input.supplierId);
      for (const key of ["purchasePresentationId", "countPresentationId"] as const) {
        const value = input[key];
        if (value === undefined) continue;
        if (value !== null) {
          const presentation = await repos.catalog.presentations.findById(value);
          if (!presentation || presentation.productId !== id) throw new AppError("not_found");
        }
        patch[key] = value;
      }
      if (Object.keys(patch).length === 1) throw new AppError("nothing_to_update");
      const after = await repos.catalog.products.update(id, patch);
      await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "product.updated", entityType: "product", entityId: id, businessId: access.businessId, before: snapshot(before), after: snapshot(after) });
      return after;
    }),
  );
}

function checkPresentationName(product: Product, others: ProductPresentation[], nameKey: string, selfId?: string) {
  if (BASE_NAMES[product.baseUnit].includes(nameKey)) throw new AppError("duplicate_name");
  if (others.some((p) => p.id !== selfId && p.nameKey === nameKey)) throw new AppError("duplicate_name");
}

function factorOf(raw: string): string {
  const factor = parseFactor(raw);
  if (factor === null) throw new AppError("invalid_factor");
  return milliToDb(factor);
}

export async function addPresentation(ctx: Ctx, scope: CatalogScope, productId: string, input: { name: string; factor: string }): Promise<ProductPresentation> {
  const { name, nameKey } = catalogName(input.name);
  const factor = factorOf(input.factor);
  const now = ctx.ports.clock.now();
  return withDuplicateGuard(() =>
    ctx.store.transaction(async (repos) => {
      const access = await catalogAccess(repos, scope);
      const product = inBusiness(await repos.catalog.products.findById(productId), access);
      checkPresentationName(product, await repos.catalog.presentations.listByProduct(product.id), nameKey);
      const presentation = await repos.catalog.presentations.insert({ productId: product.id, name, nameKey, factor, createdBy: scope.actor.id, createdAt: now });
      await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "presentation.created", entityType: "presentation", entityId: presentation.id, businessId: access.businessId, after: presentationSnapshot(presentation) });
      return presentation;
    }),
  );
}

/** RF-17: cambiar la equivalencia no toca los mínimos guardados en unidad base; solo cambia cómo se muestran. */
export async function updatePresentation(ctx: Ctx, scope: CatalogScope, id: string, input: { name?: string; factor?: string }): Promise<ProductPresentation> {
  const named = input.name === undefined ? undefined : catalogName(input.name);
  const factor = input.factor === undefined ? undefined : factorOf(input.factor);
  if (!named && factor === undefined) throw new AppError("nothing_to_update");
  const now = ctx.ports.clock.now();
  return withDuplicateGuard(() =>
    ctx.store.transaction(async (repos) => {
      const access = await catalogAccess(repos, scope);
      const before = await repos.catalog.presentations.findById(id);
      if (!before) throw new AppError("not_found");
      const product = inBusiness(await repos.catalog.products.findById(before.productId), access);
      if (named) checkPresentationName(product, await repos.catalog.presentations.listByProduct(product.id), named.nameKey, id);
      const after = await repos.catalog.presentations.update(id, { ...(named ?? {}), ...(factor !== undefined ? { factor } : {}), updatedAt: now });
      await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "presentation.updated", entityType: "presentation", entityId: id, businessId: access.businessId, before: presentationSnapshot(before), after: presentationSnapshot(after) });
      return after;
    }),
  );
}
