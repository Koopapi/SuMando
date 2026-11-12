// Spec 004 RF-22 a RF-27: lista de insumos sin guardar, para verla mientras se capturan piezas.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { previewSupplies } from "@/server/services/recipes/calculations";

export const POST = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  const { items } = await readJson(request, z.object({ items: z.unknown() }));
  return Response.json({ lines: await previewSupplies(appCtx(), scope, items) });
});
