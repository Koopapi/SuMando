// Spec 007 RF-20: renombrar una plantilla de compra.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { renamePurchaseTemplate } from "@/server/services/requisitions/templates";

export const PATCH = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scope = await requireCatalogScope(request);
  const { name } = await readJson(request, z.object({ name: z.string() }));
  const t = await renamePurchaseTemplate(appCtx(), scope, (await params).id, name);
  return Response.json({ template: { id: t.id, name: t.name } });
});
