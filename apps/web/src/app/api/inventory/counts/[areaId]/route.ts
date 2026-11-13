// Spec 005 RF-44: hoja de conteo de un área con lo esperado.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler } from "@/server/http";
import { countSheet } from "@/server/services/inventory/counts";

export const GET = handler(async (request: Request, { params }: { params: Promise<{ areaId: string }> }) => {
  const scope = await requireCatalogScope(request);
  return Response.json(await countSheet(appCtx(), scope, (await params).areaId));
});
