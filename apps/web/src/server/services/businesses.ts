// Negocios y sucursales (RF-17 a RF-22): solo el dueño (RF-31); nada se borra (RF-21); todo queda en el registro (RF-42).
import type { Branch, Business } from "@/db/schema";
import { isOwner } from "@/domain/access/owner";
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

const businessSnapshot = (b: Business) => ({ id: b.id, name: b.name, archivedAt: b.archivedAt });
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

export async function createBusiness(ctx: Ctx, actor: PublicUser, input: { name: string; firstBranchName: string }): Promise<{ business: Business; branch: Branch }> {
  assertOwner(actor);
  const name = assertValidName(input.name);
  const branchName = assertValidName(input.firstBranchName);
  const now = ctx.ports.clock.now();
  return withDuplicateGuard(() =>
    ctx.store.transaction(async (repos) => {
      if (await repos.businesses.findByNameKey(nameKey(name))) throw new AppError("duplicate_name");
      const business = await repos.businesses.insert({ name, nameKey: nameKey(name), createdBy: actor.id, createdAt: now });
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

export async function renameBusiness(ctx: Ctx, actor: PublicUser, id: string, input: { name: string }): Promise<Business> {
  assertOwner(actor);
  const name = assertValidName(input.name);
  const now = ctx.ports.clock.now();
  return withDuplicateGuard(() =>
    ctx.store.transaction(async (repos) => {
      const before = await requireBusiness(repos, id);
      const clash = await repos.businesses.findByNameKey(nameKey(name));
      if (clash && clash.id !== before.id) throw new AppError("duplicate_name");
      const after = await repos.businesses.update(before.id, { name, nameKey: nameKey(name), updatedAt: now });
      await recordAudit(repos.audit, now, { actorId: actor.id, action: "business.renamed", entityType: "business", entityId: before.id, businessId: before.id, before: businessSnapshot(before), after: businessSnapshot(after) });
      return after;
    }),
  );
}

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
  archived: boolean;
  branches: BranchView[];
}

export const branchView = (b: Branch): BranchView => ({ id: b.id, name: b.name, archived: b.archivedAt !== null });
export const businessView = (b: BusinessWithBranches): BusinessView => ({ id: b.id, name: b.name, archived: b.archivedAt !== null, branches: b.branches.map(branchView) });
