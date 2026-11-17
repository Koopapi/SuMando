// Comprador habitual de cada proveedor en la sucursal activa (spec 013, RF-1 a RF-3): una persona activa de Personal
// de esa sucursal. Lo asigna quien administra proveedores y tiene esa sucursal.
import { AppError } from "../../errors";
import type { Repos } from "../../ports";
import { recordAudit } from "../audit";
import type { Ctx } from "../context";
import { uuidOrNotFound } from "../inventory/shared";
import { assertBranch, catalogAccess, inBusiness, type CatalogAccess, type CatalogScope } from "./shared";

export interface SupplierBuyersView {
  buyers: { supplierId: string; employeeId: string; name: string; active: boolean }[];
  /** Personal activo de la sucursal, por nombre. */
  employees: { id: string; name: string }[];
}

async function branchAccess(repos: Repos, scope: CatalogScope): Promise<CatalogAccess> {
  const access = await catalogAccess(repos, scope);
  assertBranch(scope, access, scope.active.branch.id);
  return access;
}

/** RF-3: el comprador habitual de cada proveedor en la sucursal activa, y a quién se puede elegir. */
export async function listSupplierBuyers(ctx: Ctx, scope: CatalogScope): Promise<SupplierBuyersView> {
  await branchAccess(ctx.store, scope);
  const branchId = scope.active.branch.id;
  const [rows, staff] = await Promise.all([ctx.store.requisitions.supplierBuyers.listByBranch(branchId), ctx.store.personnel.employees.listByBranch(branchId)]);
  const byId = new Map(staff.map((e) => [e.id, e]));
  return {
    buyers: rows.flatMap((r) => {
      const e = byId.get(r.employeeId);
      return e ? [{ supplierId: r.supplierId, employeeId: e.id, name: e.name, active: e.active }] : [];
    }),
    employees: staff
      .filter((e) => e.active)
      .map((e) => ({ id: e.id, name: e.name }))
      .sort((a, b) => a.name.localeCompare(b.name, "es")),
  };
}

/** RF-1 y RF-2: asigna (o quita, con `null`) el comprador habitual de un proveedor activo en la sucursal activa. */
export async function setSupplierBuyer(ctx: Ctx, scope: CatalogScope, supplierId: string, rawEmployeeId: unknown): Promise<{ supplierId: string; employeeId: string | null }> {
  if (rawEmployeeId !== null && typeof rawEmployeeId !== "string") throw new AppError("validation");
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const access = await branchAccess(repos, scope);
    const branchId = scope.active.branch.id;
    const supplier = inBusiness(await repos.catalog.suppliers.findById(uuidOrNotFound(supplierId)), access);
    const before = (await repos.requisitions.supplierBuyers.listByBranch(branchId)).find((r) => r.supplierId === supplier.id)?.employeeId ?? null;
    let employeeId: string | null = null;
    if (rawEmployeeId) {
      if (supplier.archivedAt) throw new AppError("supplier_archived");
      const e = await repos.personnel.employees.findById(uuidOrNotFound(rawEmployeeId));
      if (!e || e.branchId !== branchId || e.businessId !== access.businessId || !e.active) throw new AppError("buyer_not_in_branch");
      employeeId = e.id;
      await repos.requisitions.supplierBuyers.set({ businessId: access.businessId, branchId, supplierId: supplier.id, employeeId, updatedBy: scope.actor.id, updatedAt: now });
    } else await repos.requisitions.supplierBuyers.remove(branchId, supplier.id);
    if (before !== employeeId)
      await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "supplier.buyer_set", entityType: "supplier", entityId: supplier.id, businessId: access.businessId, branchId, before: { employeeId: before }, after: { employeeId } });
    return { supplierId: supplier.id, employeeId };
  });
}
