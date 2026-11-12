// Spec 004 RF-3, RF-54: recetas del negocio de la sucursal activa.
import { RecipesManager } from "@/features/recipes/recipes-manager";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { listRecipes } from "@/server/services/recipes/recipes";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.recipes.title };

export default async function RecipesPage() {
  const { user, active } = await requirePageBranch();
  return (
    <PageShell>
      <RecipesManager recipes={await listRecipes(appCtx(), { actor: user, active })} />
    </PageShell>
  );
}
