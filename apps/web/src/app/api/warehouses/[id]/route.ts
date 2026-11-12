// Spec 003 RF-7, RF-20: renombrar un almacén.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { renameWarehouse } from "@/server/services/catalog/places";
import { warehouseView } from "@/server/services/catalog/views";

export const PATCH = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scope = await requireCatalogScope(request);
  const input = await readJson(request, z.object({ name: z.string() }));
  return Response.json({ warehouse: warehouseView(await renameWarehouse(appCtx(), scope, (await params).id, input)) });
});
