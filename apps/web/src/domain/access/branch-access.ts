// RF-25, RF-26, RF-37: el dueño ve todas las sucursales activas; el administrador, solo las asignadas y activas.
import { isOwner } from "./owner";

export interface AccessUser {
  role: "owner" | "admin";
}
export interface BranchLike {
  id: string;
  archivedAt: Date | null;
}
export interface MembershipLike {
  branchId: string;
}

export function accessibleBranches<B extends BranchLike>(user: AccessUser, memberships: MembershipLike[], branches: B[]): B[] {
  const active = branches.filter((b) => b.archivedAt === null);
  if (isOwner(user)) return active;
  const mine = new Set(memberships.map((m) => m.branchId));
  return active.filter((b) => mine.has(b.id));
}

export function canAccessBranch(user: AccessUser, memberships: MembershipLike[], branch: BranchLike): boolean {
  return accessibleBranches(user, memberships, [branch]).length === 1;
}
