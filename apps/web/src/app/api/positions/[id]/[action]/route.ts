// Spec 008 RF-11: archivar o reactivar un puesto.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { AppError } from "@/server/errors";
import { handler } from "@/server/http";
import { setPositionArchived } from "@/server/services/personnel/positions";

export const POST = handler(async (request: Request, { params }: { params: Promise<{ id: string; action: string }> }) => {
  const scope = await requireCatalogScope(request);
  const { id, action } = await params;
  if (action !== "archive" && action !== "reactivate") throw new AppError("not_found");
  return Response.json({ position: await setPositionArchived(appCtx(), scope, id, action === "archive") });
});
