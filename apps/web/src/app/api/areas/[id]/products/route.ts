// Spec 005 RF-39 a RF-41: almacén y lista ordenada de productos que se cuentan en el área.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { areaSetup, setAreaProducts } from "@/server/services/inventory/counts";
import { INVENTORY_BODY_BYTES } from "../../../inventory/schema";

type Params = { params: Promise<{ id: string }> };

export const GET = handler(async (request: Request, { params }: Params) => {
  const scope = await requireCatalogScope(request);
  return Response.json(await areaSetup(appCtx(), scope, (await params).id));
});

export const PUT = handler(async (request: Request, { params }: Params) => {
  const scope = await requireCatalogScope(request);
  const input = await readJson(request, z.object({ warehouseId: z.string(), productIds: z.array(z.string()) }), INVENTORY_BODY_BYTES);
  const ctx = appCtx();
  const { id } = await params;
  await setAreaProducts(ctx, scope, id, input);
  return Response.json(await areaSetup(ctx, scope, id));
});
