// Sucursal activa (RF-32 a RF-38): se resuelve en cada petición contra lo que la persona puede ver hoy.
import type { Branch, Business } from "@/db/schema";
import { resolveActiveBranch } from "@/domain/access/active-branch";
import { accessibleBranches } from "@/domain/access/branch-access";
import { isOwner } from "@/domain/access/owner";
import { AppError } from "../errors";
import type { Authenticated } from "./auth";
import type { Ctx } from "./context";
import type { PublicUser } from "./users-public";

export interface ActiveBranch {
  branch: Branch;
  business: Business;
}

export type BranchState = { kind: "active"; active: ActiveBranch } | { kind: "choose" } | { kind: "none" };

export interface BranchChoice {
  business: { id: string; name: string };
  branches: { id: string; name: string }[];
}

/** Sucursales activas de negocios activos que la persona puede ver, con su negocio. */
export async function accessibleFor(ctx: Ctx, user: PublicUser): Promise<ActiveBranch[]> {
  const [businesses, branches, memberships] = await Promise.all([ctx.store.businesses.list(), ctx.store.branches.listAll(), isOwner(user) ? Promise.resolve([]) : ctx.store.memberships.listByUser(user.id)]);
  const activeBusinesses = new Map(businesses.filter((b) => !b.archivedAt).map((b) => [b.id, b]));
  return accessibleBranches(user, memberships, branches)
    .filter((b) => activeBusinesses.has(b.businessId))
    .map((branch) => ({ branch, business: activeBusinesses.get(branch.businessId)! }));
}

export async function branchChoices(ctx: Ctx, user: PublicUser): Promise<BranchChoice[]> {
  const groups = new Map<string, BranchChoice>();
  for (const { branch, business } of await accessibleFor(ctx, user)) {
    const g = groups.get(business.id) ?? { business: { id: business.id, name: business.name }, branches: [] };
    g.branches.push({ id: branch.id, name: branch.name });
    groups.set(business.id, g);
  }
  return [...groups.values()].sort((a, b) => a.business.name.localeCompare(b.business.name, "es"));
}

/** Resuelve la sucursal activa de la sesión y la deja escrita en la sesión y como recordada. */
export async function resolveBranchState(ctx: Ctx, auth: Authenticated): Promise<BranchState> {
  const accessible = await accessibleFor(ctx, auth.user);
  const resolution = resolveActiveBranch({ accessible: accessible.map((a) => ({ id: a.branch.id, item: a })), sessionBranchId: auth.activeBranchId, rememberedBranchId: auth.user.lastBranchId });
  const now = ctx.ports.clock.now();
  if (resolution.kind === "keep") return { kind: "active", active: resolution.branch.item };
  if (resolution.kind === "remembered" || resolution.kind === "only") {
    const active = resolution.branch.item;
    await ctx.store.sessions.update(auth.sessionId, { activeBranchId: active.branch.id });
    if (auth.user.lastBranchId !== active.branch.id) await ctx.store.users.update(auth.user.id, { lastBranchId: active.branch.id, updatedAt: now });
    return { kind: "active", active };
  }
  if (auth.activeBranchId) await ctx.store.sessions.update(auth.sessionId, { activeBranchId: null });
  return { kind: resolution.kind };
}

/** Elegir sucursal (RF-32, RF-35): solo una accesible; se recuerda para la próxima entrada (RF-34). */
export async function selectBranch(ctx: Ctx, auth: Authenticated, branchId: string): Promise<ActiveBranch> {
  const chosen = (await accessibleFor(ctx, auth.user)).find((a) => a.branch.id === branchId);
  if (!chosen) throw new AppError("not_found");
  await ctx.store.sessions.update(auth.sessionId, { activeBranchId: chosen.branch.id });
  await ctx.store.users.update(auth.user.id, { lastBranchId: chosen.branch.id, updatedAt: ctx.ports.clock.now() });
  return chosen;
}

export const activeBranchView = (a: ActiveBranch) => ({ id: a.branch.id, name: a.branch.name, business: { id: a.business.id, name: a.business.name } });
