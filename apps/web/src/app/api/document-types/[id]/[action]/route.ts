// Spec 008 RF-17: archivar o reactivar un documento de la lista.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { AppError } from "@/server/errors";
import { handler } from "@/server/http";
import { setDocumentTypeArchived } from "@/server/services/personnel/document-types";

export const POST = handler(async (request: Request, { params }: { params: Promise<{ id: string; action: string }> }) => {
  const scope = await requireCatalogScope(request);
  const { id, action } = await params;
  if (action !== "archive" && action !== "reactivate") throw new AppError("not_found");
  return Response.json({ documentType: await setDocumentTypeArchived(appCtx(), scope, id, action === "archive") });
});
