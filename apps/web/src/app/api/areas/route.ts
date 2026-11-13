// Spec 003 RF-2, RF-5, RF-19, RF-21: áreas de la sucursal activa.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { createArea } from "@/server/services/catalog/places";
import { catalogView } from "@/server/services/catalog/views";

export const GET = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  const view = await catalogView(appCtx(), scope);
  return Response.json({ areas: view.areas, candidates: view.candidates });
});

export const POST = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  const input = await readJson(request, z.object({ name: z.string(), responsibleId: z.unknown() }));
  const a = await createArea(appCtx(), scope, input);
  return Response.json({ area: { id: a.id, name: a.name, responsibleId: a.responsibleId } }, { status: 201 });
});
