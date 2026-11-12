// Spec 004 RF-3, RF-4, RF-7 a RF-13: recetas del negocio activo.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { createRecipe, listRecipes } from "@/server/services/recipes/recipes";
import { recipeBody } from "./schema";

export const GET = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ recipes: await listRecipes(appCtx(), scope) });
});

export const POST = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  const input = await readJson(request, recipeBody);
  return Response.json({ recipe: await createRecipe(appCtx(), scope, input) }, { status: 201 });
});

