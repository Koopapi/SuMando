// Spec 010 RF-1, RF-2, RF-6 a RF-11: plantillas del negocio y alta de una.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { createTemplate, listTemplates } from "@/server/services/checklists/templates";
import { templateBody } from "./schema";

export const GET = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ templates: await listTemplates(appCtx(), scope) });
});

export const POST = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ template: await createTemplate(appCtx(), scope, await readJson(request, templateBody, 256 * 1024)) }, { status: 201 });
});
