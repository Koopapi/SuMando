// Spec 005 RF-30 a RF-38: un traspaso, con el producto propuesto solo para quien recibe.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler } from "@/server/http";
import { transferDetail } from "@/server/services/inventory/transfers";

export const GET = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ transfer: await transferDetail(appCtx(), scope, (await params).id) });
});
