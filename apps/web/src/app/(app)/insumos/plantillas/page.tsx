// Spec 004 RF-35 a RF-39: plantillas de piezas de la sucursal activa.
import { TemplatesManager } from "@/features/recipes/templates-manager";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { listTemplates } from "@/server/services/recipes/templates";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.recipes.templates.title };

export default async function TemplatesPage() {
  const { user, active } = await requirePageBranch();
  return (
    <PageShell>
      <TemplatesManager templates={await listTemplates(appCtx(), { actor: user, active })} />
    </PageShell>
  );
}
