// Spec 003 RF-11, RF-13, RF-14: añadir una presentación con su equivalencia.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { addPresentation } from "@/server/services/catalog/products";
import { presentationView } from "@/server/services/catalog/views";

export const POST = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scope = await requireCatalogScope(request);
  const input = await readJson(request, z.object({ name: z.string(), factor: z.string() }));
  return Response.json({ presentation: presentationView(await addPresentation(appCtx(), scope, (await params).id, input)) }, { status: 201 });
});
