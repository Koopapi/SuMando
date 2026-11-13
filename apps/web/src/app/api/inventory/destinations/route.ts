// Spec 005 RF-25, RF-26, RF-38: almacenes a los que se puede traspasar, solo con su nombre.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler } from "@/server/http";
import { transferDestinations } from "@/server/services/inventory/transfers";

export const GET = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ businesses: await transferDestinations(appCtx(), scope) });
});
