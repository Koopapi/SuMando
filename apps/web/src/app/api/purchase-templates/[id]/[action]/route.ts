// Spec 007 RF-20: archivar o reactivar una plantilla de compra.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { AppError } from "@/server/errors";
import { handler } from "@/server/http";
import { setPurchaseTemplateArchived } from "@/server/services/requisitions/templates";

export const POST = handler(async (request: Request, { params }: { params: Promise<{ id: string; action: string }> }) => {
  const scope = await requireCatalogScope(request);
  const { id, action } = await params;
  if (action !== "archive" && action !== "reactivate") throw new AppError("not_found");
  const t = await setPurchaseTemplateArchived(appCtx(), scope, id, action === "archive");
  return Response.json({ template: { id: t.id, name: t.name, archived: t.archivedAt !== null } });
});
