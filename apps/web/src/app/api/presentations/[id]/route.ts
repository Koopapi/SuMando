// Spec 003 RF-11, RF-13, RF-14, RF-17: renombrar una presentación o cambiar su equivalencia.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { updatePresentation } from "@/server/services/catalog/products";
import { presentationView } from "@/server/services/catalog/views";

export const PATCH = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scope = await requireCatalogScope(request);
  const input = await readJson(request, z.object({ name: z.string().optional(), factor: z.string().optional() }));
  return Response.json({ presentation: presentationView(await updatePresentation(appCtx(), scope, (await params).id, input)) });
});
