// Spec 010 RF-2, RF-8: archivar y reactivar una plantilla.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { AppError } from "@/server/errors";
import { handler } from "@/server/http";
import { setTemplateArchived } from "@/server/services/checklists/templates";

export const POST = handler(async (request: Request, { params }: { params: Promise<{ id: string; action: string }> }) => {
  const scope = await requireCatalogScope(request);
  const { id, action } = await params;
  if (action !== "archive" && action !== "reactivate") throw new AppError("not_found");
  return Response.json({ template: await setTemplateArchived(appCtx(), scope, id, action === "archive") });
});
