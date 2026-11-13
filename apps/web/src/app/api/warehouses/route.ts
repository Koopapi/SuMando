// Spec 003 RF-3, RF-5, RF-18, RF-20: almacenes de la sucursal activa y del negocio completo.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { createWarehouse, listWarehouses } from "@/server/services/catalog/places";
import { warehouseView } from "@/server/services/catalog/views";

export const GET = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ warehouses: (await listWarehouses(appCtx(), scope)).map(warehouseView) });
});

export const POST = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  const input = await readJson(request, z.object({ name: z.string(), scope: z.unknown() }));
  return Response.json({ warehouse: warehouseView(await createWarehouse(appCtx(), scope, input)) }, { status: 201 });
});
