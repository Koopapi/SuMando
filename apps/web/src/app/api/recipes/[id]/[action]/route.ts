// Spec 004 RF-51, RF-52: archivar o reactivar una receta. No hay borrado.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { AppError } from "@/server/errors";
import { handler } from "@/server/http";
import { setRecipeArchived } from "@/server/services/recipes/recipes";

export const POST = handler(async (request: Request, { params }: { params: Promise<{ id: string; action: string }> }) => {
  const scope = await requireCatalogScope(request);
  const { id, action } = await params;
  if (action !== "archive" && action !== "reactivate") throw new AppError("not_found");
  return Response.json({ recipe: await setRecipeArchived(appCtx(), scope, id, action === "archive") });
});
