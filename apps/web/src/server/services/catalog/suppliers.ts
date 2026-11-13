// Proveedores del negocio (spec 003, RF-1, RF-27, RF-29, RF-30, RF-33, RF-34, RF-38).
import type { Supplier } from "@/db/schema";
import { AppError } from "../../errors";
import { recordAudit } from "../audit";
import type { Ctx } from "../context";
import { catalogAccess, catalogName, inBusiness, optionalText, withDuplicateGuard, type CatalogScope } from "./shared";

export interface SupplierInput {
  name: string;
  phone?: string | null;
  notes?: string | null;
}

const snapshot = (s: Supplier) => ({ id: s.id, name: s.name, phone: s.phone, notes: s.notes, archivedAt: s.archivedAt });

export async function listSuppliers(ctx: Ctx, scope: CatalogScope): Promise<Supplier[]> {
  const access = await catalogAccess(ctx.store, scope);
  return ctx.store.catalog.suppliers.listByBusiness(access.businessId);
}

export async function createSupplier(ctx: Ctx, scope: CatalogScope, input: SupplierInput): Promise<Supplier> {
  const { name, nameKey } = catalogName(input.name);
  const phone = optionalText(input.phone, 30);
  const notes = optionalText(input.notes, 500);
  const now = ctx.ports.clock.now();
  return withDuplicateGuard(() =>
    ctx.store.transaction(async (repos) => {
      const access = await catalogAccess(repos, scope);
      const all = await repos.catalog.suppliers.listByBusiness(access.businessId);
      if (all.some((s) => !s.archivedAt && s.nameKey === nameKey)) throw new AppError("duplicate_name");
      const supplier = await repos.catalog.suppliers.insert({ businessId: access.businessId, name, nameKey, phone, notes, createdBy: scope.actor.id, createdAt: now });
      await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "supplier.created", entityType: "supplier", entityId: supplier.id, businessId: access.businessId, after: snapshot(supplier) });
      return supplier;
    }),
  );
}

export async function updateSupplier(ctx: Ctx, scope: CatalogScope, id: string, input: Partial<SupplierInput>): Promise<Supplier> {
  const named = input.name === undefined ? undefined : catalogName(input.name);
  const patch = {
    ...(named ?? {}),
    ...(input.phone !== undefined ? { phone: optionalText(input.phone, 30) } : {}),
    ...(input.notes !== undefined ? { notes: optionalText(input.notes, 500) } : {}),
  };
  if (Object.keys(patch).length === 0) throw new AppError("nothing_to_update");
  const now = ctx.ports.clock.now();
  return withDuplicateGuard(() =>
    ctx.store.transaction(async (repos) => {
      const access = await catalogAccess(repos, scope);
      const before = inBusiness(await repos.catalog.suppliers.findById(id), access);
      if (named && !before.archivedAt) {
        const all = await repos.catalog.suppliers.listByBusiness(access.businessId);
        if (all.some((s) => s.id !== id && !s.archivedAt && s.nameKey === named.nameKey)) throw new AppError("duplicate_name");
      }
      const after = await repos.catalog.suppliers.update(id, { ...patch, updatedAt: now });
      await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "supplier.updated", entityType: "supplier", entityId: id, businessId: access.businessId, before: snapshot(before), after: snapshot(after) });
      return after;
    }),
  );
}
