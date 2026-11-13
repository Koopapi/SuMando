// Spec 004 RF-28 a RF-30: historial de cálculos de la sucursal activa y guardar uno nuevo.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { listCalculations, saveCalculation } from "@/server/services/recipes/calculations";

export const GET = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ calculations: await listCalculations(appCtx(), scope) });
});

export const POST = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  const { items } = await readJson(request, z.object({ items: z.unknown() }));
  const calc = await saveCalculation(appCtx(), scope, items);
  return Response.json({ calculation: { id: calc.id, createdAt: calc.createdAt.toISOString() } }, { status: 201 });
});
