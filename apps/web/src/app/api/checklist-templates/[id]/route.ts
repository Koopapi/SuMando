// Spec 010 RF-9 a RF-14: una plantilla y guardar sus cambios completos.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { getTemplate, saveTemplate } from "@/server/services/checklists/templates";
import { templateBody } from "../schema";

export const GET = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ template: await getTemplate(appCtx(), scope, (await params).id) });
});

export const PUT = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ template: await saveTemplate(appCtx(), scope, (await params).id, await readJson(request, templateBody, 256 * 1024)) });
});
