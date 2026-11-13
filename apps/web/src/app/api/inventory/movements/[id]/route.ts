// Spec 005 RF-60, RF-66: un movimiento con sus renglones y su cancelación.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler } from "@/server/http";
import { movementDetail } from "@/server/services/inventory/movements";

export const GET = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ movement: await movementDetail(appCtx(), scope, (await params).id) });
});
