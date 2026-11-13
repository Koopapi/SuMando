// Spec 004 RF-6, RF-12, RF-15, RF-19: una receta y su edición completa.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { recipeDetail, updateRecipe } from "@/server/services/recipes/recipes";
import { recipeBody } from "../schema";

type Params = { params: Promise<{ id: string }> };

export const GET = handler(async (request: Request, { params }: Params) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ recipe: await recipeDetail(appCtx(), scope, (await params).id) });
});

export const PUT = handler(async (request: Request, { params }: Params) => {
  const scope = await requireCatalogScope(request);
  const input = await readJson(request, recipeBody);
  return Response.json({ recipe: await updateRecipe(appCtx(), scope, (await params).id, input) });
});
