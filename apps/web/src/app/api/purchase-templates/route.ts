// Spec 007 RF-18, RF-20: plantillas de compra de la sucursal activa y guardar una.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { listPurchaseTemplates, savePurchaseTemplate } from "@/server/services/requisitions/templates";
import { REQUISITION_BODY_BYTES, reqLine } from "../requisitions/schema";

export const GET = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ templates: await listPurchaseTemplates(appCtx(), scope) });
});

export const POST = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  const input = await readJson(request, z.object({ name: z.string(), lines: z.array(reqLine), replace: z.boolean().optional() }), REQUISITION_BODY_BYTES);
  const t = await savePurchaseTemplate(appCtx(), scope, input);
  return Response.json({ template: { id: t.id, name: t.name } }, { status: 201 });
});
