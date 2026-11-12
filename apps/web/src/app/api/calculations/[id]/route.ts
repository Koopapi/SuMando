// Spec 004 RF-31, RF-32: un cálculo tal como se guardó. Solo lectura: no hay PATCH ni DELETE.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler } from "@/server/http";
import { calculationDetail } from "@/server/services/recipes/calculations";

export const GET = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ calculation: await calculationDetail(appCtx(), scope, (await params).id) });
});
