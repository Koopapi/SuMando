// Spec 005 RF-2, RF-55 a RF-57: existencias de un almacén visible.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler } from "@/server/http";
import { inventoryWarehouses, stockOfWarehouse } from "@/server/services/inventory/stock";

export const GET = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  const ctx = appCtx();
  const warehouses = await inventoryWarehouses(ctx, scope);
  const id = new URL(request.url).searchParams.get("warehouseId") ?? warehouses.find((w) => !w.archived)?.id;
  const stock = id ? await stockOfWarehouse(ctx, scope, id) : null;
  return Response.json({ warehouses, warehouse: stock?.warehouse ?? null, rows: stock?.rows ?? [] });
});
