// Puestos del negocio (spec 008, RF-10, RF-11).
import type { Position } from "@/db/schema";
import { AppError } from "../../errors";
import { recordAudit } from "../audit";
import { businessLock, catalogName, inBusiness, type CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";
import { uuidOrNotFound } from "../inventory/shared";
import { personnelAccess } from "./shared";

export interface PositionView {
  id: string;
  name: string;
  archived: boolean;
}

const view = (p: Position): PositionView => ({ id: p.id, name: p.name, archived: p.archivedAt !== null });

export async function listPositions(ctx: Ctx, scope: CatalogScope): Promise<PositionView[]> {
  const access = await personnelAccess(ctx.store, scope);
  return (await ctx.store.personnel.positions.listByBusiness(access.businessId)).map(view);
}

export async function createPosition(ctx: Ctx, scope: CatalogScope, rawName: string): Promise<PositionView> {
  const { name, nameKey } = catalogName(rawName);
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(
    async (repos) => {
      const access = await personnelAccess(repos, scope);
      if ((await repos.personnel.positions.listByBusiness(access.businessId)).some((p) => !p.archivedAt && p.nameKey === nameKey)) throw new AppError("duplicate_name");
      const p = await repos.personnel.positions.insert({ businessId: access.businessId, name, nameKey, createdBy: scope.actor.id, createdAt: now });
      await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "position.created", entityType: "position", entityId: p.id, businessId: access.businessId, after: { name } });
      return view(p);
    },
    { lock: businessLock(scope.active.business.id) },
  );
}

export async function renamePosition(ctx: Ctx, scope: CatalogScope, id: string, rawName: string): Promise<PositionView> {
  const { name, nameKey } = catalogName(rawName);
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(
    async (repos) => {
      const access = await personnelAccess(repos, scope);
      const before = inBusiness(await repos.personnel.positions.findById(uuidOrNotFound(id)), access);
      if (!before.archivedAt && (await repos.personnel.positions.listByBusiness(access.businessId)).some((p) => p.id !== id && !p.archivedAt && p.nameKey === nameKey)) throw new AppError("duplicate_name");
      const after = await repos.personnel.positions.update(id, { name, nameKey, updatedAt: now });
      await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "position.renamed", entityType: "position", entityId: id, businessId: access.businessId, before: { name: before.name }, after: { name } });
      return view(after);
    },
    { lock: businessLock(scope.active.business.id) },
  );
}

export async function setPositionArchived(ctx: Ctx, scope: CatalogScope, id: string, archived: boolean): Promise<PositionView> {
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(
    async (repos) => {
      const access = await personnelAccess(repos, scope);
      const before = inBusiness(await repos.personnel.positions.findById(uuidOrNotFound(id)), access);
      if (!archived && (await repos.personnel.positions.listByBusiness(access.businessId)).some((p) => p.id !== id && !p.archivedAt && p.nameKey === before.nameKey)) throw new AppError("duplicate_name");
      const after = await repos.personnel.positions.update(id, { archivedAt: archived ? now : null, updatedAt: now });
      await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: archived ? "position.archived" : "position.reactivated", entityType: "position", entityId: id, businessId: access.businessId });
      return view(after);
    },
    { lock: businessLock(scope.active.business.id) },
  );
}
