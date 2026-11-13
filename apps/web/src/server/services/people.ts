// Personas y accesos (RF-11, RF-14, RF-23 a RF-31): solo el dueño; nadie se borra; cada cambio al registro (RF-42).
import { USER_ROLES, type User, type UserRole } from "@/db/schema";
import { isOwner } from "@/domain/access/owner";
import { wouldLeaveNoOwner } from "@/domain/access/last-owner";
import { AppError } from "../errors";
import type { Repos } from "../ports";
import { recordAudit } from "./audit";
import { issueTemporaryPassword } from "./auth";
import type { Ctx } from "./context";
import type { PublicUser } from "./users-public";
import { assertValidEmail, assertValidName, isUniqueViolation } from "./validation";

export interface PersonView {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  branchIds: string[];
}

const toView = (u: User, branchIds: string[]): PersonView => ({ id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.isActive, mustChangePassword: u.mustChangePassword, branchIds });
const snapshot = (u: User, branchIds: string[]) => ({ id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.isActive, branchIds });

function assertOwner(actor: PublicUser) {
  if (!isOwner(actor)) throw new AppError("forbidden");
}

function assertRole(role: string): UserRole {
  if (!(USER_ROLES as readonly string[]).includes(role)) throw new AppError("validation");
  return role as UserRole;
}

async function requireUser(repos: Repos, id: string): Promise<User> {
  const user = await repos.users.findById(id);
  if (!user) throw new AppError("not_found");
  return user;
}

async function assertBranchesExist(repos: Repos, branchIds: string[]) {
  for (const id of new Set(branchIds)) if (!(await repos.branches.findById(id))) throw new AppError("validation");
}

async function branchIdsOf(repos: Repos, user: User): Promise<string[]> {
  return (await repos.memberships.listByUser(user.id)).map((m) => m.branchId);
}

async function withDuplicateGuard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("duplicate_email");
    throw e;
  }
}

export async function listPeople(ctx: Ctx, actor: PublicUser): Promise<PersonView[]> {
  assertOwner(actor);
  const [users, memberships] = await Promise.all([ctx.store.users.list(), ctx.store.memberships.listAll()]);
  return users.map((u) => toView(u, memberships.filter((m) => m.userId === u.id).map((m) => m.branchId)));
}

export async function createPerson(ctx: Ctx, actor: PublicUser, input: { name: string; email: string; role: string; branchIds: string[] }): Promise<{ person: PersonView; temporaryPassword: string }> {
  assertOwner(actor);
  const name = assertValidName(input.name);
  const email = assertValidEmail(input.email);
  const role = assertRole(input.role);
  const now = ctx.ports.clock.now();
  return withDuplicateGuard(() =>
    ctx.store.transaction(async (repos) => {
      if (await repos.users.findByEmail(email)) throw new AppError("duplicate_email");
      await assertBranchesExist(repos, input.branchIds);
      const created = await repos.users.insert({ name, email, passwordHash: "pendiente", role, createdBy: actor.id, createdAt: now });
      const branchIds = role === "owner" ? [] : input.branchIds;
      await repos.memberships.replaceForUser(created.id, branchIds, { createdBy: actor.id, createdAt: now });
      await recordAudit(repos.audit, now, { actorId: actor.id, action: "user.created", entityType: "user", entityId: created.id, after: snapshot(created, branchIds) });
      const temporaryPassword = await issueTemporaryPassword(repos, ctx.ports, created, actor.id, "user.password_issued");
      const person = toView((await repos.users.findById(created.id))!, branchIds);
      return { person, temporaryPassword };
    }),
  );
}

export async function updatePerson(ctx: Ctx, actor: PublicUser, id: string, input: { name?: string; role?: string; branchIds?: string[] }): Promise<PersonView> {
  assertOwner(actor);
  const name = input.name === undefined ? undefined : assertValidName(input.name);
  const role = input.role === undefined ? undefined : assertRole(input.role);
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const before = await requireUser(repos, id);
    const beforeBranches = await branchIdsOf(repos, before);
    if (role === "admin" && wouldLeaveNoOwner({ target: before, otherActiveOwners: await repos.users.countActiveOwners(before.id) })) throw new AppError("last_owner");
    const nextRole = role ?? before.role;
    const wanted = nextRole === "owner" ? [] : (input.branchIds ?? beforeBranches);
    if (input.branchIds) await assertBranchesExist(repos, input.branchIds);
    const after = await repos.users.update(before.id, { ...(name !== undefined ? { name } : {}), ...(role !== undefined ? { role } : {}), updatedAt: now });
    await repos.memberships.replaceForUser(before.id, wanted, { createdBy: actor.id, createdAt: now });
    await recordAudit(repos.audit, now, { actorId: actor.id, action: "user.updated", entityType: "user", entityId: before.id, before: snapshot(before, beforeBranches), after: snapshot(after, wanted) });
    return toView(after, wanted);
  });
}

export async function deactivatePerson(ctx: Ctx, actor: PublicUser, id: string): Promise<PersonView> {
  assertOwner(actor);
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const before = await requireUser(repos, id);
    const branchIds = await branchIdsOf(repos, before);
    if (!before.isActive) return toView(before, branchIds);
    if (wouldLeaveNoOwner({ target: before, otherActiveOwners: await repos.users.countActiveOwners(before.id) })) throw new AppError("last_owner");
    const after = await repos.users.update(before.id, { isActive: false, updatedAt: now });
    await repos.sessions.revokeAllForUser(before.id, now);
    await recordAudit(repos.audit, now, { actorId: actor.id, action: "user.deactivated", entityType: "user", entityId: before.id, before: snapshot(before, branchIds), after: snapshot(after, branchIds) });
    return toView(after, branchIds);
  });
}

export async function reactivatePerson(ctx: Ctx, actor: PublicUser, id: string): Promise<{ person: PersonView; temporaryPassword: string }> {
  assertOwner(actor);
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const before = await requireUser(repos, id);
    const branchIds = await branchIdsOf(repos, before);
    if (before.isActive) throw new AppError("validation");
    const after = await repos.users.update(before.id, { isActive: true, updatedAt: now });
    await recordAudit(repos.audit, now, { actorId: actor.id, action: "user.reactivated", entityType: "user", entityId: before.id, before: snapshot(before, branchIds), after: snapshot(after, branchIds) });
    const temporaryPassword = await issueTemporaryPassword(repos, ctx.ports, after, actor.id, "user.password_issued");
    return { person: toView((await repos.users.findById(before.id))!, branchIds), temporaryPassword };
  });
}

export async function resetPersonPassword(ctx: Ctx, actor: PublicUser, id: string): Promise<string> {
  assertOwner(actor);
  return ctx.store.transaction(async (repos) => {
    const user = await requireUser(repos, id);
    if (!user.isActive) throw new AppError("validation");
    return issueTemporaryPassword(repos, ctx.ports, user, actor.id, "user.password_reset");
  });
}
