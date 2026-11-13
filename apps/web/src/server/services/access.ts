// Acceso a una sucursal concreta (RF-37): la ajena y la inexistente responden igual, sin revelar cuál es el caso.
import type { Branch } from "@/db/schema";
import { canAccessBranch } from "@/domain/access/branch-access";
import { isOwner } from "@/domain/access/owner";
import { AppError } from "../errors";
import type { Ctx } from "./context";
import type { PublicUser } from "./users-public";

export async function assertBranchAccess(ctx: Ctx, user: PublicUser, branchId: string): Promise<Branch> {
  const branch = await ctx.store.branches.findById(branchId);
  if (!branch) throw new AppError("not_found");
  const memberships = isOwner(user) ? [] : await ctx.store.memberships.listByUser(user.id);
  if (!canAccessBranch(user, memberships, branch)) throw new AppError("not_found");
  return branch;
}
