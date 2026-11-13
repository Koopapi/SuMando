// Spec 008 RF-17: el orden de la lista de documentos.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { reorderDocumentTypes } from "@/server/services/personnel/document-types";

export const PUT = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  const { ids } = await readJson(request, z.object({ ids: z.array(z.string()) }));
  return Response.json({ documentTypes: await reorderDocumentTypes(appCtx(), scope, ids) });
});
