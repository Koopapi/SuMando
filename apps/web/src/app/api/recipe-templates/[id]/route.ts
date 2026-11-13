// Spec 004 RF-36, RF-38, RF-39: piezas de una plantilla para un cálculo nuevo, y cambio de nombre.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { renameTemplate, templateStart } from "@/server/services/recipes/templates";

type Params = { params: Promise<{ id: string }> };

export const GET = handler(async (request: Request, { params }: Params) => {
  const scope = await requireCatalogScope(request);
  return Response.json(await templateStart(appCtx(), scope, (await params).id));
});

export const PATCH = handler(async (request: Request, { params }: Params) => {
  const scope = await requireCatalogScope(request);
  const { name } = await readJson(request, z.object({ name: z.string() }));
  return Response.json({ template: await renameTemplate(appCtx(), scope, (await params).id, name) });
});
