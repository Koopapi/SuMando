// Spec 005 RF-6, RF-7: productos activos con sus presentaciones para capturar renglones.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler } from "@/server/http";
import { movementProducts } from "@/server/services/inventory/stock";

export const GET = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ products: await movementProducts(appCtx(), scope) });
});
