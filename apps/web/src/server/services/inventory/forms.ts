// Lo que necesitan los formularios del inventario (spec 005): almacenes donde se puede mover, productos activos con
// sus presentaciones y proveedores activos.
import { canMoveInWarehouse } from "@/domain/inventory/access";
import type { CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";
import { inventoryAccess, loadBook } from "./shared";
import { productOption, warehouseOption } from "./stock";
import type { ProductOption, WarehouseOption } from "./views";

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, "es");

export async function movementFormData(ctx: Ctx, scope: CatalogScope): Promise<{ warehouses: WarehouseOption[]; products: ProductOption[]; suppliers: { id: string; name: string }[] }> {
  const access = await inventoryAccess(ctx.store, scope);
  const [book, suppliers] = await Promise.all([loadBook(ctx.store, access.businessId), ctx.store.catalog.suppliers.listByBusiness(access.businessId)]);
  return {
    warehouses: access.visible.filter((w) => !w.archivedAt && canMoveInWarehouse(scope.actor, access.memberships, access.branches, w)).map(warehouseOption).sort(byName),
    products: [...book.products.values()].filter((p) => !p.archivedAt).map((p) => productOption(book, p)).sort(byName),
    suppliers: suppliers.filter((s) => !s.archivedAt).map((s) => ({ id: s.id, name: s.name })).sort(byName),
  };
}
