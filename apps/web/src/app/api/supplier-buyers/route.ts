// Spec 013 RF-1 a RF-3: comprador habitual de cada proveedor en la sucursal activa.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler } from "@/server/http";
import { listSupplierBuyers } from "@/server/services/catalog/supplier-buyers";

export const GET = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  return Response.json(await listSupplierBuyers(appCtx(), scope));
});
