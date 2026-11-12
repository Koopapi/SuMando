// Negocios y sucursales (spec 001, RF-17 a RF-22): solo el dueño (RF-31); nada se borra (RF-21); todo queda en el
// registro (RF-42). Color de cada negocio (spec 002, RF-8 a RF-11 y RF-15).
import type { Branch, Business } from "@/db/schema";
import { isOwner } from "@/domain/access/owner";
import { isBusinessColor, suggestColor, type BusinessColor } from "@/domain/business-color";
import { nameKey } from "@/domain/text";
import { AppError } from "../errors";
import type { Repos } from "../ports";
import { recordAudit } from "./audit";
import type { Ctx } from "./context";
import type { PublicUser } from "./users-public";
import { assertValidName, isUniqueViolation } from "./validation";

export interface BusinessWithBranches extends Business {
  branches: Branch[];
}

function assertOwner(actor: PublicUser) {
  if (!isOwner(actor)) throw new AppError("forbidden");
}

const businessSnapshot = (b: Business) => ({ id: b.id, name: b.name, color: b.color, archivedAt: b.archivedAt });

function assertColor(color: unknown): BusinessColor {
  if (!isBusinessColor(color)) throw new AppError("invalid_color");
  return color;
}
const branchSnapshot = (b: Branch) => ({ id: b.id, businessId: b.businessId, name: b.name, archivedAt: b.archivedAt });

async function withDuplicateGuard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("duplicate_name");
    throw e;
  }
}

async function requireBusiness(repos: Repos, id: string): Promise<Business> {
  const business = await repos.businesses.findById(id);
  if (!business) throw new AppError("not_found");
  return business;
}

async function requireBranch(repos: Repos, id: string): Promise<Branch> {
  const branch = await repos.branches.findById(id);
  if (!branch) throw new AppError("not_found");
  return branch;
}

/** Todos los negocios con sus sucursales, archivados incluidos (la pantalla los separa). */
export async function listBusinesses(ctx: Ctx, actor: PublicUser): Promise<BusinessWithBranches[]> {
  assertOwner(actor);
  const [all, branches] = await Promise.all([ctx.store.businesses.list(), ctx.store.branches.listAll()]);
  return all.map((b) => ({ ...b, branches: branches.filter((br) => br.businessId === b.id) }));
}

/** Color sugerido para el siguiente negocio (RF-10): el primero libre, contando también los archivados. */
export async function suggestedColor(ctx: Ctx, actor: PublicUser): Promise<BusinessColor> {
  assertOwner(actor);
  return suggestColor((await ctx.store.businesses.list()).map((b) => b.color));
}

export async function createBusiness(ctx: Ctx, actor: PublicUser, input: { name: string; firstBranchName: string; color?: unknown }): Promise<{ business: Business; branch: Branch }> {
  assertOwner(actor);
  const name = assertValidName(input.name);
  const color = assertColor(input.color);
  const branchName = assertValidName(input.firstBranchName);
  const now = ctx.ports.clock.now();
  return withDuplicateGuard(() =>
    ctx.store.transaction(async (repos) => {
      if (await repos.businesses.findByNameKey(nameKey(name))) throw new AppError("duplicate_name");
      const business = await repos.businesses.insert({ name, nameKey: nameKey(name), color, createdBy: actor.id, createdAt: now });
      const branch = await repos.branches.insert({ businessId: business.id, name: branchName, nameKey: nameKey(branchName), createdBy: actor.id, createdAt: now });
      await recordAudit(repos.audit, now, { actorId: actor.id, action: "business.created", entityType: "business", entityId: business.id, businessId: business.id, after: businessSnapshot(business) });
      await recordAudit(repos.audit, now, { actorId: actor.id, action: "branch.created", entityType: "branch", entityId: branch.id, businessId: business.id, branchId: branch.id, after: branchSnapshot(branch) });
      return { business, branch };
    }),
  );
}

export async function addBranch(ctx: Ctx, actor: PublicUser, businessId: string, input: { name: string }): Promise<Branch> {
  assertOwner(actor);
  const name = assertValidName(input.name);
  const now = ctx.ports.clock.now();
  return withDuplicateGuard(() =>
    ctx.store.transaction(async (repos) => {
      const business = await requireBusiness(repos, businessId);
      if (business.archivedAt) throw new AppError("business_archived");
      if (await repos.branches.findByNameKey(business.id, nameKey(name))) throw new AppError("duplicate_name");
      const branch = await repos.branches.insert({ businessId: business.id, name, nameKey: nameKey(name), createdBy: actor.id, createdAt: now });
      await recordAudit(repos.audit, now, { actorId: actor.id, action: "branch.created", entityType: "branch", entityId: branch.id, businessId: business.id, branchId: branch.id, after: branchSnapshot(branch) });
      return branch;
    }),
  );
}

/**
 * Cambia el nombre (spec 001, RF-19) y/o el color (spec 002, RF-9) de un negocio. Cada cambio queda en el registro
 * con su valor anterior (RF-15). Pedir el mismo color no registra nada.
 */
