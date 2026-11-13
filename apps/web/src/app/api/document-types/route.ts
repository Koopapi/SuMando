// Spec 008 RF-16, RF-17: lista de documentos del negocio; solo el dueño la cambia.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { listDocumentTypes, saveDocumentType } from "@/server/services/personnel/document-types";
import { docTypeBody } from "./schema";

export const GET = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ documentTypes: await listDocumentTypes(appCtx(), scope) });
});

export const POST = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  const input = await readJson(request, docTypeBody);
  return Response.json({ documentType: await saveDocumentType(appCtx(), scope, null, input) }, { status: 201 });
});
