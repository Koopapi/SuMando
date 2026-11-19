// Datos del negocio activo para los ejemplos de cada paso (spec 015, RF-3). Solo nombres de su propio catálogo y
// personal; lo que falte se deja en null y el texto usa su versión genérica.
import type { CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";

export interface WizardExamples {
  /** Un producto activo, de preferencia con presentación de compra y proveedor. */
  product: { name: string; presentation: string | null; supplier: string | null } | null;
  supplier: string | null;
  area: string | null;
  position: string | null;
  employee: string | null;
}

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, "es");

export async function wizardExamples(ctx: Ctx, scope: CatalogScope): Promise<WizardExamples> {
  const businessId = scope.active.business.id;
  const branchId = scope.active.branch.id;
  const [products, presentations, suppliers, areas, positions, employees] = await Promise.all([
    ctx.store.catalog.products.listByBusiness(businessId),
    ctx.store.catalog.presentations.listByBusiness(businessId),
    ctx.store.catalog.suppliers.listByBusiness(businessId),
    ctx.store.catalog.areas.listByBusiness(businessId),
    ctx.store.personnel.positions.listByBusiness(businessId),
    ctx.store.personnel.employees.listByBranch(branchId),
  ]);
  const activeSuppliers = suppliers.filter((s) => !s.archivedAt).sort(byName);
  const supplierName = (id: string | null) => activeSuppliers.find((s) => s.id === id)?.name ?? null;
  const presentationName = (id: string | null) => presentations.find((p) => p.id === id)?.name ?? null;
  const active = products.filter((p) => !p.archivedAt).sort(byName);
  // Primero el más completo: con presentación de compra y proveedor; luego con una de las dos; luego cualquiera.
  const score = (p: (typeof active)[number]) => (p.purchasePresentationId ? 2 : 0) + (supplierName(p.supplierId) ? 1 : 0);
  const best = active.slice().sort((a, b) => score(b) - score(a))[0];
  return {
    product: best ? { name: best.name, presentation: presentationName(best.purchasePresentationId) ?? presentationName(best.countPresentationId), supplier: supplierName(best.supplierId) } : null,
    supplier: activeSuppliers[0]?.name ?? null,
    area: areas.filter((a) => a.branchId === branchId && !a.archivedAt).sort(byName)[0]?.name ?? null,
    position: positions.filter((p) => !p.archivedAt).sort(byName)[0]?.name ?? null,
    employee: employees.filter((e) => e.active).sort(byName)[0]?.name ?? null,
  };
}
