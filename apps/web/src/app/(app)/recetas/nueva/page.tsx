// Spec 004 RF-7 a RF-13: alta de una receta con ingredientes del catálogo del negocio activo.
import { RecipeEditor } from "@/features/recipes/recipe-editor";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { recipeEditorProducts } from "@/server/services/recipes/recipes";
import { EmptyState, LinkButton, PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.recipes.newTitle };

export default async function NewRecipePage() {
  const { user, active } = await requirePageBranch();
  const products = await recipeEditorProducts(appCtx(), { actor: user, active });
  const t = es.recipes;
  return (
    <PageShell title={t.newTitle}>
      <span className="self-start">
        <LinkButton href="/recetas" variant="ghost" icon="arrowLeft">
          {t.back}
        </LinkButton>
      </span>
      {products.length === 0 ? (
        <EmptyState title={t.noProducts} action={<LinkButton href="/productos">{t.goProducts}</LinkButton>} />
      ) : (
        <RecipeEditor products={products} />
      )}
    </PageShell>
  );
}
