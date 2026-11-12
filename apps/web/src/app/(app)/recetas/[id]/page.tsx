// Spec 004: una receta del negocio activo; de otro negocio, no existe (RF-6).
import { notFound } from "next/navigation";
import { RecipeView } from "@/features/recipes/recipe-view";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { recipeDetail, recipeEditorProducts } from "@/server/services/recipes/recipes";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { user, active } = await requirePageBranch();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const scope = { actor: user, active };
  const recipe = await recipeDetail(appCtx(), scope, id).catch((e) => {
    if (isAppError(e) && e.code === "not_found") return null;
    throw e;
  });
  if (!recipe) notFound();
  return (
    <PageShell>
      <RecipeView recipe={recipe} products={await recipeEditorProducts(appCtx(), scope)} />
    </PageShell>
  );
}
