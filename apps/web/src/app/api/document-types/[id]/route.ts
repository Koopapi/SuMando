// Spec 008 RF-17: cambiar nombre, obligatoriedad o vigencia de un documento.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { saveDocumentType } from "@/server/services/personnel/document-types";
import { docTypeBody } from "../schema";

export const PATCH = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scope = await requireCatalogScope(request);
  const input = await readJson(request, docTypeBody);
  return Response.json({ documentType: await saveDocumentType(appCtx(), scope, (await params).id, input) });
});
