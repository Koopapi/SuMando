// Spec 004 RF-33, RF-34: piezas de un cálculo guardado para empezar otro, sin las recetas archivadas.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler } from "@/server/http";
import { calculationBase } from "@/server/services/recipes/calculations";

export const GET = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scope = await requireCatalogScope(request);
  return Response.json(await calculationBase(appCtx(), scope, (await params).id));
});
