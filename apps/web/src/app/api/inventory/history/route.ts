// Spec 005 RF-61: historial de un producto en un almacén.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { AppError } from "@/server/errors";
import { handler } from "@/server/http";
import { productHistory } from "@/server/services/inventory/movements";

export const GET = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  const q = new URL(request.url).searchParams;
  const before = q.get("before");
  if (before !== null && !/^\d+$/.test(before)) throw new AppError("validation");
  return Response.json(await productHistory(appCtx(), scope, q.get("warehouseId") ?? "", q.get("productId") ?? "", before === null ? null : Number(before)));
});
