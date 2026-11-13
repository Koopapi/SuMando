// Spec 004 RF-35, RF-37: plantillas de la sucursal activa; un nombre ocupado responde 409 hasta confirmar `replace`.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { listTemplates, saveTemplate } from "@/server/services/recipes/templates";

export const GET = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ templates: await listTemplates(appCtx(), scope) });
});

export const POST = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  const input = await readJson(request, z.object({ name: z.string(), items: z.unknown(), replace: z.boolean().optional() }));
  return Response.json({ template: await saveTemplate(appCtx(), scope, input) }, { status: 201 });
});
