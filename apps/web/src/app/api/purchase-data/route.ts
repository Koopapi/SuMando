// Spec 013 RF-17 a RF-24: «Datos de compra» de un almacén: consultar y guardar varios cambios.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { PURCHASE_DATA_MAX_CHANGES, purchaseData, savePurchaseData } from "@/server/services/catalog/purchase-data";

export const GET = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  return Response.json(await purchaseData(appCtx(), scope, new URL(request.url).searchParams.get("almacen")));
});

const change = z.object({
  productId: z.string(),
  supplierId: z.string().nullable().optional(),
  purchasePresentationId: z.string().nullable().optional(),
  min: z.string().nullable().optional(),
  max: z.string().nullable().optional(),
  levelsIn: z.string().nullable().optional(),
});

export const POST = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  const input = await readJson(request, z.object({ warehouseId: z.string(), changes: z.array(change).max(PURCHASE_DATA_MAX_CHANGES) }), 512 * 1024);
  return Response.json(await savePurchaseData(appCtx(), scope, input));
});
