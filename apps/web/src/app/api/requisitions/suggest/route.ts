// Spec 007 RF-14 a RF-19: renglones sugeridos desde los mínimos, un cálculo guardado o una plantilla de compra.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { suggestLines } from "@/server/services/requisitions/requisitions";

export const POST = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  const input = await readJson(request, z.object({ warehouseId: z.string(), source: z.enum(["minimums", "calculation", "template"]), id: z.string().nullish() }));
  return Response.json(await suggestLines(appCtx(), scope, input));
});
