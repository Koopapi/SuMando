// Archivar y reactivar (spec 003, RF-33, RF-34, RF-35, RF-36, RF-37, RF-38): nada se borra. Reactivar se rechaza si
// el nombre ya lo usa otro elemento activo.
import { AppError } from "../../errors";
import type { Repos } from "../../ports";
import { recordAudit, type AuditInput } from "../audit";
import type { Ctx } from "../context";
import { warehouseClash } from "./places";
import { assertBranch, businessLock, catalogAccess, inBusiness, type CatalogAccess, type CatalogScope } from "./shared";

export const CATALOG_KINDS = ["products", "suppliers", "warehouses", "areas"] as const;
export type CatalogKind = (typeof CATALOG_KINDS)[number];
export const isCatalogKind = (v: string): v is CatalogKind => (CATALOG_KINDS as readonly string[]).includes(v);

const ENTITY: Record<CatalogKind, AuditInput["entityType"]> = { products: "product", suppliers: "supplier", warehouses: "warehouse", areas: "area" };

interface Archivable {
  id: string;
  businessId: string;
  name: string;
  nameKey: string;
  archivedAt: Date | null;
  branchId?: string | null;
}

async function clashes(repos: Repos, access: CatalogAccess, kind: CatalogKind, item: Archivable): Promise<boolean> {
  const c = repos.catalog;
  if (kind === "warehouses") return warehouseClash(await c.warehouses.listByBusiness(access.businessId), { id: item.id, branchId: item.branchId ?? null, nameKey: item.nameKey });
  const all: Archivable[] = await c[kind].listByBusiness(access.businessId);
  return all.some((o) => o.id !== item.id && !o.archivedAt && o.nameKey === item.nameKey && (kind !== "areas" || o.branchId === item.branchId));
}

export async function setArchived(ctx: Ctx, scope: CatalogScope, kind: CatalogKind, id: string, archived: boolean): Promise<Archivable> {
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(
    async (repos) => {
      const access = await catalogAccess(repos, scope);
      const repo = repos.catalog[kind] as unknown as { findById(id: string): Promise<Archivable | null>; update(id: string, patch: { archivedAt: Date | null; updatedAt: Date }): Promise<Archivable> };
      const before = inBusiness(await repo.findById(id), access);
      if (kind === "warehouses" || kind === "areas") assertBranch(scope, access, before.branchId ?? null);
      if ((before.archivedAt !== null) === archived) return before;
      if (!archived && (await clashes(repos, access, kind, before))) throw new AppError("duplicate_name");
      const after = await repo.update(id, { archivedAt: archived ? now : null, updatedAt: now });
      await recordAudit(repos.audit, now, {
        actorId: scope.actor.id,
        action: `${ENTITY[kind]}.${archived ? "archived" : "reactivated"}`,
        entityType: ENTITY[kind],
        entityId: id,
        businessId: access.businessId,
        branchId: before.branchId ?? null,
        before: { name: before.name, archivedAt: before.archivedAt },
        after: { name: after.name, archivedAt: after.archivedAt },
      });
      return after;
    },
    { lock: businessLock(scope.active.business.id) },
  );
}
