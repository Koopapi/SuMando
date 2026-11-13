// Almacenes y áreas (spec 003, RF-2, RF-3, RF-5, RF-7, RF-18 a RF-21, RF-38).
import type { Area, Warehouse } from "@/db/schema";
import { isOwner } from "@/domain/access/owner";
import { AppError } from "../../errors";
import type { Repos } from "../../ports";
import { recordAudit } from "../audit";
import type { Ctx } from "../context";
import { assertBranch, businessLock, catalogAccess, catalogName, inBusiness, withDuplicateGuard, type CatalogScope } from "./shared";

const warehouseSnapshot = (w: Warehouse) => ({ id: w.id, branchId: w.branchId, name: w.name, archivedAt: w.archivedAt });
const areaSnapshot = (a: Area) => ({ id: a.id, branchId: a.branchId, name: a.name, responsibleId: a.responsibleId, archivedAt: a.archivedAt });

/** RF-20: uno de sucursal choca con los de su sucursal y los del negocio; uno del negocio, con cualquiera. */
export function warehouseClash(all: Warehouse[], candidate: { id?: string; branchId: string | null; nameKey: string }): boolean {
  return all.some((w) => w.id !== candidate.id && !w.archivedAt && w.nameKey === candidate.nameKey && (candidate.branchId === null || w.branchId === null || w.branchId === candidate.branchId));
}

/** Lo que ve la sucursal activa: sus almacenes y los del negocio completo (RF-5). */
export async function listWarehouses(ctx: Ctx, scope: CatalogScope): Promise<Warehouse[]> {
  const access = await catalogAccess(ctx.store, scope);
  return (await ctx.store.catalog.warehouses.listByBusiness(access.businessId)).filter((w) => w.branchId === null || w.branchId === scope.active.branch.id);
}

export async function listAreas(ctx: Ctx, scope: CatalogScope): Promise<Area[]> {
  const access = await catalogAccess(ctx.store, scope);
  return (await ctx.store.catalog.areas.listByBusiness(access.businessId)).filter((a) => a.branchId === scope.active.branch.id);
}

export async function createWarehouse(ctx: Ctx, scope: CatalogScope, input: { name: string; scope: unknown }): Promise<Warehouse> {
  if (input.scope !== "branch" && input.scope !== "business") throw new AppError("validation");
  const { name, nameKey } = catalogName(input.name);
  const branchId = input.scope === "branch" ? scope.active.branch.id : null;
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(
    async (repos) => {
      const access = await catalogAccess(repos, scope);
      assertBranch(scope, access, branchId);
      if (warehouseClash(await repos.catalog.warehouses.listByBusiness(access.businessId), { branchId, nameKey })) throw new AppError("duplicate_name");
      const warehouse = await repos.catalog.warehouses.insert({ businessId: access.businessId, branchId, name, nameKey, createdBy: scope.actor.id, createdAt: now });
      await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "warehouse.created", entityType: "warehouse", entityId: warehouse.id, businessId: access.businessId, branchId, after: warehouseSnapshot(warehouse) });
      return warehouse;
    },
    { lock: businessLock(scope.active.business.id) },
  );
}

export async function renameWarehouse(ctx: Ctx, scope: CatalogScope, id: string, input: { name: string }): Promise<Warehouse> {
  const { name, nameKey } = catalogName(input.name);
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(
    async (repos) => {
      const access = await catalogAccess(repos, scope);
      const before = inBusiness(await repos.catalog.warehouses.findById(id), access);
      assertBranch(scope, access, before.branchId);
      if (!before.archivedAt && warehouseClash(await repos.catalog.warehouses.listByBusiness(access.businessId), { id, branchId: before.branchId, nameKey })) throw new AppError("duplicate_name");
      const after = await repos.catalog.warehouses.update(id, { name, nameKey, updatedAt: now });
      await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "warehouse.renamed", entityType: "warehouse", entityId: id, businessId: access.businessId, branchId: before.branchId, before: warehouseSnapshot(before), after: warehouseSnapshot(after) });
      return after;
    },
    { lock: businessLock(scope.active.business.id) },
  );
}

/** Candidatos a responsable de un área (RF-19): dueños activos y administradores activos de esa sucursal. */
export async function responsibleCandidates(repos: Repos, branchId: string): Promise<{ id: string; name: string }[]> {
  const [users, memberships] = await Promise.all([repos.users.list(), repos.memberships.listAll()]);
  const withBranch = new Set(memberships.filter((m) => m.branchId === branchId).map((m) => m.userId));
  return users.filter((u) => u.isActive && (isOwner(u) || withBranch.has(u.id))).map((u) => ({ id: u.id, name: u.name }));
}

export async function listResponsibleCandidates(ctx: Ctx, scope: CatalogScope) {
  await catalogAccess(ctx.store, scope);
  return responsibleCandidates(ctx.store, scope.active.branch.id);
}

async function checkResponsible(repos: Repos, branchId: string, responsibleId: unknown): Promise<string> {
  const candidates = await responsibleCandidates(repos, branchId);
  if (typeof responsibleId !== "string" || !candidates.some((c) => c.id === responsibleId)) throw new AppError("invalid_responsible");
  return responsibleId;
}

export async function createArea(ctx: Ctx, scope: CatalogScope, input: { name: string; responsibleId: unknown }): Promise<Area> {
  const { name, nameKey } = catalogName(input.name);
  const branchId = scope.active.branch.id;
  const now = ctx.ports.clock.now();
  return withDuplicateGuard(() =>
    ctx.store.transaction(async (repos) => {
      const access = await catalogAccess(repos, scope);
      assertBranch(scope, access, branchId);
      const responsibleId = await checkResponsible(repos, branchId, input.responsibleId);
      const all = await repos.catalog.areas.listByBusiness(access.businessId);
      if (all.some((a) => !a.archivedAt && a.branchId === branchId && a.nameKey === nameKey)) throw new AppError("duplicate_name");
      const area = await repos.catalog.areas.insert({ businessId: access.businessId, branchId, name, nameKey, responsibleId, createdBy: scope.actor.id, createdAt: now });
      await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "area.created", entityType: "area", entityId: area.id, businessId: access.businessId, branchId, after: areaSnapshot(area) });
      return area;
    }),
  );
}

export async function updateArea(ctx: Ctx, scope: CatalogScope, id: string, input: { name?: string; responsibleId?: unknown }): Promise<Area> {
  const named = input.name === undefined ? undefined : catalogName(input.name);
  if (!named && input.responsibleId === undefined) throw new AppError("nothing_to_update");
  const now = ctx.ports.clock.now();
  return withDuplicateGuard(() =>
    ctx.store.transaction(async (repos) => {
      const access = await catalogAccess(repos, scope);
      const before = inBusiness(await repos.catalog.areas.findById(id), access);
      assertBranch(scope, access, before.branchId);
      if (named && !before.archivedAt) {
        const all = await repos.catalog.areas.listByBusiness(access.businessId);
        if (all.some((a) => a.id !== id && !a.archivedAt && a.branchId === before.branchId && a.nameKey === named.nameKey)) throw new AppError("duplicate_name");
      }
      const responsibleId = input.responsibleId === undefined ? undefined : await checkResponsible(repos, before.branchId, input.responsibleId);
      const after = await repos.catalog.areas.update(id, { ...(named ?? {}), ...(responsibleId ? { responsibleId } : {}), updatedAt: now });
      await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "area.updated", entityType: "area", entityId: id, businessId: access.businessId, branchId: before.branchId, before: areaSnapshot(before), after: areaSnapshot(after) });
      return after;
    }),
  );
}