export async function updateBusiness(ctx: Ctx, actor: PublicUser, id: string, input: { name?: string; color?: unknown }): Promise<Business> {
  assertOwner(actor);
  if (input.name === undefined && input.color === undefined) throw new AppError("nothing_to_update");
  const name = input.name === undefined ? undefined : assertValidName(input.name);
  const color = input.color === undefined ? undefined : assertColor(input.color);
  const now = ctx.ports.clock.now();
  return withDuplicateGuard(() =>
    ctx.store.transaction(async (repos) => {
      let current = await requireBusiness(repos, id);
      if (name !== undefined) {
        const clash = await repos.businesses.findByNameKey(nameKey(name));
        if (clash && clash.id !== current.id) throw new AppError("duplicate_name");
        const after = await repos.businesses.update(current.id, { name, nameKey: nameKey(name), updatedAt: now });
        await recordAudit(repos.audit, now, { actorId: actor.id, action: "business.renamed", entityType: "business", entityId: current.id, businessId: current.id, before: businessSnapshot(current), after: businessSnapshot(after) });
        current = after;
      }
      if (color !== undefined && color !== current.color) {
        const after = await repos.businesses.update(current.id, { color, updatedAt: now });
        await recordAudit(repos.audit, now, { actorId: actor.id, action: "business.color_changed", entityType: "business", entityId: current.id, businessId: current.id, before: { color: current.color }, after: { color: after.color } });
        current = after;
      }
      return current;
    }),
  );
}

export const renameBusiness = (ctx: Ctx, actor: PublicUser, id: string, input: { name: string }) => updateBusiness(ctx, actor, id, { name: input.name });

export async function renameBranch(ctx: Ctx, actor: PublicUser, id: string, input: { name: string }): Promise<Branch> {
  assertOwner(actor);
  const name = assertValidName(input.name);
  const now = ctx.ports.clock.now();
  return withDuplicateGuard(() =>
    ctx.store.transaction(async (repos) => {
      const before = await requireBranch(repos, id);
      const clash = await repos.branches.findByNameKey(before.businessId, nameKey(name));
      if (clash && clash.id !== before.id) throw new AppError("duplicate_name");
      const after = await repos.branches.update(before.id, { name, nameKey: nameKey(name), updatedAt: now });
      await recordAudit(repos.audit, now, { actorId: actor.id, action: "branch.renamed", entityType: "branch", entityId: before.id, businessId: before.businessId, branchId: before.id, before: branchSnapshot(before), after: branchSnapshot(after) });
      return after;
    }),
  );
}

/** Archivar un negocio archiva sus sucursales activas (RF-21). Si ya estaba archivado, no cambia nada. */
export async function archiveBusiness(ctx: Ctx, actor: PublicUser, id: string): Promise<Business> {
  assertOwner(actor);
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const before = await requireBusiness(repos, id);
    if (before.archivedAt) return before;
    const after = await repos.businesses.update(before.id, { archivedAt: now, updatedAt: now });
    await recordAudit(repos.audit, now, { actorId: actor.id, action: "business.archived", entityType: "business", entityId: before.id, businessId: before.id, before: businessSnapshot(before), after: businessSnapshot(after) });
    for (const branch of await repos.branches.archiveByBusiness(before.id, now)) {
      await recordAudit(repos.audit, now, { actorId: actor.id, action: "branch.archived", entityType: "branch", entityId: branch.id, businessId: before.id, branchId: branch.id, before: { ...branchSnapshot(branch), archivedAt: null }, after: branchSnapshot(branch) });
    }
    return after;
  });
}

/** Reactivar un negocio devuelve también sus sucursales (RF-22). */
export async function reactivateBusiness(ctx: Ctx, actor: PublicUser, id: string): Promise<Business> {
  assertOwner(actor);
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const before = await requireBusiness(repos, id);
    if (!before.archivedAt) return before;
    const after = await repos.businesses.update(before.id, { archivedAt: null, updatedAt: now });
    await recordAudit(repos.audit, now, { actorId: actor.id, action: "business.reactivated", entityType: "business", entityId: before.id, businessId: before.id, before: businessSnapshot(before), after: businessSnapshot(after) });
    for (const branch of await repos.branches.reactivateByBusiness(before.id, now)) {
      await recordAudit(repos.audit, now, { actorId: actor.id, action: "branch.reactivated", entityType: "branch", entityId: branch.id, businessId: before.id, branchId: branch.id, after: branchSnapshot(branch) });
    }
    return after;
  });
}

export async function archiveBranch(ctx: Ctx, actor: PublicUser, id: string): Promise<Branch> {
  assertOwner(actor);
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const before = await requireBranch(repos, id);
    if (before.archivedAt) return before;
    const after = await repos.branches.update(before.id, { archivedAt: now, updatedAt: now });
    await recordAudit(repos.audit, now, { actorId: actor.id, action: "branch.archived", entityType: "branch", entityId: before.id, businessId: before.businessId, branchId: before.id, before: branchSnapshot(before), after: branchSnapshot(after) });
    return after;
  });
}

export async function reactivateBranch(ctx: Ctx, actor: PublicUser, id: string): Promise<Branch> {
  assertOwner(actor);
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const before = await requireBranch(repos, id);
    if (!before.archivedAt) return before;
    const business = await requireBusiness(repos, before.businessId);
    if (business.archivedAt) throw new AppError("business_archived");
    const after = await repos.branches.update(before.id, { archivedAt: null, updatedAt: now });
    await recordAudit(repos.audit, now, { actorId: actor.id, action: "branch.reactivated", entityType: "branch", entityId: before.id, businessId: before.businessId, branchId: before.id, before: branchSnapshot(before), after: branchSnapshot(after) });
    return after;
  });
}

/** Lo que ven las pantallas y la API: sin fechas internas, con la marca de archivado. */
export interface BranchView {
  id: string;
  name: string;
  archived: boolean;
}
export interface BusinessView {
  id: string;
  name: string;
  color: BusinessColor;
  archived: boolean;
  branches: BranchView[];
}

export const branchView = (b: Branch): BranchView => ({ id: b.id, name: b.name, archived: b.archivedAt !== null });
export const businessView = (b: BusinessWithBranches): BusinessView => ({ id: b.id, name: b.name, color: b.color as BusinessColor, archived: b.archivedAt !== null, branches: b.branches.map(branchView) });
