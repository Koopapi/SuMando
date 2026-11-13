// Quién mueve inventario en un almacén (spec 005, RF-3, RF-4, RF-29, RF-43): en uno de sucursal, el dueño y los
// administradores de esa sucursal; en uno del negocio completo, el dueño y cualquier administrador con alguna
// sucursal activa del negocio.
import { accessibleBranches, type AccessUser, type BranchLike, type MembershipLike } from "../access/branch-access";

export interface WarehouseLike {
  businessId: string;
  branchId: string | null;
}

export function canMoveInWarehouse(user: AccessUser, memberships: MembershipLike[], branches: (BranchLike & { businessId: string })[], warehouse: WarehouseLike): boolean {
  const mine = accessibleBranches(user, memberships, branches);
  if (warehouse.branchId === null) return mine.some((b) => b.businessId === warehouse.businessId);
  return mine.some((b) => b.id === warehouse.branchId);
}
