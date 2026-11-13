// Quién administra el catálogo (spec 003, RF-6, RF-7): el dueño, todo; un administrador, el catálogo de los negocios
// donde tiene alguna sucursal activa, y los almacenes y áreas solo de sus sucursales.
import { accessibleBranches, canAccessBranch, type AccessUser, type BranchLike, type MembershipLike } from "../access/branch-access";

export function canManageBusinessCatalog(user: AccessUser, memberships: MembershipLike[], branches: (BranchLike & { businessId: string })[], businessId: string): boolean {
  return accessibleBranches(user, memberships, branches).some((b) => b.businessId === businessId);
}

export function canManageBranchCatalog(user: AccessUser, memberships: MembershipLike[], branch: BranchLike): boolean {
  return canAccessBranch(user, memberships, branch);
}
