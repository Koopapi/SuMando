// Spec 003 RF-7, RF-19, RF-21: renombrar un área o cambiar su responsable.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { updateArea } from "@/server/services/catalog/places";

export const PATCH = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scope = await requireCatalogScope(request);
  const input = await readJson(request, z.object({ name: z.string().optional(), responsibleId: z.unknown().optional() }));
  const a = await updateArea(appCtx(), scope, (await params).id, input);
  return Response.json({ area: { id: a.id, name: a.name, responsibleId: a.responsibleId } });
});
