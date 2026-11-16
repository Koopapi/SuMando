// Sucursales y puestos que ofrece el editor de plantillas (spec 010, RF-6, RF-9).
import type { Ctx } from "@/server/services/context";
import type { CatalogScope } from "@/server/services/catalog/shared";

export async function editorOptions(ctx: Ctx, scope: CatalogScope) {
  const [branches, positions] = await Promise.all([ctx.store.branches.listByBusiness(scope.active.business.id), ctx.store.personnel.positions.listByBusiness(scope.active.business.id)]);
  return {
    branches: branches.filter((b) => !b.archivedAt).map((b) => ({ id: b.id, name: b.name })),
    positions: positions.filter((p) => !p.archivedAt).map((p) => ({ id: p.id, name: p.name })),
  };
}
