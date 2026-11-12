// Spec 004 RF-40 a RF-48: importar recetas de Excel al negocio de la sucursal activa.
import { RecipeImport } from "@/features/recipes/recipe-import";
import { es } from "@/i18n";
import { requirePageBranch } from "@/server/auth/page-guards";
import { LinkButton, PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.recipes.importer.title };

export default async function ImportRecipesPage() {
  await requirePageBranch();
  return (
    <PageShell title={es.recipes.importer.title}>
      <span className="self-start">
        <LinkButton href="/recetas" variant="ghost" icon="arrowLeft">
          {es.recipes.back}
        </LinkButton>
      </span>
      <RecipeImport />
    </PageShell>
  );
}
