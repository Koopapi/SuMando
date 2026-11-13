// Spec 003 RF-22 a RF-25: mínimo y máximo del producto en un almacén.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { setLevel } from "@/server/services/catalog/levels";

export const PUT = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scope = await requireCatalogScope(request);
  const input = await readJson(request, z.object({ warehouseId: z.string(), presentationId: z.string().nullable().optional(), min: z.string().nullable().optional(), max: z.string().nullable().optional() }));
  const level = await setLevel(appCtx(), scope, (await params).id, input);
  return Response.json({ level: { warehouseId: level.warehouseId, minBase: level.minBase, maxBase: level.maxBase } });
});
